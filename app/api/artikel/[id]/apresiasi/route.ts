import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

const MAKS_TEPUK_PER_USER = 50;

/**
 * GET /api/artikel/[id]/apresiasi — total tepuk + jumlah saya (publik).
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const artikel = await prisma.artikel.findUnique({
    where: { id },
    select: { id: true, jumlahApresiasi: true },
  });
  if (!artikel) {
    return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
  }
  const sesi = await getSessionUser();
  let saya = 0;
  if (sesi) {
    const baris = await prisma.apresiasi.findUnique({
      where: { artikelId_userId: { artikelId: id, userId: sesi.id } },
      select: { jumlah: true },
    });
    saya = baris?.jumlah ?? 0;
  }
  return NextResponse.json({ ok: true, total: artikel.jumlahApresiasi, saya, maks: MAKS_TEPUK_PER_USER });
}

/**
 * POST /api/artikel/[id]/apresiasi — tambah/undo tepuk (wajib login, cap 50).
 * Body: { tambah: 1..50 } atau { kurang: 1..50 } (undo).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Masuk dulu untuk memberi apresiasi." }, { status: 401 });
  }
  const { id } = await params;
  const artikel = await prisma.artikel.findUnique({
    where: { id },
    select: { id: true, status: true },
  });
  if (!artikel || artikel.status !== "TERBIT") {
    return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
  }

  let body: Record<string, unknown> = {};
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Isi permintaan tidak valid." }, { status: 400 });
  }
  const tambah = typeof body.tambah === "number" ? Math.floor(body.tambah) : 0;
  const kurang = typeof body.kurang === "number" ? Math.floor(body.kurang) : 0;
  if (tambah <= 0 && kurang <= 0) {
    return NextResponse.json({ error: "Jumlah tepuk tidak valid." }, { status: 400 });
  }
  if (tambah > MAKS_TEPUK_PER_USER || kurang > MAKS_TEPUK_PER_USER) {
    return NextResponse.json({ error: `Maksimal ${MAKS_TEPUK_PER_USER} tepuk per aksi.` }, { status: 400 });
  }

  const lama = await prisma.apresiasi.findUnique({
    where: { artikelId_userId: { artikelId: id, userId: user.id } },
    select: { jumlah: true },
  });
  const jumlahLama = lama?.jumlah ?? 0;
  let jumlahBaru = jumlahLama + tambah - kurang;
  if (jumlahBaru > MAKS_TEPUK_PER_USER) {
    return NextResponse.json(
      { error: `Sudah mencapai batas ${MAKS_TEPUK_PER_USER} tepuk untuk artikel ini.` },
      { status: 400 },
    );
  }
  if (jumlahBaru < 0) jumlahBaru = 0;
  const delta = jumlahBaru - jumlahLama;

  await prisma.$transaction([
    jumlahBaru === 0 && jumlahLama > 0
      ? prisma.apresiasi.delete({ where: { artikelId_userId: { artikelId: id, userId: user.id } } })
      : prisma.apresiasi.upsert({
          where: { artikelId_userId: { artikelId: id, userId: user.id } },
          create: { artikelId: id, userId: user.id, jumlah: jumlahBaru },
          update: { jumlah: jumlahBaru },
        }),
    prisma.artikel.update({
      where: { id },
      data: { jumlahApresiasi: { increment: delta } },
    }),
  ]);

  const total = await prisma.artikel.findUnique({ where: { id }, select: { jumlahApresiasi: true } });
  return NextResponse.json({ ok: true, total: total?.jumlahApresiasi ?? 0, saya: jumlahBaru, maks: MAKS_TEPUK_PER_USER });
}
