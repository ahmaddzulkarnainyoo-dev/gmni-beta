"use client";

import { useRef, useState } from "react";
import { bagikanNative, blobMenjadiFile } from "@/lib/share";
import { QuoteCardCanvas, type QuoteCardCanvasHandle, type QuoteCardTheme } from "@/components/publik/QuoteCardCanvas";

type Props = { terbuka: boolean; kutipan: string; judul: string; penulis: string; url: string; onTutup: () => void };

export function QuoteCardDialog({ terbuka, kutipan, judul, penulis, url, onTutup }: Props) {
  const canvasRef = useRef<QuoteCardCanvasHandle>(null);
  const [tema, setTema] = useState<QuoteCardTheme>("kertas");
  const [format, setFormat] = useState<"feed" | "story">("feed");
  const [status, setStatus] = useState("");
  if (!terbuka) return null;

  async function ambilBlob() {
    const blob = await canvasRef.current?.toBlob();
    if (!blob) setStatus("Kartu belum siap. Coba lagi.");
    return blob;
  }
  async function unduh() {
    const blob = await ambilBlob();
    if (!blob) return;
    const href = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = href; link.download = "kartu-kutipan-info-marhaen.png"; link.click();
    URL.revokeObjectURL(href); setStatus("Kartu kutipan diunduh.");
  }
  async function bagikan() {
    const blob = await ambilBlob();
    if (!blob) return;
    const berhasil = await bagikanNative({ title: judul, text: `Kutipan dari ${judul}`, url, file: blobMenjadiFile(blob) });
    setStatus(berhasil ? "Kartu dibagikan." : "Native share tidak tersedia. Gunakan Unduh PNG.");
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-hitam-900/70 p-4" role="presentation" onMouseDown={onTutup}>
      <section role="dialog" aria-modal="true" aria-labelledby="judul-kartu-kutipan" className="max-h-[95vh] w-full max-w-lg overflow-y-auto border-2 border-hitam-900 bg-kertas-100 p-4 shadow-[8px_8px_0_#141414]" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between gap-4">
          <div><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-gmnimerah-600">Share by image</p><h2 id="judul-kartu-kutipan" className="mt-1 font-serif text-2xl font-extrabold text-hitam-900">Kartu kutipan</h2></div>
          <button type="button" onClick={onTutup} className="border border-hitam-300 px-2 py-1 font-mono text-xs font-bold" aria-label="Tutup kartu kutipan">✕</button>
        </div>
        <div className="mt-5 flex justify-center bg-kertas-200 p-3"><QuoteCardCanvas ref={canvasRef} kutipan={kutipan} judul={judul} penulis={penulis} tema={tema} format={format} /></div>
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-500">Tema<select value={tema} onChange={(event) => setTema(event.target.value as QuoteCardTheme)} className="mt-1 block w-full border border-hitam-300 bg-white p-2 text-sm normal-case tracking-normal text-hitam-900"><option value="kertas">Kertas</option><option value="merah">Merah GMNI</option><option value="gelap">Gelap</option></select></label>
          <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-500">Format<select value={format} onChange={(event) => setFormat(event.target.value as "feed" | "story")} className="mt-1 block w-full border border-hitam-300 bg-white p-2 text-sm normal-case tracking-normal text-hitam-900"><option value="feed">Feed 4:5</option><option value="story">Story 9:16</option></select></label>
        </div>
        <div className="mt-5 flex flex-wrap gap-2"><button type="button" onClick={bagikan} className="bg-gmnimerah-600 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-white hover:bg-gmnimerah-700">Bagikan gambar</button><button type="button" onClick={unduh} className="border border-hitam-300 px-3 py-2 font-mono text-[11px] font-bold uppercase tracking-wide text-hitam-700 hover:border-gmnimerah-500">Unduh PNG</button></div>
        {status && <p className="mt-3 font-mono text-xs text-hitam-500" aria-live="polite">{status}</p>}
      </section>
    </div>
  );
}
