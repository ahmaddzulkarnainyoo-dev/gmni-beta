"use client";

import { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { getSession, signIn } from "next-auth/react";
import Link from "next/link";
import { bolehMasukAdmin } from "@/lib/nav";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Formulir masuk (Credentials + langkah 2FA) — dikirim ke endpoint NextAuth.
 * Setelah sukses: Admin/Editor langsung diarahkan ke /admin, kader ke
 * callbackUrl yang aman atau /dasbor. Saat memeriksa, tombol memuat spinner
 * + disabled (anti double-click) + aria-busy.
 */
export function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl");
  const tujuan = callbackUrl && callbackUrl.startsWith("/") ? callbackUrl : "/dasbor";

  const [identitas, setIdentitas] = useState("");
  const [sandi, setSandi] = useState("");
  const [otp, setOtp] = useState("");
  const [langkahOtp, setLangkahOtp] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState<string | null>(null);

  async function kirim(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemuat(true);
    setEror(null);
    const hasil = await signIn("credentials", {
      redirect: false,
      email: identitas,
      password: sandi,
      ...(langkahOtp ? { otpToken: otp } : {}),
    });
    if (hasil?.error) {
      if (hasil.error === "OTP_REQUIRED") {
        // Sandi benar, akun ber-2FA: lanjut ke langkah kode 6 digit.
        setLangkahOtp(true);
        setMemuat(false);
        return;
      }
      if (hasil.error === "OTP_INVALID") {
        setEror("Kode keamanan 6 digit tidak valid. Coba lagi.");
        setMemuat(false);
        return;
      }
      if (hasil.error === "OTP_TERKUNCI") {
        setEror(
          "Terlalu banyak kode salah. Akun dikunci 15 menit sebelum bisa mencoba lagi.",
        );
        setMemuat(false);
        return;
      }
      if (hasil.error === "AUTH_SERVER") {
        // Sekat infra: DB tidak terjangkau — BUKAN kredensial salah.
        setEror(
          "Server autentikasi sedang bermasalah (database tidak terjangkau). Coba lagi beberapa saat.",
        );
        setMemuat(false);
        return;
      }
      // Kembali ke langkah awal bila kredensial dasar yang salah.
      setLangkahOtp(false);
      setOtp("");
      setEror("NIM atau sandi salah. Pastikan akun berstatus aktif.");
      setMemuat(false);
      return;
    }
    router.push(await tujuanAdmin(tujuan));
    router.refresh();
  }

  /** Tujuan pasca-login: Admin/Editor → /admin, kader → callbackUrl aman. */
  async function tujuanAdmin(fallback: string): Promise<string> {
    try {
      const sesi = await getSession();
      const roleNama = sesi?.user?.roleNama ?? null;
      if (bolehMasukAdmin(roleNama)) return "/admin";
    } catch {
      // Gagal baca sesi (offline sesaat) — pakai fallback aman.
    }
    return fallback;
  }

  return (
    <form onSubmit={kirim} className="space-y-4">
      <div>
        <h1 className="font-serif text-2xl font-extrabold text-hitam-900">
          Masuk Kader
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Gunakan NIM kader dan sandi yang terdaftar. Akun lama dapat memakai
          email; email juga menjadi kanal pemulihan sandi.
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
          NIM
        </span>
        <input
          type="text"
          required
          autoComplete="username"
          value={identitas}
          onChange={(e) => setIdentitas(e.target.value)}
          className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm uppercase text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
          placeholder="mis. 20211012345 (akun lama: email)"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Sandi
        </span>
        <input
          type="password"
          required
          value={sandi}
          onChange={(e) => setSandi(e.target.value)}
          className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
          placeholder="••••••••"
        />
      </label>

      <button
        type="submit"
        disabled={memuat || (langkahOtp && otp.trim().length === 0)}
        aria-busy={memuat}
        className="inline-flex w-full items-center justify-center gap-2.5 bg-gmnimerah-500 px-5 py-3 font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {memuat && <Spinner />}
        {memuat
          ? "Memeriksa..."
          : langkahOtp
            ? "Verifikasi Kode"
            : "Masuk"}
      </button>

      {langkahOtp && (
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Kode Keamanan 6 Digit
          </span>
          <input
            type="text"
            required
            inputMode="numeric"
            autoComplete="one-time-code"
            autoFocus
            value={otp}
            onChange={(e) => setOtp(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-center font-mono text-xl font-bold tracking-[0.5em] text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
            placeholder="••••••"
          />
          <span className="mt-1 block text-xs text-hitam-500">
            Buka aplikasi authenticator kamu, atau pakai salah satu kode
            pemulihan bila perangkat hilang.
          </span>
        </label>
      )}

      <p className="pt-1 text-center text-sm text-hitam-500">
        Lupa sandi?{" "}
        <Link
          href="/lupa-password"
          className="font-semibold text-gmnimerah-600 underline decoration-2 underline-offset-4"
        >
          Pulihkan di sini
        </Link>
      </p>
    </form>
  );
}