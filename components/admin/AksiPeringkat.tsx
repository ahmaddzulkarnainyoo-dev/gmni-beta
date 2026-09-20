"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Spinner } from "@/components/ui/Spinner";

/**
 * Aksi per-baris papan leaderboard admin: sembunyikan/tampilkan dari papan
 * publik + penyesuaian poin manual (+/- dengan alasan wajib).
 */
export function AksiPeringkat({
  userId,
  namaLengkap,
  disembunyikanPapan,
}: {
  userId: string;
  namaLengkap: string;
  disembunyikanPapan: boolean;
}) {
  const router = useRouter();
  const [bukaForm, setBukaForm] = useState(false);
  const [poin, setPoin] = useState("");
  const [alasan, setAlasan] = useState("");
  const [memuat, setMemuat] = useState<string | null>(null);
  const [pesan, setPesan] = useState<string | null>(null);
  const [eror, setEror] = useState<string | null>(null);

  async function togglePapan() {
    setMemuat("papan");
    setEror(null);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/leaderboard/papan", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, sembunyikan: !disembunyikanPapan }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEror(data.error ?? "Gagal mengubah tampilan papan.");
        return;
      }
      setPesan(disembunyikanPapan ? "Kader ditampilkan kembali di papan publik." : "Kader disembunyikan dari papan publik.");
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(null);
    }
  }

  async function kirimAjus() {
    setMemuat("ajus");
    setEror(null);
    setPesan(null);
    try {
      const res = await fetch("/api/admin/leaderboard/ajus", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId, poin: Number(poin.replace(/[^0-9+-]/g, "")), alasan: alasan.trim() }),
      });
      const data = (await res.json().catch(() => ({}))) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEror(data.error ?? "Gagal menyimpan penyesuaian.");
        return;
      }
      setPesan(`Poin ${Number(poin) > 0 ? "+" : ""}${poin} dicatat untuk ${namaLengkap}.`);
      setPoin("");
      setAlasan("");
      setBukaForm(false);
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(null);
    }
  }

  return (
    <div className="mt-2 space-y-2">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          disabled={memuat !== null}
          onClick={() => setBukaForm((v) => !v)}
          className="border-2 border-hitam-900 bg-white px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 hover:bg-kertas-200 disabled:opacity-50"
        >
          ± Poin
        </button>
        <button
          type="button"
          disabled={memuat !== null}
          onClick={() => void togglePapan()}
          className="inline-flex items-center gap-1.5 border-2 border-hitam-900 bg-white px-2.5 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-900 hover:bg-kertas-200 disabled:opacity-50"
        >
          {memuat === "papan" && <Spinner />}
          {disembunyikanPapan ? "Tampilkan" : "Sembunyikan"}
        </button>
        {pesan && <span className="text-xs font-semibold text-hitam-600">{pesan}</span>}
        {eror && <span className="text-xs font-semibold text-gmnimerah-600">{eror}</span>}
      </div>

      {bukaForm && (
        <div className="border-2 border-hitam-900 bg-kertas-100 p-3">
          <p className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-600">
            Penyesuaian poin manual — {namaLengkap}
          </p>
          <div className="mt-2 grid gap-2 sm:grid-cols-[110px_1fr_auto]">
            <input
              type="text"
              value={poin}
              onChange={(e) => setPoin(e.target.value)}
              placeholder="+10 / -5"
              className="border-2 border-hitam-900 bg-white px-2 py-1.5 font-mono text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
            />
            <input
              type="text"
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Alasan wajib (mis. kontribusi lapangan / pelanggaran etika)"
              className="border-2 border-hitam-900 bg-white px-2 py-1.5 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
            />
            <button
              type="button"
              disabled={memuat !== null || alasan.trim().length < 5 || poin.trim() === ""}
              onClick={() => void kirimAjus()}
              className="inline-flex items-center justify-center gap-1.5 bg-gmnimerah-500 px-3 py-1.5 font-mono text-[10px] font-bold uppercase tracking-widest text-white hover:bg-gmnimerah-600 disabled:opacity-50"
            >
              {memuat === "ajus" && <Spinner />} Catat
            </button>
          </div>
        </div>
      )}
    </div>
  );
}