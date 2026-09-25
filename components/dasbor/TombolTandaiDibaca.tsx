"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * TombolTandaiDibaca — tandai semua notifikasi kader sebagai dibaca
 * (POST /api/notifikasi/baca), lalu segarkan daftar & badge header.
 */
export function TombolTandaiDibaca({ jumlahBelumDibaca }: { jumlahBelumDibaca: number }) {
  const router = useRouter();
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState<string | null>(null);

  if (jumlahBelumDibaca === 0) return null;

  async function tandai() {
    if (memuat) return;
    setMemuat(true);
    setEror(null);
    try {
      const res = await fetch("/api/notifikasi/baca", { method: "POST" });
      if (!res.ok) {
        setEror("Gagal menandai dibaca.");
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
    <div className="mt-3 flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={tandai}
        disabled={memuat}
        className="border-2 border-hitam-900 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white disabled:opacity-50"
      >
        {memuat ? "Memproses…" : `Tandai ${jumlahBelumDibaca} Dibaca`}
      </button>
      {eror && (
        <p role="alert" className="text-xs font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
    </div>
  );
}