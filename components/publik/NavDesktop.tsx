"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { jalurAktif } from "@/lib/nav";

export { jalurAktif };

type NavItem = { label: string; href: string };
type KatItem = { label: string; slug: string };

/** Navigasi utama desktop (lg+) — garis bawah merah mengikuti rute aktif. */
export function NavDesktop({
  navUtama,
  kategoriBerita,
}: {
  navUtama: NavItem[];
  kategoriBerita: KatItem[];
}) {
  const pathname = usePathname();

  return (
    <nav aria-label="Navigasi utama" className="hidden w-full items-center justify-center gap-1 lg:flex">
      {navUtama.map((item) => (
        <div key={item.href} className="relative group">
          <Link
            href={item.href}
            aria-current={jalurAktif(pathname, item.href) ? "page" : undefined}
            className={cn(
              "flex items-center gap-1 border-b-2 px-3 py-3 font-sans text-[13px] uppercase tracking-[0.08em] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600",
              jalurAktif(pathname, item.href)
                ? "border-red-600 font-bold text-red-600"
                : "border-transparent font-medium text-hitam-900 hover:border-red-600 hover:text-red-600",
            )}
          >
            {item.label}
            {item.href === "/berita" && (
              <span aria-hidden className="text-[10px]">
                ▾
              </span>
            )}
          </Link>
          {item.href === "/berita" && (
            <div className="invisible absolute left-0 top-full z-50 w-56 border border-hitam-200 bg-kertas-50 p-2 opacity-0 shadow-lg transition-all group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
              {kategoriBerita.map((k) => (
                <Link
                  key={k.slug}
                  href={`/berita/${k.slug}`}
                  aria-current={
                    jalurAktif(pathname, `/berita/${k.slug}`) ? "page" : undefined
                  }
                  className={cn(
                    "block border-b-2 px-3 py-2.5 font-sans text-sm transition-colors focus-visible:outline-2 focus-visible:outline-red-600",
                    jalurAktif(pathname, `/berita/${k.slug}`)
                      ? "border-red-600 font-bold text-red-600"
                      : "border-transparent font-medium text-hitam-900 hover:border-red-600 hover:text-red-600",
                  )}
                >
                  {k.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      ))}
      <Link
        href="/cari"
        aria-label="Cari berita dan kader"
        aria-current={jalurAktif(pathname, "/cari") ? "page" : undefined}
        className={cn(
          "my-1.5 ml-2 flex items-center gap-2 rounded-full border-2 px-4 py-1.5 font-sans text-[13px] transition-all focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-red-600",
          jalurAktif(pathname, "/cari")
            ? "border-gmnimerah-500 bg-gmnimerah-50 font-bold text-gmnimerah-600"
            : "border-hitam-200 bg-white font-medium text-hitam-500 hover:border-hitam-900 hover:text-hitam-900",
        )}
      >
        {/* Ikon kaca pembesar inline (tanpa dependensi ikon). */}
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" aria-hidden>
          <circle cx="9" cy="9" r="6" />
          <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" />
        </svg>
        <span>Cari di info Marhaen…</span>
      </Link>
    </nav>
  );
}
