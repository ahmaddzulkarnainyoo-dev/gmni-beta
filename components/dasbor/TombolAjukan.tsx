"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Tombol mengajukan draf ke redaksi + mengajukan ulang tulisan ditolak/diarsipkan.
 * Mode ditentukan prop `mode`: "AJUKAN" (DRAFT/DIMINTA_REVISI) atau "AJUKAN_ULANG".
 */
export function TombolAjukan({ id, mode = "AJUKAN" }: { id: string; mode?: "AJUKAN" | "AJUKAN_ULANG" }) {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState<string | null>(null);

  const labelMuat = mode === "AJUKAN_ULANG" ? "Mengajukan ulang..." : "Mengajukan...";
  const label = mode === "AJUKAN_ULANG" ? "Ajukan Ulang ke Redaksi" : "Ajukan ke Redaksi";

  async function ajukan() {
    setMemuat(true);
    setEror(null);
    try {
      const res = await fetch(`/api/artikel/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body:
          mode === "AJUKAN_ULANG"
            ? JSON.stringify({ aksiPenulis: "AJUKAN_ULANG" })
            : JSON.stringify({ ajukan: true }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEror(data.error ?? "Gagal mengajukan artikel.");
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
        onClick={ajukan}
        disabled={memuat}
        className="inline-flex items-center gap-1.5 border-2 border-hitam-900 bg-kertas-100 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-gmnimerah-500 hover:text-white disabled:opacity-50"
      >
        {memuat && <Spinner />}
        {memuat ? labelMuat : label}
      </button>
      {eror && <span className="text-xs font-semibold text-gmnimerah-700">{eror}</span>}
    </span>
  );
}