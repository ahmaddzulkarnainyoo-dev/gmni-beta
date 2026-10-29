"use client";

import { useEffect, useState } from "react";
import { QuoteCardDialog } from "@/components/publik/QuoteCardDialog";

type Props = { judul: string; penulis: string; url: string };
type Posisi = { top: number; left: number } | null;

export function SelectionShareToolbar({ judul, penulis, url }: Props) {
  const [kutipan, setKutipan] = useState("");
  const [posisi, setPosisi] = useState<Posisi>(null);
  const [dialogTerbuka, setDialogTerbuka] = useState(false);
  useEffect(() => {
    function bacaSelection() {
      const selection = window.getSelection();
      const teks = selection?.toString().replace(/\s+/g, " ").trim() ?? "";
      const anchor = selection?.anchorNode;
      const konten = document.querySelector(".konten-artikel");
      if (!selection || !anchor || !konten || !teks || !konten.contains(anchor)) { setPosisi(null); return; }
      const rect = selection.getRangeAt(0).getBoundingClientRect();
      if (!rect.width && !rect.height) return;
      setKutipan(teks.slice(0, 500));
      setPosisi({ top: Math.max(8, rect.top - 52), left: Math.min(Math.max(8, rect.left + rect.width / 2 - 110), window.innerWidth - 228) });
    }
    document.addEventListener("selectionchange", bacaSelection);
    window.addEventListener("scroll", bacaSelection, { passive: true });
    return () => { document.removeEventListener("selectionchange", bacaSelection); window.removeEventListener("scroll", bacaSelection); };
  }, []);
  return <>
    {posisi && <div className="fixed z-40 flex -translate-y-1 items-center gap-1 border-2 border-hitam-900 bg-hitam-900 p-1 shadow-[4px_4px_0_#c62828]" style={{ top: posisi.top, left: posisi.left }} role="toolbar" aria-label="Bagikan teks terpilih">
      <button type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => setDialogTerbuka(true)} className="bg-gmnimerah-600 px-2 py-1.5 font-mono text-[10px] font-bold uppercase tracking-wide text-white hover:bg-gmnimerah-700">Buat kartu</button>
    </div>}
    <QuoteCardDialog terbuka={dialogTerbuka} kutipan={kutipan} judul={judul} penulis={penulis} url={url} onTutup={() => setDialogTerbuka(false)} />
  </>;
}
