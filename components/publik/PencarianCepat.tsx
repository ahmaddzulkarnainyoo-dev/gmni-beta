"use client";

import { useEffect, useId, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { SaranCari } from "@/app/api/cari/saran/route";
import { cn } from "@/lib/utils";

const TUNDA_SARAN_MS = 250;
const TUNDA_HASIL_MS = 650;
const MAKS_KUERI = 100;

const LABEL_TIPE: Record<SaranCari["tipe"], string> = {
  artikel: "Artikel",
  kategori: "Kanal",
  tag: "Tag",
};

/** Samakan normalisasi dengan sisi server (halaman /cari). */
function samakan(mentah: string): string {
  return mentah.replace(/\s+/g, " ").trim().slice(0, MAKS_KUERI);
}

/**
 * Bilah pencarian ala Google: hero rounded-full, autokomplet dropdown
 * (debounce + navigasi keyboard), hasil ikut ter-update saat mengetik.
 */
export function PencarianCepat({
  kueriAwal = "",
  autoFokus = false,
}: {
  kueriAwal?: string;
  autoFokus?: boolean;
}) {
  const router = useRouter();
  const idDasar = useId();
  const idMasukan = `${idDasar}-masukan`;
  const idDaftar = `${idDasar}-daftar`;
  const [kueri, setKueri] = useState(kueriAwal);
  const [saran, setSaran] = useState<SaranCari[]>([]);
  const [buka, setBuka] = useState(false);
  const [indeksAktif, setIndeksAktif] = useState(-1);
  // Jumlah permintaan saran yang masih berjalan; >0 berarti memuat.
  const [tertunda, setTertunda] = useState(0);
  const memuat = tertunda > 0;
  const masukanRef = useRef<HTMLInputElement>(null);
  const sesiSaran = useRef(0);

  // Catatan: sinkronisasi kueri URL dilakukan via prop `key={kata}`
  // pada halaman /cari sehingga komponen me-mount ulang per kata kunci.

  useEffect(() => {
    if (autoFokus) masukanRef.current?.focus();
  }, [autoFokus]);

  // Hasil cepat: sinkronkan URL (debounce) agar daftar ikut ter-update.
  useEffect(() => {
    const normal = samakan(kueri);
    if (normal === kueriAwal) return;
    const tujuan = normal ? `/cari?q=${encodeURIComponent(normal)}` : "/cari";
    const id = setTimeout(() => router.replace(tujuan, { scroll: false }), TUNDA_HASIL_MS);
    return () => clearTimeout(id);
  }, [kueri, kueriAwal, router]);

  // Autokomplet: debounce + batalkan permintaan basi.
  useEffect(() => {
    const normal = samakan(kueri);
    if (normal.length < 2) return;
    // Penanda berjalan dinaikkan di callback async (bukan sinkron di effect).
    const sesi = (sesiSaran.current += 1);
    const pengendali = new AbortController();
    const id = setTimeout(() => {
      setTertunda((v) => v + 1);
      fetch(`/api/cari/saran?q=${encodeURIComponent(normal)}`, {
        signal: pengendali.signal,
      })
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP ${res.status}`);
          return res.json() as Promise<{ saran?: SaranCari[] }>;
        })
        .then((data) => {
          if (sesi !== sesiSaran.current) return;
          const daftar = Array.isArray(data.saran) ? data.saran : [];
          setSaran(daftar);
          setIndeksAktif(-1);
          setBuka(daftar.length > 0);
        })
        .catch(() => {
          if (sesi !== sesiSaran.current) return;
          setSaran([]);
          setBuka(false);
        })
        .finally(() => {
          setTertunda((v) => Math.max(0, v - 1));
        });
    }, TUNDA_SARAN_MS);
    return () => {
      clearTimeout(id);
      pengendali.abort();
    };
  }, [kueri]);

  function kirim(kueriKirim: string) {
    const normal = samakan(kueriKirim);
    setBuka(false);
    setIndeksAktif(-1);
    if (!normal) {
      setKueri("");
      router.push("/cari");
      return;
    }
    setKueri(normal);
    router.push("/cari?q=" + encodeURIComponent(normal));
  }

  function tekanTombol(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "ArrowDown" && saran.length > 0) {
      e.preventDefault();
      setBuka(true);
      setIndeksAktif((v) => (v + 1) % saran.length);
    } else if (e.key === "ArrowUp" && saran.length > 0) {
      e.preventDefault();
      setBuka(true);
      setIndeksAktif((v) => (v - 1 + saran.length) % saran.length);
    } else if (e.key === "Escape") {
      setBuka(false);
      setIndeksAktif(-1);
    } else if (e.key === "Enter" && indeksAktif >= 0 && indeksAktif < saran.length) {
      e.preventDefault();
      router.push(saran[indeksAktif].href);
    }
  }

  const idAktif =
    indeksAktif >= 0 && indeksAktif < saran.length ? idDaftar + "-" + indeksAktif : undefined;
  const normalKueri = samakan(kueri);

  return (
    <div className="mx-auto w-full max-w-2xl">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          kirim(kueri);
        }}
        className="relative"
      >
        <span
          aria-hidden
          className="pointer-events-none absolute left-5 top-1/2 -translate-y-1/2 text-hitam-400"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <circle cx="9" cy="9" r="6" />
            <line x1="13.5" y1="13.5" x2="17.5" y2="17.5" />
          </svg>
        </span>
        <label htmlFor={idMasukan} className="sr-only">
          Cari di info Marhaen
        </label>
        <input
          ref={masukanRef}
          id={idMasukan}
          name="q"
          type="search"
          role="combobox"
          aria-expanded={buka}
          aria-controls={idDaftar}
          aria-activedescendant={idAktif}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
          maxLength={MAKS_KUERI}
          value={kueri}
          placeholder="Cari berita, kaderisasi, Marhaenisme…"
          onChange={(e) => setKueri(e.target.value)}
          onKeyDown={tekanTombol}
          onFocus={() => {
            if (saran.length > 0) setBuka(true);
          }}
          onBlur={() => setBuka(false)}
          className="w-full rounded-full border-2 border-hitam-900 bg-white py-4 pl-12 pr-24 font-sans text-base text-hitam-900 shadow-[4px_4px_0_0_var(--color-hitam-900)] outline-none transition-shadow placeholder:text-hitam-400 focus:shadow-[6px_6px_0_0_var(--color-gmnimerah-500)]"
        />
        {(memuat || normalKueri !== "") && (
          <span className="absolute right-4 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
            {memuat && (
              <span aria-label="Memuat saran" role="status" className="h-4 w-4 animate-spin rounded-full border-2 border-hitam-200 border-t-gmnimerah-500" />
            )}
            {normalKueri !== "" && (
              <button
                type="button"
                aria-label="Bersihkan pencarian"
                onMouseDown={(e) => {
                  e.preventDefault();
                  kirim("");
                  masukanRef.current?.focus();
                }}
                className="grid h-7 w-7 place-items-center rounded-full text-lg font-bold leading-none text-hitam-400 transition-colors hover:bg-hitam-100 hover:text-hitam-900"
              >
                ×
              </button>
            )}
          </span>
        )}

        {buka && saran.length > 0 && (
          <ul
            id={idDaftar}
            role="listbox"
            aria-label="Saran pencarian"
            className="absolute inset-x-0 top-full z-30 mt-2 overflow-hidden rounded-2xl border-2 border-hitam-900 bg-white shadow-[4px_4px_0_0_var(--color-hitam-900)]"
          >
            {saran.map((s, i) => (
              <li
                key={s.tipe + ":" + s.href}
                id={idDaftar + "-" + i}
                role="option"
                aria-selected={i === indeksAktif}
              >
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    router.push(s.href);
                  }}
                  onMouseEnter={() => setIndeksAktif(i)}
                  className={cn(
                    "flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors",
                    i === indeksAktif ? "bg-kertas-200" : "bg-white",
                  )}
                >
                  <span className="shrink-0 rounded-sm bg-hitam-900 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-wider text-white">
                    {LABEL_TIPE[s.tipe]}
                  </span>
                  <span className="min-w-0 flex-1 truncate text-sm font-semibold text-hitam-900">
                    {s.label}
                  </span>
                  <span className="hidden shrink-0 font-mono text-[11px] text-hitam-400 sm:block">
                    {s.sub}
                  </span>
                </button>
              </li>
            ))}
            {normalKueri.length >= 2 && (
              <li className="border-t border-hitam-100">
                <button
                  type="button"
                  tabIndex={-1}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    kirim(kueri);
                  }}
                  className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm font-bold text-gmnimerah-600 transition-colors hover:bg-gmnimerah-50"
                >
                  {"Lihat semua hasil untuk \u201c" + normalKueri + "\u201d"}
                </button>
              </li>
            )}
          </ul>
        )}
      </form>
    </div>
  );
}
