import type { Metadata } from "next";
import { requireRole } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { amanAsync } from "@/lib/kueri-aman";
import { TabelAuditLog, type BarisLog } from "@/components/admin/TabelAuditLog";

export const metadata: Metadata = { title: "Audit Log" };
export const dynamic = "force-dynamic";

const PER_HALAMAN = 30;

type KueriAudit = {
  q?: string;
  entitas?: string;
  dari?: string;
  hingga?: string;
  halaman?: string;
};

export default async function HalamanAuditLog({
  searchParams,
}: {
  searchParams: Promise<KueriAudit>;
}) {
  // Gate role (Super Admin/Editor) sudah diterapkan di layout; ini lapisan kedua.
  await requireRole("Super Admin", "Editor");

  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const entitas = (sp.entitas ?? "").trim();
  const dari = (sp.dari ?? "").trim();
  const hingga = (sp.hingga ?? "").trim();
  const halaman = Math.max(1, Number.parseInt(sp.halaman ?? "1", 10) || 1);

  const tanggalSyarat: { gte?: Date; lte?: Date } = {};
  const dariTgl = dari ? new Date(`${dari}T00:00:00`) : null;
  const hinggaTgl = hingga ? new Date(`${hingga}T23:59:59.999`) : null;
  if (dariTgl && !Number.isNaN(dariTgl.getTime())) tanggalSyarat.gte = dariTgl;
  if (hinggaTgl && !Number.isNaN(hinggaTgl.getTime())) tanggalSyarat.lte = hinggaTgl;
  const pakaiTanggal = Object.keys(tanggalSyarat).length > 0;

  const [log, total, entitasTipeList, gagalMemuat] = await amanAsync(
    () =>
      Promise.all([
        prisma.auditLog.findMany({
          where: {
            ...(q ? { aksi: { contains: q, mode: "insensitive" as const } } : {}),
            ...(entitas ? { entitasTipe: entitas } : {}),
            ...(pakaiTanggal ? { tanggal: tanggalSyarat } : {}),
          },
          orderBy: { tanggal: "desc" },
          skip: (halaman - 1) * PER_HALAMAN,
          take: PER_HALAMAN,
          include: { aktor: { select: { namaLengkap: true, username: true } } },
        }),
        prisma.auditLog.count({
          where: {
            ...(q ? { aksi: { contains: q, mode: "insensitive" as const } } : {}),
            ...(entitas ? { entitasTipe: entitas } : {}),
            ...(pakaiTanggal ? { tanggal: tanggalSyarat } : {}),
          },
        }),
        prisma.auditLog.groupBy({ by: ["entitasTipe"], _count: { _all: true } }),
        Promise.resolve(false),
      ]),
    [
      [] as Array<{
        id: string;
        aksi: string;
        entitasTipe: string;
        entitasId: string;
        alamatIp: string | null;
        tanggal: Date;
        dataSebelum: unknown;
        dataSesudah: unknown;
        aktor: { namaLengkap: string; username: string } | null;
      }>,
      0,
      [] as Array<{ entitasTipe: string }>,
      true,
    ],
  );

  const jumlahHalaman = Math.max(1, Math.ceil(total / PER_HALAMAN));
  const baris: BarisLog[] = log.map((l) => ({
    id: l.id,
    aksi: l.aksi,
    entitasTipe: l.entitasTipe,
    entitasId: l.entitasId,
    aktorNama: l.aktor?.namaLengkap ?? null,
    aktorUsername: l.aktor?.username ?? null,
    alamatIp: l.alamatIp,
    tanggal: l.tanggal.toISOString(),
    dataSebelum: l.dataSebelum ?? null,
    dataSesudah: l.dataSesudah ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl">
      <div className="border-b-2 border-hitam-900 pb-3">
        <h1 className="font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
          Audit Log
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Jejak seluruh perubahan artikel, pengguna, role, dan halaman statis —
          transparansi internal &amp; forensik redaksi.
        </p>
      </div>
      {gagalMemuat && (
        <p
          role="alert"
          className="mt-4 border-2 border-gmnimerah-500 bg-gmnimerah-50 px-4 py-2.5 text-sm font-semibold text-gmnimerah-700"
        >
          Data tidak dapat dimuat sementara — periksa koneksi database lalu muat
          ulang halaman.
        </p>
      )}
      <TabelAuditLog
        log={baris}
        total={total}
        halaman={halaman}
        jumlahHalaman={jumlahHalaman}
        q={q}
        entitas={entitas}
        dari={dari}
        hingga={hingga}
        entitasTipeList={entitasTipeList.map((e) => e.entitasTipe).sort()}
      />
    </div>
  );
}