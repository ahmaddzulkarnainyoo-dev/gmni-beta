import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ tersimpan: false });
  const { id } = await params;
  const bookmark = await prisma.bookmark.findUnique({ where: { userId_artikelId: { userId: user.id, artikelId: id } }, select: { id: true } });
  return NextResponse.json({ tersimpan: Boolean(bookmark) });
}

export async function POST(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Harus masuk untuk menyimpan artikel." }, { status: 401 });
  const { id } = await params;
  const artikel = await prisma.artikel.findFirst({ where: { id, status: "TERBIT" }, select: { id: true } });
  if (!artikel) return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
  await prisma.bookmark.upsert({ where: { userId_artikelId: { userId: user.id, artikelId: id } }, create: { userId: user.id, artikelId: id }, update: {} });
  return NextResponse.json({ ok: true, tersimpan: true });
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  const { id } = await params;
  await prisma.bookmark.deleteMany({ where: { userId: user.id, artikelId: id } });
  return NextResponse.json({ ok: true, tersimpan: false });
}
