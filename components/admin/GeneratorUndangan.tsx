"use client";

import { useState } from "react";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Generator tautan undangan global — satu panel di bagian atas
 * /admin/pengguna. Membuat /daftar?token=… sekali pakai yang tidak terikat
 * ke kader tertentu; calon kader mendaftar langsung AKTIF.
 */
export function GeneratorUndangan() {
  const [tautan, setTautan] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState("");

  async function buat() {
    setMemuat(true);
    setEror("");
    try {
      const res = await fetch("/api/admin/undangan", { method: "POST" });
      const data = (await res.json()) as { error?: string; linkUndangan?: string };
      if (!res.ok || !data.linkUndangan) {
        setEror(data.error ?? "Gagal membuat tautan undangan.");
        return;
      }
      setTautan(data.linkUndangan);
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  async function salin() {
    try {
      await navigator.clipboard.writeText(tautan);
    } catch {
      /* fallback: user menyalin manual dari input */
    }
  }

  return (
    <div className="mt-6 border-2 border-hitam-900 bg-white p-4">
      <p className="font-serif text-lg font-bold text-hitam-900">
        Tautan Undangan Kader
      </p>
      <p className="mt-1 text-sm text-hitam-500">
        Buat tautan sekali pakai untuk calon kader — pendaftar lewat tautan ini
        langsung aktif tanpa antrean verifikasi manual.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          disabled={memuat}
          onClick={buat}
          className="inline-flex min-h-11 items-center justify-center gap-2 bg-gmnimerah-500 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gmnimerah-600 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {memuat && <Spinner className="h-3.5 w-3.5" />}
          {memuat ? "Membuat..." : "Buat Tautan Undangan"}
        </button>
      </div>
      {eror && (
        <p role="alert" className="mt-2 text-sm font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
      {tautan && (
        <div className="mt-3 border-2 border-gmnimerah-500 bg-gmnimerah-50 p-3">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gmnimerah-700">
            Tautan Undangan (sekali pakai)
          </p>
          <div className="mt-1 flex flex-col gap-2 sm:flex-row">
            <input
              readOnly
              value={tautan}
              onFocus={(e) => e.target.select()}
              className="w-full flex-1 border border-hitam-300 bg-white px-2 py-1.5 font-mono text-[12px] text-hitam-900"
            />
            <button
              type="button"
              onClick={salin}
              className="min-h-11 shrink-0 border-2 border-hitam-900 px-4 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
            >
              Salin
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
