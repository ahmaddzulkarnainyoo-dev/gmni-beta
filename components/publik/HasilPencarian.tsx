import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { amanAsync } from "@/lib/kueri-aman";
import { PILIH_ARTIKEL_PUBLIK, bylineArtikel, fmtTanggal } from "@/lib/articles";
import type { ArtikelPublik } from "@/lib/articles";
import { KartuArtikel } from "@/components/ui/KartuArtikel";

const BATAS_ARTIKEL = 30;
const BATAS_KADER = 6;

/** Hasil pencarian publik: artikel TERBIT + kader aktif berprofil publik. */
export async function HasilPencarian({ q }: { q: string }) {
  type BarisArtikel = ArtikelPublik;
  type BarisKader = { namaLengkap: string; username: string };
  type HasilCari = { artikel: BarisArtikel[]; kader: BarisKader[]; gagal: boolean };
  const hasil: HasilCari = await amanAsync<HasilCari>(async () => {
    const [a, k] = await Promise.all([
      prisma.artikel.findMany({
        where: {
          status: "TERBIT",
          OR: [
            { judul: { contains: q, mode: "insensitive" } },
            { ringkasan: { contains: q, mode: "insensitive" } },
            { konten: { contains: q, mode: "insensitive" } },
            { kategori: { nama: { contains: q, mode: "insensitive" } } },
            { tags: { some: { tag: { nama: { contains: q, mode: "insensitive" } } } } },
          ],
        },
        orderBy: [{ disematkan: "desc" }, { tanggalTerbit: "desc" }],
        take: BATAS_ARTIKEL,
        select: PILIH_ARTIKEL_PUBLIK,
      }),
      prisma.user.findMany({
        where: {
          statusAkun: "AKTIF",
          profilTersembunyi: false,
          OR: [
            { namaLengkap: { contains: q, mode: "insensitive" } },
            { username: { contains: q, mode: "insensitive" } },
          ],
        },
        orderBy: { namaLengkap: "asc" },
        take: BATAS_KADER,
        select: { namaLengkap: true, username: true },
      }),
    ]);
    return { artikel: a, kader: k, gagal: false };
  }, { artikel: [], kader: [], gagal: true });
  const { artikel, kader, gagal } = hasil;

  if (gagal) {
    return (
      <p
        role="alert"
        className="border-2 border-gmnimerah-500 bg-gmnimerah-50 px-4 py-3 text-sm font-semibold text-gmnimerah-700"
      >
        Pencarian gagal dimuat sementara — periksa koneksi database lalu muat
        ulang halaman.
      </p>
    );
  }

  if (artikel.length === 0 && kader.length === 0) {
    return (
      <div className="border border-hitam-200 bg-white p-8 text-center md:p-12">
        <p className="font-serif text-2xl font-bold text-hitam-900">
          Tidak ada hasil untuk “{q}”.
        </p>
        <ul className="mx-auto mt-4 max-w-md space-y-1.5 text-sm text-hitam-500">
          <li>Periksa kembali ejaan kata kunci.</li>
          <li>Gunakan kata yang lebih umum atau lebih pendek.</li>
          <li>Telusuri kanal berita atau arsip tag dari menu navigasi.</li>
        </ul>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {artikel.length > 0 && (
        <section aria-label={`Artikel (${artikel.length})`}>
          <h2 className="border-b-2 border-hitam-900 pb-2 font-mono text-xs font-bold uppercase tracking-widest text-hitam-600">
            Artikel · {artikel.length} hasil
          </h2>
          <div className="mt-5 grid gap-6 md:grid-cols-3">
            {artikel.map((a) => (
              <KartuArtikel
                key={a.id}
                judul={a.judul}
                ringkasan={a.ringkasan ?? undefined}
                kategori={{ nama: a.kategori.nama, slug: a.kategori.slug }}
                tanggal={fmtTanggal(a.tanggalTerbit)}
                penulis={bylineArtikel(a).nama}
                gambar={a.gambarUtama}
                slug={a.slug}
              />
            ))}
          </div>
        </section>
      )}

      {kader.length > 0 && (
        <section aria-label={`Kader (${kader.length})`}>
          <h2 className="border-b-2 border-hitam-900 pb-2 font-mono text-xs font-bold uppercase tracking-widest text-hitam-600">
            Kader · {kader.length} hasil
          </h2>
          <ul className="mt-5 grid gap-3 sm:grid-cols-2">
            {kader.map((k) => (
              <li key={k.username}>
                <Link
                  href={`/profil/${k.username}`}
                  className="flex items-center gap-3 border border-hitam-200 bg-white px-4 py-3 transition-all hover:border-hitam-900 hover:shadow-[3px_3px_0_0_var(--color-hitam-900)]"
                >
                  <span
                    aria-hidden
                    className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-hitam-900 font-serif text-lg font-bold text-white"
                  >
                    {k.namaLengkap.trim().charAt(0).toUpperCase()}
                  </span>
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-bold text-hitam-900">
                      {k.namaLengkap}
                    </span>
                    <span className="block truncate font-mono text-[11px] text-hitam-500">
                      @{k.username}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
