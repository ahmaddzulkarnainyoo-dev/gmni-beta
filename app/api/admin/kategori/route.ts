import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { slugify } from "@/lib/slug";

const ROLES_ADMIN = ["Super Admin", "Editor"];
const SLUG_TERLINDUNG = ["marhaenisme"];

function teks(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

/** POST /api/admin/kategori — membuat kategori (Super Admin/Editor). */
export async function POST(request: Request) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.roleNama || !ROLES_ADMIN.includes(user.roleNama)) {
    return NextResponse.json(
      { error: "Hanya Super Admin atau Editor yang dapat mengelola kategori." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const nama = teks(body.nama);
    if (!nama || nama.length < 2) {
      return NextResponse.json({ error: "Nama kategori minimal 2 karakter." }, { status: 400 });
    }

    const slugUsulan = teks(body.slug);
    const slug = slugUsulan ?? slugify(nama);
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug hanya huruf kecil, angka, dan tanda hubung." },
        { status: 400 },
      );
    }
    const bentrok = await prisma.kategori.findUnique({ where: { slug } });
    if (bentrok) {
      return NextResponse.json({ error: "Slug kategori sudah dipakai." }, { status: 409 });
    }

    const isTetap = body.isTetap === true && user.roleNama === "Super Admin";

    const dibuat = await prisma.$transaction(async (tx) => {
      const k = await tx.kategori.create({
        data: { nama, slug, deskripsi: teks(body.deskripsi), isTetap },
      });
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "kategori.create",
          entitasTipe: "Kategori",
          entitasId: k.id,
          dataSesudah: { nama, slug, isTetap },
        },
      });
      return k;
    });

    return NextResponse.json({ ok: true, id: dibuat.id, slug: dibuat.slug });
  } catch (error) {
    console.error("[admin/kategori] Gagal membuat:", error);
    return NextResponse.json({ error: "Gagal menyimpan kategori." }, { status: 500 });
  }
}
