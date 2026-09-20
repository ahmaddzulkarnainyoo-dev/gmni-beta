/**
 * Mesin gamifikasi kader (Sub-Fase 3.2 - blueprint 8.4 & 7.7).
 * Poin: ARTIKEL_TERBIT=10, KOMENTAR_TAMPIL=2, AKTIF_HARIAN=1.
 * Jendela mingguan: Senin 00:00 WIB - reset via filter tanggal (tanpa cron).
 * Filter anonimitas mutlak: hanya artikel ASLI + tidak dikecualikan.
 */
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import type { JenisAktivitas } from "@prisma/client";

/**
 * Nama role tim redaksi/admin yang DIKECUALIKAN dari papan peringkat kader.
 * Papan publik & dasbor kader murni berisi persaingan kader/anggota; panel
 * audit /admin/leaderboard dapat menyertakannya lewat opsi sertakanAdmin.
 */
export const PERAN_ADMIN: readonly string[] = ["Super Admin", "Editor"];

export const POIN_AKTIVITAS: Record<JenisAktivitas, number> = {
  ARTIKEL_TERBIT: 10,
  KOMENTAR_TAMPIL: 2,
  AKTIF_HARIAN: 1,
};

/** Awal minggu berjalan (Senin 00:00 WIB) sebagai Date UTC. */
export function awalMingguBerjalan(sekarang = new Date()): Date {
  const wib = new Date(sekarang.getTime() + 7 * 3_600_000);
  const hari = wib.getUTCDay();
  const mundur = (hari + 6) % 7;
  const seninWib = new Date(
    Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate() - mundur),
  );
  return new Date(seninWib.getTime() - 7 * 3_600_000);
}

/** Akhir minggu berjalan (Senin berikutnya 00:00 WIB, eksklusif). */
export function akhirMingguBerjalan(sekarang = new Date()): Date {
  return new Date(awalMingguBerjalan(sekarang).getTime() + 7 * 86_400_000);
}

/** Label periode mingguan, mis. "2026-W37". */
export function labelPeriodeMingguan(sekarang = new Date()): string {
  const awal = awalMingguBerjalan(sekarang);
  const awalTahun = Date.UTC(awal.getUTCFullYear(), 0, 1);
  const minggu = Math.floor((awal.getTime() - awalTahun) / (7 * 86_400_000)) + 1;
  return `${awal.getUTCFullYear()}-W${String(minggu).padStart(2, "0")}`;
}

/** Tanggal hari dalam zona WIB (tengah malam WIB) untuk dedup AKTIF_HARIAN. */
export function tanggalHariWib(sekarang = new Date()): Date {
  const wib = new Date(sekarang.getTime() + 7 * 3_600_000);
  const tengahMalamWib = Date.UTC(wib.getUTCFullYear(), wib.getUTCMonth(), wib.getUTCDate());
  return new Date(tengahMalamWib - 7 * 3_600_000);
}

/** Alias lawas (UTC): dipertahankan untuk kompatibilitas, JANGAN dipakai di kode baru. */
export function tanggalHariUtc(sekarang = new Date()): Date {
  return new Date(
    Date.UTC(sekarang.getUTCFullYear(), sekarang.getUTCMonth(), sekarang.getUTCDate()),
  );
}

/** Catat satu aktivitas berpoin (idempoten per hari via unique). */
export async function catatAktivitas(
  userId: string,
  jenis: JenisAktivitas,
  opsi?: { detail?: string; tanggal?: Date },
): Promise<void> {
  const tanggal = opsi?.tanggal ?? new Date();
  try {
    await prisma.kegiatanKader.upsert({
      where: {
        userId_jenis_tanggalHari: {
          userId,
          jenis,
          tanggalHari: tanggalHariWib(tanggal),
        },
      },
      update: {},
      create: {
        userId,
        jenis,
        poin: POIN_AKTIVITAS[jenis],
        detail: opsi?.detail,
        tanggalHari: tanggalHariWib(tanggal),
        tanggal,
      },
    });
  } catch {
    // Poin tidak boleh menggagalkan aksi utama.
  }
}

