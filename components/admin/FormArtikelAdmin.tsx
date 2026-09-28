"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { htmlKeMd, mdKeHtml } from "@/lib/markdown";
import { idYoutube, sisipAtKursor } from "@/lib/editor-util";
import { slugify } from "@/lib/slug";
import { PanelPengaturan } from "@/components/dasbor/PanelPengaturan";
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
  { teks: "\n\n---\n\n", label: "Pemisah" },
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
  const [unggahKonten, setUnggahKonten] = useState(false);
  const kontenRef = useRef<HTMLTextAreaElement>(null);
  const unggahGambarRef = useRef<HTMLInputElement>(null);
  const [eror, setEror] = useState<string | null>(null);
const [bukaPratinjau, setBukaPratinjau] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [erorUnggah, setErorUnggah] = useState<string | null>(null);
  const [panel, setPanel] = useState(false);

  const pratinjauHtml = useMemo(() => mdKeHtml(konten), [konten]);

  function gantiJudul(v: string) {
    setJudul(v);
    if (!slugDibuat) setSlug(slugify(v));
  }

  function sisip(teks: string) {
    setKonten((k) => (k.length === 0 ? teks : `${k}\n\n${teks}`));
    setPratinjau(false);
  }

  /** Sisip teks Markdown tepat pada kursor textarea isi artikel. */
  function sisipKursor(teks: string) {
    const ta = kontenRef.current;
    if (!ta) {
      sisip(teks);
      return;
    }
    const hasil = sisipAtKursor(ta, konten, teks);
    setKonten(hasil.nilai);
    setPratinjau(false);
    requestAnimationFrame(() => {
      ta.focus();
      ta.setSelectionRange(hasil.posisi, hasil.posisi);
    });
  }

  /** Unggah gambar ke /api/media lalu sisip Markdown gambar pada kursor. */
  async function unggahGambarKonten(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUnggahKonten(true);
    setErorUnggah(null);
    setInfo(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("jenis", "artikel");
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        setErorUnggah(data.error ?? "Upload gagal. Gunakan URL manual di Markdown.");
        return;
      }
      sisipKursor(`\n![${file.name.replace(/\.[a-z0-9]+$/i, "")}](${data.url})\n`);
      setInfo("Gambar tersisip ke isi artikel (lihat Pratinjau).");
    } catch {
      setErorUnggah("Tidak dapat menghubungi server untuk upload.");
    } finally {
      setUnggahKonten(false);
    }
  }

  /** Sisip video YouTube berupa token :::youtube <ID>::: pada kursor. */
  function sisipVideo() {
    const masukan = window.prompt(
      "Tempel URL atau ID video YouTube:",
      "https://www.youtube.com/watch?v=",
    );
    if (!masukan) return;
    const id = idYoutube(masukan);
    if (!id) {
      setEror("URL/ID video YouTube tidak dikenali.");
      return;
    }
    sisipKursor(`\n:::youtube ${id}:::\n`);
    setEror(null);
    setInfo("Sisipan video YouTube ditambahkan.");
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
    <form onSubmit={simpan} className="pb-6">
      {/* Toolbar lengket ala Medium — tipis, blur, tanpa kotak kaku */}
      <div className="sticky top-0 z-30 -mx-3 mb-8 border-b border-hitam-200 bg-kertas-50/85 px-3 py-2 backdrop-blur-md sm:-mx-4 sm:px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-auto shrink-0 font-serif text-sm font-bold text-hitam-900">
            {buat ? "Artikel Baru" : "Edit Artikel"}
          </span>

          <div className="flex min-w-0 flex-1 items-center gap-1 overflow-x-auto">
            {SNIPPET_MD.map((s) => (
              <button
                key={s.label}
                type="button"
                onClick={() => sisip(s.teks)}
                className="shrink-0 border border-transparent px-2 py-1 font-mono text-[11px] text-hitam-600 transition-colors hover:border-hitam-200 hover:bg-white hover:text-hitam-900"
              >
                {s.label}
              </button>
            ))}
            <button
              type="button"
              disabled={unggahKonten}
              onClick={() => unggahGambarRef.current?.click()}
              className="shrink-0 border border-transparent px-2 py-1 font-mono text-[11px] font-bold text-gmnimerah-700 transition-colors hover:border-gmnimerah-200 hover:bg-white disabled:opacity-50"
            >
              {unggahKonten ? "Mengunggah…" : "Gambar"}
            </button>
            <button
              type="button"
              onClick={sisipVideo}
              className="shrink-0 border border-transparent px-2 py-1 font-mono text-[11px] font-bold text-gmnimerah-700 transition-colors hover:border-gmnimerah-200 hover:bg-white"
            >
              Video
            </button>
          </div>

          <button
            type="button"
            onClick={() => setPanel(true)}
            className="shrink-0 border border-hitam-200 bg-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-hitam-700 transition-colors hover:border-hitam-900 hover:text-hitam-900"
          >
            Metadata
          </button>
          <button
            type="button"
            onClick={() => setPratinjau((p) => !p)}
            className="shrink-0 border border-hitam-900 px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-wider text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
          >
            {pratinjau ? "Tulis" : "Pratinjau"}
          </button>
        </div>
      </div>

      {eror && (
        <p role="alert" className="mb-6 border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm font-semibold text-gmnimerah-700">
          {eror}
        </p>
      )}
      {info && (
        <p role="status" className="mb-6 border-2 border-hitam-900 bg-kertas-200 px-3 py-2 text-sm font-semibold text-hitam-800">
          {info}
        </p>
      )}

      <div className="mx-auto w-full max-w-3xl">
        <label className="block">
          <span className="sr-only">Judul</span>
          <input
            type="text"
            required
            minLength={8}
            value={judul}
            onChange={(e) => gantiJudul(e.target.value)}
            className="w-full border-0 bg-transparent px-0 font-serif text-3xl font-extrabold leading-tight text-hitam-900 outline-none placeholder:text-hitam-300 md:text-4xl lg:text-5xl"
            placeholder="Judul artikel…"
          />
        </label>

        <label className="mt-4 block">
          <span className="sr-only">Ringkasan</span>
          <textarea
            rows={2}
            value={ringkasan}
            onChange={(e) => setRingkasan(e.target.value)}
            className="w-full resize-none border-0 border-l-2 border-hitam-200 bg-transparent px-0 py-0 pl-3 font-serif text-lg italic leading-relaxed text-hitam-600 outline-none placeholder:text-hitam-300"
            maxLength={300}
            placeholder="Ringkasan singkat (opsional) — satu-dua kalimat pemikat pembaca."
          />
        </label>

      {!pratinjau && (
        <div className="mt-8">
          <span className="sr-only">Isi Artikel (Markdown)</span>
          <textarea
            required
            minLength={40}
            rows={18}
            ref={kontenRef}
            value={konten}
            onChange={(e) => setKonten(e.target.value)}
            className="min-h-[55vh] w-full resize-none border-0 bg-transparent px-0 py-0 font-sans text-lg leading-[1.85] text-hitam-800 outline-none placeholder:text-hitam-300"
            placeholder={"Tulis di sini…\n\nGunakan Markdown sederhana:\n## Judul Bagian\n\nParagraf pembuka...\n\n- poin pertama\n- poin kedua\n\n**teks tebal** atau _teks miring_\n\nSisip media: ![keterangan](url-gambar) atau :::youtube ID-VIDEO:::"}
          />
          <input
            ref={unggahGambarRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            onChange={unggahGambarKonten}
            className="hidden"
            aria-hidden
            tabIndex={-1}
          />
        </div>
      )}

      {pratinjau && (
        <div className="mt-8">
          <h2 className="font-serif text-3xl font-extrabold leading-tight text-hitam-900 md:text-4xl">
            {judul || "(tanpa judul)"}
          </h2>
          {ringkasan.trim() && (
            <p className="mt-3 border-l-4 border-gmnimerah-500 pl-3 font-serif text-base italic text-hitam-600">
              {ringkasan}
            </p>
          )}
          <div
            className="konten-artikel mt-8"
            dangerouslySetInnerHTML={{ __html: pratinjauHtml }}
          />
        </div>
      )}
      </div>

      {/* Drawer metadata — semua tombol mesin dikumpulkan di sini (gaya Medium) */}
      <PanelPengaturan buka={panel} onTutup={() => setPanel(false)} judul="Metadata Artikel">
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

      <fieldset className="border border-hitam-200 bg-white p-3">
        <legend className="px-1 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">
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

      <div className="grid gap-4">
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

      <div className="grid gap-4">
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

      <label className="flex cursor-pointer items-center gap-3 border border-hitam-200 bg-white px-3 py-2.5">
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

      </PanelPengaturan>

      {/* Bilah aksi bawah — lengket + blur, penanda gaya editor fokus konten */}
      <div className="sticky bottom-0 z-30 -mx-3 mt-10 border-t border-hitam-200 bg-kertas-50/90 px-3 py-3 backdrop-blur-md sm:-mx-4 sm:px-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
          <button
            type="submit"
            disabled={memuat}
            className="bg-gmnimerah-500 px-5 py-2.5 font-sans text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
          >
            {memuat ? "Menyimpan…" : buat ? "Simpan Artikel" : "Simpan Perubahan"}
          </button>
          <button
            type="button"
            onClick={() => setBukaPratinjau(true)}
            className="border-2 border-hitam-900 bg-white px-5 py-2.5 font-sans text-[13px] font-bold uppercase tracking-wide text-hitam-900 transition-colors hover:bg-kertas-200"
          >
            Pratinjau
          </button>
          <button
            type="button"
            onClick={() => router.push("/admin/artikel")}
            className="border-2 border-hitam-900 px-5 py-2.5 font-sans text-[13px] font-bold uppercase tracking-wide text-hitam-900 transition-colors hover:bg-kertas-200"
          >
            Batal
          </button>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-hitam-400">
            {konten.trim() ? `${konten.trim().split(/\s+/).length} kata` : "0 kata"}
          </span>
        </div>
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