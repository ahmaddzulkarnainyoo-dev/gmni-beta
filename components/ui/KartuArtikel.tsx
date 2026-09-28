import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { KickerLabel } from "./KickerLabel";
import { LogoGMNI } from "@/components/brand/LogoGMNI";

/**
 * Kartu berita — blok penyusun halaman depan & kategori.
 * Judul memakai serif tegas (media cetak), gambar memakai next/image.
 */
export function KartuArtikel({
  judul,
  ringkasan,
  kategori,
  tanggal,
  penulis,
  gambar,
  slug,
  varian = "standar",
  lencana,
  className,
}: {
  judul: string;
  ringkasan?: string;
  kategori?: { nama: string; slug: string } | null;
  tanggal?: string;
  penulis?: string | null;
  gambar?: string | null;
  slug?: string;
  varian?: "besar" | "standar" | "kompak";
  /** Teks kecil di kaki kartu (mis. "👏 12 tepuk") — opsional. */
  lencana?: string;
  className?: string;
}) {
  const href = slug ? `/artikel/${slug}` : "#";
  const isi = (
    <>
      {varian !== "kompak" && (
        <div className="relative aspect-[16/10] overflow-hidden bg-hitam-100">
          {gambar ? (
            <Image
              alt={judul}
              src={gambar}
              fill
              sizes="(min-width: 1024px) 33vw, 100vw"
              className="object-cover"
            />
          ) : (
            <div className="absolute inset-0 grid place-items-center bg-hitam-900">
              <LogoGMNI warne="putih" className="h-12 w-12 opacity-60" />
            </div>
          )}
        </div>
      )}
      <div className="flex flex-col gap-1.5 p-4">
        <div className="flex items-center justify-between gap-2">
          {kategori ? (
            <KickerLabel warne="merah">{kategori.nama}</KickerLabel>
          ) : (
            <span aria-hidden />
          )}
          {tanggal && (
            <time className="font-mono text-[11px] uppercase tracking-wide text-hitam-400">
              {tanggal}
            </time>
          )}
        </div>
        <h3
          className={cn(
            "font-serif font-bold leading-snug text-hitam-900 group-hover:text-gmnimerah-600",
            varian === "besar" ? "text-2xl md:text-3xl" : "text-lg",
          )}
        >
          {judul}
        </h3>
        {ringkasan && varian !== "kompak" && (
          <p className="line-clamp-2 text-sm leading-relaxed text-hitam-500">
            {ringkasan}
          </p>
        )}
        {(penulis || lencana) && (
          <p className="mt-auto flex flex-wrap items-center gap-x-3 gap-y-0.5 font-mono text-[11px] uppercase tracking-wider text-hitam-400">
            {penulis && <span>{penulis}</span>}
            {lencana && <span className="font-bold text-gmnimerah-600">{lencana}</span>}
          </p>
        )}
      </div>
    </>
  );

  if (slug) {
    return (
      <article
        className={cn(
          "group flex flex-col overflow-hidden border border-hitam-100 bg-white transition-shadow hover:shadow-[4px_4px_0_0_var(--color-gmnimerah-500)]",
          className,
        )}
      >
        <Link href={href} className="flex flex-1 flex-col">
          {isi}
        </Link>
      </article>
    );
  }

  return (
    <article
      className={cn(
        "flex flex-col overflow-hidden border border-hitam-100 bg-white",
        className,
      )}
    >
      {isi}
    </article>
  );
}