/** Hapus poin yang merujuk ke sebuah entitas (retraksi moderasi). */
export async function tarikPoinEntitas(detail: string): Promise<void> {
  try {
    await prisma.kegiatanKader.deleteMany({ where: { detail } });
  } catch {
    // Best-effort.
  }
}

/**
 * Triase error Prisma: P2021 (tabel belum ada) / P2022 (kolom belum ada).
 * Terjadi bila DB environment belum di-sync — JANGAN dibungkus banner palsu;
 * cukup log jelas + fallback data kosong (data memang nol, bukan error DB).
 */
function skemaHilang(error: unknown): boolean {
  return (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2021" || error.code === "P2022")
  );
}

function logSkemaHilang(label: string): void {
  console.error(
    `[gamifikasi] Tabel/kolom gamifikasi belum ada di DB (${label}) — jalankan "npx prisma db push" di environment produksi.`,
  );
}

/** Penghitung bagian query untuk deteksi "semua gagal". */
type CatatanKueri = { gagal: number; total: number; skemaHilang: boolean };

/**
 * Jalankan satu bagian query dengan fallback; catat kegagalan ke `catatan`.
 * Kegagalan satu bagian TIDAK merusak bagian lain (anti-banner-palsu).
 */
async function amanBagian<T>(
  label: string,
  fn: () => Promise<T>,
  fallback: T,
  catatan: CatatanKueri,
): Promise<T> {
  catatan.total += 1;
  try {
    return await fn();
  } catch (error) {
    catatan.gagal += 1;
    if (skemaHilang(error)) {
      catatan.skemaHilang = true;
      logSkemaHilang(label);
    } else {
      console.error(`[gamifikasi] Bagian ${label} gagal:`, error);
    }
    return fallback;
  }
}
/** Beri badge idempoten (upsert - duplikat diabaikan). */
export async function beriBadge(
  userId: string,
  jenisBadge: string,
  periode: string,
): Promise<void> {
  await prisma.pencapaian.upsert({
    where: { userId_jenisBadge_periode: { userId, jenisBadge, periode } },
    update: {},
    create: { userId, jenisBadge, periode },
  });
}

/** Label badge yang ramah tampil (Indonesia). */
export const LABEL_BADGE: Record<string, string> = {
  ARTIKEL_FIRST: "Tulisan Perdana",
  ARTIKEL_10: "Sepuluh Tulisan",
  KOMENTAR_10: "Sepuluh Komentar",
  KOMENTAR_50: "Lima Puluh Komentar",
  STREAK_3: "Konsisten 3 Hari",
  STREAK_7: "Aktif 7 Hari",
  STREAK_30: "Loyal 30 Hari",
  TOP_3_MINGGU: "Tiga Besar Mingguan",
};
/** Perbarui streak harian kader + badge milestone (3/7/30 hari). */
export async function perbaruiStreak(userId: string, sekarang = new Date()): Promise<number> {
  const hariIni = tanggalHariWib(sekarang);
  const kemarin = new Date(hariIni.getTime() - 86400000);
  try {
    const lama = await prisma.streakKader.findUnique({ where: { userId } });
    if (!lama) {
      await prisma.streakKader.create({
        data: { userId, jumlahHariBeruntun: 1, hariTerakhirAktif: hariIni },
      });
      return 1;
    }
    const t = new Date(lama.hariTerakhirAktif);
    const terakhirHari = Date.UTC(t.getUTCFullYear(), t.getUTCMonth(), t.getUTCDate());
    if (terakhirHari === hariIni.getTime()) return lama.jumlahHariBeruntun;
    const beruntun = terakhirHari === kemarin.getTime() ? lama.jumlahHariBeruntun + 1 : 1;
    await prisma.streakKader.update({
      where: { userId },
      data: { jumlahHariBeruntun: beruntun, hariTerakhirAktif: hariIni },
    });
    if (beruntun === 3) await beriBadge(userId, "STREAK_3", "SEMUA").catch(() => undefined);
    if (beruntun === 7) await beriBadge(userId, "STREAK_7", "SEMUA").catch(() => undefined);
    if (beruntun === 30) await beriBadge(userId, "STREAK_30", "SEMUA").catch(() => undefined);
    return beruntun;
  } catch {
    return 0;
  }
}

