import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { slugArtikelUnik } from "@/lib/slug";
import { mdKeHtml } from "@/lib/markdown";
import { urlGambarValid } from "@/lib/image-url";
import type { StatusArtikel, VisibilitasPenulis } from "@prisma/client";

const ROLES_ADMIN = ["Super Admin", "Editor"];
const VISIBILITAS: VisibilitasPenulis[] = ["ASLI", "SAMARAN", "REDAKSI"];
const STATUS: StatusArtikel[] = [
  "DRAFT",
  "DIAJUKAN",
  "SEDANG_DITINJAU",
  "DIMINTA_REVISI",
  "DISETUJUI",
  "TERBIT",
  "DITOLAK",
  "DIARSIPKAN",
];

function teks(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

/** POST /api/admin/artikel — membuat artikel oleh Super Admin/Editor. */
export async function POST(request: Request) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Harus masuk terlebih dahulu." },
      { status: 401 },
    );
  }
  if (!user.roleNama || !ROLES_ADMIN.includes(user.roleNama)) {
    return NextResponse.json(
      { error: "Hanya Super Admin atau Editor yang dapat mengelola artikel." },
      { status: 403 },
    );
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const judul = teks(body.judul);
    const konten = teks(body.konten);
    const kategoriId = typeof body.kategoriId === "string" ? body.kategoriId : "";
    const status: StatusArtikel = STATUS.includes(body.status as StatusArtikel)
      ? (body.status as StatusArtikel)
      : "DRAFT";
    const visibilitas: VisibilitasPenulis = VISIBILITAS.includes(
      body.visibilitasPenulis as VisibilitasPenulis,
    )
      ? (body.visibilitasPenulis as VisibilitasPenulis)
      : "ASLI";

    if (!judul || judul.length < 8) {
      return NextResponse.json(
        { error: "Judul minimal 8 karakter." },
        { status: 400 },
      );
    }
    if (!konten || konten.length < 40) {
      return NextResponse.json(
        { error: "Isi artikel minimal 40 karakter." },
        { status: 400 },
      );
    }
    if (visibilitas === "SAMARAN" && !teks(body.namaTampilanKustom)) {
      return NextResponse.json(
        { error: "Nama samaran wajib diisi saat Visibilitas Penulis = Samaran." },
        { status: 400 },
      );
    }

    const kategori = await prisma.kategori.findUnique({ where: { id: kategoriId } });
    if (!kategori) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
    }

    const slugUsulan = teks(body.slug);
    let slug: string;
    if (slugUsulan) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugUsulan)) {
        return NextResponse.json(
          { error: "Slug hanya huruf kecil, angka, dan tanda hubung." },
          { status: 400 },
        );
      }
      const bentrok = await prisma.artikel.findUnique({ where: { slug: slugUsulan } });
      if (bentrok) {
        return NextResponse.json(
          { error: "Slug sudah dipakai artikel lain." },
          { status: 409 },
        );
      }
      slug = slugUsulan;
    } else {
      slug = await slugArtikelUnik(judul);
    }

    const tagIds = Array.isArray(body.tagIds)
      ? [...new Set(body.tagIds.filter((t) => typeof t === "string"))].slice(0, 5)
      : [];

    let penulisId = user.id;
    const penulisUsulan = teks(body.penulisId ?? "");
    if (penulisUsulan) {
      const penulis = await prisma.user.findUnique({ where: { id: penulisUsulan } });
      if (!penulis || penulis.statusAkun !== "AKTIF") {
        return NextResponse.json(
          { error: "Penulis tidak ditemukan atau nonaktif." },
          { status: 400 },
        );
      }
      penulisId = penulis.id;
    }

    const gambarUtama =
      typeof body.gambarUtama === "string" && body.gambarUtama.trim().length > 0
        ? body.gambarUtama.trim().slice(0, 2000)
        : null;
    if (gambarUtama && !urlGambarValid(gambarUtama)) {
      return NextResponse.json({ error: "URL gambar utama tidak valid." }, { status: 400 });
    }
    const disematkan = body.disematkan === true;
    const jadwalMentah =
      typeof body.tanggalJadwal === "string" && body.tanggalJadwal.trim()
        ? body.tanggalJadwal.trim()
        : null;
    const tanggalDijadwalkan =
      jadwalMentah && !Number.isNaN(Date.parse(jadwalMentah))
        ? new Date(jadwalMentah)
        : null;

    const artikel = await prisma.$transaction(async (tx) => {
      const dibuat = await tx.artikel.create({
        data: {
          judul,
          slug,
          ringkasan: teks(body.ringkasan) || null,
          konten: mdKeHtml(konten),
          gambarUtama,
          kategoriId,
          penulisId,
          status,
          visibilitasPenulis: visibilitas,
          namaTampilanKustom:
            visibilitas === "SAMARAN" ? teks(body.namaTampilanKustom) : null,
          dikecualikanDariLeaderboard: visibilitas !== "ASLI",
          disematkan,
          tanggalDijadwalkan,
          ...(status === "TERBIT" ? { tanggalTerbit: new Date() } : {}),
          ...(status === "DIAJUKAN" ? { tanggalDiajukan: new Date() } : {}),
          tags: { create: tagIds.map((tagId) => ({ tagId })) },
        },
      });
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "artikel.create",
          entitasTipe: "Artikel",
          entitasId: dibuat.id,
          dataSesudah: { judul, status },
        },
      });
      return dibuat;
    });

    return NextResponse.json({
      ok: true,
      id: artikel.id,
      slug: artikel.slug,
      status: artikel.status,
    });
  } catch (error) {
    console.error("[admin/artikel] Gagal membuat:", error);
    return NextResponse.json({ error: "Gagal menyimpan artikel." }, { status: 500 });
  }
}
