import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/session";

/**
 * PATCH /api/admin/katalog-badge â€” kelola gambar/label lencana (Sub-fase 4.3).
 * Khusus Super Admin (kontrol kepengurusan, blueprÂ­int 8.4). Body:
 * { jenisBadge, gambarUrl?: string|null, label?: string, aktif?: boolean }.
 * Upsert: baris katalog dibuat otomatis bila belum ada; audit setiap perubahan.
 */
export async function PATCH(request: Request) {
  const pemilik = await requireRole("Super Admin");

  let body: {
    jenisBadge?: string;
    gambarUrl?: string | null;
    label?: string;
    aktif?: boolean;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body tidak valid." }, { status: 400 });
  }

  const { jenisBadge } = body;
  if (!jenisBadge || typeof jenisBadge !== "string") {
    return NextResponse.json({ error: "jenisBadge wajib diisi." }, { status: 400 });
  }

  if (body.gambarUrl !== undefined && body.gambarUrl !== null) {
    const u = body.gambarUrl;
    if (u.length > 300 || !/^https?:\/\/.+/i.test(u)) {
      return NextResponse.json(
        { error: "URL gambar tidak valid (wajib http(s), maks 300 karakter)." },
        { status: 400 },
      );
    }
  }
  if (body.label !== undefined && (body.label.trim().length < 2 || body.label.trim().length > 60)) {
    return NextResponse.json({ error: "Label 2â€“60 karakter." }, { status: 400 });
  }

  try {
    const lama = await prisma.katalogBadge.findUnique({ where: { jenisBadge } });
    const entri = await prisma.katalogBadge.upsert({
      where: { jenisBadge },
      update: {
        ...(body.gambarUrl !== undefined ? { gambarUrl: body.gambarUrl } : {}),
        ...(body.label !== undefined ? { label: body.label.trim() } : {}),
        ...(body.aktif !== undefined ? { aktif: body.aktif } : {}),
      },
      create: {
        jenisBadge,
        label: body.label?.trim() ?? jenisBadge,
        gambarUrl: body.gambarUrl ?? null,
        aktif: body.aktif ?? true,
      },
    });

    await prisma.auditLog
      .create({
        data: {
          aktorId: pemilik.id,
          aksi: "katalog_badge.ubah",
          entitasTipe: "KatalogBadge",
          entitasId: entri.id,
          dataSebelum: lama
            ? { gambarUrl: lama.gambarUrl, aktif: lama.aktif }
            : Prisma.DbNull,
          dataSesudah: { gambarUrl: entri.gambarUrl, aktif: entri.aktif },
        },
      })
      .catch(() => undefined);

    return NextResponse.json({
      ok: true,
      entri: {
        id: entri.id,
        jenisBadge: entri.jenisBadge,
        label: entri.label,
        gambarUrl: entri.gambarUrl,
        deskripsi: entri.deskripsi,
        aktif: entri.aktif,
      },
    });
  } catch (error) {
    console.error("[katalog-badge] Gagal menyimpan:", error);
    return NextResponse.json({ error: "Gagal menyimpan katalog." }, { status: 500 });
  }
}