/** Evaluasi badge lifetime (artikel & komentar) - dipanggil lazily). */
export async function evaluasiBadgeKader(userId: string): Promise<void> {
  try {
    const [jumlahArtikel, jumlahKomentar] = await Promise.all([
      prisma.artikel.count({
        where: {
          penulisId: userId,
          status: "TERBIT",
          visibilitasPenulis: "ASLI",
          dikecualikanDariLeaderboard: false,
        },
      }),
      prisma.komentar.count({ where: { penulisId: userId, status: "TAMPIL" } }),
    ]);
    if (jumlahArtikel >= 1) await beriBadge(userId, "ARTIKEL_FIRST", "SEMUA");
    if (jumlahArtikel >= 10) await beriBadge(userId, "ARTIKEL_10", "SEMUA");
    if (jumlahKomentar >= 10) await beriBadge(userId, "KOMENTAR_10", "SEMUA");
    if (jumlahKomentar >= 50) await beriBadge(userId, "KOMENTAR_50", "SEMUA");
  } catch {
    // Best-effort.
  }
}
export type BarisPeringkat = {
  userId: string;
  namaLengkap: string;
  username: string;
  fotoProfil: string | null;
  daerahAsal: string | null;
  totalPoin: number;
  jumlahArtikel: number;
  jumlahKomentar: number;
  /** True bila akun kader menyembunyikan profil (hanya diisi mode admin). */
  profilTersembunyi?: boolean;
  /** Jumlah poin manual (AjusPoin) minggu berjalan yang tergabung di totalPoin. */
  poinManual?: number;
  /** True bila kader disembunyikan dari papan publik oleh Super Admin. */
  disembunyikanPapan?: boolean;
  /** Nama role akun (dipakai panel audit untuk menandai tim redaksi/admin). */
  roleNama?: string;
};

/**
 * Agregasi leaderboard minggu berjalan dari ledger KegiatanKader.
 * Anti-banner-palsu: error skema (P2021/P2022 — tabel gamifikasi belum
 * di-push di environment tersebut) → papan kosong + log jelas; error DB
 * lain (koneksi/timeout) → dilempar ke amanAsync (banner sah di dasbor).
 */
export async function ambilPeringkatMingguan(
  batas = 50,
  opsi?: { sertakanTersembunyi?: boolean; sertakanAdmin?: boolean },
): Promise<BarisPeringkat[]> {
  try {
    return await kumpulkanPeringkatMingguan(batas, opsi);
  } catch (error) {
    if (skemaHilang(error)) {
      logSkemaHilang("leaderboard");
      return [];
    }
    throw error;
  }
}

