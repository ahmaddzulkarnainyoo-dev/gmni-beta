"use client";

import { useCallback, useEffect, useState } from "react";
import {
  awalMingguKas,
  tanggalDateOnly,
  tanggalWib,
  type StatusTampilanKas,
} from "@/lib/kas";

type SelKas = {
  mingguMulai: string;
  nominal: number | null;
  status: StatusTampilanKas;
};
type KaderMatrix = {
  id: string;
  namaLengkap: string;
  username: string;
  nim: string | null;
  cabangDpc: string | null;
  komisariat: string | null;
  minggu: SelKas[];
};
type TarifKasRow = { id: string; nominal: number; berlakuMulai: string };
type PengajuanKas = {
  id: string;
  labelAnonim: string;
  kader?: {
    namaLengkap: string;
    username: string;
    cabangDpc: string | null;
    komisariat: string | null;
  };
  tanggalBayar: string;
  jumlahMinggu: number;
  totalNominal: number;
  catatan: string | null;
  createdAt: string;
  bukti: { id: string; namaFile: string; ukuranByte: number } | null;
  minggu: Array<{ mulai: string; nominal: number }>;
};
type DataKasAdmin = {
  bolehRekapPenuh: boolean;
  rekapPenuh: boolean;
  tahun: number;
  minggu: string[];
  matrix: KaderMatrix[];
  tarif: TarifKasRow[];
  pembayaran: PengajuanKas[];
  ringkasan: {
    kaderAktif: number;
    kaderSudahBayar: number;
    mingguLunas: number;
    mingguMenunggu: number;
    mingguBelumBayar: number;
    totalKasMasuk: number;
    totalMenunggu: number;
    pengajuanDisetujui: number;
    pengajuanMenunggu: number;
  };
};

async function ambilDataKasAdmin(
  tahun: number,
  filter: { q: string; cabang: string; komisariat: string },
  modePenuh: boolean,
): Promise<DataKasAdmin> {
  const params = new URLSearchParams({ tahun: String(tahun) });
  if (modePenuh) params.set("mode", "penuh");
  if (filter.q) params.set("q", filter.q);
  if (filter.cabang) params.set("cabang", filter.cabang);
  if (filter.komisariat) params.set("komisariat", filter.komisariat);
  const res = await fetch(`/api/admin/kas?${params}`, { cache: "no-store" });
  const body = (await res.json()) as DataKasAdmin & { ok?: boolean; error?: string };
  if (!res.ok || !body.ok) {
    throw new Error(body.error ?? "Rekap kas belum dapat dimuat.");
  }
  return body;
}

const LABEL_STATUS: Record<StatusTampilanKas, string> = {
  LUNAS: "Lunas",
  MENUNGGU_VERIFIKASI: "Pending",
  BELUM_BAYAR: "Belum bayar",
  MENUNGGAK: "Menunggak",
};
const GAYA_STATUS: Record<StatusTampilanKas, string> = {
  LUNAS: "bg-emerald-100 text-emerald-900",
  MENUNGGU_VERIFIKASI: "bg-amber-100 text-amber-950",
  BELUM_BAYAR: "bg-hitam-100 text-hitam-500",
  MENUNGGAK: "bg-gmnimerah-100 text-gmnimerah-800",
};

function statusKasValid(value: string): value is StatusTampilanKas {
  return Object.prototype.hasOwnProperty.call(LABEL_STATUS, value);
}

function rupiah(nilai: number): string {
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(nilai);
}

function tanggalLabel(value: string): string {
  return new Intl.DateTimeFormat("id-ID", {
    dateStyle: "medium",
    timeZone: "UTC",
  }).format(new Date(`${value}T00:00:00.000Z`));
}

