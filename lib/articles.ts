import { prisma } from "@/lib/prisma";
import type { VisibilitasPenulis } from "@prisma/client";

/** Proyeksi konsisten untuk kartu artikel publik (blueprint 7.3). */
export const PILIH_ARTIKEL_PUBLIK = {
  id: true,
  judul: true,
  slug: true,
  ringkasan: true,
  gambarUtama: true,
  visibilitasPenulis: true,
  namaTampilanKustom: true,
  disematkan: true,
  tanggalTerbit: true,
  jumlahDilihat: true,
  kategori: { select: { nama: true, slug: true } },
  penulis: { select: { namaLengkap: true, username: true } },
} as const;

export type ArtikelPublik = {
  id: string;
  judul: string;
  slug: string;
  ringkasan: string | null;
  gambarUtama: string | null;
  visibilitasPenulis: VisibilitasPenulis;
  namaTampilanKustom: string | null;
  disematkan: boolean;
  tanggalTerbit: Date | null;
  jumlahDilihat: number;
  kategori: { nama: string; slug: string };
  penulis: { namaLengkap: string; username: string };
};

/** Byline artikel publik — menjamin anonimitas (blueprint 6.2 & 13.1). */
export function bylineArtikel(
  a: Pick<ArtikelPublik, "visibilitasPenulis" | "namaTampilanKustom" | "penulis">,
): { nama: string; href?: string } {
  if (a.visibilitasPenulis === "SAMARAN") {
    return { nama: a.namaTampilanKustom || "Penulis", href: undefined };
  }
  if (a.visibilitasPenulis === "REDAKSI") {
    return { nama: "Redaksi info Marhaen", href: undefined };
  }
  return {
    nama: a.penulis.namaLengkap,
    href: `/profil/${a.penulis.username}`,
  };
}

/** Artikel terbit terbaru (beranda & daftar). Pinned Marhaenisme di atas. */
export async function ambilTerbitTerbaru(batas = 9) {
  try {
    return await prisma.artikel.findMany({
      where: { status: "TERBIT" },
      orderBy: [{ disematkan: "desc" }, { tanggalTerbit: "desc" }],
      take: batas,
      select: PILIH_ARTIKEL_PUBLIK,
    });
  } catch (e) {
    // Guard publik: DB latency/timeout Supabase → halaman utama tetap
    // render (grid kosong), tidak jatuh ke "Mesin Cetak Macet".
    console.error("[articles] ambilTerbitTerbaru gagal:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function ambilTerbitByKategori(kategoriSlug: string, batas = 24) {
  try {
    return await prisma.artikel.findMany({
      where: { status: "TERBIT", kategori: { slug: kategoriSlug } },
      orderBy: [{ disematkan: "desc" }, { tanggalTerbit: "desc" }],
      take: batas,
      select: PILIH_ARTIKEL_PUBLIK,
    });
  } catch (e) {
    console.error("[articles] ambilTerbitByKategori gagal:", e instanceof Error ? e.message : e);
    return [];
  }
}

export async function ambilTerbitBySlug(slug: string) {
  try {
    return await prisma.artikel.findFirst({
      where: { slug, status: "TERBIT" },
      select: {
        ...PILIH_ARTIKEL_PUBLIK,
        konten: true,
        kategori: { select: { nama: true, slug: true } },
      },
    });
  } catch (e) {
    console.error("[articles] ambilTerbitBySlug gagal:", e instanceof Error ? e.message : e);
    return null;
  }
}

/** Format tanggal edisi (indeks media cetak). */
export function fmtTanggal(tanggal: Date | string | null): string {
  if (!tanggal) return "";
  const d = typeof tanggal === "string" ? new Date(tanggal) : tanggal;
  return d.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}