async function kumpulkanPeringkatMingguan(
  batas = 50,
  opsi?: { sertakanTersembunyi?: boolean; sertakanAdmin?: boolean },
): Promise<BarisPeringkat[]> {
  const awal = awalMingguBerjalan();
  const akhir = akhirMingguBerjalan();
  const sertakanTersembunyi = opsi?.sertakanTersembunyi === true;
  const sertakanAdmin = opsi?.sertakanAdmin === true;
  const ledger = await prisma.kegiatanKader.groupBy({
    by: ["userId"],
    where: { tanggal: { gte: awal, lt: akhir } },
    _sum: { poin: true },
    orderBy: { _sum: { poin: "desc" } },
    // Ambil kandidat lebih banyak karena sebagian tersaring (nonaktif/tersembunyi/admin).
    take: batas * 3,
  });
  if (ledger.length === 0) return [];
  const userIds = ledger.map((l) => l.userId);
  const [pengguna, artikel, komentar, ajust] = await Promise.all([
    prisma.user.findMany({
      where: {
        id: { in: userIds },
        statusAkun: "AKTIF",
        // Panel admin boleh menyertakan kader berperil tersembunyi.
        ...(sertakanTersembunyi
          ? {}
          : { profilTersembunyi: false, sembunyikanDariPapan: false }),
        // Papan kader murni: akun tim redaksi/admin tidak diikutkan.
        ...(sertakanAdmin ? {} : { role: { nama: { notIn: [...PERAN_ADMIN] } } }),
      },
      select: {
        id: true,
        namaLengkap: true,
        username: true,
        fotoProfil: true,
        daerahAsal: true,
        profilTersembunyi: true,
        sembunyikanDariPapan: true,
        role: { select: { nama: true } },
      },
    }),
    prisma.artikel.groupBy({
      by: ["penulisId"],
      where: {
        penulisId: { in: userIds },
        status: "TERBIT",
        visibilitasPenulis: "ASLI",
        dikecualikanDariLeaderboard: false,
        tanggalTerbit: { gte: awal, lt: akhir },
      },
      _count: { _all: true },
    }),
    prisma.komentar.groupBy({
      by: ["penulisId"],
      where: { penulisId: { in: userIds }, status: "TAMPIL", tanggal: { gte: awal, lt: akhir } },
      _count: { _all: true },
    }),
    // Poin manual Super Admin (AjusPoin) minggu berjalan — dijumlahkan.
    prisma.ajusPoin.groupBy({
      by: ["userId"],
      where: { userId: { in: userIds }, createdAt: { gte: awal, lt: akhir } },
      _sum: { poin: true },
    }),
  ]);
  const petaPengguna = new Map(pengguna.map((u) => [u.id, u]));
  const petaArtikel = new Map(artikel.map((a) => [a.penulisId, a._count._all]));
  const petaKomentar = new Map(
    komentar.filter((k) => k.penulisId).map((k) => [k.penulisId as string, k._count._all]),
  );
  const petaAjus = new Map(ajust.map((a) => [a.userId, a._sum.poin ?? 0]));
  const baris: BarisPeringkat[] = [];
  for (const l of ledger) {
    const u = petaPengguna.get(l.userId);
    if (!u) continue;
    const poinManual = petaAjus.get(u.id) ?? 0;
    baris.push({
      userId: u.id,
      namaLengkap: u.namaLengkap,
      username: u.username,
      fotoProfil: u.fotoProfil,
      daerahAsal: u.daerahAsal,
      totalPoin: (l._sum.poin ?? 0) + poinManual,
      poinManual,
      jumlahArtikel: petaArtikel.get(u.id) ?? 0,
      jumlahKomentar: petaKomentar.get(u.id) ?? 0,
      profilTersembunyi: (u as { profilTersembunyi?: boolean }).profilTersembunyi ?? false,
      disembunyikanPapan: (u as { sembunyikanDariPapan?: boolean }).sembunyikanDariPapan ?? false,
      roleNama: u.role.nama,
    });
    if (baris.length >= batas) break;
  }
  return baris;
}

