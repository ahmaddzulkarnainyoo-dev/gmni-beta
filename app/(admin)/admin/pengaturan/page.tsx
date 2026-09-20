import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { PanelPengaturanSitus } from "@/components/admin/PanelPengaturanSitus";

export const metadata: Metadata = { title: "Pengaturan Situs" };
export const dynamic = "force-dynamic";

export default async function HalamanPengaturan() {
  await requirePermission("role.kelola");

  // Tabel baru — bila belum di-push, tetap render form dengan nilai bawaan.
  let cfg: Awaited<ReturnType<typeof prisma.pengaturanSitus.findUnique>> = null;
  try {
    cfg = await prisma.pengaturanSitus.findUnique({ where: { id: "utama" } });
  } catch {
    cfg = null;
  }

  return (
    <div className="mx-auto max-w-4xl">
      <div className="border-b-2 border-hitam-900 pb-3">
        <KickerLabel>Administrasi</KickerLabel>
        <h1 className="mt-1 font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
          Pengaturan Situs
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Konfigurasi umum situs: identitas, kontak resmi, dan mode perbaikan.
          Perubahan tercatat di log audit.
        </p>
      </div>

      <section aria-label="Pengaturan umum" className="mt-6">
        <PanelPengaturanSitus
          awal={{
            namaSitus: cfg?.namaSitus ?? "info Marhaen",
            tagline: cfg?.tagline ?? null,
            emailKontak: cfg?.emailKontak ?? null,
            waKontak: cfg?.waKontak ?? null,
            maintenanceMode: cfg?.maintenanceMode ?? false,
            maintenancePesan: cfg?.maintenancePesan ?? null,
            dariDb: cfg !== null,
          }}
        />
      </section>
    </div>
  );
}