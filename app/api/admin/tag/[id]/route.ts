import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import type { Prisma } from "@prisma/client";

const ROLES_ADMIN = ["Super Admin", "Editor"];

function teks(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

/** PATCH /api/admin/tag/[id] — ubah nama/slug tag. */
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
      { error: "Hanya Super Admin atau Editor yang dapat mengelola tag." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    return NextResponse.json({ error: "Tag tidak ditemukan." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    const nama = teks(body.nama);
    if (nama !== null) {
      if (nama.length < 2) {
        return NextResponse.json({ error: "Nama tag minimal 2 karakter." }, { status: 400 });
      }
      data.nama = nama;
    }

    const slugUsulan = teks(body.slug);
    if (slugUsulan !== null && slugUsulan !== tag.slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugUsulan)) {
        return NextResponse.json(
          { error: "Slug hanya huruf kecil, angka, dan tanda hubung." },
          { status: 400 },
        );
      }
      const bentrok = await prisma.tag.findFirst({
        where: { slug: slugUsulan, id: { not: id } },
      });
      if (bentrok) {
        return NextResponse.json({ error: "Slug tag sudah dipakai." }, { status: 409 });
      }
      data.slug = slugUsulan;
    }

    const hasil = await prisma.$transaction([
      prisma.tag.update({ where: { id }, data }),
      prisma.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "tag.update",
          entitasTipe: "Tag",
          entitasId: id,
          dataSebelum: { nama: tag.nama, slug: tag.slug },
          dataSesudah: data as Prisma.InputJsonValue,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, id: hasil[0].id, slug: hasil[0].slug });
  } catch (error) {
    console.error("[admin/tag] Gagal memperbarui:", error);
    return NextResponse.json({ error: "Gagal menyimpan tag." }, { status: 500 });
  }
}

/** DELETE /api/admin/tag/[id] — hapus tag (ArtikelTag ter-cascade). */
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
      { error: "Hanya Super Admin atau Editor yang dapat mengelola tag." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const tag = await prisma.tag.findUnique({ where: { id } });
  if (!tag) {
    return NextResponse.json({ error: "Tag tidak ditemukan." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.tag.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: "tag.delete",
        entitasTipe: "Tag",
        entitasId: id,
        dataSebelum: { nama: tag.nama, slug: tag.slug },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
