"use client";

import { useState } from "react";

/** FormHakJawab — pengajuan hak jawab pembaca (tanpa login). */
export function FormHakJawab() {
  const [nama, setNama] = useState("");
  const [email, setEmail] = useState("");
  const [judul, setJudul] = useState("");
  const [url, setUrl] = useState("");
  const [isi, setIsi] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemuat(true);
    setEror(null);
    try {
      const res = await fetch("/api/hak-jawab", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          namaPengaju: nama.trim(),
          emailPengaju: email.trim(),
          judulPemberitaan: judul.trim(),
          urlPemberitaan: url.trim() || null,
          isi: isi.trim(),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEror(data.error ?? `Gagal mengirim pengajuan (kode ${res.status}).`);
        return;
      }
      setSukses(true);
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  if (sukses) {
    return (
      <div className="border-2 border-hitam-900 bg-kertas-100 p-6 text-center">
        <p className="font-serif text-xl font-bold text-hitam-900">Pengajuan diterima.</p>
        <p className="mt-2 text-sm text-hitam-600">
          Redaksi akan meninjau pengajuan Anda dan menjawab paling lambat 2×24 jam
          sejak pengajuan sah (identitas &amp; syarat terpenuhi).
        </p>
        <button
          type="button"
          onClick={() => {
            setSukses(false);
            setNama("");
            setEmail("");
            setJudul("");
            setUrl("");
            setIsi("");
          }}
          className="mt-4 border-2 border-hitam-900 bg-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
        >
          Ajukan Baru
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={kirim} className="border-2 border-hitam-900 bg-white p-5 md:p-6">
      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-500">
        Formulir Pengajuan Hak Jawab
      </p>
      <div className="mt-3 grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="label-bidang">Nama Lengkap *</span>
          <input
            type="text"
            required
            minLength={2}
            maxLength={80}
            value={nama}
            onChange={(e) => setNama(e.target.value)}
            className="input-bidang"
            placeholder="Nama dan identitas Anda"
          />
        </label>
        <label className="block">
          <span className="label-bidang">Email / Kontak (opsional)</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="input-bidang"
            placeholder="Untuk balasan langsung"
          />
        </label>
      </div>
      <label className="mt-4 block">
        <span className="label-bidang">Judul Pemberitaan yang Dipersoalkan *</span>
        <input
          type="text"
          required
          minLength={5}
          maxLength={200}
          value={judul}
          onChange={(e) => setJudul(e.target.value)}
          className="input-bidang"
          placeholder="Judul artikel/berita info Marhaen"
        />
      </label>
      <label className="mt-4 block">
        <span className="label-bidang">Tautan Pemberitaan (opsional)</span>
        <input
          type="url"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          className="input-bidang"
          placeholder="https://infomarhaen.id/artikel/..."
        />
      </label>
      <label className="mt-4 block">
        <span className="label-bidang">Uraian Hak Jawab *</span>
        <textarea
          rows={6}
          required
          minLength={20}
          maxLength={5000}
          value={isi}
          onChange={(e) => setIsi(e.target.value)}
          className="input-bidang resize-y"
          placeholder="Uraikan bagian yang dianggap merugikan, disertai dasar/data pendukung..."
        />
        <span className="mt-1 block font-mono text-[11px] text-hitam-400">
          20–5000 karakter. Hak jawab yang sah dimuat penuh tanpa diedit redaksi.
        </span>
      </label>
      {eror && <p className="mt-3 text-sm font-semibold text-gmnimerah-600">{eror}</p>}
      <button
        type="submit"
        disabled={memuat}
        className="mt-5 w-full bg-gmnimerah-500 px-6 py-3 font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
      >
        {memuat ? "Mengirim..." : "Ajukan Hak Jawab"}
      </button>
    </form>
  );
}