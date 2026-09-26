import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export type SaranCari = {
  tipe: "artikel" | "kategori" | "tag";
  label: string;
  sub: string;
  href: string;
};

const KUERI_MIN = 2;
const KUERI_MAX = 60;
const BATAS_SARAN = 7;

/** Normalisasi ringan: rapatkan spasi, buang kontrol, batasi panjang. */
function bersihkan(mentah: string | null): string {
  return (mentah ?? "")
    .replace(/[^\S ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, KUERI_MAX);
}

/** GET /api/cari/saran?q= — saran autokomplet pencarian publik (tanpa auth). */
export async function GET(request: Request) {
  const q = bersihkan(new URL(request.url).searchParams.get("q"));
  if (q.length < KUERI_MIN) {
    return NextResponse.json({ saran: [] satisfies SaranCari[] });
  }

  try {
    const [artikel, kategori, tag] = await Promise.all([
      prisma.artikel.findMany({
        where: { status: "TERBIT", judul: { contains: q, mode: "insensitive" } },
        orderBy: [{ disematkan: "desc" }, { tanggalTerbit: "desc" }],
        take: 4,
        select: {
          judul: true,
          slug: true,
          kategori: { select: { nama: true } },
        },
      }),
      prisma.kategori.findMany({
        where: { nama: { contains: q, mode: "insensitive" } },
        orderBy: [{ isTetap: "desc" }, { nama: "asc" }],
        take: 2,
        select: { nama: true, slug: true },
      }),
      prisma.tag.findMany({
        where: { nama: { contains: q, mode: "insensitive" } },
        orderBy: { nama: "asc" },
        take: 2,
        select: { nama: true, slug: true },
      }),
    ]);

    const saran: SaranCari[] = [
      ...artikel.map((a) => ({
        tipe: "artikel" as const,
        label: a.judul,
        sub: a.kategori.nama,
        href: `/artikel/${a.slug}`,
      })),
      ...kategori.map((k) => ({
        tipe: "kategori" as const,
        label: k.nama,
        sub: "Kanal berita",
        href: `/berita/${k.slug}`,
      })),
      ...tag.map((t) => ({
        tipe: "tag" as const,
        label: `#${t.nama}`,
        sub: "Arsip tag",
        href: `/tag/${t.slug}`,
      })),
    ].slice(0, BATAS_SARAN);

    return NextResponse.json({ saran });
  } catch (e) {
    console.error("[cari] saran gagal:", e instanceof Error ? e.message : e);
    return NextResponse.json({ saran: [] satisfies SaranCari[] });
  }
}