export function PanelKasAdmin() {
  const [tahun, setTahun] = useState(() =>
    Number(tanggalWib(new Date()).slice(0, 4)),
  );
  const [data, setData] = useState<DataKasAdmin | null>(null);
  const [memuat, setMemuat] = useState(true);
  const [aksiId, setAksiId] = useState<string | null>(null);
  const [eror, setEror] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [cari, setCari] = useState("");
  const [cabang, setCabang] = useState("");
  const [komisariat, setKomisariat] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusTampilanKas | "">("");
  const [modePenuh, setModePenuh] = useState(false);
  const [filter, setFilter] = useState({ q: "", cabang: "", komisariat: "" });
  const [nominal, setNominal] = useState("");
  const [tarifMulai, setTarifMulai] = useState(() =>
    tanggalDateOnly(awalMingguKas(new Date())),
  );
  const [kaderId, setKaderId] = useState("");
  const [manualMingguMulai, setManualMingguMulai] = useState(() =>
    tanggalDateOnly(awalMingguKas(new Date())),
  );
  const [manualJumlah, setManualJumlah] = useState("1");
  const [manualTanggal, setManualTanggal] = useState(() => tanggalWib(new Date()));
  const [manualCatatan, setManualCatatan] = useState("");

  const muatData = useCallback(async (tahunMuat = tahun, filterMuat = filter) => {
    try {
      const body = await ambilDataKasAdmin(tahunMuat, filterMuat, modePenuh);
      setEror(null);
      setData(body);
      setKaderId((sebelumnya) =>
        body.matrix.some((kader) => kader.id === sebelumnya)
          ? sebelumnya
          : body.matrix[0]?.id ?? "",
      );
    } catch {
      setEror("Tidak dapat menghubungi server untuk memuat rekap kas.");
    } finally {
      setMemuat(false);
    }
  }, [filter, modePenuh, tahun]);

  useEffect(() => {
    let dibatalkan = false;
    void ambilDataKasAdmin(tahun, filter, modePenuh)
      .then((body) => {
        if (dibatalkan) return;
        setEror(null);
        setData(body);
        setKaderId((sebelumnya) =>
          body.matrix.some((kader) => kader.id === sebelumnya)
            ? sebelumnya
            : body.matrix[0]?.id ?? "",
        );
      })
      .catch((error: unknown) => {
        if (!dibatalkan) {
          setEror(error instanceof Error ? error.message : "Rekap kas belum dapat dimuat.");
        }
      })
      .finally(() => {
        if (!dibatalkan) setMemuat(false);
      });
    return () => {
      dibatalkan = true;
    };
  }, [filter, modePenuh, tahun]);

  async function simpanTarif(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAksiId("tarif");
    setEror(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/kas/tarif", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nominal: Number(nominal), berlakuMulai: tarifMulai }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setEror(body.error ?? "Tarif kas gagal disimpan.");
        return;
      }
      setNominal("");
      setInfo("Tarif kas berhasil disimpan untuk minggu yang dipilih.");
      await muatData();
    } catch {
      setEror("Tidak dapat menghubungi server untuk menyimpan tarif.");
    } finally {
      setAksiId(null);
    }
  }

  async function prosesPembayaran(id: string, aksi: "SETUJUI" | "TOLAK") {
    let alasanPenolakan = "";
    if (aksi === "SETUJUI" && !window.confirm("Setujui bukti ini dan tandai seluruh minggu sebagai lunas?")) {
      return;
    }
    if (aksi === "TOLAK") {
      const masukan = window.prompt("Alasan penolakan (wajib):");
      if (masukan === null) return;
      alasanPenolakan = masukan.trim();
    }
    setAksiId(id);
    setEror(null);
    setInfo(null);
    try {
      const res = await fetch(`/api/admin/kas/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aksi, alasanPenolakan }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setEror(body.error ?? "Pengajuan kas gagal diproses.");
        return;
      }
      setInfo(aksi === "SETUJUI" ? "Pembayaran telah diverifikasi." : "Pengajuan ditolak dan minggu tersedia kembali.");
      await muatData();
    } catch {
      setEror("Tidak dapat menghubungi server untuk memproses pengajuan.");
    } finally {
      setAksiId(null);
    }
  }

  async function catatTunai(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setAksiId("tunai");
    setEror(null);
    setInfo(null);
    try {
      const res = await fetch("/api/admin/kas/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          kaderId,
          mingguMulai: manualMingguMulai,
          jumlahMinggu: Number(manualJumlah),
          tanggalBayar: manualTanggal,
          catatan: manualCatatan,
        }),
      });
      const body = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !body.ok) {
        setEror(body.error ?? "Pembayaran tunai gagal dicatat.");
        return;
      }
      setInfo("Pembayaran tunai berhasil dicatat dan ditandai lunas.");
      setManualCatatan("");
      await muatData();
    } catch {
      setEror("Tidak dapat menghubungi server untuk mencatat pembayaran tunai.");
    } finally {
      setAksiId(null);
    }
  }

  function terapkanFilter(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const berikutnya = {
      q: cari.trim(),
      cabang: cabang.trim(),
      komisariat: komisariat.trim(),
    };
    setFilter(berikutnya);
  }

  const tautanEkspor = (() => {
    const params = new URLSearchParams({ tahun: String(tahun) });
    if (filter.q) params.set("q", filter.q);
    if (filter.cabang) params.set("cabang", filter.cabang);
    if (filter.komisariat) params.set("komisariat", filter.komisariat);
    if (statusFilter) params.set("status", statusFilter);
    if (modePenuh) params.set("mode", "penuh");
    return `/api/admin/kas/ekspor?${params}`;
  })();
  const tautanEksporExcel = tautanEkspor.replace("/ekspor?", "/ekspor/excel?");
  const matrixDitampilkan =
    data?.matrix.filter(
      (kader) =>
        !statusFilter || kader.minggu.some((minggu) => minggu.status === statusFilter),
    ) ?? [];

  return (
    <div className="mx-auto max-w-7xl">
      <header className="border-b-2 border-hitam-900 pb-3">
        <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gmnimerah-600">
          Administrasi Organisasi
        </p>
        <h1 className="mt-1 font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
          Rekap Iuran Kas Kader
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Tinjau bukti transfer, catat pembayaran tunai, dan pantau status mingguan kader.
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

      {data && <section className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4" aria-label="Ringkasan statistik kas">
        {[
          ["Total kas masuk", rupiah(data.ringkasan.totalKasMasuk)],
          ["Kader sudah bayar", `${data.ringkasan.kaderSudahBayar} / ${data.ringkasan.kaderAktif}`],
          ["Minggu lunas", String(data.ringkasan.mingguLunas)],
          ["Menunggu verifikasi", `${data.ringkasan.pengajuanMenunggu} · ${rupiah(data.ringkasan.totalMenunggu)}`],
        ].map(([label, value]) => <article key={label} className="border-2 border-hitam-900 bg-white p-4"><p className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-500">{label}</p><p className="mt-1 font-serif text-xl font-extrabold text-hitam-900">{value}</p></article>)}
      </section>}

      <section className="mt-6 grid gap-4 lg:grid-cols-2">
        <div className="border-2 border-hitam-900 bg-white p-4">
          <h2 className="font-serif text-lg font-bold text-hitam-900">Atur Tarif Mingguan</h2>
          <form onSubmit={simpanTarif} className="mt-3 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
            <label>
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">Nominal (Rp)</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={nominal}
                onChange={(event) => setNominal(event.target.value)}
                className="w-full border-2 border-hitam-900 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">Berlaku mulai Senin</span>
              <input
                type="date"
                required
                value={tarifMulai}
                onChange={(event) => setTarifMulai(event.target.value)}
                className="w-full border-2 border-hitam-900 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={aksiId === "tarif"}
              className="self-end bg-hitam-900 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white hover:bg-hitam-700 disabled:opacity-50"
            >
              Simpan Tarif
            </button>
          </form>
          {data?.tarif.length ? (
            <ul className="mt-3 border-t border-hitam-100 pt-2 text-xs text-hitam-600">
              {data.tarif.slice(-4).reverse().map((item) => (
                <li key={item.id} className="flex justify-between gap-3 py-1">
                  <span>Berlaku {tanggalLabel(item.berlakuMulai)}</span>
                  <strong>{rupiah(item.nominal)}</strong>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-hitam-500">Tarif belum diatur; kader belum dapat mengajukan pembayaran.</p>
          )}
        </div>

        <div className="border-2 border-hitam-900 bg-white p-4">
          <h2 className="font-serif text-lg font-bold text-hitam-900">Catat Pembayaran Tunai</h2>
          <form onSubmit={catatTunai} className="mt-3 grid gap-3 sm:grid-cols-2">
            <label className="sm:col-span-2">
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">Kader</span>
              <select
                required
                value={kaderId}
                onChange={(event) => setKaderId(event.target.value)}
                className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm"
              >
                <option value="">Pilih kader</option>
                {data?.matrix.map((kader) => (
                  <option key={kader.id} value={kader.id}>
                    {kader.namaLengkap} · {kader.cabangDpc ?? "DPC belum diisi"}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">Minggu mulai (Senin)</span>
              <input
                type="date"
                required
                value={manualMingguMulai}
                onChange={(event) => setManualMingguMulai(event.target.value)}
                className="w-full border-2 border-hitam-900 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">Jumlah minggu</span>
              <input
                type="number"
                min="1"
                step="1"
                required
                value={manualJumlah}
                onChange={(event) => setManualJumlah(event.target.value)}
                className="w-full border-2 border-hitam-900 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">Tanggal bayar</span>
              <input
                type="date"
                required
                value={manualTanggal}
                onChange={(event) => setManualTanggal(event.target.value)}
                className="w-full border-2 border-hitam-900 px-3 py-2 text-sm"
              />
            </label>
            <label>
              <span className="mb-1 block font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">Catatan</span>
              <input
                type="text"
                maxLength={500}
                value={manualCatatan}
                onChange={(event) => setManualCatatan(event.target.value)}
                className="w-full border-2 border-hitam-900 px-3 py-2 text-sm"
              />
            </label>
            <button
              type="submit"
              disabled={aksiId === "tunai" || !kaderId}
              className="bg-gmnimerah-500 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white hover:bg-gmnimerah-600 disabled:opacity-50 sm:col-span-2"
            >
              Catat Tunai &amp; Tandai Lunas
            </button>
          </form>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-hitam-900 pb-2">
          <div>
            <h2 className="font-serif text-xl font-extrabold text-hitam-900">Antrean Verifikasi</h2>
            <p className="text-xs text-hitam-500">Pengajuan transfer yang belum ditinjau.</p>
          </div>
          {memuat && <span role="status" className="text-sm text-hitam-500">Memuat...</span>}
        </div>
        {data?.pembayaran.length ? (
          <ul className="mt-3 space-y-3">
            {data.pembayaran.map((item) => (
              <li key={item.id} className="border-2 border-hitam-900 bg-white p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-serif text-lg font-bold text-hitam-900">
                      {data.rekapPenuh && item.kader ? item.kader.namaLengkap : item.labelAnonim}
                    </p>
                    {data.rekapPenuh && item.kader && <p className="font-mono text-[11px] text-hitam-500">
                      @{item.kader.username} · {item.kader.cabangDpc ?? "DPC —"} · {item.kader.komisariat ?? "Komisariat —"}
                    </p>}
                    <p className="mt-2 text-sm text-hitam-700">
                      {item.jumlahMinggu} minggu · {rupiah(item.totalNominal)} · dibayar{" "}
                      {tanggalLabel(item.tanggalBayar)}
                    </p>
                    <p className="mt-1 text-xs text-hitam-500">
                      {item.minggu.map((minggu) => tanggalLabel(minggu.mulai)).join(", ")}
                    </p>
                    {item.catatan && <p className="mt-2 text-sm text-hitam-600">Catatan: {item.catatan}</p>}
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {item.bukti && (
                      <a
                        href={`/api/kas/${item.id}/bukti`}
                        target="_blank"
                        rel="noreferrer"
                        className="border-2 border-hitam-900 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 hover:bg-kertas-100"
                      >
                        Lihat Bukti
                      </a>
                    )}
                    <button
                      type="button"
                      disabled={aksiId === item.id}
                      onClick={() => void prosesPembayaran(item.id, "TOLAK")}
                      className="border-2 border-gmnimerah-600 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-gmnimerah-700 hover:bg-gmnimerah-50 disabled:opacity-50"
                    >
                      Tolak
                    </button>
                    <button
                      type="button"
                      disabled={aksiId === item.id}
                      onClick={() => void prosesPembayaran(item.id, "SETUJUI")}
                      className="bg-emerald-700 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white hover:bg-emerald-800 disabled:opacity-50"
                    >
                      Setujui
                    </button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-3 border border-hitam-200 bg-white p-4 text-sm text-hitam-500">
            Tidak ada pengajuan yang menunggu verifikasi.
          </p>
        )}
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-hitam-900 pb-2">
          <div>
            <h2 className="font-serif text-xl font-extrabold text-hitam-900">Matrix Status Tahunan</h2>
            <p className="text-xs text-hitam-500">Status tampil dengan warna dan label teks; geser tabel ke samping untuk melihat semua minggu.</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {data?.bolehRekapPenuh && (
              <button
                type="button"
                onClick={() => setModePenuh((nilai) => !nilai)}
                className="border-2 border-hitam-900 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 hover:bg-kertas-100"
              >
                {modePenuh ? "Mode anonim" : "Lihat rekap penuh"}
              </button>
            )}
            <label className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">
              Tahun{" "}
              <select
                value={tahun}
                onChange={(event) => {
                  const nilai = Number(event.target.value);
                  setTahun(nilai);
                }}
                className="border-2 border-hitam-900 bg-white px-2 py-1 text-sm"
              >
                {[tahun - 1, tahun, tahun + 1].map((nilai) => (
                  <option key={nilai} value={nilai}>{nilai}</option>
                ))}
              </select>
            </label>
            <a
              href={tautanEkspor}
              className="bg-hitam-900 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white hover:bg-hitam-700"
            >
              Ekspor CSV
            </a>
            <a
              href={tautanEksporExcel}
              className="bg-emerald-700 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white hover:bg-emerald-800"
            >
              Ekspor Excel
            </a>
          </div>
        </div>
        <form onSubmit={terapkanFilter} className="mt-3 grid gap-2 sm:grid-cols-5">
          <input value={cari} onChange={(event) => setCari(event.target.value)} placeholder="Nama / username / NIM" className="border border-hitam-300 bg-white px-3 py-2 text-sm" />
          <input value={cabang} onChange={(event) => setCabang(event.target.value)} placeholder="Filter DPC" className="border border-hitam-300 bg-white px-3 py-2 text-sm" />
          <input value={komisariat} onChange={(event) => setKomisariat(event.target.value)} placeholder="Filter komisariat" className="border border-hitam-300 bg-white px-3 py-2 text-sm" />
          <select
            value={statusFilter}
            onChange={(event) => {
              const nilai = event.target.value;
              setStatusFilter(nilai === "" || statusKasValid(nilai) ? nilai : "");
            }}
            className="border border-hitam-300 bg-white px-3 py-2 text-sm"
            aria-label="Filter status kas"
          >
            <option value="">Semua status</option>
            {Object.entries(LABEL_STATUS).map(([status, label]) => (
              <option key={status} value={status}>{label}</option>
            ))}
          </select>
          <button type="submit" className="border-2 border-hitam-900 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 hover:bg-kertas-100">Terapkan Filter</button>
        </form>
        <div className="mt-3 overflow-auto border-2 border-hitam-900 bg-white">
          {matrixDitampilkan.length ? (
            <table className="min-w-max border-collapse text-left text-xs">
              <thead>
                <tr className="bg-hitam-900 text-white">
                  <th className="sticky left-0 z-10 min-w-56 border-r border-white/20 bg-hitam-900 px-3 py-2">Kader / DPC</th>
                  {data?.minggu.map((minggu) => (
                    <th key={minggu} className="min-w-28 border-r border-white/20 px-2 py-2 text-center">
                      {tanggalLabel(minggu)}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {matrixDitampilkan.map((kader) => (
                  <tr key={kader.id} className="border-t border-hitam-200">
                    <th className="sticky left-0 z-10 border-r border-hitam-200 bg-white px-3 py-2 align-top">
                      <span className="block font-semibold text-hitam-900">{kader.namaLengkap}</span>
                      <span className="block font-mono text-[10px] font-normal text-hitam-500">
                        @{kader.username} · {kader.cabangDpc ?? "DPC —"}
                      </span>
                    </th>
                    {kader.minggu.map((item) => (
                      <td key={item.mingguMulai} className="border-r border-hitam-100 px-1.5 py-1.5 text-center">
                        <span title={`${LABEL_STATUS[item.status]} · ${item.nominal === null ? "tarif belum diatur" : rupiah(item.nominal)}`} className={`inline-block whitespace-nowrap rounded-sm px-1.5 py-1 font-mono text-[9px] font-bold uppercase ${GAYA_STATUS[item.status]}`}>
                          {LABEL_STATUS[item.status]}
                        </span>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="p-5 text-sm text-hitam-500">Tidak ada kader aktif yang cocok dengan filter.</p>
          )}
        </div>
      </section>
    </div>
  );
}
