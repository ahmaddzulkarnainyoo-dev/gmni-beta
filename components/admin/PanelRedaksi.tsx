"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

type BarisAntrian = {
  id: string;
  judul: string;
  slug: string;
  status: string;
  ringkasan: string | null;
  kategori: string;
  penulis: string;
  tanggal: string;
};

/** Panel Antrian Redaksi: setujui/minta revisi/tolak/pratinjau artikel masuk. */
export function PanelRedaksi({
  antrian,
  gagalMemuat,
}: {
  antrian: BarisAntrian[];
  gagalMemuat: boolean;
}) {
  const router = useRouter();
  const [memuatId, setMemuatId] = useState<string | null>(null);
  const [modal, setModal] = useState<{ id: string; judul: string; jenis: "REVISI" | "TOLAK" } | null>(null);
  const [catatan, setCatatan] = useState("");
  const [eror, setEror] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  async function kirimStatus(id: string, status: "TERBIT" | "DIMINTA_REVISI" | "DITOLAK", catatanRevisi?: string) {
    setMemuatId(id);
    setEror(null);
    setSukses(null);
    try {
      const res = await fetch(`/api/admin/artikel/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(catatanRevisi ? { status, catatanRevisi } : { status }),
      });
      let data: { ok?: boolean; error?: string } = {};
      try {
        data = (await res.json()) as typeof data;
      } catch {
        data = { error: `Server tidak membalas JSON (kode ${res.status}).` };
      }
      if (!res.ok || !data.ok) {
        setEror(data.error ?? `Gagal memperbarui artikel (kode ${res.status}).`);
        return;
      }
      setSukses(
        status === "TERBIT"
          ? "Artikel diterbitkan — sudah tampil di kanal publik."
          : status === "DIMINTA_REVISI"
            ? "Revisi diminta — penulis diberi catatan."
            : "Artikel ditolak — penulis diberi catatan.",
      );
      setModal(null);
      setCatatan("");
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuatId(null);
    }
  }

  return (
    <div className="mt-6">
      {gagalMemuat && (
        <p role="alert" className="border-2 border-gmnimerah-500 bg-gmnimerah-50 px-4 py-2.5 text-sm font-semibold text-gmnimerah-700">
          Data tidak dapat dimuat sementara — periksa koneksi database lalu muat ulang halaman.
        </p>
      )}
      {eror && (
        <p role="alert" className="border-2 border-gmnimerah-500 bg-gmnimerah-50 px-4 py-2.5 text-sm font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
      {sukses && (
        <p role="status" className="border-2 border-hitam-900 bg-kertas-200 px-4 py-2.5 text-sm font-semibold text-hitam-800">
          {sukses}
        </p>
      )}

      {antrian.length === 0 && !gagalMemuat ? (
        <div className="border-4 border-dashed border-hitam-200 bg-kertas-100 p-10 text-center">
          <p className="font-serif text-xl font-bold text-hitam-900">Antrian bersih.</p>
          <p className="mt-1 text-sm text-hitam-500">
            Tidak ada artikel yang menunggu keputusan redaksi.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-hitam-100 border-2 border-hitam-900 bg-white">
          {antrian.map((a) => (
            <li key={a.id} className="p-4 md:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`inline-block px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${
                        a.status === "DIAJUKAN"
                          ? "bg-hitam-900 text-white"
                          : "border border-hitam-900 text-hitam-700"
                      }`}
                    >
                      {a.status === "DIAJUKAN" ? "Masuk" : "Ditinjau"}
                    </span>
                    <span className="font-mono text-[10px] uppercase tracking-widest text-hitam-400">
                      {a.kategori} · {a.tanggal}
                    </span>
                  </div>
                  <h3 className="mt-1 font-serif text-lg font-bold text-hitam-900">{a.judul}</h3>
                  <p className="mt-0.5 text-sm text-hitam-500">
                    oleh {a.penulis}
                    {a.ringkasan ? ` — ${a.ringkasan.slice(0, 120)}` : ""}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Link
                    href={`/admin/artikel/${a.id}/edit`}
                    className="border-2 border-hitam-900 bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-kertas-200"
                  >
                    Pratinjau / Edit
                  </Link>
                  <button
                    type="button"
                    disabled={memuatId !== null}
                    onClick={() => void kirimStatus(a.id, "TERBIT")}
                    className="inline-flex items-center gap-1.5 bg-gmnimerah-500 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
                  >
                    {memuatId === a.id && <Spinner />} Terbitkan
                  </button>
                  <button
                    type="button"
                    disabled={memuatId !== null}
                    onClick={() => {
                      setModal({ id: a.id, judul: a.judul, jenis: "REVISI" });
                      setCatatan("");
                    }}
                    className="border-2 border-hitam-900 bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-kertas-200 disabled:opacity-50"
                  >
                    Revisi
                  </button>
                  <button
                    type="button"
                    disabled={memuatId !== null}
                    onClick={() => {
                      setModal({ id: a.id, judul: a.judul, jenis: "TOLAK" });
                      setCatatan("");
                    }}
                    className="border-2 border-gmnimerah-500 bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-gmnimerah-600 transition-colors hover:bg-gmnimerah-50 disabled:opacity-50"
                  >
                    Tolak
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {modal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-hitam-900/60 p-4"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setModal(null);
          }}
        >
          <div className="w-full max-w-md border-4 border-hitam-900 bg-kertas-100 p-5">
            <div className="flex items-start justify-between gap-3">
              <h3 className="font-serif text-lg font-bold text-hitam-900">
                {modal.jenis === "REVISI" ? "Minta Revisi" : "Tolak Artikel"}
              </h3>
              <button
                type="button"
                onClick={() => setModal(null)}
                aria-label="Tutup"
                className="font-mono text-sm font-bold text-hitam-500 hover:text-hitam-900"
              >
                ✕
              </button>
            </div>
            <p className="mt-1 truncate text-sm text-hitam-600">{modal.judul}</p>
            <label className="mt-4 block">
              <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
                Catatan untuk penulis (wajib)
              </span>
              <textarea
                rows={4}
                required
                value={catatan}
                onChange={(e) => setCatatan(e.target.value)}
                className="w-full resize-y border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
                placeholder={modal.jenis === "REVISI" ? "Bagian yang perlu diperbaiki..." : "Alasan penolakan..."}
              />
            </label>
            <div className="mt-4 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setModal(null)}
                className="border-2 border-hitam-900 bg-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 hover:bg-kertas-200"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={memuatId !== null || catatan.trim().length < 5}
                onClick={() => {
                  if (!modal) return;
                  void kirimStatus(
                    modal.id,
                    modal.jenis === "REVISI" ? "DIMINTA_REVISI" : "DITOLAK",
                    catatan.trim(),
                  );
                }}
                className={`inline-flex items-center gap-1.5 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors disabled:opacity-50 ${
                  modal.jenis === "REVISI" ? "bg-hitam-900 hover:bg-hitam-700" : "bg-gmnimerah-500 hover:bg-gmnimerah-600"
                }`}
              >
                {memuatId === modal.id && <Spinner />} Kirim
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}