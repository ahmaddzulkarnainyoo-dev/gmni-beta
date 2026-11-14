import Link from "next/link";
import { requireAuthUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { fmtTanggal, bylineArtikel } from "@/lib/articles";
import { KartuArtikel } from "@/components/ui/KartuArtikel";

export const dynamic = "force-dynamic";

export default async function HalamanTersimpan() {
  const user = await requireAuthUser();
  const simpanan = await prisma.bookmark.findMany({ where: { userId: user.id, artikel: { status: "TERBIT" } }, orderBy: { createdAt: "desc" }, include: { artikel: { include: { kategori: true, penulis: { select: { namaLengkap: true, username: true } } } } } });
  return <div className="mx-auto max-w-5xl"><div className="border-b-2 border-hitam-900 pb-3"><p className="font-mono text-[11px] font-bold uppercase tracking-widest text-gmnimerah-600">Perpustakaan pribadi</p><h1 className="mt-1 font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">Artikel Tersimpan</h1><p className="mt-1 text-sm text-hitam-500">Bacaan yang kamu tandai untuk dibuka kembali.</p></div>{simpanan.length === 0 ? <div className="mt-6 border-2 border-dashed border-hitam-300 bg-white p-10 text-center"><p className="font-serif text-xl font-bold">Belum ada artikel tersimpan.</p><Link href="/berita" className="mt-3 inline-block text-sm font-semibold text-gmnimerah-600 underline">Jelajahi berita</Link></div> : <div className="mt-6 grid gap-6 md:grid-cols-3">{simpanan.map(({ artikel }) => <KartuArtikel key={artikel.id} judul={artikel.judul} ringkasan={artikel.ringkasan ?? undefined} kategori={{ nama: artikel.kategori.nama, slug: artikel.kategori.slug }} tanggal={fmtTanggal(artikel.tanggalTerbit)} penulis={bylineArtikel(artikel).nama} gambar={artikel.gambarUtama} slug={artikel.slug} />)}</div>}</div>;
}
