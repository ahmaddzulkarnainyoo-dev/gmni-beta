import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { verifikasiTotp } from "@/lib/totp";

/** POST /api/kader/dua-faktor/verifikasi — uji kode tanpa mengubah state. */
export async function POST(req: Request) {
  const user = await requireActiveUser();
  const body = (await req.json().catch(() => null)) as { kode?: string } | null;
  const kode = (body?.kode ?? "").trim();
  if (!kode) {
    return NextResponse.json({ eror: "Kode wajib diisi." }, { status: 400 });
  }

  const milik = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true, is2FAEnabled: true },
  });
  if (!milik?.is2FAEnabled || !milik.totpSecret) {
    return NextResponse.json({ eror: "2FA belum aktif." }, { status: 409 });
  }

  const sah = verifikasiTotp(milik.totpSecret, kode);
  return NextResponse.json({ ok: sah, sah });
}
