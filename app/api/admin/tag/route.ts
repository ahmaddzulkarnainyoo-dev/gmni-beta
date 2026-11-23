import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { slugify } from "@/lib/slug";

const ROLES_ADMIN = ["Super Admin", "Editor"];

function teks(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

/** POST /api/admin/tag — membuat tag (Super Admin/Editor). */
export async function POST(request: Request) {
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

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const nama = teks(body.nama);
    if (!nama || nama.length < 2) {
      return NextResponse.json({ error: "Nama tag minimal 2 karakter." }, { status: 400 });
    }

    const slugUsulan = teks(body.slug);
    const slug = slugUsulan ?? slugify(nama);
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug hanya huruf kecil, angka, dan tanda hubung." },
        { status: 400 },
      );
    }
    const bentrok = await prisma.tag.findUnique({ where: { slug } });
    if (bentrok) {
      return NextResponse.json({ error: "Slug tag sudah dipakai." }, { status: 409 });
    }

    const dibuat = await prisma.$transaction(async (tx) => {
      const t = await tx.tag.create({ data: { nama, slug } });
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "tag.create",
          entitasTipe: "Tag",
          entitasId: t.id,
          dataSesudah: { nama, slug },
        },
      });
      return t;
    });

    return NextResponse.json({ ok: true, id: dibuat.id, slug: dibuat.slug });
  } catch (error) {
    console.error("[admin/tag] Gagal membuat:", error);
    return NextResponse.json({ error: "Gagal menyimpan tag." }, { status: 500 });
  }
}
