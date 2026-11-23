import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { slugArtikelUnik } from "@/lib/slug";
import { mdKeHtml } from "@/lib/markdown";
import type { VisibilitasPenulis } from "@prisma/client";

const PILIHAN_VISIBILITAS: VisibilitasPenulis[] = ["ASLI", "SAMARAN", "REDAKSI"];

/** Konversi markdown aman: parser tak boleh menggagalkan simpan draf. */
function mdKeHtmlAman(teks: string): string {
  try {
    return mdKeHtml(teks);
  } catch (error) {
    console.error("[artikel] mdKeHtml gagal, simpan mentah:", error);
    return teks;
  }
}

/** Membuat artikel baru: DRAFT, atau langsung DIAJUKAN ke redaksi. */
export async function POST(request: Request) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.permissions.includes("artikel.buat")) {
    return NextResponse.json({ error: "Tidak punya izin menulis artikel." }, { status: 403 });
  }

  try {
    const body = (await request.json()) as {
      judul?: string;
      ringkasan?: string;
      konten?: string;
      kategoriId?: string;
      tagIds?: string[];
      visibilitasPenulis?: VisibilitasPenulis;
      namaTampilanKustom?: string | null;
      ajukan?: boolean;
    };

    const judul = body.judul?.trim();
    const konten = body.konten?.trim();
    const kategoriId = typeof body.kategoriId === "string" ? body.kategoriId.trim() : "";
    const visibilitas: VisibilitasPenulis | undefined = PILIHAN_VISIBILITAS.includes(
      body.visibilitasPenulis as VisibilitasPenulis,
    )
      ? (body.visibilitasPenulis as VisibilitasPenulis)
      : "ASLI";

    if (!judul || judul.length < 8) {
      return NextResponse.json({ error: "Judul minimal 8 karakter." }, { status: 400 });
    }
    if (!konten || konten.length < 40) {
      return NextResponse.json({ error: "Isi artikel minimal 40 karakter." }, { status: 400 });
    }
    if (visibilitas === "SAMARAN" && !body.namaTampilanKustom?.trim()) {
      return NextResponse.json(
        { error: "Nama samaran wajib diisi saat memilih Visibilitas Penulis Samaran." },
        { status: 400 },
      );
    }
    // Validasi kategori SEBELUM query Prisma: id kosong/tak valid langsung 400
    // (bukan PrismaClientValidationError via findUnique id undefined).
    if (!kategoriId) {
      return NextResponse.json({ error: "Kategori wajib dipilih." }, { status: 400 });
    }
    const kategoriAda = await prisma.kategori.findUnique({ where: { id: kategoriId } });
    if (!kategoriAda) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
    }

    const bermintaSubmit = Boolean(body.ajukan);
    if (bermintaSubmit && !user.permissions.includes("artikel.submit")) {
      return NextResponse.json({ error: "Tidak punya izin mengajukan ke redaksi." }, { status: 403 });
    }

    const tagIds = Array.isArray(body.tagIds)
      ? [...new Set(body.tagIds.filter((t) => typeof t === "string"))].slice(0, 5)
      : [];

    const slug = await slugArtikelUnik(judul);
    const namaSamaran = visibilitas === "SAMARAN" ? body.namaTampilanKustom!.trim() : null;
    const kontenHtml = mdKeHtmlAman(konten);

    const artikel = await prisma.artikel.create({
      data: {
        judul,
        slug,
        ringkasan: body.ringkasan?.trim() || null,
        konten: kontenHtml,
        kategoriId,
        penulisId: user.id,
        visibilitasPenulis: visibilitas,
        namaTampilanKustom: namaSamaran,
        // Prinsip anonimitas (blueprint 6.2 & 8.4): SAMARAN & REDAKSI
        // DILARANG masuk gamifikasi.
        dikecualikanDariLeaderboard: visibilitas !== "ASLI",
        status: bermintaSubmit ? "DIAJUKAN" : "DRAFT",
        tanggalDiajukan: bermintaSubmit ? new Date() : null,
        tags: {
          create: tagIds.map((tagId) => ({ tagId })),
        },
      },
    });

    return NextResponse.json({ ok: true, id: artikel.id, slug: artikel.slug, status: artikel.status });
  } catch (error) {
    console.error("[artikel] Gagal membuat:", error);
    return NextResponse.json({ error: "Gagal menyimpan artikel." }, { status: 500 });
  }
}
