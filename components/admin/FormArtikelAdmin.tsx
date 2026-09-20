"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { htmlKeMd, mdKeHtml } from "@/lib/markdown";
import { slugify } from "@/lib/slug";
import type { StatusArtikel, VisibilitasPenulis } from "@prisma/client";

type KategoriOpsi = { id: string; nama: string; slug: string; isTetap: boolean };
type TagOpsi = { id: string; nama: string; slug: string };
type PenulisOpsi = { id: string; namaLengkap: string; username: string };

type ArtikelEdit = {
  id: string;
  judul: string;
  slug: string;
  ringkasan: string | null;
  konten: string;
  gambarUtama: string | null;
  kategoriId: string;
  status: StatusArtikel;
  visibilitasPenulis: VisibilitasPenulis;
  namaTampilanKustom: string | null;
  disematkan: boolean;
  tanggalDijadwalkan: Date | null;
  tagIds: string[];
  penulisId: string;
};

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

const PILIHAN_VISIBILITAS: Array<{ nilai: VisibilitasPenulis; label: string; bantu: string }> = [
  { nilai: "ASLI", label: "Nama Asli", bantu: "Nama terhubung ke profil kader." },
  { nilai: "SAMARAN", label: "Nama Samaran", bantu: "Identitas dilindungi, dikecualikan dari leaderboard." },
  { nilai: "REDAKSI", label: "Atas Nama Redaksi", bantu: "Ditulis atas nama redaksi info Marhaen." },
];

const SNIPPET_MD: Array<{ teks: string; label: string }> = [
  { teks: "## ", label: "H2" },
  { teks: "### ", label: "H3" },
  { teks: "- ", label: "List" },
  { teks: "**teks**", label: "Bold" },
  { teks: "_teks_", label: "Miring" },
  { teks: "[judul](https://)", label: "Tautan" },
  { teks: "> ", label: "Kutipan" },
];

