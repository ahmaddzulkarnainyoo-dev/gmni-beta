"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

export type BarisLog = {
  id: string;
  aksi: string;
  entitasTipe: string;
  entitasId: string;
  aktorNama: string | null;
  aktorUsername: string | null;
  alamatIp: string | null;
  tanggal: string;
  dataSebelum: unknown;
  dataSesudah: unknown;
};

function fmtWaktu(iso: string): string {
  try {
    const d = new Date(iso);
    return (
      d.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric" }) +
      " " +
      d.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit" })
    );
  } catch {
    return iso;
  }
}

/** Humanize kode aksi: "user.setujui_kader" → "user setujui kader". */
function labelAksi(aksi: string): string {
  return aksi.replace(/[._-]+/g, " ").trim();
}

function ringkas(v: unknown): string {
  if (v === null || v === undefined) return "";
  try {
    return JSON.stringify(v, null, 2);
  } catch {
    return String(v);
  }
}

/**
 * Tabel jejak audit (Super Admin/Editor): filter aksi/entitas/rentang tanggal,
 * pagination 30/halaman, dan expand detail snapshot JSON sebelum/sesudah.
 */
export function TabelAuditLog({
  log,
  total,
  halaman,
  jumlahHalaman,
  q,
  entitas,
  dari,
  hingga,
  entitasTipeList,
}: {
  log: BarisLog[];
  total: number;
  halaman: number;
  jumlahHalaman: number;
  q: string;
  entitas: string;
  dari: string;
  hingga: string;
  entitasTipeList: string[];
}) {
  const router = useRouter();
  const [aksiCari, setAksiCari] = useState(q);
  const [entitasPilih, setEntitasPilih] = useState(entitas);
  const [dariPilih, setDariPilih] = useState(dari);
  const [hinggaPilih, setHinggaPilih] = useState(hingga);
  const [buka, setBuka] = useState<Record<string, boolean>>({});

  function terapkan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const params = new URLSearchParams();
    if (aksiCari.trim()) params.set("q", aksiCari.trim());
    if (entitasPilih) params.set("entitas", entitasPilih);
    if (dariPilih) params.set("dari", dariPilih);
    if (hinggaPilih) params.set("hingga", hinggaPilih);
    router.push(`/admin/audit-log${params.toString() ? `?${params.toString()}` : ""}`);
    router.refresh();
  }

  function buatUrl(p: number) {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (entitas) params.set("entitas", entitas);
    if (dari) params.set("dari", dari);
    if (hingga) params.set("hingga", hingga);
    if (p > 1) params.set("halaman", String(p));
    return `/admin/audit-log${params.toString() ? `?${params.toString()}` : ""}`;
  }

  return (
    <div className="mt-6">
      <form
        onSubmit={terapkan}
        className="flex flex-wrap items-end gap-3 border-2 border-hitam-900 bg-kertas-100 p-4"
      >
        <label className="block min-w-[180px] flex-1">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Cari Aksi
          </span>
          <input
            type="text"
            value={aksiCari}
            onChange={(e) => setAksiCari(e.target.value)}
            placeholder="mis. artikel, suspend, role"
            className="w-full border border-hitam-300 bg-white px-2 py-1.5 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Entitas
          </span>
          <select
            value={entitasPilih}
            onChange={(e) => setEntitasPilih(e.target.value)}
            className="border border-hitam-300 bg-white px-2 py-1.5 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          >
            <option value="">Semua</option>
            {entitasTipeList.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Dari
          </span>
          <input
            type="date"
            value={dariPilih}
            onChange={(e) => setDariPilih(e.target.value)}
            className="border border-hitam-300 bg-white px-2 py-1.5 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          />
        </label>
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Hingga
          </span>
          <input
            type="date"
            value={hinggaPilih}
            onChange={(e) => setHinggaPilih(e.target.value)}
            className="border border-hitam-300 bg-white px-2 py-1.5 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          />
        </label>
        <button
          type="submit"
          className="border-2 border-hitam-900 bg-hitam-900 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gmnimerah-600"
        >
          Terapkan
        </button>
        <button
          type="button"
          onClick={() => {
            setAksiCari("");
            setEntitasPilih("");
            setDariPilih("");
            setHinggaPilih("");
            router.push("/admin/audit-log");
            router.refresh();
          }}
          className="border border-hitam-300 px-3 py-2 font-mono text-[11px] uppercase tracking-widest text-hitam-500 transition-colors hover:border-hitam-900 hover:text-hitam-900"
        >
          Reset
        </button>
      </form>

      {log.length === 0 ? (
        <div className="mt-6 border-4 border-dashed border-hitam-200 bg-kertas-100 p-10 text-center">
          <p className="font-serif text-xl font-bold text-hitam-900">
            Belum ada jejak audit{q || entitas || dari || hingga ? " yang cocok" : ""}.
          </p>
          <p className="mt-2 text-sm text-hitam-500">
            Setiap perubahan artikel, pengguna, peran, dan halaman statis terekam di sini.
          </p>
        </div>
      ) : (
        <>
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-hitam-500">
            {total} entri · Halaman {halaman} dari {jumlahHalaman}
          </p>
          <div className="mt-2 overflow-x-auto border-2 border-hitam-900 bg-white">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead>
                <tr className="border-b-2 border-hitam-900 bg-kertas-200">
                  <th className="px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">
                    Waktu
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">
                    Aktor
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">
                    Aksi
                  </th>
                  <th className="px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">
                    Entitas
                  </th>
                  <th className="px-3 py-2 text-right font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody>
                {log.map((l) => (
                  <LogBaris
                    key={l.id}
                    l={l}
                    terbuka={!!buka[l.id]}
                    toggle={() => setBuka((b) => ({ ...b, [l.id]: !b[l.id] }))}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </>
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

function LogBaris({
  l,
  terbuka,
  toggle,
}: {
  l: BarisLog;
  terbuka: boolean;
  toggle: () => void;
}) {
  const sebelum = ringkas(l.dataSebelum);
  const sesudah = ringkas(l.dataSesudah);
  const adaDetail = sebelum !== "" || sesudah !== "";
  return (
    <>
      <tr className="border-b border-hitam-200 align-top hover:bg-kertas-100">
        <td className="whitespace-nowrap px-3 py-2 font-mono text-[12px] text-hitam-600">
          {fmtWaktu(l.tanggal)}
        </td>
        <td className="px-3 py-2 text-hitam-700">
          {l.aktorNama ?? <span className="text-hitam-400">Sistem/Publik</span>}
          {l.aktorUsername && (
            <span className="block font-mono text-[11px] text-hitam-400">
              @{l.aktorUsername}
            </span>
          )}
        </td>
        <td className="px-3 py-2">
          <span className="font-mono text-[12px] font-bold text-hitam-900">
            {labelAksi(l.aksi)}
          </span>
          <span className="block font-mono text-[10px] text-hitam-400">{l.aksi}</span>
        </td>
        <td className="px-3 py-2 font-mono text-[12px] text-hitam-600">
          {l.entitasTipe}
          <span className="block font-mono text-[10px] text-hitam-400">
            {l.entitasId.length > 14 ? `${l.entitasId.slice(0, 14)}…` : l.entitasId}
          </span>
        </td>
        <td className="px-3 py-2 text-right">
          {adaDetail && (
            <button
              type="button"
              onClick={toggle}
              aria-expanded={terbuka}
              className="border border-hitam-900 px-2 py-1 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
            >
              {terbuka ? "Tutup" : "Lihat"}
            </button>
          )}
        </td>
      </tr>
      {terbuka && (
        <tr className="border-b border-hitam-200 bg-kertas-100">
          <td colSpan={5} className="px-3 py-3">
            <div className="grid gap-3 md:grid-cols-2">
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-500">
                  Sebelum
                </p>
                <pre className="mt-1 overflow-x-auto border border-hitam-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-hitam-700">
                  {sebelum || "—"}
                </pre>
              </div>
              <div>
                <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-500">
                  Sesudah
                </p>
                <pre className="mt-1 overflow-x-auto border border-hitam-200 bg-white p-2 font-mono text-[11px] leading-relaxed text-hitam-700">
                  {sesudah || "—"}
                </pre>
              </div>
            </div>
            {l.alamatIp && (
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-hitam-400">
                IP: {l.alamatIp}
              </p>
            )}
          </td>
        </tr>
      )}
    </>
  );
}
