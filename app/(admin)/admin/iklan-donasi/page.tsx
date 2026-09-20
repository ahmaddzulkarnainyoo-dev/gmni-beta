import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { PanelIklan } from "@/components/admin/PanelIklan";
import { PanelDonasi } from "@/components/admin/PanelDonasi";
import { PanelKonfigDonasi } from "@/components/admin/PanelKonfigDonasi";
import { ambilKonfigurasiDonasi } from "@/lib/monetisasi";

export const metadata: Metadata = { title: "Iklan & Donasi" };
export const dynamic = "force-dynamic";

export default async function HalamanIklanDonasi() {
  await requireRole("Super Admin", "Editor");

  const [iklan, donasi, agregat, konfigDonasi] = await Promise.all([
    prisma.iklan.findMany({
      orderBy: [{ lokasiSlot: "asc" }, { urutan: "asc" }, { createdAt: "desc" }],
    }),
    prisma.donasi.findMany({
      orderBy: [{ createdAt: "desc" }],
      take: 200,
      include: { verifikasiOleh: { select: { namaLengkap: true, username: true } } },
    }),
    prisma.donasi.groupBy({
      by: ["status"],
      _count: { _all: true },
      _sum: { nominal: true },
    }),
    ambilKonfigurasiDonasi(prisma),
  ]);

  const hitung = (s: string) => agregat.find((a) => a.status === s)?._count._all ?? 0;
  const nominalTerverifikasi =
    agregat.find((a) => a.status === "TERVERIFIKASI")?._sum.nominal ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <div className="border-b-2 border-hitam-900 pb-3">
        <KickerLabel>Monetisasi</KickerLabel>
        <h1 className="mt-1 font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
          Iklan & Donasi
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Kelola banner slot mandiri dan verifikasi donasi pers Marhaen tanpa developer.
        </p>
      </div>

      <section aria-label="Slot iklan" className="mt-6">
        <h2 className="font-serif text-xl font-bold text-hitam-900">Slot Iklan Mandiri</h2>
        <PanelIklan
          iklan={iklan.map((i) => ({
            id: i.id,
            nama: i.nama,
            gambarUrl: i.gambarUrl,
            tautanUrl: i.tautanUrl,
            lokasiSlot: i.lokasiSlot,
            urutan: i.urutan,
            tanggalMulai: i.tanggalMulai?.toISOString() ?? null,
            tanggalSelesai: i.tanggalSelesai?.toISOString() ?? null,
            status: i.status,
            jumlahKlik: i.jumlahKlik,
          }))}
        />
      </section>

      <section aria-label="Konfigurasi rekening donasi" className="mt-6">
        <h2 className="font-serif text-xl font-bold text-hitam-900">Rekening &amp; QRIS Resmi</h2>
        <p className="mt-1 text-sm text-hitam-500">
          Nilai ini tampil di halaman publik /donasi — menggantikan konstanta
          placeholder di kode. Perubahan tercatat di log audit.
        </p>
        <PanelKonfigDonasi awal={konfigDonasi} />
      </section>

      <section aria-label="Donasi" className="mt-6">
        <h2 className="font-serif text-xl font-bold text-hitam-900">Donasi Pers Marhaen</h2>
        <PanelDonasi
          donasi={donasi.map((d) => ({
            id: d.id,
            namaDonatur: d.namaDonatur,
            nominal: d.nominal,
            pesan: d.pesan,
            status: d.status,
            createdAt: d.createdAt.toISOString(),
            verifikasiOleh: d.verifikasiOleh,
          }))}
          totalMenunggu={hitung("MENUNGGU_VERIFIKASI")}
          totalTerverifikasi={hitung("TERVERIFIKASI")}
          totalDitolak={hitung("DITOLAK")}
          nominalTerverifikasi={nominalTerverifikasi}
        />
      </section>
    </div>
  );
}
