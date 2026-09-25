"use client";

import { useRef, useState } from "react";

type BarisBadge = {
  id: string;
  jenisBadge: string;
  label: string;
  gambarUrl: string | null;
  deskripsi: string | null;
  aktif: boolean;
};

/**
 * PanelBadge — kelola gambar/label lencana (Trophy Case) dari dashboard
 * admin (Sub-fase 4.3 temuan #1). Unggah gambar via /api/media lalu
 * PATCH katalog; tanpa gambar → render fallback ikon bintang.
 */
export function PanelBadge({ badgeAwal }: { badgeAwal: BarisBadge[] }) {
  const [baris, setBaris] = useState(badgeAwal);
  const [memuat, setMemuat] = useState<string | null>(null);
  const [eror, setEror] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const inputBerkas = useRef<HTMLInputElement>(null);
  const jenisDipilih = useRef<string | null>(null);

  async function simpan(jenisBadge: string, ubah: { gambarUrl?: string | null; label?: string; aktif?: boolean }) {
    setMemuat(jenisBadge);
    setEror(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/katalog-badge", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jenisBadge, ...ubah }),
      });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; entri?: BarisBadge; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.entri) {
        setEror(data?.error ?? "Gagal menyimpan katalog lencana.");
        return;
      }
      setBaris((lama) => lama.map((b) => (b.jenisBadge === jenisBadge ? { ...b, ...data.entri! } : b)));
      setInfo("Katalog lencana diperbarui.");
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(null);
    }
  }

  async function unggahGambar(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    const jenis = jenisDipilih.current;
    if (!file || !jenis) return;
    setMemuat(jenis);
    setEror(null);
    setInfo(null);
    try {
      if (file.size > 2 * 1024 * 1024) {
        setEror("Ukuran gambar lencana maksimal 2 MB.");
        return;
      }
      const fd = new FormData();
      fd.append("file", file);
      fd.append("jenis", "artikel");
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = (await res.json().catch(() => null)) as
        | { ok?: boolean; url?: string; error?: string }
        | null;
      if (!res.ok || !data?.ok || !data.url) {
        setEror(data?.error ?? "Unggah gambar gagal.");
        return;
      }
      await simpan(jenis, { gambarUrl: data.url });
    } catch {
      setEror("Tidak dapat menghubungi server untuk unggah.");
    } finally {
      setMemuat(null);
    }
  }

  return (
    <section className="mt-10">
      <div className="border-b-2 border-hitam-900 pb-2">
        <h2 className="font-serif text-xl font-extrabold text-hitam-900">Katalog Lencana</h2>
        <p className="mt-1 text-sm text-hitam-500">
          Gambar &amp; label lencana tampil di Trophy Case kader (dasbor &amp; profil publik).
          Tanpa gambar → ikon bintang bawaan. PNG/JPEG/WebP/GIF, maks 2 MB.
        </p>
      </div>

      {eror && (
        <p role="alert" className="mt-3 border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
      {info && (
        <p role="status" className="mt-3 border-2 border-hitam-900 bg-kertas-200 px-3 py-2 text-sm font-semibold text-hitam-900">
          {info}
        </p>
      )}

      <input
        ref={inputBerkas}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={unggahGambar}
      />

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        {baris.map((b) => (
          <div key={b.id} className="flex items-center gap-4 border-2 border-hitam-900 bg-white p-4">
            <div className="h-14 w-14 shrink-0 overflow-hidden border-2 border-hitam-900 bg-kertas-200">
              {b.gambarUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={b.gambarUrl} alt={b.label} className="h-full w-full object-cover" />
              ) : (
                <span className="grid h-full w-full place-items-center font-serif text-2xl font-extrabold text-gmnimerah-600">
                  &starf;
                </span>
              )}
            </div>
            <div className="min-w-0 flex-1">
              <p className="truncate font-serif text-base font-bold text-hitam-900">{b.label}</p>
              <p className="font-mono text-[10px] uppercase tracking-widest text-hitam-400">{b.jenisBadge}</p>
            </div>
            <div className="flex shrink-0 flex-col gap-1.5">
              <button
                type="button"
                disabled={memuat === b.jenisBadge}
                onClick={() => {
                  jenisDipilih.current = b.jenisBadge;
                  inputBerkas.current?.click();
                }}
                className="border-2 border-hitam-900 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white disabled:opacity-50"
              >
                {memuat === b.jenisBadge ? "Memproses…" : "Ganti Gambar"}
              </button>
              {b.gambarUrl && (
                <button
                  type="button"
                  disabled={memuat === b.jenisBadge}
                  onClick={() => simpan(b.jenisBadge, { gambarUrl: null })}
                  className="border border-gmnimerah-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-gmnimerah-600 transition-colors hover:bg-gmnimerah-500 hover:text-white disabled:opacity-50"
                >
                  Hapus Gambar
                </button>
              )}
              <button
                type="button"
                disabled={memuat === b.jenisBadge}
                onClick={() => simpan(b.jenisBadge, { aktif: !b.aktif })}
                className={
                  b.aktif
                    ? "border-2 border-hitam-900 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 disabled:opacity-50"
                    : "border-2 border-gmnimerah-500 bg-gmnimerah-500 px-2.5 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-white disabled:opacity-50"
                }
              >
                {b.aktif ? "Aktif" : "Nonaktif"}
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}