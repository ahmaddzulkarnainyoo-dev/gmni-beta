"use client";

import Link from "next/link";

type ItemTicker = { judul: string; slug: string | null };

const ITEM_MINIMAL = 6;
const DURASI_PER_ITEM_DETIK = 7;
const DURASI_MIN_DETIK = 24;
const DURASI_MAX_DETIK = 90;
const PLACEHOLDER: ItemTicker = {
  judul: "Berita baru segera hadir di info Marhaen.",
  slug: null,
};

/**
 * Ticker berita ala breaking news — marquee CSS kontinu yang bergerak
 * mulus dari kanan ke kiri, berhenti saat hover/fokus, dan hormat pada
 * preferensi reduced-motion. Slot konten selalu terisi penuh: bila
 * artikel terbit kurang dari ambang, daftar digandakan/dilengkapi
 * placeholder rapi (bukan teks mentah).
 */
export function TickerBerita({
  berita,
}: {
  berita: Array<{ judul: string; slug: string }>;
}) {
  const pokok: ItemTicker[] = berita.slice(0, 12).map((b) => ({
    judul: b.judul,
    slug: b.slug,
  }));

  // Pastikan rel cukup panjang agar loop mulus, lalu duplikasi 2x
  // agar pergeseran -50% menyambung tanpa lompatan.
  const dasar: ItemTicker[] = pokok.length === 0 ? [PLACEHOLDER] : [...pokok];
  while (dasar.length < ITEM_MINIMAL) {
    const sisa = pokok.length === 0 ? [PLACEHOLDER] : pokok;
    dasar.push(sisa[(dasar.length - (pokok.length === 0 ? 1 : 0)) % sisa.length]);
  }
  const rel = [...dasar, ...dasar];

  const durasiDetik = Math.min(
    DURASI_MAX_DETIK,
    Math.max(DURASI_MIN_DETIK, dasar.length * DURASI_PER_ITEM_DETIK),
  );

  return (
    <div
      className="marquee-jeda group relative min-w-0 flex-1 overflow-hidden font-sans text-[13px] font-normal normal-case tracking-normal sm:text-sm [mask-image:linear-gradient(to_right,transparent,black_2rem,black_calc(100%-2rem),transparent)]"
    >
      {/* Rel marquee — aria-hidden agar pembaca layar tidak terpapar duplikat. */}
      <div
        aria-hidden
        className="animate-marquee flex w-max items-center gap-0 py-1"
        style={{ ["--marquee-durasi" as string]: `${durasiDetik}s` }}
      >
        {rel.map((b, i) => (
          <span key={`${b.slug ?? "ph"}-${i}`} className="flex shrink-0 items-center">
            {i > 0 && (
              <span aria-hidden className="mx-4 select-none text-[9px] text-gmnimerah-500">
                {"\u25CF"}
              </span>
            )}
            {b.slug ? (
              <Link
                href={`/artikel/${b.slug}`}
                tabIndex={-1}
                className="block max-w-[70vw] truncate text-hitam-800 transition-colors hover:text-red-600 hover:underline hover:underline-offset-4 sm:max-w-[46vw]"
              >
                {b.judul}
              </Link>
            ) : (
              <span className="block truncate text-hitam-500">{b.judul}</span>
            )}
          </span>
        ))}
      </div>

      {/* Daftar asli untuk pembaca layar & saat animasi dimatikan. */}
      <ul className="sr-only">
        {dasar.map((b, i) =>
          b.slug ? (
            <li key={`sr-${b.slug}-${i}`}>
              <Link href={`/artikel/${b.slug}`}>{b.judul}</Link>
            </li>
          ) : (
            <li key={`sr-ph-${i}`}>{b.judul}</li>
          ),
        )}
      </ul>
    </div>
  );
}
