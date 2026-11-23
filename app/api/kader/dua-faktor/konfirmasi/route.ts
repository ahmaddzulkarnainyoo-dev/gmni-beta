import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { verifikasiTotp } from "@/lib/totp";

/** POST /api/kader/dua-faktor/konfirmasi — aktifkan 2FA setelah verifikasi kode. */
export async function POST(req: Request) {
  const user = await requireActiveUser();
  const body = (await req.json().catch(() => null)) as { kode?: string } | null;
  const kode = (body?.kode ?? "").trim();
  if (!kode) {
    return NextResponse.json({ eror: "Kode wajib diisi." }, { status: 400 });
  }

  const milik = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpPendingSecret: true, is2FAEnabled: true },
  });
  if (!milik?.totpPendingSecret) {
    return NextResponse.json(
      { eror: "Belum ada setup 2FA. Minta kode baru dulu." },
      { status: 409 },
    );
  }
  if (!verifikasiTotp(milik.totpPendingSecret, kode)) {
    return NextResponse.json({ eror: "Kode tidak valid." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpSecret: milik.totpPendingSecret,
      totpPendingSecret: null,
      is2FAEnabled: true,
      totpAktivasiAt: new Date(),
      totpUpayaGagal: 0,
      totpKunciSampai: null,
    },
  });
  await prisma.auditLog.create({
    data: {
      aktorId: user.id,
      aksi: "dua-faktor.aktifkan",
      entitasTipe: "User",
      entitasId: user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
