"use client";

import { useState } from "react";
import Link from "next/link";

const LABEL = "mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600";
const INPUT =
  "w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500";

/**
 * Formulir pendaftaran terbuka kader (tanpa token undangan).
 * Akun dibuat berstatus PENDING — wajib verifikasi Admin Redaksi di
 * /admin/pengguna sebelum bisa login.
 */
export function FormPendaftaranPublik({ tokenTidakSah }: { tokenTidakSah: boolean }) {
  const [namaLengkap, setNamaLengkap] = useState("");
  const [nim, setNim] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [cabangDpc, setCabangDpc] = useState("");
  const [komisariat, setKomisariat] = useState("");
  const [sandi, setSandi] = useState("");
  const [konfirmasi, setKonfirmasi] = useState("");
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState<string | null>(null);
  const [sukses, setSukses] = useState(false);

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (sandi !== konfirmasi) {
      setEror("Konfirmasi sandi tidak sama dengan sandi.");
      return;
    }
    setMemuat(true);
    setEror(null);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ namaLengkap, nim, username, email, password: sandi, cabangDpc, komisariat }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEror(data.error ?? "Registrasi gagal. Coba lagi.");
        setMemuat(false);
        return;
      }
      setSukses(true);
    } catch {
      setEror("Tidak dapat menghubungi server. Coba beberapa saat lagi.");
      setMemuat(false);
    }
  }

  if (sukses) {
    return (
      <div className="space-y-4">
        <h1 className="font-serif text-2xl font-extrabold text-hitam-900">
          Pendaftaran Berhasil
        </h1>
        <p
          role="status"
          className="border-2 border-hitam-900 bg-kertas-100 px-4 py-3 text-sm leading-relaxed text-hitam-700"
        >
          Pendaftaran berhasil. Akun Anda sedang dalam proses verifikasi oleh
          Admin Redaksi. Anda akan dapat masuk setelah akun disetujui.
        </p>
        <Link
          href="/login"
          className="block w-full bg-gmnimerah-500 px-5 py-3 text-center font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600"
        >
          Ke Halaman Masuk
        </Link>
      </div>
    );
  }


  return (
    <form onSubmit={kirim} className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-extrabold text-hitam-900">
          Registrasi Kader
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Pendaftaran terbuka untuk seluruh kader GMNI. Akun aktif setelah
          diverifikasi Admin Redaksi.
        </p>
        {tokenTidakSah && (
          <p className="mt-2 border border-hitam-300 bg-kertas-100 px-3 py-2 text-xs leading-relaxed text-hitam-600">
            Tautan undangan kamu tidak valid atau sudah dipakai — silakan
            lanjutkan pendaftaran terbuka di bawah ini.
          </p>
        )}
      </div>

      {eror && (
        <p
          role="alert"
          className="border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm font-semibold text-gmnimerah-700"
        >
          {eror}
        </p>
      )}

      <label className="block">
        <span className={LABEL}>Nama Lengkap</span>
        <input
          type="text"
          required
          minLength={3}
          maxLength={100}
          value={namaLengkap}
          onChange={(e) => setNamaLengkap(e.target.value)}
          className={INPUT}
          placeholder="Nama lengkap sesuai identitas kader"
        />
      </label>

      <label className="block">
        <span className={LABEL}>NIM</span>
        <input
          type="text"
          required
          pattern="[A-Za-z0-9]{5,20}"
          title="NIM 5-20 karakter, hanya huruf dan angka"
          value={nim}
          onChange={(e) => setNim(e.target.value)}
          className={`${INPUT} uppercase`}
          placeholder="mis. 20211012345"
        />
        <span className="mt-1 block text-xs text-hitam-500">
          NIM menjadi identitas masuk kader — email hanya untuk pemulihan sandi.
        </span>
      </label>

      <label className="block">
        <span className={LABEL}>Username</span>
        <input
          type="text"
          required
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_.]{3,24}"
          title="Huruf, angka, titik, atau garis bawah (3-24 karakter)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className={INPUT}
          placeholder="mis. marhaen_muda"
        />
      </label>

      <label className="block">
        <span className={LABEL}>Email</span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={INPUT}
          placeholder="kader@contoh.id"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Cabang (DPC)</span>
          <input
            type="text"
            required
            minLength={3}
            maxLength={100}
            value={cabangDpc}
            onChange={(e) => setCabangDpc(e.target.value)}
            className={INPUT}
            placeholder="mis. DPC Surabaya"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Komisariat</span>
          <input
            type="text"
            required
            minLength={3}
            maxLength={120}
            value={komisariat}
            onChange={(e) => setKomisariat(e.target.value)}
            className={INPUT}
            placeholder="mis. Komisariat FISIP Unair"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className={LABEL}>Sandi</span>
          <input
            type="password"
            required
            minLength={12}
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
            className={INPUT}
            placeholder="Minimal 12 karakter"
          />
        </label>
        <label className="block">
          <span className={LABEL}>Konfirmasi Sandi</span>
          <input
            type="password"
            required
            minLength={12}
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            className={INPUT}
            placeholder="Ulangi sandi"
          />
        </label>
      </div>

      <button
        type="submit"
        disabled={memuat}
        className="w-full bg-gmnimerah-500 px-5 py-3 font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
      >
        {memuat ? "Memproses..." : "Daftar sebagai Kader"}
      </button>
    </form>
  );
}
