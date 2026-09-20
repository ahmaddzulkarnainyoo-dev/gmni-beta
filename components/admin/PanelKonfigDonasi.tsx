"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

/**
 * PanelKonfigDonasi — bendahara mengelola rekening resmi & URL QRIS
 * (menggantikan konstanta hardcoded; tersimpan di tabel KonfigurasiDonasi).
 */
export function PanelKonfigDonasi({
  awal,
}: {
  awal: { bankNama: string; rekeningNomor: string; atasNama: string; qrisUrl: string | null; dariDb: boolean };
}) {
  const router = useRouter();
  const [bankNama, setBankNama] = useState(awal.bankNama);
  const [rekeningNomor, setRekeningNomor] = useState(awal.rekeningNomor);
  const [atasNama, setAtasNama] = useState(awal.atasNama);
  const [qrisUrl, setQrisUrl] = useState(awal.qrisUrl ?? "");
  const [memuat, setMemuat] = useState(false);
  const [unggah, setUnggah] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [eror, setEror] = useState<string | null>(null);

  async function unggahQris(file: File) {
    setUnggah(true);
    setEror(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = (await res.json().catch(() => ({}))) as { url?: string; error?: string };
      if (!res.ok || !data.url) {
        setEror(data.error ?? "Gagal mengunggah QRIS.");
        return;
      }
      setQrisUrl(data.url);
      setPesan("QRIS terunggah — tekan Simpan untuk menerapkan.");
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setUnggah(false);
    }
  }

  async function simpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemuat(true);
    setPesan(null);
    setEror(null);
    try {
      const res = await fetch("/api/admin/konfigurasi-donasi", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bankNama, rekeningNomor, atasNama, qrisUrl: qrisUrl.trim() || null }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEror(data.error ?? `Gagal menyimpan (kode ${res.status}).`);
        return;
      }
      setPesan("Konfigurasi donasi tersimpan — halaman /donasi langsung memakai data baru.");
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <form onSubmit={simpan} className="mt-3 border-2 border-hitam-900 bg-white p-5">
      {!awal.dariDb && (
        <p className="mb-3 border border-hitam-300 bg-kertas-100 px-3 py-2 text-xs text-hitam-600">
          Belum ada konfigurasi tersimpan — nilai di bawah masih konstanta kode.
          Simpan sekali agar halaman /donasi memakai data bendahara.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Nama Bank
          </span>
          <input
            type="text"
            required
            value={bankNama}
            onChange={(e) => setBankNama(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Nomor Rekening
          </span>
          <input
            type="text"
            required
            value={rekeningNomor}
            onChange={(e) => setRekeningNomor(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-mono text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Atas Nama
          </span>
          <input
            type="text"
            required
            value={atasNama}
            onChange={(e) => setAtasNama(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          />
        </label>
        <label className="block md:col-span-2">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            URL QRIS (http(s) atau path /public)
          </span>
          <input
            type="text"
            value={qrisUrl}
            onChange={(e) => setQrisUrl(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-mono text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
            placeholder="/qris-donasi.png atau https://..."
          />
        </label>
        <div className="md:col-span-2">
          <label className="inline-flex cursor-pointer items-center gap-2 border-2 border-hitam-900 bg-kertas-100 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 hover:bg-kertas-200">
            {unggah ? <Spinner /> : "Unggah QRIS Baru"}
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              disabled={unggah}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void unggahQris(f);
                e.target.value = "";
              }}
            />
          </label>
          {qrisUrl && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={qrisUrl}
              alt="Pratinjau QRIS"
              className="mt-3 h-32 w-32 border-2 border-hitam-900 object-contain"
            />
          )}
        </div>
      </div>
      {pesan && (
        <p role="status" className="mt-3 border-2 border-hitam-900 bg-kertas-200 px-3 py-2 text-sm font-semibold text-hitam-800">
          {pesan}
        </p>
      )}
      {eror && (
        <p role="alert" className="mt-3 border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
      <button
        type="submit"
        disabled={memuat}
        className="mt-4 inline-flex items-center gap-2 bg-gmnimerah-500 px-6 py-2.5 font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
      >
        {memuat && <Spinner />} Simpan Konfigurasi
      </button>
    </form>
  );
}