"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { jalurAktif } from "@/lib/nav";
import { TombolKeluar } from "@/components/ui/TombolKeluar";

type ItemMenu = { label: string; href: string; lencana?: number };

/**
 * Navigasi dasbor kader seluler: hamburger di header membuka drawer
 * off-canvas dari kiri + backdrop gelap (pola identik `AdminDrawer`).
 * Sidebar desktop permanen tersembunyi di `md:` ke atas.
 */
export function DasborDrawer({
  menu,
  namaKader,
}: {
  menu: ItemMenu[];
  namaKader: string;
}) {
  const [buka, setBuka] = useState(false);
  const pathname = usePathname();

  const halamanAktif =
    menu.find((m) => jalurAktif(pathname, m.href))?.label ?? "Ringkasan";

  useEffect(() => {
    if (!buka) return;
    const tutupSaatEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setBuka(false);
    };
    document.addEventListener("keydown", tutupSaatEscape);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", tutupSaatEscape);
      document.body.style.overflow = "";
    };
  }, [buka]);

  return (
    <div className="contents md:hidden">
      <button
        type="button"
        aria-label={buka ? "Tutup menu dasbor" : "Buka menu dasbor"}
        aria-expanded={buka}
        onClick={() => setBuka((v) => !v)}
        className="flex min-h-11 min-w-11 items-center justify-center border border-white/30 text-white transition-colors hover:border-gmnimerah-400 hover:text-gmnimerah-400"
      >
        <svg
          aria-hidden
          viewBox="0 0 20 20"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          className="h-5 w-5"
        >
          <path strokeLinecap="round" d="M3 5h14M3 10h14M3 15h14" />
        </svg>
      </button>
      <span className="truncate font-mono text-[11px] uppercase tracking-widest text-kertas-300">
        Dasbor / <span className="text-white">{halamanAktif}</span>
      </span>

      {/* Backdrop gelap — klik menutup drawer */}
      <div
        aria-hidden={!buka}
        onClick={() => setBuka(false)}
        className={cn(
          "fixed inset-0 z-40 bg-hitam-900/60 transition-opacity duration-300",
          buka ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer off-canvas dari kiri */}
      <aside
        aria-label="Menu dasbor seluler"
        aria-hidden={!buka}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85vw] flex-col bg-white shadow-2xl transition-transform duration-300 ease-out",
          buka ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex min-h-14 items-center justify-between gap-2 border-b-2 border-hitam-900 bg-hitam-900 px-4 text-white">
          <p className="font-serif text-base font-bold">
            info <span className="italic text-gmnimerah-400">Marhaen</span>
          </p>
          <button
            type="button"
            aria-label="Tutup menu dasbor"
            onClick={() => setBuka(false)}
            className="flex min-h-10 min-w-10 items-center justify-center border border-white/30 font-mono text-sm transition-colors hover:border-gmnimerah-400 hover:text-gmnimerah-400"
          >
            ✕
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto p-3">
          <p className="mb-1 px-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-500">
            Dasbor Kader
          </p>
          <div className="flex flex-col">
            {menu.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                onClick={() => setBuka(false)}
                aria-current={
                  jalurAktif(pathname, m.href) ? "page" : undefined
                }
                className={cn(
                  "flex min-h-11 items-center gap-2 border-l-2 px-3 py-2.5 font-sans text-sm transition-colors",
                  jalurAktif(pathname, m.href)
                    ? "border-gmnimerah-500 bg-gmnimerah-50 font-bold text-gmnimerah-700"
                    : "border-transparent font-medium text-hitam-700 hover:border-gmnimerah-500 hover:bg-kertas-100",
                )}
              >
                <span>{m.label}</span>
                {m.lencana !== undefined && m.lencana > 0 && (
                  <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-gmnimerah-500 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
                    {m.lencana > 99 ? "99+" : m.lencana}
                  </span>
                )}
                {m.lencana === 0 && (
                  <span
                    aria-hidden
                    className="ml-auto inline-block h-1.5 w-1.5 rounded-full bg-gmnimerah-500/40"
                  />
                )}
              </Link>
            ))}
          </div>
        </nav>

        <div className="border-t border-hitam-200 p-3">
          <span className="block px-2 font-mono text-[11px] uppercase tracking-widest text-hitam-400">
            Masuk sebagai {namaKader}
          </span>
          <TombolKeluar variant="tombol-drawer" />
        </div>
      </aside>
    </div>
  );
}
