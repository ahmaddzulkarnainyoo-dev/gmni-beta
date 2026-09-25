"use client";

import { useState } from "react";

/**
 * TombolIkuti — ikuti / berhenti mengikuti kader lain dari profil publik
 * (Sub-fase 4.3 kolaborasi). POST /api/kader/follow/[username] bersifat
 * toggle; server yang menentukan izin (bukan diri sendiri, target AKTIF).
 */
export function TombolIkuti({
  username,
  awalMengikuti,
  login,
}: {
  username: string;
  awalMengikuti: boolean;
  login: boolean;
}) {
  const [mengikuti, setMengikuti] = useState(awalMengikuti);
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState<string | null>(null);

  if (!login) {
    return (
      <a
        href="/login"
        className="mt-4 inline-block border-2 border-hitam-900 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
      >
        Masuk untuk Mengikuti
      </a>
    );
  }

  async function toggle() {
    if (memuat) return;
    setMemuat(true);
    setEror(null);
    try {
      const res = await fetch(`/api/kader/follow/${encodeURIComponent(username)}`, {
        method: "POST",
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; mengikuti?: boolean; error?: string }
        | null;
      if (!res.ok || !data?.ok) {
        setEror(data?.error ?? "Gagal menyimpan perubahan.");
        return;
      }
      setMengikuti(Boolean(data.mengikuti));
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <div className="mt-4 flex flex-col items-start gap-1">
      <button
        type="button"
        onClick={toggle}
        disabled={memuat}
        aria-pressed={mengikuti}
        className={
          mengikuti
            ? "inline-block border-2 border-hitam-900 bg-hitam-900 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:border-gmnimerah-600 hover:bg-gmnimerah-600 disabled:opacity-50"
            : "inline-block bg-gmnimerah-500 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
        }
      >
        {memuat ? "Memproses…" : mengikuti ? "Mengikuti ✓" : "Ikuti"}
      </button>
      {eror && (
        <p role="alert" className="text-xs font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
    </div>
  );
}