import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { amanAsync } from "@/lib/kueri-aman";
import { PanelRedaksi } from "@/components/admin/PanelRedaksi";
import { fmtTanggal } from "@/lib/articles";

export const metadata: Metadata = { title: "Antrian Redaksi" };
export const dynamic = "force-dynamic";

/**
 * Antrian Redaksi — artikel DIAJUKAN & SEDANG_DITINJAU dengan aksi cepat:
 * Setujui (publish), Minta Revisi, Tolak, dan Pratinjau (lewat halaman edit).
 */
export default async function HalamanAntrianRedaksi() {
  await requireRole("Super Admin", "Editor");

  const [daftar, gagalMemuat] = await amanAsync(
    () =>
      Promise.all([
        prisma.artikel.findMany({
          where: { status: { in: ["DIAJUKAN", "SEDANG_DITINJAU"] } },
          orderBy: [{ tanggalDiajukan: "asc" }, { createdAt: "asc" }],
          take: 100,
          select: {
            id: true,
            judul: true,
            slug: true,
            status: true,
            ringkasan: true,
            tanggalDiajukan: true,
            kategori: { select: { nama: true } },
            penulis: { select: { namaLengkap: true, username: true } },
          },
        }),
        Promise.resolve(false),
      ]),
    [[], true] as const,
  );

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b-2 border-hitam-900 pb-3">
        <h1 className="font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
          Antrian Redaksi
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Artikel masuk yang menunggu keputusan redaksi. Setujui untuk
          menerbitkan, atau minta revisi / tolak dengan catatan untuk penulis.
        </p>
      </div>

      <PanelRedaksi
        antrian={daftar.map((a) => ({
          id: a.id,
          judul: a.judul,
          slug: a.slug,
          status: a.status,
          ringkasan: a.ringkasan,
          kategori: a.kategori.nama,
          penulis: a.penulis.namaLengkap,
          tanggal: a.tanggalDiajukan ? fmtTanggal(a.tanggalDiajukan) : "—",
        }))}
        gagalMemuat={gagalMemuat}
      />
    </div>
  );
}