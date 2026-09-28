"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

/** Tombol kader mengarsipkan tulisan sendiri (DRAFT/DIAJUKAN/DIMINTA_REVISI/DITOLAK). */
export function TombolArsipTulisan({ id, judul }: { id: string; judul: string }) {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState<string | null>(null);

  async function arsipkan() {
    if (!window.confirm(`Arsipkan "${judul}"? Tulisan tidak tampil publik dan bisa diajukan ulang.`)) return;
    setMemuat(true);
    setEror(null);
    try {
      const res = await fetch(`/api/artikel/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aksiPenulis: "ARSIPKAN" }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEror(data.error ?? "Gagal mengarsipkan tulisan.");
        return;
      }
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={arsipkan}
        disabled={memuat}
        className="inline-flex items-center gap-1.5 border border-hitam-300 bg-white px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600 transition-colors hover:border-hitam-900 hover:text-hitam-900 disabled:opacity-50"
      >
        {memuat && <Spinner />}
        {memuat ? "Mengarsipkan..." : "Arsipkan"}
      </button>
      {eror && <span className="text-xs font-semibold text-gmnimerah-700">{eror}</span>}
    </span>
  );
}
