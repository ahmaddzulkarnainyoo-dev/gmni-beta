import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/session";

/** Batas panjang isi pesan DM (blueprint 8.5). */
export const BATAS_ISI_PESAN = 2000;

/** Staf moderasi dikecualikan dari blokir profilTersembunyi (pola halaman profil). */
export function apakahStaf(sesi: SessionUser): boolean {
  return sesi.permissions.includes("komentar.moderasi");
}

type LawanBicara = {
  id: string;
  namaLengkap: string;
  username: string;
  fotoProfil: string | null;
  profilTersembunyi: boolean;
};

/** Cari room 1-on-1 eksisting antara dua user (grandfather privasi Fase 2→3). */
export async function cariPercakapanSatuLawanSatu(
  userIdA: string,
  userIdB: string,
): Promise<string | null> {
  const baris = await prisma.anggotaPercakapan.findFirst({
    where: {
      userId: userIdA,
      percakapan: { anggota: { some: { userId: userIdB } } },
    },
    select: { percakapanId: true },
  });
  if (!baris) return null;
  // Pastikan benar-benar 1-on-1 (tepat 2 anggota), bukan room grup masa depan.
  const jumlah = await prisma.anggotaPercakapan.count({
    where: { percakapanId: baris.percakapanId },
  });
  return jumlah === 2 ? baris.percakapanId : null;
}

/** Validasi target DM: ada, AKTIF, bukan diri sendiri. */
export async function ambilTargetDm(
  pemintaId: string,
  targetId: string,
): Promise<
  | { ok: true; target: LawanBicara & { statusAkun: string } }
  | { ok: false; status: number; pesan: string }
> {
  if (targetId === pemintaId) {
    return {
      ok: false,
      status: 400,
      pesan: "Tidak bisa mengirim pesan ke diri sendiri.",
    };
  }
  const target = await prisma.user.findUnique({
    where: { id: targetId },
    select: {
      id: true,
      namaLengkap: true,
      username: true,
      fotoProfil: true,
      profilTersembunyi: true,
      statusAkun: true,
    },
  });
  if (!target || target.statusAkun !== "AKTIF") {
    return {
      ok: false,
      status: 404,
      pesan: "Kader tujuan tidak ditemukan atau tidak aktif.",
    };
  }
  return { ok: true, target };
}

/** Aturan blokir profilTersembunyi untuk percakapan BARU (pengecualian staf). */
export function bolehMulaiPercakapanBaru(
  sesi: SessionUser,
  target: { profilTersembunyi: boolean; id: string },
  percakapanLamaId: string | null,
): boolean {
  if (percakapanLamaId) return true; // grandfather: room lama tetap jalan
  if (sesi.id === target.id) return false;
  if (apakahStaf(sesi)) return true;
  return !target.profilTersembunyi;
}

/** Id notifikasi kotak masuk untuk sebuah percakapan (idempoten: 1 per room). */
export function idNotifikasiPesan(percakapanId: string): string {
  return `pesan-${percakapanId}`;
}

/**
 * Upsert notifikasi kotak masuk untuk PENERIMA pesan baru (best-effort).
 * Dipakai `POST /api/pesan` agar lonceng notifikasi dasbor berbunyi saat ada
 * DM masuk. Satu baris per percakapan (di-refresh tiap pesan baru, kembali
 * "belum dibaca") supaya kotak masuk tidak dibanjiri ribuan duplikat saat
 * percakapan aktif. `tautan` menunjuk langsung ke /dasbor/pesan.
 */
export async function notifikasiPesanMasuk(params: {
  percakapanId: string;
  penerimaId: string;
  pengirimNama: string;
  isi: string;
}): Promise<void> {
  const cuplikan = params.isi.replace(/\s+/g, " ").trim().slice(0, 140);
  const judul = `Pesan baru dari ${params.pengirimNama || "kader"}`;
  await prisma.notifikasi.upsert({
    where: { id: idNotifikasiPesan(params.percakapanId) },
    create: {
      id: idNotifikasiPesan(params.percakapanId),
      userId: params.penerimaId,
      judul,
      isi: cuplikan,
      tipe: "INFO",
      tautan: "/dasbor/pesan",
    },
    update: {
      // Room 1-on-1: kepemilikan baris berpindah ke lawan bicara terakhir,
      // sehingga notifikasi selalu menunjuk penerima pesan paling baru.
      userId: params.penerimaId,
      judul,
      isi: cuplikan,
      tipe: "INFO",
      tautan: "/dasbor/pesan",
      dibaca: false,
    },
  });
}
