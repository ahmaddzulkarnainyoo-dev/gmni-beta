import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PanelHalaman } from "@/components/admin/PanelHalaman";
import { PanelHakJawab } from "@/components/admin/PanelHakJawab";

export const metadata: Metadata = { title: "Halaman Statis" };
export const dynamic = "force-dynamic";

export default async function HalamanAdmin() {
  await requirePermission("halaman_statis.edit");

  const [halaman, pengajuanHakJawab] = await Promise.all([
    prisma.halamanStatis.findMany({ orderBy: { slug: "asc" } }),
    prisma.hakJawab.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    }),
  ]);

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b-2 border-hitam-900 pb-3">
        <h1 className="font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
          Halaman Statis
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Redaksi dapat mengelola konten tanpa developer. Perubahan langsung
          tampil di rute publik.
        </p>
      </div>
      <PanelHalaman
        halaman={halaman.map((h) => ({ slug: h.slug, judul: h.judul, konten: h.konten }))}
      />

      <section aria-label="Pengajuan hak jawab" className="mt-10">
        <h2 className="font-serif text-xl font-bold text-hitam-900">
          Pengajuan Hak Jawab ({pengajuanHakJawab.filter((h) => h.status === "MENUNGGU" || h.status === "DIPROSES").length} aktif)
        </h2>
        <p className="mt-1 text-sm text-hitam-500">
          Tinjauan pengajuan hak jawab pembaca sesuai Pedoman Media Siber —
          jawab paling lambat 2×24 jam sejak pengajuan sah.
        </p>
        <PanelHakJawab
          daftar={pengajuanHakJawab.map((h) => ({
            id: h.id,
            namaPengaju: h.namaPengaju,
            emailPengaju: h.emailPengaju,
            judulPemberitaan: h.judulPemberitaan,
            urlPemberitaan: h.urlPemberitaan,
            isi: h.isi,
            status: h.status,
            jawabanRedaksi: h.jawabanRedaksi,
            createdAt: h.createdAt.toISOString(),
          }))}
        />
      </section>
    </div>
  );
}