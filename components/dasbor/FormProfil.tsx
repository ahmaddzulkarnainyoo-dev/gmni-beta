"use client";

import { useState } from "react";
import { useSession } from "next-auth/react";
import { useToast } from "@/components/ui/ToastProvider";

type NilaiProfil = {
  namaLengkap: string;
  bio: string | null;
  daerahAsal: string | null;
  cabangDpc: string | null;
  komisariat: string | null;
};

export function FormProfil({ awal }: { awal: NilaiProfil }) {
  const { update } = useSession();
  const { tampilkan } = useToast();
  const [nilai, setNilai] = useState({
    namaLengkap: awal.namaLengkap,
    bio: awal.bio ?? "",
    daerahAsal: awal.daerahAsal ?? "",
    cabangDpc: awal.cabangDpc ?? "",
    komisariat: awal.komisariat ?? "",
  });
  const [memuat, setMemuat] = useState(false);

  function ubah(kunci: keyof typeof nilai, isi: string) {
    setNilai((lama) => ({ ...lama, [kunci]: isi }));
  }

  async function simpan(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (nilai.namaLengkap.trim().length < 3) {
      tampilkan("Nama lengkap minimal 3 karakter.", "error");
      return;
    }
    setMemuat(true);
    try {
      const res = await fetch("/api/me/pengaturan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...nilai, bio: nilai.bio.trim() || null, daerahAsal: nilai.daerahAsal.trim() || null, cabangDpc: nilai.cabangDpc.trim() || null, komisariat: nilai.komisariat.trim() || null }),
      });
      const data = (await res.json().catch(() => null)) as { ok?: boolean; error?: string; pengguna?: NilaiProfil } | null;
      if (!res.ok || !data?.ok) {
        tampilkan(data?.error ?? "Profil gagal disimpan.", "error");
        return;
      }
      if (data.pengguna) setNilai({ namaLengkap: data.pengguna.namaLengkap, bio: data.pengguna.bio ?? "", daerahAsal: data.pengguna.daerahAsal ?? "", cabangDpc: data.pengguna.cabangDpc ?? "", komisariat: data.pengguna.komisariat ?? "" });
      await update({ name: data.pengguna?.namaLengkap ?? nilai.namaLengkap.trim() });
      tampilkan("Profil berhasil diperbarui.");
    } catch {
      tampilkan("Tidak dapat menghubungi server.", "error");
    } finally {
      setMemuat(false);
    }
  }

  return (
    <form onSubmit={simpan} className="mt-6 border-2 border-hitam-900 bg-white p-5">
      <p className="font-serif text-lg font-bold text-hitam-900">Identitas Profil</p>
      <p className="mt-1 text-sm text-hitam-500">Data ini tampil di profil publik dan membantu pembaca mengenal latar kader.</p>
      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <label className="sm:col-span-2"><span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">Nama lengkap</span><input required maxLength={100} value={nilai.namaLengkap} onChange={(e) => ubah("namaLengkap", e.target.value)} className="w-full border-2 border-hitam-900 px-3 py-2 text-sm" /></label>
        <label className="sm:col-span-2"><span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">Bio <span className="font-normal normal-case tracking-normal">({nilai.bio.length}/1000)</span></span><textarea maxLength={1000} rows={5} value={nilai.bio} onChange={(e) => ubah("bio", e.target.value)} placeholder="Ceritakan minat, perjuangan, atau fokus tulisanmu." className="w-full resize-y border-2 border-hitam-900 px-3 py-2 text-sm leading-relaxed" /></label>
        <label><span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">Daerah asal</span><input maxLength={100} value={nilai.daerahAsal} onChange={(e) => ubah("daerahAsal", e.target.value)} className="w-full border-2 border-hitam-900 px-3 py-2 text-sm" /></label>
        <label><span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">DPC</span><input maxLength={100} value={nilai.cabangDpc} onChange={(e) => ubah("cabangDpc", e.target.value)} className="w-full border-2 border-hitam-900 px-3 py-2 text-sm" /></label>
        <label className="sm:col-span-2"><span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">Komisariat</span><input maxLength={120} value={nilai.komisariat} onChange={(e) => ubah("komisariat", e.target.value)} className="w-full border-2 border-hitam-900 px-3 py-2 text-sm" /></label>
      </div>
      <button type="submit" disabled={memuat} className="mt-4 bg-gmnimerah-500 px-5 py-2.5 font-mono text-[11px] font-bold uppercase tracking-widest text-white hover:bg-gmnimerah-600 disabled:opacity-50">{memuat ? "Menyimpan…" : "Simpan profil"}</button>
    </form>
  );
}
