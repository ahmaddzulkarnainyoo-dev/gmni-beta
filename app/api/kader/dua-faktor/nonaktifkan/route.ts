import { NextResponse } from "next/server";
import { compare } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import { normalisasiKodePemulihan, verifikasiTotp } from "@/lib/totp";

/** POST /api/kader/dua-faktor/nonaktifkan — matikan 2FA (butuh kode aktif/pemulihan). */
export async function POST(req: Request) {
  const user = await requireActiveUser();
  const body = (await req.json().catch(() => null)) as { kode?: string } | null;
  const kode = (body?.kode ?? "").trim();
  if (!kode) {
    return NextResponse.json({ eror: "Kode wajib diisi." }, { status: 400 });
  }

  const milik = await prisma.user.findUnique({
    where: { id: user.id },
    select: { totpSecret: true, is2FAEnabled: true, recoveryKodes: true },
  });
  if (!milik?.is2FAEnabled || !milik.totpSecret) {
    return NextResponse.json({ eror: "2FA belum aktif." }, { status: 409 });
  }

  let sah = verifikasiTotp(milik.totpSecret, kode);
  if (!sah) {
    const normal = normalisasiKodePemulihan(kode);
    for (const h of milik.recoveryKodes) {
      if ((await compare(normal, h).catch(() => false)) ||
        (await compare(kode.toUpperCase(), h).catch(() => false))) {
        sah = true;
        break;
      }
    }
  }
  if (!sah) {
    return NextResponse.json({ eror: "Kode tidak valid." }, { status: 400 });
  }

  await prisma.user.update({
    where: { id: user.id },
    data: {
      totpSecret: null,
      totpPendingSecret: null,
      is2FAEnabled: false,
      totpAktivasiAt: null,
      totpUpayaGagal: 0,
      totpKunciSampai: null,
      recoveryKodes: [],
    },
  });
  await prisma.auditLog.create({
    data: {
      aktorId: user.id,
      aksi: "dua-faktor.nonaktifkan",
      entitasTipe: "User",
      entitasId: user.id,
    },
  });

  return NextResponse.json({ ok: true });
}
