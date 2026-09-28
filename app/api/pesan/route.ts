import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  BATAS_ISI_PESAN,
  ambilTargetDm,
  bolehMulaiPercakapanBaru,
  cariPercakapanSatuLawanSatu,
  notifikasiPesanMasuk,
} from "@/lib/dm";
import { catatAktivitas, perbaruiStreak } from "@/lib/gamifikasi";

const BATAS_KIRIM_PER_MENIT = 20;

type BodyKirim = {
  percakapanId?: string;
  penerimaId?: string;
  username?: string;
  isi?: string;
};

/**
 * Notifikasi kotak masuk ke lawan bicara pada room EKSISTING (best-effort).
 * Sengaja dipisah sebagai fungsi modul: narrowing `user` dari sesi tidak
 * berlaku di dalam closure, jadi pengirim diteruskan sebagai parameter.
 * Pemanggil tidak menunggu (fire-and-forget) agar kegagalan notifikasi tidak
 * menggagalkan pengiriman pesan yang sudah tersimpan.
 */
async function kabarkanLawan(
  percakapanId: string,
  pengirim: { id: string; name: string },
  isi: string,
): Promise<void> {
  const lawan = await prisma.anggotaPercakapan.findFirst({
    where: { percakapanId, userId: { not: pengirim.id } },
    select: { userId: true },
  });
  if (!lawan) return;
  await notifikasiPesanMasuk({
    percakapanId,
    penerimaId: lawan.userId,
    pengirimNama: pengirim.name,
    isi,
  });
}

