import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { PanelKasAdmin } from "@/components/admin/PanelKasAdmin";
import { PanelKonfigKas } from "@/components/admin/PanelKonfigKas";
import { prisma } from "@/lib/prisma";
import { KickerLabel } from "@/components/ui/KickerLabel";

export const metadata: Metadata = { title: "Rekap Iuran Kas" };
export const dynamic = "force-dynamic";

export default async function HalamanKasAdmin() {
  await requirePermission("kas.kelola");
  const cfg = await prisma.konfigurasiKas.findUnique({ where: { id: "utama" } });
  return <>
    <PanelKasAdmin />
    <section className="mx-auto mt-10 max-w-7xl border-t-2 border-hitam-900 pt-6">
      <KickerLabel>Pengaturan Pembayaran</KickerLabel>
      <h2 className="mt-1 font-serif text-xl font-bold text-hitam-900">Rekening &amp; QRIS Iuran Kas</h2>
      <p className="mt-1 text-sm text-hitam-500">Informasi ini tampil di bagian atas dashboard kader.</p>
      <PanelKonfigKas awal={{ bankNama: cfg?.bankNama ?? "", rekeningNomor: cfg?.rekeningNomor ?? "", atasNama: cfg?.atasNama ?? "", qrisUrl: cfg?.qrisUrl ?? null, dariDb: cfg !== null }} />
    </section>
  </>;
}
