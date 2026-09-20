"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import type { StatusArtikel } from "@prisma/client";
import { LABEL_STATUS, GAYA_STATUS } from "@/lib/label-status";

type BarisArtikel = {
  id: string;
  judul: string;
  slug: string;
  status: StatusArtikel;
  disematkan: boolean;
  gambarUtama: string | null;
  tanggalTerbit: string | null;
  kategoriNama: string;
  penulisNama: string;
  visibilitasPenulis: "ASLI" | "SAMARAN" | "REDAKSI";
  namaTampilanKustom: string | null;
};

type KategoriOpsi = { id: string; nama: string; isTetap: boolean };

const STATUS_OPTIONS: StatusArtikel[] = [
  "DRAFT",
  "DIAJUKAN",
  "SEDANG_DITINJAU",
  "DIMINTA_REVISI",
  "DISETUJUI",
  "TERBIT",
  "DITOLAK",
  "DIARSIPKAN",
];

function fmtTanggal(iso: string | null): string {
  if (!iso) return "—";
  const d = new Date(iso);
  return d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" });
}

/** Tabel kelola artikel: pencarian, filter kategori/status, pagination, aksi. */
export function TabelArtikelAdmin({
  artikel,
  total,
  halaman,
  jumlahHalaman,
  kataKunci,
  kategoriId,
  statusFilter,
  kategori,
}: {
  artikel: BarisArtikel[];
  total: number;
  halaman: number;
  jumlahHalaman: number;
  kataKunci: string;
  kategoriId: string;
  statusFilter: string;
  kategori: KategoriOpsi[];
}) {
  const router = useRouter();
  const [q, setQ] = useState(kataKunci);
  const [kat, setKat] = useState(kategoriId);
  const [sts, setSts] = useState(statusFilter);
  const [memuat, setMemuat] = useState<string | null>(null);
  const [eror, setEror] = useState<string | null>(null);

  async function terapkan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (q.trim()) params.set("q", q.trim());
    if (kat) params.set("kategori", kat);
    if (sts) params.set("status", sts);
    router.push(`/admin/artikel${params.toString() ? `?${params.toString()}` : ""}`);
    router.refresh();
  }

  function buatUrl(p: number) {
    const params = new URLSearchParams();
    if (kataKunci) params.set("q", kataKunci);
    if (kategoriId) params.set("kategori", kategoriId);
    if (statusFilter) params.set("status", statusFilter);
    if (p > 1) params.set("halaman", String(p));
    return `/admin/artikel${params.toString() ? `?${params.toString()}` : ""}`;
  }

  async function arsipkan(a: BarisArtikel) {
    if (!confirm(`Arsipkan artikel "${a.judul}"?`)) return;
    setMemuat(a.id);
    setEror(null);
    try {
      const res = await fetch(`/api/admin/artikel/${a.id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEror(data.error ?? "Gagal mengarsipkan artikel.");
        return;
      }
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(null);
    }
  }

  /** ACC/publish langsung (→ TERBIT) atau pulihkan dari arsip (→ DRAFT). */
  async function ubahStatus(a: BarisArtikel, status: StatusArtikel) {
    const konfirmasi =
      status === "TERBIT"
        ? `ACC & terbitkan "${a.judul}" sekarang? Artikel langsung tampil publik.`
        : `Pulihkan "${a.judul}" dari arsip ke draf?`;
    if (!confirm(konfirmasi)) return;
    setMemuat(a.id);
    setEror(null);
    try {
      const res = await fetch(`/api/admin/artikel/${a.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setEror(data.error ?? "Gagal mengubah status artikel.");
        return;
      }
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(null);
    }
  }

  return (
    <div className="mt-6">
      {eror && (
        <p
          role="alert"
          className="mb-4 border-2 border-gmnimerah-500 bg-gmnimerah-50 px-4 py-2.5 text-sm font-semibold text-gmnimerah-700"
        >
          {eror}
        </p>
      )}
      <form
        onSubmit={terapkan}
        className="flex flex-wrap items-end gap-3 border-2 border-hitam-900 bg-kertas-100 p-4"
      >
        <label className="block min-w-[220px] flex-1">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Cari Judul
          </span>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Ketik judul artikel..."
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Kategori
          </span>
          <select
            value={kat}
            onChange={(e) => setKat(e.target.value)}
            className="border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          >
            <option value="">Semua</option>
            {kategori.map((k) => (
              <option key={k.id} value={k.id}>
                {k.isTetap ? `${k.nama} (tetap)` : k.nama}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Status
          </span>
          <select
            value={sts}
            onChange={(e) => setSts(e.target.value)}
            className="border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          >
            <option value="">Semua</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {LABEL_STATUS[s]}
              </option>
            ))}
          </select>
        </label>
        <button
          type="submit"
          className="bg-hitam-900 px-5 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gmnimerah-600"
        >
          Terapkan Filter
        </button>
      </form>

      {eror && (
        <p role="alert" className="mt-4 border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}

      <p className="mt-4 text-sm text-hitam-500">{total} artikel ditemukan.</p>

      {artikel.length === 0 ? (
        <div className="mt-4 border-4 border-dashed border-hitam-200 bg-kertas-100 p-10 text-center">
          <p className="font-serif text-xl font-bold text-hitam-900">Tidak ada artikel.</p>
          <p className="mt-2 text-sm text-hitam-500">Ubah kata kunci/filter atau buat artikel baru.</p>
        </div>
      ) : (
        <div className="mt-4 overflow-x-auto border-2 border-hitam-900 bg-white">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b-2 border-hitam-900 bg-kertas-200 font-mono text-[11px] uppercase tracking-widest text-hitam-600">
                <th className="px-3 py-2">Artikel</th>
                <th className="px-3 py-2">Kategori</th>
                <th className="px-3 py-2">Penulis</th>
                <th className="px-3 py-2">Status</th>
                <th className="px-3 py-2">Terbit</th>
                <th className="px-3 py-2 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody>
              {artikel.map((a) => (
                <tr key={a.id} className="border-b border-hitam-100 hover:bg-kertas-100">
                  <td className="px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      {a.gambarUtama ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={a.gambarUtama}
                          alt=""
                          className="h-10 w-14 shrink-0 border border-hitam-200 object-cover"
                        />
                      ) : (
                        <span className="flex h-10 w-14 shrink-0 items-center justify-center border border-hitam-200 bg-kertas-200 font-mono text-[9px] uppercase text-hitam-400">
                          no-img
                        </span>
                      )}
                      <div className="min-w-0">
                        <Link
                          href={`/admin/artikel/${a.id}/edit`}
                          className="block max-w-[260px] truncate font-sans text-sm font-bold text-hitam-900 hover:text-gmnimerah-600"
                        >
                          {a.judul}
                        </Link>
                        <span className="block font-mono text-[10px] text-hitam-400">
                          /{a.slug}
                          {a.disematkan && (
                            <span className="ml-1 inline-block bg-hitam-900 px-1 py-0.5 text-[9px] font-bold uppercase text-white">
                              Pin
                            </span>
                          )}
                        </span>
                      </div>
                    </div>
                  </td>
                  <td className="px-3 py-2.5 text-hitam-700">{a.kategoriNama}</td>
                  <td className="px-3 py-2.5 text-hitam-700">
                    {a.visibilitasPenulis === "SAMARAN"
                      ? a.namaTampilanKustom
                      : a.visibilitasPenulis === "REDAKSI"
                        ? "Redaksi"
                        : a.penulisNama}
                  </td>
                  <td className="px-3 py-2.5">
                    <span className={`inline-block border border-hitam-900 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest ${GAYA_STATUS[a.status]}`}>
                      {LABEL_STATUS[a.status]}
                    </span>
                  </td>
                  <td className="px-3 py-2.5 font-mono text-[12px] text-hitam-600">
                    {fmtTanggal(a.tanggalTerbit)}
                  </td>
                  <td className="px-3 py-2.5">
                    <div className="flex justify-end gap-1.5">
                      {a.status !== "TERBIT" && a.status !== "DIARSIPKAN" && (
                        <button
                          type="button"
                          disabled={memuat === a.id}
                          onClick={() => ubahStatus(a, "TERBIT")}
                          className="border border-gmnimerah-500 bg-gmnimerah-500 px-2 py-1 font-mono text-[10px] font-bold uppercase text-white transition-colors hover:bg-gmnimerah-700 disabled:opacity-40"
                        >
                          {memuat === a.id ? "…" : "ACC"}
                        </button>
                      )}
                      {a.status === "DIARSIPKAN" && (
                        <button
                          type="button"
                          disabled={memuat === a.id}
                          onClick={() => ubahStatus(a, "DRAFT")}
                          className="border border-hitam-900 px-2 py-1 font-mono text-[10px] font-bold uppercase text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white disabled:opacity-40"
                        >
                          {memuat === a.id ? "…" : "Pulihkan"}
                        </button>
                      )}
                      <Link
                        href={`/admin/artikel/${a.id}/edit`}
                        className="border border-hitam-900 px-2 py-1 font-mono text-[10px] font-bold uppercase text-hitam-900 transition-colors hover:bg-kertas-200"
                      >
                        Edit
                      </Link>
                      <Link
                        href={`/artikel/${a.slug}`}
                        target="_blank"
                        className="border border-hitam-300 px-2 py-1 font-mono text-[10px] uppercase text-hitam-500 hover:border-hitam-900"
                      >
                        Lihat
                      </Link>
                      <button
                        type="button"
                        disabled={memuat === a.id || a.status === "DIARSIPKAN"}
                        onClick={() => arsipkan(a)}
                        className="border border-gmnimerah-700 px-2 py-1 font-mono text-[10px] font-bold uppercase text-gmnimerah-700 transition-colors hover:bg-gmnimerah-700 hover:text-white disabled:opacity-40"
                      >
                        {a.status === "DIARSIPKAN" ? "Diarsip" : "Arsip"}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {jumlahHalaman > 1 && (
        <nav className="mt-5 flex items-center justify-between gap-3 border-t-2 border-hitam-900 pt-4">
          <p className="text-sm text-hitam-500">
            Halaman {halaman} dari {jumlahHalaman}
          </p>
          <div className="flex gap-1.5">
            {halaman > 1 && (
              <Link
                href={buatUrl(halaman - 1)}
                className="border-2 border-hitam-900 px-3 py-1.5 font-mono text-[11px] font-bold uppercase text-hitam-900 transition-colors hover:bg-kertas-200"
              >
                ← Sebelumnya
              </Link>
            )}
            {halaman < jumlahHalaman && (
              <Link
                href={buatUrl(halaman + 1)}
                className="border-2 border-hitam-900 px-3 py-1.5 font-mono text-[11px] font-bold uppercase text-hitam-900 transition-colors hover:bg-kertas-200"
              >
                Berikutnya →
              </Link>
            )}
          </div>
        </nav>
      )}
    </div>
  );
}