"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

type StatusHasil = "idle" | "sukses" | "eror";

/** Tombol apresiasi tepuk tangan ala Medium (login, +1 bertahap, cap 50). */
export function TombolApresiasi({ artikelId }: { artikelId: string }) {
  const router = useRouter();
  const [total, setTotal] = useState<number | null>(null);
  const [saya, setSaya] = useState(0);
  const [maks] = useState(50);
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState<string | null>(null);
  const [masuk, setMasuk] = useState(true);
  const [hasil, setHasil] = useState<StatusHasil>("idle");

  useEffect(() => {
    let batal = false;
    (async () => {
      try {
        const res = await fetch(`/api/artikel/${artikelId}/apresiasi`, { cache: "no-store" });
        if (!res.ok) return;
        const data = (await res.json()) as { total?: number; saya?: number };
        if (!batal) {
          if (typeof data.total === "number") setTotal(data.total);
          if (typeof data.saya === "number") setSaya(data.saya);
        }
      } catch {
        /* publik: diam */
      }
    })();
    return () => {
      batal = true;
    };
  }, [artikelId]);

  async function tepuk() {
    if (memuat) return;
    setMemuat(true);
    setEror(null);
    setHasil("idle");
    try {
      const res = await fetch(`/api/artikel/${artikelId}/apresiasi`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tambah: 1 }),
      });
      const data = (await res.json()) as { total?: number; saya?: number; error?: string };
      if (res.status === 401) {
        setMasuk(false);
        return;
      }
      if (!res.ok) {
        setEror(data.error ?? "Gagal memberi apresiasi.");
        return;
      }
      if (typeof data.total === "number") setTotal(data.total);
      if (typeof data.saya === "number") setSaya(data.saya);
      setHasil("sukses");
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  if (!masuk) {
    return (
      <button
        type="button"
        onClick={() => router.push("/login")}
        className="inline-flex items-center gap-2 border-2 border-hitam-900 bg-kertas-100 px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
      >
        <span aria-hidden="true">👏</span>
        <span>Masuk untuk bertepuk</span>
        {total !== null && <span className="text-gmnimerah-600">{total}</span>}
      </button>
    );
  }

  const penuh = saya >= maks;

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={tepuk}
        disabled={memuat || penuh}
        aria-live="polite"
        className="inline-flex items-center gap-2 border-2 border-hitam-900 bg-white px-4 py-2 font-mono text-[12px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-gmnimerah-500 hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
      >
        {memuat ? <Spinner /> : <span aria-hidden="true">👏</span>}
        <span>{penuh ? `Penuh ${maks}×` : saya > 0 ? `Tepuk lagi (${saya}/${maks})` : "Beri tepuk tangan"}</span>
        {total !== null && <span className="text-gmnimerah-600">{total}</span>}
      </button>
      {hasil === "sukses" && (
        <span className="text-xs font-semibold text-hitam-500">Terima kasih atas apresiasinya!</span>
      )}
      {eror && <span className="text-xs font-semibold text-gmnimerah-700">{eror}</span>}
    </span>
  );
}
