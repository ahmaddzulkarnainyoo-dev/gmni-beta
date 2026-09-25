"use client";

import { useEffect, useState } from "react";

/**
 * Widget pengaturan 2FA (Sub-Fase 4.2): status, wizard setup (QR + kode
 * pemulihan 1x), konfirmasi, uji kode, dan nonaktifkan. Gaya konsisten
 * dengan TogglePrivasi (border tegas, label mono, aksen gmnimerah).
 */
export function WidgetDuaFaktor({ aktifAwal }: { aktifAwal: boolean }) {
  const [aktif, setAktif] = useState(aktifAwal);
  const [tahap, setTahap] = useState<"idle" | "setup">("idle");
  const [uri, setUri] = useState("");
  const [secret, setSecret] = useState("");
  const [qrUrl, setQrUrl] = useState<string | null>(null);
  const [pemulihan, setPemulihan] = useState<string[]>([]);
  const [kode, setKode] = useState("");
  const [kodeUji, setKodeUji] = useState("");
  const [hasilUji, setHasilUji] = useState<null | boolean>(null);
  const [memuat, setMemuat] = useState(false);
  const [pesan, setPesan] = useState<string | null>(null);
  const [eror, setEror] = useState<string | null>(null);

  // Render QR client-side (dynamic import agar tidak membebani bundle awal).
  // qrUrl dibersihkan di handler yang mengubah uri (bukan sinkron di effect).
  useEffect(() => {
    if (!uri) return;
    let batal = false;
    import("qrcode")
      .then((m) => m.toDataURL(uri, { margin: 1, width: 220 }))
      .then((url) => {
        if (!batal) setQrUrl(url);
      })
      .catch(() => {
        if (!batal) setQrUrl(null); // fallback: tampilkan URI teks
      });
    return () => {
      batal = true;
    };
  }, [uri]);

  type HasilApi = {
    eror?: string;
    ok?: boolean;
    sah?: boolean;
    uri?: string;
    secret?: string;
    kodePemulihan?: string[];
  };

  async function panggil(url: string, body?: object) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = (await res.json().catch(() => null)) as HasilApi | null;
    return { res, data };
  }
  async function mulai() {
    setMemuat(true);
    setEror(null);
    setPesan(null);
    setQrUrl(null);
    const { res, data } = await panggil("/api/kader/dua-faktor/buat");
    setMemuat(false);
    if (!res.ok) {
      setEror(data?.eror ?? "Gagal memulai setup 2FA.");
      return;
    }
    setUri(data?.uri ?? "");
    setSecret(data?.secret ?? "");
    setPemulihan(data?.kodePemulihan ?? []);
    setTahap("setup");
  }

  async function konfirmasi(e: React.FormEvent) {
    e.preventDefault();
    setMemuat(true);
    setEror(null);
    const { res, data } = await panggil("/api/kader/dua-faktor/konfirmasi", {
      kode,
    });
    setMemuat(false);
    if (!res.ok) {
      setEror(data?.eror ?? "Kode tidak valid.");
      return;
    }
    setAktif(true);
    setTahap("idle");
    setUri("");
    setSecret("");
    setPemulihan([]);
    setKode("");
    setPesan("2FA aktif. Setiap login kini meminta kode 6 digit.");
  }

  async function nonaktifkan(e: React.FormEvent) {
    e.preventDefault();
    if (!confirm("Nonaktifkan 2FA untuk akun ini?")) return;
    setMemuat(true);
    setEror(null);
    const { res, data } = await panggil("/api/kader/dua-faktor/nonaktifkan", {
      kode: kodeUji,
    });
    setMemuat(false);
    if (!res.ok) {
      setEror(data?.eror ?? "Kode tidak valid.");
      return;
    }
    setAktif(false);
    setKodeUji("");
    setHasilUji(null);
    setPesan("2FA dinonaktifkan.");
  }

  async function uji(e: React.FormEvent) {
    e.preventDefault();
    setMemuat(true);
    setHasilUji(null);
    setEror(null);
    const { res, data } = await panggil("/api/kader/dua-faktor/verifikasi", {
      kode: kodeUji,
    });
    setMemuat(false);
    if (!res.ok) {
      setEror(data?.eror ?? "Gagal menguji kode.");
      return;
    }
    setHasilUji(data?.sah === true);
  }

  function batalSetup() {
    setTahap("idle");
    setUri("");
    setSecret("");
    setPemulihan([]);
    setKode("");
    setEror(null);
  }

  const labelStatus = aktif ? "2FA Aktif" : "2FA Belum Aktif";
  const kelasStatus = aktif
    ? "border-hitam-900 bg-hitam-900 text-white"
    : "border-gmnimerah-500 bg-gmnimerah-50 text-gmnimerah-700";

  return (
    <section className="mt-6 border-2 border-hitam-900 bg-white p-5">
      <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
        Keamanan
      </p>
      <h2 className="mt-1 font-serif text-lg font-extrabold text-hitam-900">
        Autentikasi Dua Faktor (2FA)
      </h2>
      <p className="mt-1 text-sm text-hitam-500">
        Sangat disarankan untuk Super Admin &amp; Editor. Setelah aktif, login
        meminta kode 6 digit dari aplikasi authenticator.
      </p>

      <p
        className={`mt-3 inline-block border-2 px-2 py-1 font-mono text-[11px] font-bold uppercase tracking-widest ${kelasStatus}`}
      >
        {labelStatus}
      </p>

      {eror && (
        <p
          role="alert"
          className="mt-3 border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm font-semibold text-gmnimerah-700"
        >
          {eror}
        </p>
      )}
      {pesan && (
        <p className="mt-3 border-2 border-hitam-900 bg-kertas-150 px-3 py-2 text-sm font-semibold text-hitam-900">
          {pesan}
        </p>
      )}

      {!aktif && tahap === "idle" && (
        <button
          type="button"
          onClick={mulai}
          disabled={memuat}
          className="mt-4 bg-hitam-900 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
        >
          {memuat ? "Menyiapkan..." : "Aktifkan 2FA"}
        </button>
      )}

      {!aktif && tahap === "setup" && (
        <div className="mt-4 space-y-4">
          <div className="border-2 border-dashed border-hitam-300 bg-kertas-150 p-4">
            {qrUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={qrUrl}
                alt="QR kode setup 2FA"
                width={220}
                height={220}
                className="border-2 border-hitam-900 bg-white"
              />
            ) : (
              <p className="break-all font-mono text-xs text-hitam-700">
                Pindai manual URI ini di aplikasi authenticator:
                <br />
                <span className="font-bold">{uri}</span>
              </p>
            )}
            {secret !== "" && (
              <p className="mt-2 font-mono text-xs text-hitam-600">
                Secret manual:{" "}
                <span className="font-bold text-hitam-900">{secret}</span>
              </p>
            )}
          </div>

          {pemulihan.length > 0 && (
            <div className="border-2 border-gmnimerah-500 bg-gmnimerah-50 p-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gmnimerah-700">
                Kode pemulihan - simpan sekarang (hanya tampil 1x)
              </p>
              <ul className="mt-2 grid grid-cols-1 gap-1 font-mono text-sm font-bold text-hitam-900 sm:grid-cols-2">
                {pemulihan.map((k) => (
                  <li key={k} className="border border-hitam-200 bg-white px-2 py-1">
                    {k}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <form onSubmit={konfirmasi} className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
                Kode 6 digit dari aplikasi
              </span>
              <input
                type="text"
                required
                inputMode="numeric"
                autoComplete="one-time-code"
                value={kode}
                onChange={(e) => setKode(e.target.value)}
                className="w-48 border-2 border-hitam-900 bg-white px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.4em] text-hitam-900 outline-none focus:border-gmnimerah-500"
                placeholder="......"
              />
            </label>
            <button
              type="submit"
              disabled={memuat || kode.trim().length === 0}
              className="bg-gmnimerah-500 px-5 py-2.5 font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
            >
              {memuat ? "Memeriksa..." : "Konfirmasi & Aktifkan"}
            </button>
            <button
              type="button"
              onClick={batalSetup}
              className="border-2 border-hitam-900 bg-white px-4 py-2 font-sans text-sm font-bold uppercase tracking-wide text-hitam-900 hover:bg-kertas-150"
            >
              Batal
            </button>
          </form>
        </div>
      )}

      {aktif && (
        <div className="mt-4 space-y-4">
          <form onSubmit={uji} className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
                Uji kode authenticator
              </span>
              <input
                type="text"
                inputMode="numeric"
                value={kodeUji}
                onChange={(e) => {
                  setKodeUji(e.target.value);
                  setHasilUji(null);
                }}
                className="w-48 border-2 border-hitam-900 bg-white px-3 py-2 text-center font-mono text-lg font-bold tracking-[0.4em] text-hitam-900 outline-none focus:border-gmnimerah-500"
                placeholder="......"
              />
            </label>
            <button
              type="submit"
              disabled={memuat || kodeUji.trim().length === 0}
              className="border-2 border-hitam-900 bg-white px-4 py-2 font-sans text-sm font-bold uppercase tracking-wide text-hitam-900 hover:bg-kertas-150 disabled:opacity-50"
            >
              {memuat ? "Menguji..." : "Uji Kode"}
            </button>
          </form>
          {hasilUji !== null && (
            <p
              className={
                hasilUji
                  ? "inline-block border-2 border-hitam-900 bg-kertas-150 px-3 py-1.5 text-sm font-semibold text-hitam-900"
                  : "inline-block border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-1.5 text-sm font-semibold text-gmnimerah-700"
              }
            >
              {hasilUji ? "Kode valid." : "Kode tidak valid."}
            </p>
          )}

          <form onSubmit={nonaktifkan} className="border-t-2 border-dashed border-hitam-200 pt-4">
            <p className="text-sm text-hitam-500">
              Untuk menonaktifkan, masukkan kode 6 digit saat ini (atau salah
              satu kode pemulihan) di kolom uji di atas lalu tekan tombol ini.
            </p>
            <button
              type="submit"
              disabled={memuat || kodeUji.trim().length === 0}
              className="mt-2 border-2 border-gmnimerah-500 bg-white px-4 py-2 font-sans text-sm font-bold uppercase tracking-wide text-gmnimerah-600 hover:bg-gmnimerah-50 disabled:opacity-50"
            >
              Nonaktifkan 2FA
            </button>
          </form>
        </div>
      )}
    </section>
  );
}

