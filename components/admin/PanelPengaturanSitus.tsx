"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

export type NilaiPengaturan = {
  namaSitus: string;
  tagline: string | null;
  emailKontak: string | null;
  waKontak: string | null;
  maintenanceMode: boolean;
  maintenancePesan: string | null;
  dariDb: boolean;
};

/** PanelPengaturanSitus — konfigurasi umum situs (tabel PengaturanSitus, id "utama"). */
export function PanelPengaturanSitus({ awal }: { awal: NilaiPengaturan }) {
  const router = useRouter();
  const [namaSitus, setNamaSitus] = useState(awal.namaSitus);
  const [tagline, setTagline] = useState(awal.tagline ?? "");
  const [emailKontak, setEmailKontak] = useState(awal.emailKontak ?? "");
  const [waKontak, setWaKontak] = useState(awal.waKontak ?? "");
  const [maintenanceMode, setMaintenanceMode] = useState(awal.maintenanceMode);
  const [maintenancePesan, setMaintenancePesan] = useState(awal.maintenancePesan ?? "");
  const [memuat, setMemuat] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [eror, setEror] = useState<string | null>(null);

  async function simpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemuat(true);
    setPesan(null);
    setEror(null);
    try {
      const res = await fetch("/api/admin/pengaturan-situs", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaSitus,
          tagline: tagline.trim() || null,
          emailKontak: emailKontak.trim() || null,
          waKontak: waKontak.trim() || null,
          maintenanceMode,
          maintenancePesan: maintenancePesan.trim() || null,
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEror(data.error ?? `Gagal menyimpan (kode ${res.status}).`);
        return;
      }
      setPesan("Pengaturan situs tersimpan.");
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
          Belum ada konfigurasi tersimpan — simpan sekali untuk mengisi tabel
          PengaturanSitus.
        </p>
      )}
      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Nama Situs *
          </span>
          <input
            type="text"
            required
            value={namaSitus}
            onChange={(e) => setNamaSitus(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Tagline (opsional)
          </span>
          <input
            type="text"
            value={tagline}
            onChange={(e) => setTagline(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
            placeholder="Suara rakyat kebencanaan"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Email Kontak (opsional)
          </span>
          <input
            type="email"
            value={emailKontak}
            onChange={(e) => setEmailKontak(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
            placeholder="redaksi@infomarhaen.id"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            WhatsApp Kontak (opsional, angka)
          </span>
          <input
            type="text"
            value={waKontak}
            onChange={(e) => setWaKontak(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-mono text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
            placeholder="+6281234567890"
          />
        </label>
      </div>
      <div className="mt-4 border-t border-hitam-100 pt-4">
        <label className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={maintenanceMode}
            onChange={(e) => setMaintenanceMode(e.target.checked)}
            className="mt-0.5 h-4 w-4 accent-gmnimerah-500"
          />
          <span>
            <span className="block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Mode Perbaikan (maintenance)
            </span>
            <span className="block text-xs text-hitam-500">
              Aktifkan hanya saat kerusakan parah — pengunjung publik melihat
              halaman pemberitahuan.
            </span>
          </span>
        </label>
        {maintenanceMode && (
          <label className="mt-3 block">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Pesan Halaman Perbaikan
            </span>
            <textarea
              rows={2}
              value={maintenancePesan}
              onChange={(e) => setMaintenancePesan(e.target.value)}
              className="w-full resize-y border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
              placeholder="Situs sedang diperbaiki — kembali segera, merdeka!"
            />
          </label>
        )}
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
        {memuat && <Spinner />} Simpan Pengaturan
      </button>
    </form>
  );
}