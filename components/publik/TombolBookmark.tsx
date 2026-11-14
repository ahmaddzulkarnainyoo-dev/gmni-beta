"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useToast } from "@/components/ui/ToastProvider";

export function TombolBookmark({ artikelId, login }: { artikelId: string; login: boolean }) {
  const router = useRouter();
  const { tampilkan } = useToast();
  const [tersimpan, setTersimpan] = useState(false);
  const [memuat, setMemuat] = useState(true);
  useEffect(() => { if (!login) { setMemuat(false); return; } fetch(`/api/artikel/${artikelId}/bookmark`).then((res) => res.json()).then((data: { tersimpan?: boolean }) => setTersimpan(Boolean(data.tersimpan))).catch(() => undefined).finally(() => setMemuat(false)); }, [artikelId, login]);
  async function toggle() {
    if (!login) { tampilkan("Masuk untuk menyimpan artikel.", "error"); router.push("/login"); return; }
    setMemuat(true);
    try {
      const res = await fetch(`/api/artikel/${artikelId}/bookmark`, { method: tersimpan ? "DELETE" : "POST" });
      const data = (await res.json()) as { tersimpan?: boolean; error?: string };
      if (!res.ok) throw new Error(data.error ?? "Bookmark gagal diperbarui.");
      setTersimpan(Boolean(data.tersimpan));
      tampilkan(data.tersimpan ? "Artikel disimpan." : "Artikel dihapus dari simpanan.");
    } catch (error) { tampilkan(error instanceof Error ? error.message : "Bookmark gagal diperbarui.", "error"); } finally { setMemuat(false); }
  }
  return <button type="button" onClick={toggle} disabled={memuat} aria-pressed={tersimpan} className="border border-hitam-900 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wide text-hitam-700 hover:border-gmnimerah-500 hover:text-gmnimerah-600 disabled:opacity-50">{tersimpan ? "★ Tersimpan" : "☆ Simpan"}</button>;
}
