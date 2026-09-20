"use client";

import { useState } from "react";
import Link from "next/link";

/** Formulir registrasi kader berbasis invite token (blueprint 6.3). */
export function DaftarForm({
  token,
  pengundang,
}: {
  token: string;
  pengundang: string;
}) {
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
        body: JSON.stringify({ token, namaLengkap, nim, username, email, password: sandi, cabangDpc, komisariat }),
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
          Terdaftar!
        </h1>
        <p className="text-sm leading-relaxed text-hitam-600">
          Pendaftaran kader berhasil. Akun Anda sudah aktif dengan peran{" "}
          <strong className="text-hitam-900">Kontributor</strong>. Silakan masuk
          untuk mulai menulis.
        </p>
        <Link
          href="/login"
          className="block w-full bg-gmnimerah-500 px-5 py-3 text-center font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600"
        >
          Masuk Sekarang
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
          Diundang oleh <strong className="text-hitam-900">{pengundang}</strong>.
          Pendaftaran terbatas untuk kader dengan token undangan yang sah.
        </p>
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
        <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Nama Lengkap
        </span>
        <input
          type="text"
          required
          minLength={3}
          value={namaLengkap}
          onChange={(e) => setNamaLengkap(e.target.value)}
          className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
          placeholder="Nama lengkap sesuai identitas kader"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          NIM
        </span>
        <input
          type="text"
          required
          pattern="[A-Za-z0-9]{5,20}"
          title="NIM 5-20 karakter, hanya huruf dan angka"
          value={nim}
          onChange={(e) => setNim(e.target.value)}
          className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm uppercase text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
          placeholder="mis. 20211012345"
        />
        <span className="mt-1 block text-xs text-hitam-500">
          NIM menjadi identitas masuk kader â€” email hanya untuk pemulihan sandi.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Username
        </span>
        <input
          type="text"
          required
          minLength={3}
          maxLength={24}
          pattern="[A-Za-z0-9_.]{3,24}"
          title="Huruf, angka, titik, atau garis bawah (3-24 karakter)"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
          placeholder="mis. marhaen_muda"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Email
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
          placeholder="kader@contoh.id"
        />
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Cabang (DPC)
          </span>
          <input
            type="text"
            required
            minLength={3}
            maxLength={100}
            value={cabangDpc}
            onChange={(e) => setCabangDpc(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
            placeholder="mis. DPC Jakarta Selatan"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Komisariat
          </span>
          <input
            type="text"
            required
            minLength={3}
            maxLength={120}
            value={komisariat}
            onChange={(e) => setKomisariat(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
            placeholder="mis. Komisariat FISIP UI"
          />
        </label>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Sandi
          </span>
          <input
            type="password"
            required
            minLength={12}
            value={sandi}
            onChange={(e) => setSandi(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
            placeholder="Minimal 12 karakter"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Konfirmasi Sandi
          </span>
          <input
            type="password"
            required
            minLength={12}
            value={konfirmasi}
            onChange={(e) => setKonfirmasi(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
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
