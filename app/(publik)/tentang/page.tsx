import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { KartuArtikel } from "@/components/ui/KartuArtikel";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { ambilTerbitTerbaru, bylineArtikel, fmtTanggal } from "@/lib/articles";
import { ambilHalaman, deskripsiDariHalaman } from "@/lib/halaman";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const h = await ambilHalaman("tentang");
  return {
    title: h?.judul ?? "Tentang",
    description: h ? deskripsiDariHalaman(h) : undefined,
  };
}

/**
 * Paragraf pembuka konten diambil UTUH (bukan dipotong) untuk dipakai
 * sebagai kalimat pemikat (standfirst) bergaya media internasional.
 */
function paragrafPembuka(kontenHtml: string): string {
  const cocok = kontenHtml.match(/<p[^>]*>([\s\S]*?)<\/p>/i);
  if (!cocok) return "";
  return cocok[1]
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Halaman Tentang GMNI — konten tetap dari `HalamanStatis` slug "tentang"
 * (dikelola redaksi via /admin/halaman, dengan fallback kode di lib/halaman).
 * Tampilan memakai tipografi editorial (`.konten-editorial`) + widget
 * rekomendasi "Artikel Terbaru" di bagian bawah.
 */
export default async function HalamanTentang() {
  const [h, terbaru] = await Promise.all([
    ambilHalaman("tentang"),
    ambilTerbitTerbaru(3),
  ]);
  if (!h) notFound();

  const standfirst = paragrafPembuka(h.konten);

  return (
    <article className="mx-auto max-w-3xl px-4 py-10 md:py-14">
      <header className="border-b-4 border-hitam-900 pb-6">
        <KickerLabel>Tentang Kami</KickerLabel>
        <h1 className="mt-3 font-serif text-4xl font-extrabold leading-[1.08] tracking-tight text-hitam-900 md:text-5xl">
          {h.judul}
        </h1>
        {standfirst && (
          <p className="mt-5 font-serif text-lg italic leading-relaxed text-hitam-600 md:text-xl">
            {standfirst}
          </p>
        )}
      </header>

      <div
        className="konten-editorial mt-10"
        // Konten dikelola admin/redaksi (blueprint 12); untuk input Markdown
        // editor sudah di-escape oleh lib/markdown sebelum disimpan.
        dangerouslySetInnerHTML={{ __html: h.konten }}
      />

      {terbaru.length > 0 && (
        <section className="mt-16 border-t-2 border-hitam-900 pt-6">
          <KickerLabel>Rekomendasi</KickerLabel>
          <h2 className="mt-1 font-serif text-2xl font-bold text-hitam-900">
            Artikel Terbaru
          </h2>
          <p className="mt-2 text-sm text-hitam-500">
            Tulisan terbit terbaru dari redaksi info Marhaen.
          </p>
          <div className="mt-5 grid gap-6 sm:grid-cols-2 md:grid-cols-3">
            {terbaru.map((a) => (
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
  );
}