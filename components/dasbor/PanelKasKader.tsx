"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  awalMingguKas,
  parseTanggalDateOnly,
  tanggalDateOnly,
  tanggalWib,
  totalNominalUntukRentang,
  type TarifKas,
  type StatusTampilanKas,
} from "@/lib/kas";

type StatusKasPembayaran = "MENUNGGU_VERIFIKASI" | "DISETUJUI" | "DITOLAK";
type MingguKader = {
  mingguMulai: string;
  nominal: number | null;
  status: StatusTampilanKas;
  tanggalLunas: string | null;
};
type PembayaranKader = {
  id: string;
  tanggalBayar: string;
  jumlahMinggu: number;
  totalNominal: number;
  metode: "TRANSFER" | "TUNAI";
  status: StatusKasPembayaran;
  catatan: string | null;
  alasanPenolakan: string | null;
  createdAt: string;
  bukti: { id: string; namaFile: string } | null;
  minggu: string[];
};
type DataKas = {
  tahun: number;
  konfigurasiKas: { bankNama: string; rekeningNomor: string; atasNama: string; qrisUrl: string | null } | null;
  minggu: MingguKader[];
  tarif: TarifKas[];
  pembayaran: PembayaranKader[];
};

async function ambilDataKas(): Promise<DataKas> {
  const res = await fetch("/api/kas", { cache: "no-store" });
  const body = (await res.json()) as DataKas & { error?: string; ok?: boolean };
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? "Ringkasan kas belum dapat dimuat.");
  }
  return body;
}

const LABEL_STATUS: Record<StatusTampilanKas, string> = {
  LUNAS: "Lunas",
  MENUNGGU_VERIFIKASI: "Menunggu verifikasi",
  BELUM_BAYAR: "Belum bayar",
  MENUNGGAK: "Menunggak",
};
const GAYA_STATUS: Record<StatusTampilanKas, string> = {
  LUNAS: "border-emerald-700 bg-emerald-100 text-emerald-900",
  MENUNGGU_VERIFIKASI: "border-amber-700 bg-amber-100 text-amber-950",
  BELUM_BAYAR: "border-hitam-300 bg-hitam-50 text-hitam-600",
  MENUNGGAK: "border-gmnimerah-700 bg-gmnimerah-100 text-gmnimerah-800",
};

function rupiah(nilai: number | null): string {
  if (nilai === null) return "Tarif belum diatur";
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nilai);
}

