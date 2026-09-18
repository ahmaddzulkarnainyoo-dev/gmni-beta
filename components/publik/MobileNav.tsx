"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { bolehMasukAdmin, jalurAktif } from "@/lib/nav";
import { TombolKeluar } from "@/components/ui/TombolKeluar";

type NavItem = { label: string; href: string };
type KatItem = { label: string; slug: string };

/**
 * Navigasi mobile (hamburger/drawer) — cegah menu melebar di HP (Fase 3).
 * Penanda halaman aktif memakai garis merah + teks merah tebal (selaras
 * `NavDesktop`), bukan blok latar merah solid.
 */
export function MobileNav({
  navUtama,
  kategoriBerita,
  user,
}: {
  navUtama: NavItem[];
  kategoriBerita: KatItem[];
  user: { masuk: boolean; roleNama?: string | null };
}) {
  const [buka, setBuka] = useState(false);
  const pathname = usePathname();

  const taut = (aktif: boolean, ekstra = "") =>
    cn(
      "block border-b-2 px-3 py-3 font-sans text-sm uppercase tracking-[0.08em] transition-colors",
      aktif
        ? "border-red-600 font-bold text-red-600"
        : "border-transparent font-medium text-hitam-900 hover:border-red-600 hover:text-red-600",
      ekstra,
    );

  return (
    <>
      <button
        type="button"
        aria-label={buka ? "Tutup menu" : "Buka menu"}
        aria-expanded={buka}
        onClick={() => setBuka((v) => !v)}
        className="ml-auto flex items-center gap-2 border-l border-hitam-900/15 px-3 py-4 font-sans text-[11px] font-bold uppercase tracking-[0.12em] text-hitam-900 transition-colors hover:text-red-600 lg:hidden"
      >
        <span>{buka ? "Tutup" : "Menu"}</span>
        <span aria-hidden className="relative flex h-4 w-5 flex-col justify-between">
          <span className={cn("h-0.5 w-full bg-hitam-900 transition-transform", buka && "translate-y-[7px] rotate-45")} />
          <span className={cn("h-0.5 w-full bg-hitam-900 transition-opacity", buka && "opacity-0")} />
          <span className={cn("h-0.5 w-full bg-hitam-900 transition-transform", buka && "-translate-y-[7px] -rotate-45")} />
        </span>
      </button>

      {buka && (
        <nav aria-label="Menu seluler" className="w-full border-t-2 border-hitam-900 bg-kertas-50 lg:hidden">
          <div className="mx-auto max-w-6xl px-4 py-4">
            <ul className="grid gap-0">
              {navUtama.map((item) => (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={() => setBuka(false)}
                    aria-current={
                      jalurAktif(pathname, item.href) ? "page" : undefined
                    }
                    className={taut(jalurAktif(pathname, item.href))}
                  >
                    {item.label}
                  </Link>
                  {item.href === "/berita" && (
                    <ul className="ml-3 mt-1 grid gap-0.5 border-l border-hitam-200 pl-3">
                      {kategoriBerita.map((k) => (
                        <li key={k.slug}>
                          <Link
                            href={`/berita/${k.slug}`}
                            onClick={() => setBuka(false)}
                            aria-current={
                              jalurAktif(pathname, `/berita/${k.slug}`)
                                ? "page"
                                : undefined
                            }
                            className={cn(
                              "block border-b-2 px-2 py-1.5 font-sans text-[13px] transition-colors",
                              jalurAktif(pathname, `/berita/${k.slug}`)
                                ? "border-red-600 font-bold text-red-600"
                                : "border-transparent font-medium text-hitam-600 hover:text-red-600",
                            )}
                          >
                            {k.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              ))}
              <li>
                <Link
                  href="/cari"
                  onClick={() => setBuka(false)}
                  aria-current={
                    jalurAktif(pathname, "/cari") ? "page" : undefined
                  }
                  className={taut(jalurAktif(pathname, "/cari"))}
                >
                  Cari
                </Link>
              </li>
            </ul>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-hitam-900/20 pt-4">
              {user.masuk ? (
                <>
                  {/* Satu pintu adaptif: admin/editor → /admin, kader → /dasbor. */}
                  {bolehMasukAdmin(user.roleNama) ? (
                    <Link href="/admin" onClick={() => setBuka(false)} className="rounded-sm border border-red-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-red-600 transition-colors hover:bg-red-600 hover:text-white">
                      Dasbor Admin
                    </Link>
                  ) : (
                    <Link href="/dasbor" onClick={() => setBuka(false)} className="rounded-sm border border-hitam-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white">
                      Dasbor
                    </Link>
                  )}
                  <TombolKeluar variant="tombol" />
                </>
              ) : (
                <>
                  <Link href="/login" onClick={() => setBuka(false)} className="rounded-sm border border-hitam-900 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white">
                    Masuk
                  </Link>
                  <Link href="/daftar" onClick={() => setBuka(false)} className="rounded-sm bg-red-600 px-3 py-1.5 text-xs font-semibold uppercase tracking-wide text-white transition-colors hover:bg-red-700">
                    Registrasi Kader
                  </Link>
                </>
              )}
            </div>
          </div>
        </nav>
      )}
    </>
  );
}