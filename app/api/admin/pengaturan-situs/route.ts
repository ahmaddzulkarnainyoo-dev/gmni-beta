import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

/**
 * PATCH /api/admin/pengaturan-situs — konfigurasi umum situs
 * (permission role.kelola). Single-row upsert (id "utama").
 */
export async function PATCH(request: Request) {
  const user = await requirePermission("role.kelola");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const teks = (v: unknown, maks: number): string | undefined =>
    typeof v === "string" ? (v.trim().slice(0, maks) || undefined) : undefined;

  const namaSitus = teks(body.namaSitus, 60);
  if (namaSitus !== undefined && namaSitus.length < 2) {
    return NextResponse.json({ error: "Nama situs minimal 2 karakter." }, { status: 400 });
  }
  const emailKontak = teks(body.emailKontak, 120);
  if (emailKontak && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailKontak)) {
    return NextResponse.json({ error: "Email kontak tidak valid." }, { status: 400 });
  }
  const waKontak = teks(body.waKontak, 25);
  if (waKontak && !/^\+?[0-9]{8,20}$/.test(waKontak)) {
    return NextResponse.json(
      { error: "Nomor WhatsApp hanya angka (boleh diawali +), 8–20 digit." },
      { status: 400 },
    );
  }

  const sebelum = await prisma.pengaturanSitus.findUnique({ where: { id: "utama" } });
  const data = {
    ...(namaSitus !== undefined ? { namaSitus } : {}),
    tagline: teks(body.tagline, 120) ?? null,
    emailKontak: emailKontak ?? null,
    waKontak: waKontak ?? null,
    maintenanceMode: body.maintenanceMode === true,
    maintenancePesan: teks(body.maintenancePesan, 300) ?? null,
    diubahOlehId: user.id,
  };

  await prisma.$transaction([
    prisma.pengaturanSitus.upsert({
      where: { id: "utama" },
      update: data,
      create: {
        namaSitus: namaSitus ?? "info Marhaen",
        ...data,
      },
    }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: "pengaturan.situs",
        entitasTipe: "PengaturanSitus",
        entitasId: "utama",
        dataSebelum: {
          nama: sebelum?.namaSitus ?? null,
          maintenance: sebelum?.maintenanceMode ?? false,
        },
        dataSesudah: { nama: namaSitus, maintenance: data.maintenanceMode },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}