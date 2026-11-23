import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { slugify } from "@/lib/slug";

const ROLES_ADMIN = ["Super Admin", "Editor"];
const STATUS_TOKOH = ["AKTIF", "ARSIP"];

function teks(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function angka(v: unknown): number | null {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.trunc(n) : null;
}

/** POST /api/admin/tokoh — tambah tokoh Marhaenis (Super Admin/Editor). */
export async function POST(request: Request) {
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

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const nama = teks(body.nama);
    if (!nama || nama.length < 2) {
      return NextResponse.json({ error: "Nama tokoh minimal 2 karakter." }, { status: 400 });
    }
    const biografi = teks(body.biografi);
    if (!biografi || biografi.length < 10) {
      return NextResponse.json({ error: "Biografi minimal 10 karakter." }, { status: 400 });
    }

    const slugUsulan = teks(body.slug);
    const slug = slugUsulan ?? slugify(nama);
    if (!slug || !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slug)) {
      return NextResponse.json(
        { error: "Slug hanya huruf kecil, angka, dan tanda hubung." },
        { status: 400 },
      );
    }
    const bentrok = await prisma.tokoh.findUnique({ where: { slug } });
    if (bentrok) {
      return NextResponse.json({ error: "Slug tokoh sudah dipakai." }, { status: 409 });
    }

    const status = STATUS_TOKOH.includes(body.status as string)
      ? (body.status as string)
      : "AKTIF";

    const dibuat = await prisma.$transaction(async (tx) => {
      const t = await tx.tokoh.create({
        data: {
          nama,
          slug,
          julukan: teks(body.julukan),
          gambar: teks(body.gambar),
          biografi,
          kutipan: teks(body.kutipan),
          lahir: angka(body.lahir),
          wafat: angka(body.wafat),
          status,
          urutan: angka(body.urutan) ?? 0,
          dibuatOlehId: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "tokoh.create",
          entitasTipe: "Tokoh",
          entitasId: t.id,
          dataSesudah: { nama, slug, status },
        },
      });
      return t;
    });

    return NextResponse.json({ ok: true, id: dibuat.id, slug: dibuat.slug });
  } catch (error) {
    console.error("[admin/tokoh] Gagal membuat:", error);
    return NextResponse.json({ error: "Gagal menyimpan tokoh." }, { status: 500 });
  }
}