/** Ringkasan poin & peringkat seorang kader untuk widget dasbor. */
export async function ambilRingkasanKader(userId: string): Promise<{
  poinMingguIni: number;
  peringkat: number | null;
  streak: number;
  jumlahBadge: number;
  /** Rincian per jenis aktivitas minggu ini (untuk transparansi widget). */
  rincian: Array<{ jenis: string; jumlah: number; poin: number }>;
  /** true bila SEMUA bagian query gagal (DB down) → banner dasbor sah. */
  gagalTotal: boolean;
  /** true bila ada bagian gagal karena tabel/kolom belum dibuat (P2021/P2022). */
  tabelGamifikasiHilang: boolean;
}> {
  const awal = awalMingguBerjalan();
  const akhir = akhirMingguBerjalan();
  const catatan: CatatanKueri = { gagal: 0, total: 0, skemaHilang: false };

  // Granular: tiap query dijaga sendiri-sendiri — satu bagian gagal (mis.
  // tabel gamifikasi belum di-push) TIDAK merusak bagian lain maupun
  // memunculkan banner palsu "Sebagian data ringkasan belum dapat dimuat".
  const [agregat, perJenis, streak, jumlahBadge, pemilik] = await Promise.all([
    amanBagian(
      "agregat-poin",
      () =>
        prisma.kegiatanKader.aggregate({
          where: { userId, tanggal: { gte: awal, lt: akhir } },
          _sum: { poin: true },
        }),
      { _sum: { poin: null } },
      catatan,
    ),
    amanBagian(
      "rincian-jenis",
      () =>
        prisma.kegiatanKader.groupBy({
          by: ["jenis"],
          where: { userId, tanggal: { gte: awal, lt: akhir } },
          _count: { _all: true },
          _sum: { poin: true },
        }),
      [] as Array<{
        jenis: JenisAktivitas;
        _count: { _all: number };
        _sum: { poin: number | null };
      }>,
      catatan,
    ),
    amanBagian(
      "streak",
      () => prisma.streakKader.findUnique({ where: { userId } }),
      null,
      catatan,
    ),
    amanBagian(
      "badge",
      () => prisma.pencapaian.count({ where: { userId } }),
      0,
      catatan,
    ),
    amanBagian(
      "pemilik-akun",
      () =>
        prisma.user.findUnique({
          where: { id: userId },
          select: { statusAkun: true, profilTersembunyi: true, role: { select: { nama: true } } },
        }),
      null,
      catatan,
    ),
  ]);

  const poinMingguIni = agregat._sum.poin ?? 0;
  const rincian = perJenis.map((r) => ({ jenis: r.jenis, jumlah: r._count._all, poin: r._sum.poin ?? 0 }));
  // Peringkat hanya bermakna bila akun ikut papan kader (AKTIF, profil tampil,
  // bukan tim redaksi/admin) - sejalan dengan filter ambilPeringkatMingguan().
  const ikutPapan =
    pemilik !== null &&
    pemilik.statusAkun === "AKTIF" &&
    !pemilik.profilTersembunyi &&
    !PERAN_ADMIN.includes(pemilik.role.nama);
  let peringkat: number | null = null;
  if (poinMingguIni > 0 && ikutPapan) {
    peringkat = await amanBagian(
      "peringkat",
      async () => {
        const diAtas = await prisma.kegiatanKader.groupBy({
          by: ["userId"],
          where: { tanggal: { gte: awal, lt: akhir } },
          _sum: { poin: true },
          having: { poin: { _sum: { gt: poinMingguIni } } },
        });
        const kandidat = diAtas.map((d) => d.userId);
        if (kandidat.length === 0) return 1;
        const jumlahDiAtas = await prisma.user.count({
          where: {
            id: { in: kandidat },
            statusAkun: "AKTIF",
            profilTersembunyi: false,
            sembunyikanDariPapan: false,
            role: { nama: { notIn: [...PERAN_ADMIN] } },
          },
        });
        return jumlahDiAtas + 1;
      },
      null,
      catatan,
    );
  }

  // Banner dasbor HANYA bila semua bagian gagal (DB benar-benar tak terjangkau).
  const gagalTotal = catatan.total > 0 && catatan.gagal === catatan.total;
  return {
    poinMingguIni,
    peringkat,
    streak: streak?.jumlahHariBeruntun ?? 0,
    jumlahBadge,
    rincian,
    gagalTotal,
    tabelGamifikasiHilang: catatan.skemaHilang,
  };
}

/** Snapshot top-N minggu berjalan + badge TOP_3_MINGGU (lazily). */
export async function snapshotPeringkatMingguan(batas = 10): Promise<void> {
  try {
    const awal = awalMingguBerjalan();
    const akhir = akhirMingguBerjalan();
    const periode = labelPeriodeMingguan();
    const baris = await ambilPeringkatMingguan(batas);
    let posisi = 0;
    for (const b of baris) {
      posisi += 1;
      await prisma.peringkatMingguan.upsert({
        where: {
          mingguMulai_kategori_userId: { mingguMulai: awal, kategori: "POIN_UMUM", userId: b.userId },
        },
        update: { skor: b.totalPoin, peringkat: posisi, mingguSelesai: akhir },
        create: {
          mingguMulai: awal,
          mingguSelesai: akhir,
          kategori: "POIN_UMUM",
          userId: b.userId,
          skor: b.totalPoin,
          peringkat: posisi,
        },
      });
      if (posisi <= 3) await beriBadge(b.userId, "TOP_3_MINGGU", periode).catch(() => undefined);
    }
  } catch {
    // Best-effort.
  }
}
