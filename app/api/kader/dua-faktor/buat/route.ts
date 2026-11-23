import { NextResponse } from "next/server";
import { hash } from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { requireActiveUser } from "@/lib/session";
import {
  buatKodePemulihan,
  buatSecretTotp,
  buatUriOtpauth,
} from "@/lib/totp";

/**
 * POST /api/kader/dua-faktor/buat — mulai wizard setup 2FA (Sub-Fase 4.2).
 * Membuat secret *tentatif* + 5 kode pemulihan; QR dibuat client-side
 * agar tidak bergantung penuh pada package `qrcode` saat runtime.
 */
export async function POST() {
  const user = await requireActiveUser();

  const milik = await prisma.user.findUnique({
    where: { id: user.id },
    select: { is2FAEnabled: true, username: true, email: true },
  });
  if (!milik) return NextResponse.json({ eror: "Akun tak ditemukan." }, { status: 404 });
  if (milik.is2FAEnabled) {
    return NextResponse.json(
      { eror: "2FA sudah aktif. Nonaktifkan dulu untuk setup ulang." },
      { status: 409 },
    );
  }

  const pending = buatSecretTotp();
  const pemulihan = buatKodePemulihan(5);
  const hashPemulihan = await Promise.all(
    pemulihan.map((kode) =>
      hash(kode.replace("-", ""), 10).catch(() => hash(kode, 10)),
    ),
  );

  await prisma.user.update({
    where: { id: user.id },
    data: { totpPendingSecret: pending, recoveryKodes: hashPemulihan },
  });
  await prisma.auditLog.create({
    data: {
      aktorId: user.id,
      aksi: "dua-faktor.setup_mulai",
      entitasTipe: "User",
      entitasId: user.id,
    },
  });

  return NextResponse.json({
    ok: true,
    uri: buatUriOtpauth(milik.username ?? milik.email, pending),
    secret: pending,
    kodePemulihan: pemulihan,
  });
}
