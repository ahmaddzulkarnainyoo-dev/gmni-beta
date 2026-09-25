"use client";

import { useState } from "react";

/**
 * TombolBagikan — bagikan artikel ke WhatsApp / X / Facebook / LinkedIn +
 * salin tautan (Sub-fase 4.3 temuan #5). Non-intrusif: baris kecil di bawah
 * byline artikel, gaya konsisten tema pers.
 */
export function TombolBagikan({ judul, url }: { judul: string; url: string }) {
  const [tersalin, setTersalin] = useState(false);

  const teks = `${judul} — ${url}`;
  const tautan: Array<{ nama: string; href: string }> = [
    { nama: "WhatsApp", href: `https://wa.me/?text=${encodeURIComponent(teks)}` },
    {
      nama: "X",
      href: `https://twitter.com/intent/tweet?text=${encodeURIComponent(judul)}&url=${encodeURIComponent(url)}`,
    },
    { nama: "Facebook", href: `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}` },
    { nama: "LinkedIn", href: `https://www.linkedin.com/sharing/share-offsite/?url=${encodeURIComponent(url)}` },
  ];

  async function salin() {
    try {
      await navigator.clipboard.writeText(url);
      setTersalin(true);
      window.setTimeout(() => setTersalin(false), 2000);
    } catch {
      // Clipboard API kadang tidak tersedia (HTTP non-secure) — biarkan senyap.
    }
  }

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2">
      <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-500">
        Bagikan
      </span>
      {tautan.map((t) => (
        <a
          key={t.nama}
          href={t.href}
          target="_blank"
          rel="noopener noreferrer"
          className="border border-hitam-300 bg-kertas-100 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-hitam-600 transition-colors hover:border-gmnimerah-500 hover:text-gmnimerah-600"
        >
          {t.nama}
        </a>
      ))}
      <button
        type="button"
        onClick={salin}
        className="border border-hitam-300 bg-kertas-100 px-2.5 py-1 font-mono text-[11px] font-bold uppercase tracking-wide text-hitam-600 transition-colors hover:border-gmnimerah-500 hover:text-gmnimerah-600"
      >
        {tersalin ? "Tersalin ✓" : "Salin Tautan"}
      </button>
    </div>
  );
}