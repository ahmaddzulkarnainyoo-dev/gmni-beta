"use client";

import { forwardRef, useImperativeHandle, useRef } from "react";

export type QuoteCardTheme = "kertas" | "merah" | "gelap";
export type QuoteCardCanvasProps = { kutipan: string; judul: string; penulis: string; tema: QuoteCardTheme; format?: "feed" | "story" };
export type QuoteCardCanvasHandle = { toBlob: () => Promise<Blob | null> };

const WARNA = {
  kertas: { latar: "#faf9f5", teks: "#141414", sekunder: "#4a4a4a", aksen: "#c62828" },
  merah: { latar: "#c62828", teks: "#ffffff", sekunder: "#fad6d5", aksen: "#ffffff" },
  gelap: { latar: "#141414", teks: "#ffffff", sekunder: "#c8c8c8", aksen: "#e53935" },
} as const;

function potongBaris(ctx: CanvasRenderingContext2D, teks: string, lebar: number): string[] {
  const baris: string[] = [];
  for (const paragraf of teks.split(/\n+/)) {
    let sekarang = "";
    for (const kata of paragraf.trim().split(/\s+/)) {
      const calon = sekarang ? `${sekarang} ${kata}` : kata;
      if (sekarang && ctx.measureText(calon).width > lebar) {
        baris.push(sekarang);
        sekarang = kata;
      } else sekarang = calon;
    }
    if (sekarang) baris.push(sekarang);
  }
  return baris.length ? baris : [""];
}

function gambarKartu(canvas: HTMLCanvasElement, props: QuoteCardCanvasProps) {
  const lebar = 1080;
  const tinggi = props.format === "story" ? 1920 : 1350;
  const skala = window.devicePixelRatio || 1;
  canvas.width = lebar * skala;
  canvas.height = tinggi * skala;
  canvas.style.aspectRatio = `${lebar} / ${tinggi}`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;
  ctx.scale(skala, skala);
  const warna = WARNA[props.tema];
  ctx.fillStyle = warna.latar;
  ctx.fillRect(0, 0, lebar, tinggi);
  ctx.fillStyle = warna.aksen;
  ctx.fillRect(72, 72, 150, 12);
  ctx.font = "700 24px Arial, sans-serif";
  ctx.fillText("INFO MARHAEN", 72, 132);
  const ukuran = props.format === "story" ? 58 : 54;
  ctx.font = `700 ${ukuran}px Georgia, "Times New Roman", serif`;
  ctx.fillStyle = warna.teks;
  const kutipan = potongBaris(ctx, `“${props.kutipan}”`, lebar - 144);
  const tinggiBaris = ukuran * 1.32;
  const awalY = Math.max(300, tinggi / 2 - (kutipan.length * tinggiBaris) / 2);
  kutipan.forEach((baris, index) => ctx.fillText(baris, 72, awalY + index * tinggiBaris));
  ctx.fillStyle = warna.aksen;
  ctx.fillRect(72, tinggi - 262, 80, 8);
  ctx.fillStyle = warna.sekunder;
  ctx.font = "700 25px Arial, sans-serif";
  ctx.fillText(`— ${potongBaris(ctx, props.penulis, lebar - 144)[0]}`, 72, tinggi - 205);
  ctx.font = "400 23px Arial, sans-serif";
  ctx.fillText(potongBaris(ctx, props.judul, lebar - 144)[0], 72, tinggi - 150);
  ctx.font = "400 20px Arial, sans-serif";
  ctx.fillText("Baca selengkapnya di infomarhaen.id", 72, tinggi - 86);
}

export const QuoteCardCanvas = forwardRef<QuoteCardCanvasHandle, QuoteCardCanvasProps>(function QuoteCardCanvas(props, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useImperativeHandle(ref, () => ({
    toBlob: () => new Promise((resolve) => canvasRef.current?.toBlob(resolve, "image/png") ?? resolve(null)),
  }));
  return (
    <canvas
      ref={(node) => { canvasRef.current = node; if (node) gambarKartu(node, props); }}
      aria-label="Pratinjau kartu kutipan"
      className="block h-auto w-full border-2 border-hitam-900 shadow-[6px_6px_0_#141414]"
    />
  );
});