function keWaktuLokal(t: Date | null): string {
  if (!t) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${t.getFullYear()}-${pad(t.getMonth() + 1)}-${pad(t.getDate())}T${pad(t.getHours())}:${pad(t.getMinutes())}`;
}

/** Form lengkap CMS admin: editor markdown, gambar unggulan, kategori, tag, status. */
export function FormArtikelAdmin({
  buat,
  artikel,
  kategori,
  tags,
  penulis,
}: {
  buat: boolean;
  artikel?: ArtikelEdit;
  kategori: KategoriOpsi[];
  tags: TagOpsi[];
  penulis: PenulisOpsi[];
}) {
  const router = useRouter();
  const [judul, setJudul] = useState(artikel?.judul ?? "");
  const [slug, setSlug] = useState(artikel?.slug ?? "");
  const [slugDibuat, setSlugDibuat] = useState(Boolean(artikel));
  const [ringkasan, setRingkasan] = useState(artikel?.ringkasan ?? "");
  const [konten, setKonten] = useState(artikel ? htmlKeMd(artikel.konten) : "");
  const [gambarUtama, setGambarUtama] = useState(artikel?.gambarUtama ?? "");
  const [kategoriId, setKategoriId] = useState(artikel?.kategoriId ?? kategori[0]?.id ?? "");
  const [tagIds, setTagIds] = useState<string[]>(artikel?.tagIds ?? []);
  const [status, setStatus] = useState<StatusArtikel>(artikel?.status ?? "DRAFT");
  const [visibilitas, setVisibilitas] = useState<VisibilitasPenulis>(
    artikel?.visibilitasPenulis ?? "ASLI",
  );
  const [namaSamaran, setNamaSamaran] = useState(artikel?.namaTampilanKustom ?? "");
  const [disematkan, setDisematkan] = useState(artikel?.disematkan ?? false);
  const [tanggalJadwal, setTanggalJadwal] = useState(
    keWaktuLokal(artikel?.tanggalDijadwalkan ?? null),
  );
  const [penulisId, setPenulisId] = useState(artikel?.penulisId ?? "");
  const [catatanRevisi, setCatatanRevisi] = useState("");
  const [pratinjau, setPratinjau] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [mengunggah, setMengunggah] = useState(false);
  const [eror, setEror] = useState<string | null>(null);
const [bukaPratinjau, setBukaPratinjau] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [erorUnggah, setErorUnggah] = useState<string | null>(null);

  const pratinjauHtml = useMemo(() => mdKeHtml(konten), [konten]);

  function gantiJudul(v: string) {
    setJudul(v);
    if (!slugDibuat) setSlug(slugify(v));
  }

  function sisip(teks: string) {
    setKonten((k) => (k.length === 0 ? teks : `${k}\n\n${teks}`));
    setPratinjau(false);
  }

  function toggleTag(id: string) {
    setTagIds((ts) => (ts.includes(id) ? ts.filter((t) => t !== id) : [...ts, id]));
  }

  async function unggah(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setMengunggah(true);
    setErorUnggah(null);
    setInfo(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        setErorUnggah(data.error ?? "Upload gagal. Gunakan URL gambar manual.");
        return;
      }
      setGambarUtama(data.url);
      setInfo("Gambar unggulan berhasil diunggah.");
    } catch {
      setErorUnggah("Tidak dapat menghubungi server untuk upload.");
    } finally {
      setMengunggah(false);
    }
  }

  async function simpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemuat(true);
    setEror(null);
    setInfo(null);

    const payload: Record<string, unknown> = {
      judul,
      slug: slug || undefined,
      ringkasan,
      konten,
      gambarUtama: gambarUtama || null,
      kategoriId,
      tagIds,
      status,
      disematkan,
      visibilitasPenulis: visibilitas,
      namaTampilanKustom: visibilitas === "SAMARAN" ? namaSamaran : null,
      tanggalJadwal: tanggalJadwal || null,
      penulisId: penulisId || undefined,
      ...(!buat ? { catatanRevisi: catatanRevisi || undefined } : {}),
    };

    try {
      const url = buat ? "/api/admin/artikel" : `/api/admin/artikel/${artikel!.id}`;
      const res = await fetch(url, {
        method: buat ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !data.ok) {
        setEror(data.error ?? "Gagal menyimpan artikel.");
        return;
      }
      router.push("/admin/artikel");
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
    } finally {
      setMemuat(false);
    }
  }

  const butuhCatatan = !buat && (status === "DIMINTA_REVISI" || status === "DITOLAK");

  return (
    <form onSubmit={simpan} className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-hitam-900 pb-3">
        <div>
          <h1 className="font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
            {buat ? "Tulis Artikel" : "Edit Artikel"}
          </h1>
          <p className="mt-1 text-sm text-hitam-500">
            Editor Markdown dengan pratinjau. Perubahan langsung tersimpan ke
            database & dicatat di audit log.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setPratinjau((p) => !p)}
          className="border-2 border-hitam-900 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
        >
          {pratinjau ? "Kembali Menulis" : "Pratinjau"}
        </button>
      </div>

      {eror && (
        <p role="alert" className="border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
      {info && (
        <p role="status" className="border-2 border-hitam-900 bg-kertas-200 px-3 py-2 text-sm font-semibold text-hitam-800">
          {info}
        </p>
      )}

      <label className="block">
        <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Judul
        </span>
        <input
          type="text"
          required
          minLength={8}
          value={judul}
          onChange={(e) => gantiJudul(e.target.value)}
          className="w-full border-2 border-hitam-900 bg-white px-3 py-2.5 font-serif text-xl font-bold text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
          placeholder="Judul yang tegas — seperti headline media cetak"
        />
      </label>

      <label className="block">
        <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Slug (URL)
        </span>
        <input
          type="text"
          value={slug}
          onChange={(e) => {
            setSlugDibuat(true);
            setSlug(e.target.value);
          }}
          className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-mono text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          placeholder="slug-otomatis-dari-judul"
        />
        <span className="mt-1 block text-xs text-hitam-400">
          Kosongkan untuk membuat otomatis. Hanya huruf kecil, angka, dan tanda hubung.
        </span>
      </label>

      <label className="block">
        <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Ringkasan (opsional, tampil di kartu berita)
        </span>
        <textarea
          rows={2}
          value={ringkasan}
          onChange={(e) => setRingkasan(e.target.value)}
          className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
          maxLength={300}
          placeholder="Satu-dua kalimat yang memancing pembaca."
        />
      </label>

      {!pratinjau && (
        <div>
          <div className="mb-1 flex flex-wrap items-center justify-between gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Isi Artikel (Markdown)
            </span>
            <div className="flex gap-1">
              {SNIPPET_MD.map((s) => (
                <button
                  key={s.label}
                  type="button"
                  onClick={() => sisip(s.teks)}
                  className="border border-hitam-300 bg-kertas-100 px-2 py-1 font-mono text-[11px] text-hitam-700 transition-colors hover:border-gmnimerah-500 hover:bg-gmnimerah-50"
                >
                  {s.label}
                </button>
              ))}
            </div>
          </div>
          <textarea
            required
            minLength={40}
            rows={18}
            value={konten}
            onChange={(e) => setKonten(e.target.value)}
            className="w-full resize-y border-2 border-hitam-900 bg-white px-3 py-3 font-mono text-[13px] leading-relaxed text-hitam-900 outline-none transition-colors focus:border-gmnimerah-500"
            placeholder={"Gunakan Markdown:\n## Judul Bagian\n\nParagraf pembuka...\n\n- poin pertama\n- poin kedua\n\n**teks tebal** atau _teks miring_"}
          />
        </div>
      )}

      {pratinjau && (
        <div className="border-4 border-hitam-900 bg-white p-5 md:p-8">
          <h2 className="font-serif text-3xl font-extrabold leading-tight text-hitam-900">
            {judul || "(tanpa judul)"}
          </h2>
          <div
            className="konten-artikel mt-6"
            dangerouslySetInnerHTML={{ __html: pratinjauHtml }}
          />
        </div>
      )}

      <fieldset className="border-2 border-hitam-900 bg-kertas-100 p-4">
        <legend className="px-2 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Gambar Unggulan
        </legend>
        {gambarUtama ? (
          <div className="flex items-start gap-3">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={gambarUtama} alt="Pratinjau gambar unggulan" className="h-24 w-40 border-2 border-hitam-900 object-cover" />
            <button
              type="button"
              onClick={() => setGambarUtama("")}
              className="border-2 border-gmnimerah-700 px-3 py-1.5 font-mono text-[11px] font-bold uppercase text-gmnimerah-700 hover:bg-gmnimerah-700 hover:text-white"
            >
              Hapus
            </button>
          </div>
        ) : (
          <p className="mb-2 text-sm text-hitam-500">Belum ada gambar unggulan.</p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            disabled={mengunggah}
            onChange={unggah}
            className="w-full max-w-sm border border-hitam-300 bg-white px-2 py-1.5 text-sm file:mr-2 file:border-0 file:bg-hitam-900 file:px-3 file:py-1.5 file:text-white"
          />
          {mengunggah && <span className="font-mono text-[11px] uppercase text-hitam-600">Mengunggah...</span>}
        </div>
        {erorUnggah && (
          <p className="mt-2 text-xs font-semibold text-gmnimerah-700">{erorUnggah}</p>
        )}
        <label className="mt-3 block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-500">
            ...atau tempel URL gambar (fallback)
          </span>
          <input
            type="url"
            value={gambarUtama}
            onChange={(e) => setGambarUtama(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-mono text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
            placeholder="https://.../gambar.jpg"
          />
        </label>
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Penulis
          </span>
          <select
            value={penulisId}
            onChange={(e) => setPenulisId(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          >
            <option value="">Pilih penulis...</option>
            {penulis.map((p) => (
              <option key={p.id} value={p.id}>
                {p.namaLengkap} (@{p.username})
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Kategori
          </span>
          <select
            value={kategoriId}
            onChange={(e) => setKategoriId(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          >
            {kategori.map((k) => (
              <option key={k.id} value={k.id}>
                {k.isTetap ? `${k.nama} (tetap)` : k.nama}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div>
        <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Tag (maks. 5)
        </span>
        <div className="flex flex-wrap gap-1.5">
          {tags.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => toggleTag(t.id)}
              className={`border px-2 py-1 font-mono text-[11px] uppercase tracking-wide transition-colors ${
                tagIds.includes(t.id)
                  ? "border-gmnimerah-500 bg-gmnimerah-500 text-white"
                  : "border-hitam-300 bg-kertas-100 text-hitam-600 hover:border-hitam-900"
              }`}
            >
              {t.nama}
            </button>
          ))}
        </div>
      </div>

      <fieldset>
        <legend className="mb-1 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
          Visibilitas Penulis
        </legend>
        <div className="grid gap-3 md:grid-cols-3">
          {PILIHAN_VISIBILITAS.map((p) => (
            <label
              key={p.nilai}
              className={`flex cursor-pointer items-start gap-3 border-2 p-3 transition-colors ${
                visibilitas === p.nilai
                  ? "border-gmnimerah-500 bg-gmnimerah-50"
                  : "border-hitam-200 bg-white hover:border-hitam-900"
              }`}
            >
              <input
                type="radio"
                name="visibilitas"
                value={p.nilai}
                checked={visibilitas === p.nilai}
                onChange={() => setVisibilitas(p.nilai)}
                className="mt-1 accent-gmnimerah-500"
              />
              <span>
                <span className="block font-sans text-sm font-bold text-hitam-900">{p.label}</span>
                <span className="block text-xs text-hitam-500">{p.bantu}</span>
              </span>
            </label>
          ))}
        </div>
        {visibilitas === "SAMARAN" && (
          <label className="mt-3 block">
            <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
              Nama Samaran
            </span>
            <input
              type="text"
              required
              value={namaSamaran}
              onChange={(e) => setNamaSamaran(e.target.value)}
              className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
              placeholder="mis. Kader Cakrabirawa (tidak tertaut ke profil)"
            />
          </label>
        )}
      </fieldset>

      <div className="grid gap-4 md:grid-cols-2">
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Status Redaksi
          </span>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value as StatusArtikel)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-sans text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </label>

        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Jadwal Tayang (opsional)
          </span>
          <input
            type="datetime-local"
            value={tanggalJadwal}
            onChange={(e) => setTanggalJadwal(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 font-mono text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
          />
        </label>
      </div>

      <label className="flex cursor-pointer items-center gap-3 border-2 border-hitam-900 bg-kertas-100 px-4 py-3">
        <input
          type="checkbox"
          checked={disematkan}
          onChange={(e) => setDisematkan(e.target.checked)}
          className="accent-gmnimerah-500"
        />
        <span>
          <span className="block font-sans text-sm font-bold text-hitam-900">Disematkan (pinned)</span>
          <span className="block text-xs text-hitam-500">
            Selalu tampil di atas daftar — contoh: rubrik Marhaenisme.
          </span>
        </span>
      </label>

      {butuhCatatan && (
        <label className="block">
          <span className="mb-1 block font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
            Catatan Revisi / Penolakan (wajib)
          </span>
          <textarea
            rows={3}
            required
            value={catatanRevisi}
            onChange={(e) => setCatatanRevisi(e.target.value)}
            className="w-full border-2 border-hitam-900 bg-white px-3 py-2 text-sm text-hitam-900 outline-none focus:border-gmnimerah-500"
            placeholder="Alasan untuk penulis..."
          />
        </label>
      )}

      <div className="flex flex-wrap items-center gap-3 border-t-2 border-hitam-900 pt-4">
        <button
          type="submit"
          disabled={memuat}
          className="bg-gmnimerah-500 px-6 py-3 font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
        >
          {memuat ? "Menyimpan..." : buat ? "Simpan Artikel" : "Simpan Perubahan"}
        </button>
        <button
          type="button"
          onClick={() => setBukaPratinjau(true)}
          className="border-2 border-hitam-900 bg-white px-6 py-3 font-sans text-sm font-bold uppercase tracking-wide text-hitam-900 transition-colors hover:bg-kertas-200"
        >
          Pratinjau
        </button>
        <button
          type="button"
          onClick={() => router.push("/admin/artikel")}
          className="border-2 border-hitam-900 px-6 py-3 font-sans text-sm font-bold uppercase tracking-wide text-hitam-900 transition-colors hover:bg-kertas-200"
        >
          Batal
        </button>
      </div>

      {bukaPratinjau && (
        <div
          className="fixed inset-0 z-50 overflow-y-auto bg-hitam-900/60 p-4 md:p-8"
          role="dialog"
          aria-modal="true"
          onClick={(e) => {
            if (e.target === e.currentTarget) setBukaPratinjau(false);
          }}
        >
          <div className="mx-auto max-w-3xl border-4 border-hitam-900 bg-kertas-50 p-6 md:p-10">
            <div className="mb-4 flex items-center justify-between border-b-2 border-hitam-900 pb-3">
              <span className="font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-500">
                Pratinjau Tampilan Publik (belum tersimpan)
              </span>
              <button
                type="button"
                onClick={() => setBukaPratinjau(false)}
                aria-label="Tutup pratinjau"
                className="font-mono text-sm font-bold text-hitam-500 hover:text-hitam-900"
              >
                ✕
              </button>
            </div>
            <article>
              <h1 className="font-serif text-3xl font-extrabold leading-tight text-hitam-900 md:text-4xl">
                {judul || "(tanpa judul)"}
              </h1>
              {ringkasan.trim() && (
                <p className="mt-3 border-l-4 border-gmnimerah-500 pl-3 font-serif text-base italic text-hitam-600">
                  {ringkasan}
                </p>
              )}
              <div
                className="konten-artikel mt-6"
                dangerouslySetInnerHTML={{ __html: mdKeHtml(konten) }}
              />
            </article>
            <div className="mt-6 flex justify-end border-t-2 border-hitam-100 pt-3">
              <button
                type="button"
                onClick={() => setBukaPratinjau(false)}
                className="border-2 border-hitam-900 bg-white px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 hover:bg-kertas-200"
              >
                Tutup Pratinjau
              </button>
            </div>
          </div>
        </div>
      )}
    </form>
  );
}