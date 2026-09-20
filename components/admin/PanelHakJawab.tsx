"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";
import { fmtTanggal } from "@/lib/articles";

type BarisHakJawab = {
  id: string;
  namaPengaju: string;
  emailPengaju: string | null;
  judulPemberitaan: string;
  urlPemberitaan: string | null;
  isi: string;
  status: string;
  jawabanRedaksi: string | null;
  createdAt: string;
};

const LABEL_STATUS: Record<string, string> = {
  MENUNGGU: "Menunggu",
  DIPROSES: "Diproses",
  DIJAWAB: "Dijawab",
  DITOLAK: "Ditolak",
};

/** Panel tinjauan pengajuan hak jawab pembaca (Pedoman Media Siber). */
export function PanelHakJawab({ daftar }: { daftar: BarisHakJawab[] }) {
  const router = useRouter();
  const [memuatId, setMemuatId] = useState<string | null>(null);
  const [jawaban, setJawaban] = useState<Record<string, string>>({});
  const [eror, setEror] = useState<string | null>(null);
  const [sukses, setSukses] = useState<string | null>(null);

  async function kirim(id: string, status: "DIPROSES" | "DIJAWAB" | "DITOLAK") {
    setMemuatId(id);
    setEror(null);
    setSukses(null);
    try {
      const res = await fetch(`/api/admin/hak-jawab/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, jawabanRedaksi: jawaban[id] ?? undefined }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEror(data.error ?? `Gagal memperbarui pengajuan (kode ${res.status}).`);
        return;
      }
      setSukses(
        status === "DIJAWAB"
          ? "Jawaban redaksi tercatat."
          : status === "DITOLAK"
            ? "Pengajuan ditolak."
            : "Pengajuan diproses.",
      );
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuatId(null);
    }
  }

  if (daftar.length === 0) {
    return (
      <div className="mt-4 border-4 border-dashed border-hitam-200 bg-kertas-100 p-8 text-center">
        <p className="font-serif text-lg font-bold text-hitam-900">Belum ada pengajuan hak jawab.</p>
        <p className="mt-1 text-sm text-hitam-500">
          Pengajuan pembaca lewat formulir di /hak-jawab akan muncul di sini.
        </p>
      </div>
    );
  }

  return (
    <div className="mt-4 space-y-3">
      {eror && (
        <p role="alert" className="border-2 border-gmnimerah-500 bg-gmnimerah-50 px-4 py-2.5 text-sm font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
      {daftar.map((h) => (
        <article key={h.id} className="border-2 border-hitam-900 bg-white p-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span
              className={`inline-block px-1.5 py-0.5 font-mono text-[9px] font-bold uppercase tracking-widest ${
                h.status === "DIJAWAB"
                  ? "bg-hitam-900 text-white"
                  : h.status === "DITOLAK"
                    ? "border border-gmnimerah-500 text-gmnimerah-600"
                    : "border border-hitam-900 text-hitam-700"
              }`}
            >
              {LABEL_STATUS[h.status] ?? h.status}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-widest text-hitam-400">
              {fmtTanggal(new Date(h.createdAt))}
            </span>
          </div>
          <p className="mt-1 font-serif text-base font-bold text-hitam-900">{h.judulPemberitaan}</p>
          <p className="text-sm text-hitam-500">
            oleh {h.namaPengaju}
            {h.emailPengaju ? ` · ${h.emailPengaju}` : ""}
            {h.urlPemberitaan ? (
              <>
                {" · "}
                <a href={h.urlPemberitaan} target="_blank" rel="noreferrer" className="text-gmnimerah-600 hover:underline">
                  tautan
                </a>
              </>
            ) : null}
          </p>
          <p className="mt-2 whitespace-pre-line border-l-4 border-hitam-200 pl-3 text-sm leading-relaxed text-hitam-700">
            {h.isi}
          </p>
          {h.jawabanRedaksi && (
            <p className="mt-2 border-2 border-hitam-900 bg-kertas-100 p-3 text-sm text-hitam-800">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-500">
                Jawaban redaksi:{" "}
              </span>
              {h.jawabanRedaksi}
            </p>
          )}
          {h.status !== "DIJAWAB" && h.status !== "DITOLAK" && (
            <>
              <textarea
                rows={3}
                value={jawaban[h.id] ?? ""}
                onChange={(e) => setJawaban((s) => ({ ...s, [h.id]: e.target.value }))}
                placeholder="Jawaban redaksi (wajib bila DIJAWAB; minimal 10 karakter)..."
                className="mt-3 w-full resize-y border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={memuatId !== null || (jawaban[h.id] ?? "").trim().length < 10}
                  onClick={() => void kirim(h.id, "DIJAWAB")}
                  className="inline-flex items-center gap-1.5 bg-gmnimerah-500 px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-white hover:bg-gmnimerah-600 disabled:opacity-50"
                >
                  {memuatId === h.id && <Spinner />} Jawab
                </button>
                <button
                  type="button"
                  disabled={memuatId !== null}
                  onClick={() => void kirim(h.id, "DIPROSES")}
                  className="border-2 border-hitam-900 bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 hover:bg-kertas-200 disabled:opacity-50"
                >
                  Tandai Diproses
                </button>
                <button
                  type="button"
                  disabled={memuatId !== null}
                  onClick={() => void kirim(h.id, "DITOLAK")}
                  className="border-2 border-gmnimerah-500 bg-white px-3 py-2 font-mono text-[10px] font-bold uppercase tracking-widest text-gmnimerah-600 hover:bg-gmnimerah-50 disabled:opacity-50"
                >
                  Tolak
                </button>
              </div>
            </>
          )}
        </article>
      ))}
    </div>
  );
}