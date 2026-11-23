import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import type { Prisma } from "@prisma/client";

const ROLES_ADMIN = ["Super Admin", "Editor"];
const SLUG_TERLINDUNG = ["marhaenisme"];

function teks(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

/** PATCH /api/admin/kategori/[id] — ubah nama/slug/deskripsi/isTetap. */
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
      { error: "Hanya Super Admin atau Editor yang dapat mengelola kategori." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const kategori = await prisma.kategori.findUnique({ where: { id } });
  if (!kategori) {
    return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    const nama = teks(body.nama);
    if (nama !== null) {
      if (nama.length < 2) {
        return NextResponse.json({ error: "Nama kategori minimal 2 karakter." }, { status: 400 });
      }
      data.nama = nama;
    }

    const slugUsulan = teks(body.slug);
    if (slugUsulan !== null && slugUsulan !== kategori.slug) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugUsulan)) {
        return NextResponse.json(
          { error: "Slug hanya huruf kecil, angka, dan tanda hubung." },
          { status: 400 },
        );
      }
      if (SLUG_TERLINDUNG.includes(kategori.slug) && SLUG_TERLINDUNG.includes(slugUsulan)) {
        // Nama kategori tetap boleh diedit, slug terlindung tidak diganti.
      } else if (SLUG_TERLINDUNG.includes(kategori.slug)) {
        return NextResponse.json(
          { error: "Slug kategori tetap tidak dapat diganti." },
          { status: 403 },
        );
      }
      const bentrok = await prisma.kategori.findFirst({
        where: { slug: slugUsulan, id: { not: id } },
      });
      if (bentrok) {
        return NextResponse.json({ error: "Slug kategori sudah dipakai." }, { status: 409 });
      }
      data.slug = slugUsulan;
    }

    const deskripsi = teks(body.deskripsi);
    if (deskripsi !== null) data.deskripsi = deskripsi || null;

    if (body.isTetap !== undefined) {
      const isTetap = body.isTetap === true;
      if (SLUG_TERLINDUNG.includes(kategori.slug) && !isTetap) {
        return NextResponse.json(
          { error: "Kategori tetap (Marhaenisme) tidak dapat dinonaktifkan." },
          { status: 403 },
        );
      }
      if (isTetap && user.roleNama !== "Super Admin") {
        return NextResponse.json(
          { error: "Hanya Super Admin yang dapat menandai kategori tetap." },
          { status: 403 },
        );
      }
      data.isTetap = isTetap;
    }

    const hasil = await prisma.$transaction([
      prisma.kategori.update({ where: { id }, data }),
      prisma.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "kategori.update",
          entitasTipe: "Kategori",
          entitasId: id,
          dataSebelum: { nama: kategori.nama, slug: kategori.slug },
          dataSesudah: data as Prisma.InputJsonValue,
        },
      }),
    ]);

    return NextResponse.json({ ok: true, id: hasil[0].id, slug: hasil[0].slug });
  } catch (error) {
    console.error("[admin/kategori] Gagal memperbarui:", error);
    return NextResponse.json({ error: "Gagal menyimpan kategori." }, { status: 500 });
  }
}

/** DELETE /api/admin/kategori/[id] — hapus kategori (jika tidak ada artikel). */
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
      { error: "Hanya Super Admin atau Editor yang dapat mengelola kategori." },
      { status: 403 },
    );
  }

  const { id } = await params;
  const kategori = await prisma.kategori.findUnique({ where: { id } });
  if (!kategori) {
    return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 404 });
  }
  if (kategori.isTetap || SLUG_TERLINDUNG.includes(kategori.slug)) {
    return NextResponse.json(
      { error: "Kategori tetap (Marhaenisme) tidak dapat dihapus." },
      { status: 403 },
    );
  }
  const jumlahArtikel = await prisma.artikel.count({ where: { kategoriId: id } });
  if (jumlahArtikel > 0) {
    return NextResponse.json(
      { error: "Kategori masih dipakai oleh artikel. Pindahkan artikel dulu." },
      { status: 400 },
    );
  }

  await prisma.$transaction([
    prisma.kategori.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: "kategori.delete",
        entitasTipe: "Kategori",
        entitasId: id,
        dataSebelum: { nama: kategori.nama, slug: kategori.slug },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}
