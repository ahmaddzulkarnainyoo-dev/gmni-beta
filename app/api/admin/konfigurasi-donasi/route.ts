import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";
import { tautanIklanValid } from "@/lib/monetisasi";

/**
 * PATCH /api/admin/konfigurasi-donasi — kelola rekening & QRIS donasi
 * (permission monetisasi.kelola). Single-row upsert (id "utama").
 */
export async function PATCH(request: Request) {
  const user = await requirePermission("monetisasi.kelola");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const bankNama = typeof body.bankNama === "string" ? body.bankNama.trim() : "";
  const rekeningNomor = typeof body.rekeningNomor === "string" ? body.rekeningNomor.trim() : "";
  const atasNama = typeof body.atasNama === "string" ? body.atasNama.trim() : "";
  const qrisUrl = typeof body.qrisUrl === "string" ? body.qrisUrl.trim() : "";

  if (bankNama.length < 2 || bankNama.length > 60) {
    return NextResponse.json({ error: "Nama bank 2–60 karakter." }, { status: 400 });
  }
  if (rekeningNomor.length < 4 || rekeningNomor.length > 40) {
    return NextResponse.json({ error: "Nomor rekening 4–40 karakter." }, { status: 400 });
  }
  if (atasNama.length < 2 || atasNama.length > 80) {
    return NextResponse.json({ error: "Atas nama 2–80 karakter." }, { status: 400 });
  }
  if (qrisUrl && !tautanIklanValid(qrisUrl) && !qrisUrl.startsWith("/")) {
    return NextResponse.json({ error: "URL QRIS harus http(s) atau path internal (/...)." }, { status: 400 });
  }

  const sebelum = await prisma.konfigurasiDonasi.findUnique({ where: { id: "utama" } });
  const data = { bankNama, rekeningNomor, atasNama, qrisUrl: qrisUrl || null, diubahOlehId: user.id };

  await prisma.$transaction([
    prisma.konfigurasiDonasi.upsert({
      where: { id: "utama" },
      update: data,
      create: data,
    }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: "donasi.konfigurasi",
        entitasTipe: "KonfigurasiDonasi",
        entitasId: "utama",
        dataSebelum: {
          bank: sebelum?.bankNama ?? null,
          rekening: sebelum?.rekeningNomor ?? null,
          qris: sebelum?.qrisUrl ?? null,
        },
        dataSesudah: { bank: bankNama, rekening: rekeningNomor, qris: qrisUrl || null },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}