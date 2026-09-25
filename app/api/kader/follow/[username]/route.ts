import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/**
 * POST /api/kader/follow/[username] — toggle ikuti / berhenti mengikuti
 * kader lain (Sub-fase 4.3). Aturan: login wajib, tidak bisa mengikuti
 * diri sendiri, target harus AKTIF, dan profil tersembunyi hanya bisa
 * diikuti oleh staf moderasi / pemilik.
 */
export async function POST(
  _request: Request,
  { params }: { params: Promise<{ username: string }> },
) {
  const { username } = await params;
  const sesi = await getSessionUser();
  if (!sesi) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }

  const target = await prisma.user.findUnique({
    where: { username },
    select: { id: true, statusAkun: true, profilTersembunyi: true },
  });
  if (!target || target.statusAkun !== "AKTIF") {
    return NextResponse.json({ error: "Kader tidak ditemukan." }, { status: 404 });
  }
  if (target.id === sesi.id) {
    return NextResponse.json(
      { error: "Tidak bisa mengikuti diri sendiri." },
      { status: 400 },
    );
  }
  const staf = sesi.permissions.includes("komentar.moderasi");
  if (target.profilTersembunyi && !staf) {
    return NextResponse.json(
      { error: "Kader ini menyembunyikan profilnya dari publik." },
      { status: 403 },
    );
  }

  try {
    const lama = await prisma.follower.findUnique({
      where: { pengikutId_diikutiId: { pengikutId: sesi.id, diikutiId: target.id } },
    });
    if (lama) {
      await prisma.follower.delete({ where: { id: lama.id } });
      return NextResponse.json({ ok: true, mengikuti: false });
    }
    await prisma.follower.create({
      data: { pengikutId: sesi.id, diikutiId: target.id },
    });
    return NextResponse.json({ ok: true, mengikuti: true });
  } catch (error) {
    console.error("[follow] Toggle gagal:", error);
    return NextResponse.json({ error: "Gagal menyimpan perubahan." }, { status: 500 });
  }
}