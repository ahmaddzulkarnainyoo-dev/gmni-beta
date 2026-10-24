import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { urlSementaraBuktiKas } from "@/lib/storage-kas";

type Context = { params: Promise<{ id: string }> };

/** GET /api/kas/[id]/bukti — signed URL singkat untuk pemilik atau bendahara. */
export async function GET(_request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  const { id } = await params;

  try {
    const pembayaran = await prisma.pembayaranKas.findUnique({
      where: { id },
      select: {
        kaderId: true,
        bukti: { select: { storageKey: true } },
      },
    });
    if (!pembayaran?.bukti) {
      return NextResponse.json({ error: "Bukti kas tidak ditemukan." }, { status: 404 });
    }
    const pemilik = pembayaran.kaderId === user.id;
    const petugasKas = user.permissions.includes("kas.kelola");
    if (!pemilik && !petugasKas) {
      return NextResponse.json({ error: "Tidak berhak mengakses bukti ini." }, { status: 403 });
    }
    const url = await urlSementaraBuktiKas(pembayaran.bukti.storageKey);
    return NextResponse.redirect(url, 302);
  } catch (error) {
    console.error("[kas] Gagal menyediakan bukti privat:", error);
    return NextResponse.json({ error: "Bukti kas belum dapat dibuka." }, { status: 502 });
  }
}
