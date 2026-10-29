"use client";

import { useEffect, useState } from "react";
import { bagikanNative, platformShareLinks, salinTeks } from "@/lib/share";

type Props = { judul: string; url: string };

export function TombolBagikan({ judul, url }: Props) {
  const [terbuka, setTerbuka] = useState(false);
  const [tersalin, setTersalin] = useState(false);
  const [nativeTersedia, setNativeTersedia] = useState(false);
  useEffect(() => setNativeTersedia(typeof navigator !== "undefined" && typeof navigator.share === "function"), []);

  async function salin() {
    if (!(await salinTeks(url))) return;
    setTersalin(true);
    window.setTimeout(() => setTersalin(false), 2200);
  }
  async function nativeShare() { await bagikanNative({ title: judul, text: `Baca artikel: ${judul}`, url }); }

  return <div className="relative flex flex-wrap items-center gap-2">
    <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-500">Bagikan</span>
    <button type="button" onClick={() => setTerbuka((value) => !value)} aria-expanded={terbuka} className="border border-hitam-300 bg-kertas-100 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-hitam-700 transition-colors hover:border-gmnimerah-500 hover:text-gmnimerah-600">Pilihan share</button>
    {nativeTersedia && <button type="button" onClick={nativeShare} className="bg-gmnimerah-600 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-white hover:bg-gmnimerah-700">Bagikan perangkat</button>}
    {terbuka && <div className="absolute left-0 top-full z-30 mt-2 grid min-w-[230px] gap-1 border-2 border-hitam-900 bg-kertas-100 p-2 shadow-[5px_5px_0_#141414]">
      {platformShareLinks({ title: judul, url }).map((tautan) => <a key={tautan.nama} href={tautan.href} target="_blank" rel="noopener noreferrer" className="px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-hitam-700 hover:bg-gmnimerah-50 hover:text-gmnimerah-700">{tautan.nama}</a>)}
      <button type="button" onClick={salin} className="border-t border-hitam-200 px-3 py-2 text-left font-mono text-[11px] font-bold uppercase tracking-wide text-hitam-700 hover:text-gmnimerah-600">{tersalin ? "Tautan disalin ✓" : "Salin tautan"}</button>
    </div>}
    <span className="sr-only" aria-live="polite">{tersalin ? "Tautan disalin" : ""}</span>
  </div>;
}
