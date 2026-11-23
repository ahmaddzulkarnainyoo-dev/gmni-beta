import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import type { Prisma } from "@prisma/client";

const ROLES_ADMIN = ["Super Admin", "Editor"];
const STATUS_TOKOH = ["AKTIF", "ARSIP"];

function teks(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function angka(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** PATCH /api/admin/tokoh/[id] — ubah profil tokoh. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.roleNama || !ROLES_ADMIN.includes(user.roleNama)) {
    return NextResponse.json(
      { error: "Hanya Super Admin atau Editor yang dapat mengelola tokoh." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const tokoh = await prisma.tokoh.findUnique({ where: { id } });
  if (!tokoh) {
    return NextResponse.json({ error: "Tokoh tidak ditemukan." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    const nama = teks(body.nama);
    if (nama !== null) {
      if (nama.length < 2) {
        return NextResponse.json({ error: "Nama tokoh minimal 2 karakter." }, { status: 400 });
      }
      data.nama = nama;
    }

    const slugUsulan = teks(body.slug);
    if (slugUsulan !== null && slugUsulan !== tokoh.slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugUsulan)) {
        return NextResponse.json(
          { error: "Slug hanya huruf kecil, angka, dan tanda hubung." },
          { status: 400 },
        );
      }
      const bentrok = await prisma.tokoh.findFirst({
        where: { slug: slugUsulan, id: { not: id } },
      });
      if (bentrok) {
        return NextResponse.json({ error: "Slug tokoh sudah dipakai." }, { status: 409 });
      }
      data.slug = slugUsulan;
    }

    const julukan = teks(body.julukan);
    if (julukan !== null) data.julukan = julukan || null;
    const gambar = teks(body.gambar);
    if (gambar !== null) data.gambar = gambar || null;
    const kutipan = teks(body.kutipan);
    if (kutipan !== null) data.kutipan = kutipan || null;

    const biografi = teks(body.biografi);
    if (biografi !== null) {
      if (biografi.length < 10) {
        return NextResponse.json({ error: "Biografi minimal 10 karakter." }, { status: 400 });
      }
      data.biografi = biografi;
    }

    if (body.lahir !== undefined) data.lahir = angka(body.lahir);
    if (body.wafat !== undefined) data.wafat = angka(body.wafat);
    if (body.urutan !== undefined) data.urutan = angka(body.urutan) ?? 0;

    const status = teks(body.status);
    if (status !== null) {
      if (!STATUS_TOKOH.includes(status as string)) {
        return NextResponse.json({ error: "Status tokoh tidak dikenal." }, { status: 400 });
      }
      data.status = status;
    }

    const hasil = await prisma.$transaction([
      prisma.tokoh.update({ where: { id }, data }),
      prisma.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "tokoh.update",
          entitasTipe: "Tokoh",
          entitasId: id,
          dataSebelum: { nama: tokoh.nama, status: tokoh.status },
          dataSesudah: data as Prisma.InputJsonValue,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, id: hasil[0].id, slug: hasil[0].slug });
  } catch (error) {
    console.error("[admin/tokoh] Gagal memperbarui:", error);
    return NextResponse.json({ error: "Gagal menyimpan tokoh." }, { status: 500 });
  }
}

/** DELETE /api/admin/tokoh/[id] — hapus tokoh. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.roleNama || !ROLES_ADMIN.includes(user.roleNama)) {
    return NextResponse.json(
      { error: "Hanya Super Admin atau Editor yang dapat mengelola tokoh." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const tokoh = await prisma.tokoh.findUnique({ where: { id } });
  if (!tokoh) {
    return NextResponse.json({ error: "Tokoh tidak ditemukan." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.tokoh.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: "tokoh.delete",
        entitasTipe: "Tokoh",
        entitasId: id,
        dataSebelum: { nama: tokoh.nama, slug: tokoh.slug },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
