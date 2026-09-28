"use client";

import { useEffect } from "react";
import { cn } from "@/lib/utils";

/**
 * Panel drawer kanan berisi pengaturan artikel (Kategori, Tag, Visibilitas,
 * gambar unggulan, status, dsb.) untuk editor gaya Medium: konten jadi fokus
 * utama, sementara semua "tombol mesin" dikumpulkan di drawer ini.
 *
 * Perilaku: tutup via tombol ✕, klik backdrop, atau tombol Escape.
 */
export function PanelPengaturan({
  buka,
  onTutup,
  judul = "Pengaturan Tulisan",
  children,
}: {
  buka: boolean;
  onTutup: () => void;
  judul?: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!buka) return;
    const tanganiEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") onTutup();
    };
    document.addEventListener("keydown", tanganiEscape);
    return () => document.removeEventListener("keydown", tanganiEscape);
  }, [buka, onTutup]);

  return (
    <>
      {/* Backdrop gelap + blur tipis */}
      <div
        aria-hidden={!buka}
        onClick={onTutup}
        className={cn(
          "fixed inset-0 z-40 bg-hitam-900/50 backdrop-blur-[1px] transition-opacity duration-200",
          buka ? "opacity-100" : "pointer-events-none opacity-0",
        )}
      />

      {/* Drawer dari kanan */}
      <aside
        aria-label={judul}
        aria-hidden={!buka}
        className={cn(
          "fixed inset-y-0 right-0 z-50 flex w-80 max-w-[90vw] flex-col border-l-2 border-hitam-900 bg-kertas-50 shadow-2xl transition-transform duration-300 ease-out",
          buka ? "translate-x-0" : "translate-x-full",
        )}
      >
        <div className="flex min-h-12 items-center justify-between gap-2 border-b border-hitam-200 px-4 py-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-700">
            {judul}
          </p>
          <button
            type="button"
            onClick={onTutup}
            aria-label="Tutup pengaturan"
            className="flex min-h-9 min-w-9 items-center justify-center font-mono text-sm text-hitam-500 transition-colors hover:text-hitam-900"
          >
            ✕
          </button>
        </div>
        <div className="flex-1 space-y-6 overflow-y-auto p-4">{children}</div>
      </aside>
    </>
  );
}
