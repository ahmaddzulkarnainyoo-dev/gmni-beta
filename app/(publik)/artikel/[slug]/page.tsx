import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { bylineArtikel, fmtTanggal } from "@/lib/articles";
import { getSessionUser } from "@/lib/session";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { KartuArtikel } from "@/components/ui/KartuArtikel";
import { BagianKomentar } from "@/components/publik/BagianKomentar";
import { SlotIklanSidebar } from "@/components/publik/SlotIklanSidebar";
import { TombolBagikan } from "@/components/publik/TombolBagikan";

export const dynamic = "force-dynamic";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const artikel = await prisma.artikel.findFirst({
    where: { slug, status: "TERBIT" },
    select: { judul: true, ringkasan: true, gambarUtama: true },
  });
  if (!artikel) return { title: "Artikel Tidak Ditemukan" };
  return {
    title: artikel.judul,
    description: artikel.ringkasan ?? undefined,
    openGraph: {
      title: artikel.judul,
      description: artikel.ringkasan ?? undefined,
      type: "article",
      images: [artikel.gambarUtama ?? "/og-default"],
    },
  };
}

export default async function HalamanArtikel({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const artikel = await prisma.artikel.findFirst({
    where: { slug, status: "TERBIT" },
    include: {
      kategori: true,
      penulis: { select: { namaLengkap: true, username: true } },
      tags: { include: { tag: true } },
    },
  });
  if (!artikel) notFound();

  // Hitung tayangan pembaca (tidak menghambat render utama).
  await prisma.artikel
    .update({ where: { id: artikel.id }, data: { jumlahDilihat: { increment: 1 } } })
    .catch(() => undefined);

  const byline = bylineArtikel(artikel);
  const kepala = await headers();
  const host = kepala.get("x-forwarded-host") ?? kepala.get("host") ?? "localhost:3000";
  const protokol = host.startsWith("localhost") || host.startsWith("127.0.0.1") ? "http" : "https";
  const urlArtikel = `${protokol}://${host}/artikel/${artikel.slug}`;

  const terkait = await prisma.artikel.findMany({
    where: { status: "TERBIT", kategoriId: artikel.kategoriId, id: { not: artikel.id } },
    orderBy: [{ disematkan: "desc" }, { tanggalTerbit: "desc" }],
    take: 3,
    select: {
      id: true,
      judul: true,
      slug: true,
      ringkasan: true,
      gambarUtama: true,
      visibilitasPenulis: true,
      namaTampilanKustom: true,
      tanggalTerbit: true,
      kategori: { select: { nama: true, slug: true } },
      penulis: { select: { namaLengkap: true, username: true } },
    },
  });

  const [komentar, sesi] = await Promise.all([
    prisma.komentar.findMany({
      where: { artikelId: artikel.id, status: "TAMPIL" },
      orderBy: { tanggal: "desc" },
      take: 100,
      include: {
        penulis: { select: { id: true, namaLengkap: true, username: true } },
      },
    }),
    getSessionUser(),
  ]);

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_280px]">
        <article className="min-w-0">
          <header>
        <Link
          href={`/berita/${artikel.kategori.slug}`}
          className="inline-block"
        >
          <KickerLabel>{artikel.kategori.nama}</KickerLabel>
        </Link>
        <h1 className="mt-4 font-serif text-3xl font-extrabold leading-[1.15] text-hitam-900 md:text-5xl">
          {artikel.judul}
        </h1>

        <div className="mt-6 flex flex-wrap items-center gap-x-4 gap-y-1 border-y-2 border-hitam-900 py-3">
          {byline.href ? (
            <Link
              href={byline.href}
              className="font-mono text-[12px] font-bold uppercase tracking-widest text-gmnimerah-600 hover:text-gmnimerah-700"
            >
              {byline.nama}
            </Link>
          ) : (
            <span className="font-mono text-[12px] font-bold uppercase tracking-widest text-hitam-700">
              {byline.nama}
            </span>
          )}
          <time
            dateTime={artikel.tanggalTerbit?.toISOString()}
            className="font-mono text-[12px] uppercase tracking-widest text-hitam-400"
          >
            {fmtTanggal(artikel.tanggalTerbit)}
          </time>
          {artikel.visibilitasPenulis === "SAMARAN" && (
            <span className="font-mono text-[11px] uppercase tracking-widest text-gmnimerah-600">
              Nama disamarkan
            </span>
          )}
        </div>
      </header>

      <TombolBagikan judul={artikel.judul} url={urlArtikel} />

      <div
        className="konten-artikel mt-8"
        dangerouslySetInnerHTML={{ __html: artikel.konten }}
      />

      {artikel.tags.length > 0 && (
        <footer className="mt-10 border-t-2 border-hitam-100 pt-4">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-500">
            Tag
          </p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {artikel.tags.map((t) => (
              <Link
                key={t.tagId}
                href={`/tag/${t.tag.slug}`}
                className="border border-hitam-300 bg-kertas-100 px-2 py-1 font-mono text-[11px] uppercase tracking-wide text-hitam-600 transition-colors hover:border-gmnimerah-500 hover:text-gmnimerah-600"
              >
                {t.tag.nama}
              </Link>
            ))}
          </div>
        </footer>
      )}

      <BagianKomentar
        slug={artikel.slug}
        jumlah={artikel.jumlahKomentar}
        komentar={komentar}
        login={Boolean(sesi)}
        namaUser={sesi?.name ?? ""}
      />

      {terkait.length > 0 && (
        <section className="mt-14">
          <KickerLabel>Bacaan Terkait</KickerLabel>
          <div className="mt-4 grid gap-6 md:grid-cols-3">
            {terkait.map((a) => (
              <KartuArtikel
                key={a.id}
                varian="kompak"
                judul={a.judul}
                kategori={{ nama: a.kategori.nama, slug: a.kategori.slug }}
                tanggal={fmtTanggal(a.tanggalTerbit)}
                penulis={bylineArtikel(a).nama}
                slug={a.slug}
              />
            ))}
          </div>
        </section>
      )}
        </article>
        <div className="hidden lg:block">
          <div className="sticky top-4">
            <SlotIklanSidebar />
          </div>
        </div>
      </div>
    </div>
  );
}