import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";

const BATAS_MAKS = 100;

/** GET /api/pesan/[percakapanId] — riwayat + tandai dibaca (bukan anggota → 404). */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ percakapanId: string }> },
) {
  const user = await getActiveSessionUser();
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

  const { percakapanId } = await params;
  const anggota = await prisma.anggotaPercakapan.findUnique({
    where: { percakapanId_userId: { percakapanId, userId: user.id } },
  });
  // Sengaja 404 (bukan 403) agar ID room tak bisa di-enumerasi.
  if (!anggota) {
    return NextResponse.json(
      { error: "Percakapan tidak ditemukan." },
      { status: 404 },
    );
  }

  const { searchParams } = new URL(request.url);
  const batasMentah = Number(searchParams.get("batas") ?? "30");
  const batas = Number.isFinite(batasMentah)
    ? Math.min(Math.max(Math.trunc(batasMentah), 1), BATAS_MAKS)
    : 30;
  const setelah = searchParams.get("setelah");
  const acuanSetelah = setelah ? new Date(setelah) : null;
  const modePolling = acuanSetelah && !Number.isNaN(acuanSetelah.getTime());

  // Polling: pesan baru setelah cursor. Paging awal: N pesan terbaru.
  const pesan = modePolling
    ? await prisma.pesan.findMany({
        where: {
          percakapanId,
          tanggal: { gt: acuanSetelah as Date },
        },
        orderBy: { tanggal: "asc" },
        take: BATAS_MAKS,
        include: {
          pengirim: {
            select: { id: true, namaLengkap: true, username: true },
          },
        },
      })
    : (
        await prisma.pesan.findMany({
          where: { percakapanId },
          orderBy: { tanggal: "desc" },
          take: batas,
          include: {
            pengirim: {
              select: { id: true, namaLengkap: true, username: true },
            },
          },
        })
      ).reverse();

  // Tandai dibaca (hemat transaksi): saat polling, transaksi penanda-baca hanya
  // dijalankan bila benar-benar ada pesan lawan TERKIRIM di batch; buka room
  // (non-polling) selalu menandai penuh — resi pengirim tetap akurat.
  const perluTandai = modePolling
    ? pesan.some(
        (p) => p.pengirimId !== user.id && p.status === "TERKIRIM",
      )
    : true;
  if (perluTandai) {
    const sekarang = new Date();
    await prisma.$transaction([
      prisma.pesan.updateMany({
        where: {
          percakapanId,
          pengirimId: { not: user.id },
          status: "TERKIRIM",
        },
        data: { status: "DIBACA" },
      }),
      prisma.anggotaPercakapan.update({
        where: { percakapanId_userId: { percakapanId, userId: user.id } },
        data: { terakhirDibacaAt: sekarang },
      }),
    ]);
  }

  return NextResponse.json({ pesan });
}
