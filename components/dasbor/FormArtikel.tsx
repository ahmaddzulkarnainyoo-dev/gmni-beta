"use client";

import { useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { htmlKeMd, mdKeHtml } from "@/lib/markdown";
import { idYoutube, sisipAtKursor } from "@/lib/editor-util";
import { PanelPengaturan } from "@/components/dasbor/PanelPengaturan";
import type { StatusArtikel, VisibilitasPenulis } from "@prisma/client";

/**
 * Pembungkus aman konversi Markdown: bila parser melempar pada input
 * tertentu, kembalikan fallback (bukan crash render / boundary global).
 */
function mdKeHtmlAman(md: string): string {
  try {
    return mdKeHtml(md);
  } catch {
    return md;
  }
}

function htmlKeMdAman(html: string): string {
  try {
    return htmlKeMd(html);
  } catch {
    return html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  }
}

type KategoriOpsi = { id: string; nama: string; slug: string; isTetap: boolean };
type TagOpsi = { id: string; nama: string; slug: string };

type DataArtikelEdit = {
  id: string;
  judul: string;
  ringkasan: string | null;
  konten: string;
  kategoriId: string;
  visibilitasPenulis: VisibilitasPenulis;
  namaTampilanKustom: string | null;
  status: StatusArtikel;
  tagIds: string[];
};

const PILIHAN_VISIBILITAS: Array<{ nilai: VisibilitasPenulis; label: string; bantu: string }> = [
  {
    nilai: "ASLI",
    label: "Nama Asli",
    bantu: "Nama terhubung ke profil kader Anda.",
  },
  {
    nilai: "SAMARAN",
    label: "Nama Samaran",
    bantu: "Identitas dilindungi dan dikecualikan dari leaderboard.",
  },
  {
    nilai: "REDAKSI",
    label: "Atas Nama Redaksi",
    bantu: "Ditulis atas nama redaksi info Marhaen.",
  },
];

/** Tombol sisip Markdown pada toolbar editor (gaya Medium). */
const SNIPPET_MD: Array<{ teks: string; label: string }> = [
  { teks: "## ", label: "H2" },
  { teks: "- ", label: "List" },
  { teks: "**teks**", label: "Bold" },
  { teks: "_teks_", label: "Miring" },
  { teks: "> ", label: "Kutipan" },
  { teks: "\n\n---\n\n", label: "Pemisah" },
];

/** Editor artikel Markdown + pratinjau (mode buat & mode edit). */
export function FormArtikel({
  kategori,
  tags,
  buat = true,
  artikel,
}: {
  kategori: KategoriOpsi[];
  tags: TagOpsi[];
  buat?: boolean;
  artikel?: DataArtikelEdit;
}) {
  const router = useRouter();
  const [judul, setJudul] = useState(artikel?.judul ?? "");
  const [ringkasan, setRingkasan] = useState(artikel?.ringkasan ?? "");
  const [konten, setKonten] = useState(() => (artikel ? htmlKeMdAman(artikel.konten) : ""));
  const [kategoriId, setKategoriId] = useState(artikel?.kategoriId ?? kategori[0]?.id ?? "");
  const [tagIds, setTagIds] = useState<string[]>(artikel?.tagIds ?? []);
  const [visibilitas, setVisibilitas] = useState<VisibilitasPenulis>(
    artikel?.visibilitasPenulis ?? "ASLI",
  );
  const [namaSamaran, setNamaSamaran] = useState(artikel?.namaTampilanKustom ?? "");
  const [ajukan, setAjukan] = useState(false);
  const [pratinjau, setPratinjau] = useState(false);
  const [memuat, setMemuat] = useState(false);
  const [eror, setEror] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [unggahGambar, setUnggahGambar] = useState(false);
  const [panel, setPanel] = useState(false);
  const kontenRef = useRef<HTMLTextAreaElement>(null);
  const unggahGambarRef = useRef<HTMLInputElement>(null);

  const pratinjauHtml = useMemo(() => mdKeHtmlAman(konten), [konten]);

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

  /** Unggah gambar isi artikel (maks 2 MB) lalu sisip Markdown pada kursor. */
  async function unggahGambarKonten(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUnggahGambar(true);
    setEror(null);
    setInfo(null);
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("jenis", "artikel");
      const res = await fetch("/api/media", { method: "POST", body: fd });
      const data = (await res.json()) as { ok?: boolean; url?: string; error?: string };
      if (!res.ok || !data.ok || !data.url) {
        setEror(data.error ?? "Upload gagal. Coba gambar lain (maks 2 MB).");
        return;
      }
      sisipKursor(`\n![${file.name.replace(/\.[a-z0-9]+$/i, "")}](${data.url})\n`);
      setInfo("Gambar tersisip ke isi artikel (lihat Pratinjau).");
    } catch {
      setEror("Tidak dapat menghubungi server untuk upload.");
    } finally {
      setUnggahGambar(false);
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

  async function simpan(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setMemuat(true);
    setEror(null);
    setInfo(null);

    const payload = {
      judul,
      ringkasan,
      konten,
      kategoriId,
      tagIds,
      visibilitasPenulis: visibilitas,
      namaTampilanKustom: visibilitas === "SAMARAN" ? namaSamaran : null,
      ...(buat ? { ajukan } : {}),
    };

    try {
      const url = buat ? "/api/artikel" : `/api/artikel/${artikel!.id}`;
      const res = await fetch(url, {
        method: buat ? "POST" : "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      let data: { ok?: boolean; error?: string; status?: string } = {};
      try {
        data = (await res.json()) as { ok?: boolean; error?: string; status?: string };
      } catch {
        const teksMentah = (await res.text().catch(() => "")) || "";
        data = {
          error: teksMentah.startsWith("{")
            ? "Respons server tidak valid."
            : `Server tidak membalas JSON (kode ${res.status}). Silakan coba lagi.`
        };
      }
      if (!res.ok || !data.ok) {
        setEror(data.error ?? "Gagal menyimpan artikel.");
        setMemuat(false);
        return;
      }
      if (buat) {
        router.push("/dasbor/tulisan-saya");
        router.refresh();
        return;
      }
      setInfo(
        ajukan
          ? "Artikel dikirim ulang ke redaksi."
          : `Tersimpan (status: ${data.status ?? "draft"}).`,
      );
      setAjukan(false);
      setMemuat(false);
      router.refresh();
    } catch {
      setEror("Tidak dapat menghubungi server.");
      setMemuat(false);
    }
  }

  return (
    <form onSubmit={simpan} className="pb-6">
      {/* Toolbar lengket ala Medium — tipis, blur, tanpa kotak kaku */}
      <div className="sticky top-0 z-30 -mx-3 mb-8 border-b border-hitam-200 bg-kertas-50/85 px-3 py-2 backdrop-blur-md sm:-mx-4 sm:px-4">
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-auto shrink-0 font-serif text-sm font-bold text-hitam-900">
            {buat ? "Tulisan Baru" : "Edit Tulisan"}
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
              disabled={unggahGambar}
              onClick={() => unggahGambarRef.current?.click()}
              className="shrink-0 border border-transparent px-2 py-1 font-mono text-[11px] font-bold text-gmnimerah-700 transition-colors hover:border-gmnimerah-200 hover:bg-white disabled:opacity-50"
            >
              {unggahGambar ? "Mengunggah…" : "Gambar"}
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
            Kategori &amp; Tag
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
            onChange={(e) => setJudul(e.target.value)}
            className="w-full border-0 bg-transparent px-0 font-serif text-3xl font-extrabold leading-tight text-hitam-900 outline-none placeholder:text-hitam-300 md:text-4xl lg:text-5xl"
            placeholder="Judul tulisan…"
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
          <span className="sr-only">Isi Tulisan (Markdown)</span>
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

      {/* Drawer pengaturan — Kategori, Tag, Visibilitas (gaya Medium) */}
      <PanelPengaturan buka={panel} onTutup={() => setPanel(false)} judul="Kategori & Tag">
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
          <div className="grid gap-3">
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
                  <span className="block font-sans text-sm font-bold text-hitam-900">
                    {p.label}
                  </span>
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
      </PanelPengaturan>

      {/* Bilah aksi bawah — lengket + blur, penanda gaya editor fokus konten */}
      <div className="sticky bottom-0 z-30 -mx-3 mt-10 border-t border-hitam-200 bg-kertas-50/90 px-3 py-3 backdrop-blur-md sm:-mx-4 sm:px-4">
        <div className="mx-auto flex max-w-3xl flex-wrap items-center gap-3">
          {buat ? (
            <>
              <button
                type="submit"
                disabled={memuat}
                className="bg-gmnimerah-500 px-5 py-2.5 font-sans text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
              >
                {memuat ? "Menyimpan…" : "Simpan Draf"}
              </button>
              <button
                type="submit"
                disabled={memuat}
                onClick={() => setAjukan(true)}
                className="border-2 border-hitam-900 px-5 py-2.5 font-sans text-[13px] font-bold uppercase tracking-wide text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white disabled:opacity-50"
              >
                {memuat ? "Mengajukan…" : "Simpan & Ajukan"}
              </button>
            </>
          ) : (
            <>
              <button
                type="submit"
                disabled={memuat}
                className="bg-gmnimerah-500 px-5 py-2.5 font-sans text-[13px] font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600 disabled:opacity-50"
              >
                {memuat ? "Menyimpan…" : "Simpan Perubahan"}
              </button>
              <button
                type="submit"
                disabled={memuat}
                onClick={() => setAjukan(true)}
                className="border-2 border-hitam-900 px-5 py-2.5 font-sans text-[13px] font-bold uppercase tracking-wide text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white disabled:opacity-50"
              >
                {memuat ? "Mengajukan…" : "Simpan & Ajukan Ulang"}
              </button>
            </>
          )}
          <span className="ml-auto font-mono text-[10px] uppercase tracking-widest text-hitam-400">
            {konten.trim() ? `${konten.trim().split(/\s+/).length} kata` : "0 kata"}
          </span>
        </div>
      </div>
    </form>
  );
}