/**
 * POST /api/pesan — kirim pesan ke room eksisting atau buat room 1-on-1 baru.
 * Menegakkan aturan profilTersembunyi Fase 2 (dengan pengecualian staf +
 * grandfather room lama).
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Harus masuk terlebih dahulu." },
      { status: 401 },
    );
  }
  if (!user.permissions.includes("pesan.kirim")) {
    return NextResponse.json(
      { error: "Akun Anda tidak memiliki izin berkirim pesan." },
      { status: 403 },
    );
  }

  const body = (await request.json()) as BodyKirim;
  const isi = body.isi?.trim() ?? "";
  if (!isi) {
    return NextResponse.json(
      { error: "Isi pesan tidak boleh kosong." },
      { status: 400 },
    );
  }
  if (isi.length > BATAS_ISI_PESAN) {
    return NextResponse.json(
      { error: `Pesan maksimal ${BATAS_ISI_PESAN} karakter.` },
      { status: 400 },
    );
  }

  // Throttle sederhana: maks N pesan/menit per user (blueprint 9.2).
  const semenitLalu = new Date(Date.now() - 60_000);
  const terkirimBaru = await prisma.pesan.count({
    where: { pengirimId: user.id, tanggal: { gt: semenitLalu } },
  });
  if (terkirimBaru >= BATAS_KIRIM_PER_MENIT) {
    return NextResponse.json(
      { error: "Terlalu banyak pesan. Coba lagi sebentar lagi." },
      { status: 429 },
    );
  }

  const sekarang = new Date();

  // Cabang A: lanjutkan percakapan eksisting.
  if (body.percakapanId) {
    const anggota = await prisma.anggotaPercakapan.findUnique({
      where: {
        percakapanId_userId: { percakapanId: body.percakapanId, userId: user.id },
      },
    });
    if (!anggota) {
      return NextResponse.json(
        { error: "Percakapan tidak ditemukan." },
        { status: 404 },
      );
    }
    const [pesan] = await prisma.$transaction([
      prisma.pesan.create({
        data: {
          percakapanId: body.percakapanId,
          pengirimId: user.id,
          isi,
        },
      }),
      prisma.percakapan.update({
        where: { id: body.percakapanId },
        data: { pesanTerakhirAt: sekarang },
      }),
    ]);
    // Aktivitas harian pengirim (best-effort, blueprint 8.4).
    catatAktivitas(user.id, "AKTIF_HARIAN")
      .then(() => perbaruiStreak(user.id))
      .catch(() => undefined);
    // Notifikasi kotak masuk penerima (best-effort).
    kabarkanLawan(body.percakapanId, user, isi).catch(() => undefined);
    return NextResponse.json(
      { ok: true, percakapanId: body.percakapanId, pesan },
      { status: 201 },
    );
  }

  // Cabang B: percakapan baru — selesaikan identitas target.
  let targetId = body.penerimaId?.trim() || null;
  if (!targetId && body.username?.trim()) {
    const calon = await prisma.user.findUnique({
      where: { username: body.username.trim() },
      select: { id: true },
    });
    targetId = calon?.id ?? null;
  }
  if (!targetId) {
    return NextResponse.json(
      { error: "Tujuan pesan tidak ditemukan." },
      { status: 404 },
    );
  }

  const hasil = await ambilTargetDm(user.id, targetId);
  if (!hasil.ok) {
    return NextResponse.json({ error: hasil.pesan }, { status: hasil.status });
  }

  // Reuse room 1-on-1 bila sudah ada (idempoten, anti duplikat).
  const lama = await cariPercakapanSatuLawanSatu(user.id, targetId);
  if (lama) {
    const [pesan] = await prisma.$transaction([
      prisma.pesan.create({
        data: { percakapanId: lama, pengirimId: user.id, isi },
      }),
      prisma.percakapan.update({
        where: { id: lama },
        data: { pesanTerakhirAt: sekarang },
      }),
    ]);
    // Aktivitas harian pengirim (best-effort, blueprint 8.4).
    catatAktivitas(user.id, "AKTIF_HARIAN")
      .then(() => perbaruiStreak(user.id))
      .catch(() => undefined);
    // Notifikasi kotak masuk penerima (best-effort).
    kabarkanLawan(lama, user, isi).catch(() => undefined);
    return NextResponse.json(
      { ok: true, percakapanId: lama, pesan },
      { status: 201 },
    );
  }

  if (!bolehMulaiPercakapanBaru(user, hasil.target, null)) {
    return NextResponse.json(
      {
        error:
          "Kader ini menyembunyikan profil dan tidak menerima pesan baru.",
      },
      { status: 403 },
    );
  }

  // Buat room + 2 anggota + pesan pertama atomik.
  const dibuat = await prisma.percakapan.create({
    data: {
      pesanTerakhirAt: sekarang,
      anggota: { create: [{ userId: user.id }, { userId: targetId }] },
      pesan: { create: [{ pengirimId: user.id, isi }] },
    },
    include: {
      pesan: { orderBy: { tanggal: "asc" }, take: 1 },
      anggota: { select: { userId: true } },
    },
  });

  // Observability: room 1-on-1 wajib tepat 2 anggota; log bila tidak (data
  // tetap tersimpan — asersi hanya untuk tracing insiden "pesan tidak sampai").
  if (dibuat.anggota.length !== 2) {
    console.error("[pesan] room baru anggota != 2", {
      percakapanId: dibuat.id,
      pengirim: user.id,
      target: targetId,
      jumlah: dibuat.anggota.length,
    });
  }

  // Aktivitas harian pengirim (best-effort, blueprint 8.4).
  catatAktivitas(user.id, "AKTIF_HARIAN")
    .then(() => perbaruiStreak(user.id))
    .catch(() => undefined);

  // Notifikasi kotak masuk penerima (best-effort; room baru → target diketahui).
  notifikasiPesanMasuk({
    percakapanId: dibuat.id,
    penerimaId: targetId,
    pengirimNama: user.name,
    isi,
  }).catch(() => undefined);

  return NextResponse.json(
    { ok: true, percakapanId: dibuat.id, pesan: dibuat.pesan[0] ?? null },
    { status: 201 },
  );
}