function labelTanggal(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function PanelKasKader() {
  const router = useRouter();
  const [data, setData] = useState<DataKas | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [mengirim, setMengirim] = useState(false);
  const [eror, setEror] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [mingguMulai, setMingguMulai] = useState(() =>
    tanggalDateOnly(awalMingguKas(new Date())),
  );
  const [jumlahMinggu, setJumlahMinggu] = useState("1");
  const [tanggalBayar, setTanggalBayar] = useState(() => tanggalWib(new Date()));
  const [catatan, setCatatan] = useState("");

  async function muatData() {
    try {
      const body = await ambilDataKas();
      setEror(null);
      setData(body);
    } catch {
      setEror("Tidak dapat menghubungi server untuk memuat kas.");
    } finally {
      setMemuat(false);
    }
  }

  useEffect(() => {
    let dibatalkan = false;
    void ambilDataKas()
      .then((body) => {
        if (dibatalkan) return;
        setEror(null);
        setData(body);
      })
      .catch((error: unknown) => {
        if (!dibatalkan) {
          setEror(error instanceof Error ? error.message : "Ringkasan kas belum dapat dimuat.");
        }
      })
      .finally(() => {
        if (!dibatalkan) setMemuat(false);
      });
    return () => {
      dibatalkan = true;
    };
  }, []);

  const pratinjau = (() => {
    const mulai = parseTanggalDateOnly(mingguMulai);
    const jumlah = Number(jumlahMinggu);
    if (!mulai || tanggalDateOnly(awalMingguKas(mulai)) !== mingguMulai) {
      return { total: null, pesan: "Pilih hari Senin sebagai awal minggu." };
    }
    if (!Number.isSafeInteger(jumlah) || jumlah < 1) {
      return { total: null, pesan: "Masukkan jumlah minggu yang valid." };
    }
    const akhir = new Date(mulai);
    akhir.setUTCDate(akhir.getUTCDate() + (jumlah - 1) * 7);
    if (!Number.isFinite(akhir.getTime()) || akhir.getUTCFullYear() > 9998) {
      return { total: null, pesan: "Rentang minggu berada di luar tanggal yang didukung." };
    }
    if (!data) return { total: null, pesan: "Tarif belum dimuat." };
    const total = totalNominalUntukRentang(data.tarif, mulai, jumlah);
    if (total === null) {
      return {
        total: null,
        pesan: "Tarif belum tersedia atau total melebihi batas transaksi yang didukung.",
      };
    }
    return { total, pesan: null };
  })();

  async function ajukan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formElement = e.currentTarget;
    setMengirim(true);
    setEror(null);
    setInfo(null);
    const form = new FormData(formElement);
    try {
      const res = await fetch("/api/kas", { method: "POST", body: form });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setEror(body.error ?? "Pengajuan pembayaran gagal.");
        return;
      }
      setInfo("Bukti pembayaran terkirim. Status minggu pilihan menunggu verifikasi bendahara.");
      setCatatan("");
      formElement.reset();
      setMingguMulai(tanggalDateOnly(awalMingguKas(new Date())));
      setJumlahMinggu("1");
      setTanggalBayar(tanggalWib(new Date()));
      await muatData();
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server untuk mengirim bukti.");
    } finally {
      setMengirim(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl">
      <header className="border-b-2 border-hitam-900 pb-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gmnimerah-600">
          Administrasi Kader
        </p>
        <h1 className="mt-1 font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
          Iuran Kas Mingguan
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Bayar minggu berjalan atau beberapa minggu ke depan sekaligus. Pembayaran baru lunas
          setelah diverifikasi bendahara.
        </p>
      </header>

      {eror && (
        <p role="alert" className="mt-4 border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
      {info && (
        <p role="status" className="mt-4 border-2 border-hitam-900 bg-kertas-100 px-3 py-2 text-sm font-semibold text-hitam-800">
          {info}
        </p>
      )}

      {data?.konfigurasiKas && (
        <section className="mt-6 grid gap-4 border-2 border-gmnimerah-500 bg-white p-4 md:grid-cols-[1fr_auto] md:p-5" aria-label="Panduan pembayaran kas">
          <div>
            <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gmnimerah-600">Panduan Pembayaran</p>
            <h2 className="mt-1 font-serif text-xl font-bold text-hitam-900">Transfer iuran kas ke rekening resmi</h2>
            <dl className="mt-3 grid gap-2 text-sm sm:grid-cols-2">
              <div><dt className="text-xs text-hitam-500">Bank</dt><dd className="font-semibold">{data.konfigurasiKas.bankNama}</dd></div>
              <div><dt className="text-xs text-hitam-500">Nomor rekening</dt><dd className="font-mono font-bold">{data.konfigurasiKas.rekeningNomor}</dd></div>
              <div><dt className="text-xs text-hitam-500">Nama pemilik</dt><dd className="font-semibold">{data.konfigurasiKas.atasNama}</dd></div>
            </dl>
          </div>
          {data.konfigurasiKas.qrisUrl && <img src={data.konfigurasiKas.qrisUrl} alt="QRIS iuran kas" className="h-40 w-40 border-2 border-hitam-900 object-contain" />}
        </section>
      )}

      <section className="mt-6 border-2 border-hitam-900 bg-white p-4 md:p-5">
        <h2 className="font-serif text-xl font-bold text-hitam-900">Ajukan Pembayaran Transfer</h2>
        <p className="mt-1 text-sm text-hitam-500">
          Nominal dihitung dari tarif yang berlaku untuk setiap minggu yang dipilih.
        </p>
        <form onSubmit={ajukan} className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Minggu pertama (Senin)
            </span>
            <input
              name="mingguMulai"
              type="date"
              required
              value={mingguMulai}
              onChange={(event) => setMingguMulai(event.target.value)}
              className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Jumlah minggu
            </span>
            <input
              name="jumlahMinggu"
              type="number"
              min="1"
              step="1"
              required
              value={jumlahMinggu}
              onChange={(event) => setJumlahMinggu(event.target.value)}
              className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm"
            />
          </label>
          <label className="block">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Tanggal pembayaran
            </span>
            <input
              name="tanggalBayar"
              type="date"
              required
              value={tanggalBayar}
              onChange={(event) => setTanggalBayar(event.target.value)}
              className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm"
            />
          </label>
          <div className="border-l-2 border-gmnimerah-500 bg-kertas-100 px-3 py-2">
            <span className="block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Total pengajuan
            </span>
            <span className="mt-1 block font-serif text-xl font-extrabold text-hitam-900">
              {rupiah(pratinjau.total)}
            </span>
            {pratinjau.pesan && (
              <span className="mt-1 block text-xs text-hitam-500">{pratinjau.pesan}</span>
            )}
          </div>
          <label className="block sm:col-span-2">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Bukti transfer (JPEG, PNG, WebP; maks. 5 MB)
            </span>
            <input
              name="bukti"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              required
              className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm file:mr-3 file:border-0 file:bg-hitam-900 file:px-3 file:py-1 file:font-mono file:text-xs file:font-bold file:uppercase file:text-white"
            />
          </label>
          <label className="block sm:col-span-2">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Catatan (opsional)
            </span>
            <textarea
              name="catatan"
              maxLength={500}
              rows={2}
              value={catatan}
              onChange={(event) => setCatatan(event.target.value)}
              className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm"
            />
          </label>
          <button
            type="submit"
            disabled={mengirim || memuat || pratinjau.total === null}
            className="bg-gmnimerah-500 px-5 py-3 text-sm font-bold uppercase tracking-wide text-white hover:bg-gmnimerah-600 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2"
          >
            {mengirim ? "Mengirim bukti..." : "Kirim untuk Verifikasi"}
          </button>
        </form>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-2 border-b-2 border-hitam-900 pb-2">
          <div>
            <h2 className="font-serif text-xl font-extrabold text-hitam-900">
              Status Mingguan {data?.tahun ?? ""}
            </h2>
            <p className="text-xs text-hitam-500">Minggu berjalan dimulai setiap Senin WIB.</p>
          </div>
          {memuat && <span role="status" className="text-sm text-hitam-500">Memuat...</span>}
        </div>
        <div className="mt-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
          {data?.minggu.map((baris) => (
            <article key={baris.mingguMulai} className="flex items-start justify-between gap-3 border border-hitam-200 bg-white p-3">
              <div>
                <p className="font-semibold text-hitam-900">{labelTanggal(baris.mingguMulai)}</p>
                <p className="mt-0.5 text-xs text-hitam-500">{rupiah(baris.nominal)}</p>
              </div>
              <span className={`shrink-0 border px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-wide ${GAYA_STATUS[baris.status]}`}>
                {LABEL_STATUS[baris.status]}
              </span>
            </article>
          ))}
          {!memuat && data?.minggu.length === 0 && (
            <p className="text-sm text-hitam-500">Belum ada status mingguan.</p>
          )}
        </div>
      </section>

      <section className="mt-8">
        <h2 className="border-b-2 border-hitam-900 pb-2 font-serif text-xl font-extrabold text-hitam-900">
          Riwayat Pengajuan
        </h2>
        {data?.pembayaran.length ? (
          <ul className="mt-3 space-y-3">
            {data.pembayaran.map((item) => (
              <li key={item.id} className="border border-hitam-200 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-hitam-900">
                      {item.jumlahMinggu} minggu · {rupiah(item.totalNominal)}
                    </p>
                    <p className="mt-1 text-xs text-hitam-500">
                      Dibayar {labelTanggal(item.tanggalBayar)} ·{" "}
                      {item.minggu.map(labelTanggal).join(", ")}
                    </p>
                    {item.catatan && <p className="mt-1 text-sm text-hitam-600">{item.catatan}</p>}
                    {item.alasanPenolakan && (
                      <p className="mt-2 border-l-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm text-gmnimerah-800">
                        Alasan penolakan: {item.alasanPenolakan}
                      </p>
                    )}
                  </div>
                  <span className="border border-hitam-900 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest">
                    {item.status === "DISETUJUI"
                      ? "Lunas"
                      : item.status === "DITOLAK"
                        ? "Ditolak"
                        : "Menunggu"}
                  </span>
                </div>
                {item.bukti && (
                  <a
                    href={`/api/kas/${item.id}/bukti`}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-3 inline-block font-mono text-[11px] font-bold uppercase tracking-widest text-gmnimerah-700 underline"
                  >
                    Buka bukti pembayaran
                  </a>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 border border-hitam-200 bg-white p-4 text-sm text-hitam-500">
            Belum ada riwayat pengajuan pembayaran.
          </p>
        )}
      </section>
    </div>
  );
}
