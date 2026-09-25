import Link from "next/link";
import type { Metadata } from "next";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { requireAuthUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { amanAsync } from "@/lib/kueri-aman";
import { fmtTanggal } from "@/lib/articles";
import { cn } from "@/lib/utils";
import { TombolTandaiDibaca } from "@/components/dasbor/TombolTandaiDibaca";

export const metadata: Metadata = { title: "Notifikasi" };
export const dynamic = "force-dynamic";

type EntriNotifikasi = {
  id: string;
  aksi: string;
  tanggal: Date;
  aktorNama: string | null;
  artikelId: string;
  artikelJudul: string;
  statusArtikel: string;
};

const LABEL_AKSI: Record<string, { judul: string; gaya: string }> = {
  "artikel.terbit": { judul: "Artikel kamu terbit!", gaya: "bg-gmnimerah-500 text-white" },
  "artikel.setujui": { judul: "Artikel disetujui redaksi", gaya: "bg-hitam-900 text-white" },
  "artikel.revisi": { judul: "Diminta revisi", gaya: "bg-gmnimerah-500 text-white" },
  "artikel.tolak": { judul: "Artikel ditolak", gaya: "bg-hitam-900 text-white" },
  "artikel.tinjau": { judul: "Sedang ditinjau redaksi", gaya: "bg-kertas-200 text-hitam-900" },
  "artikel.update": { judul: "Redaksi memperbarui tulisanmu", gaya: "bg-kertas-200 text-hitam-900" },
  "artikel.arsip": { judul: "Artikel diarsipkan", gaya: "bg-hitam-900 text-white" },
};

function judulAksi(aksi: string): { judul: string; gaya: string } {
  const entri = LABEL_AKSI[aksi];
  if (entri) return entri;
  return { judul: aksi.replace(/^artikel\./, "").replace(/_/g, " "), gaya: "bg-kertas-200 text-hitam-900" };
}

/** Gaya lencana per TipeNotifikasi (schema: INFO | PERINGATAN | SUKSES). */
const LABEL_TIPE: Record<string, { judul: string; gaya: string }> = {
  INFO: { judul: "Info", gaya: "bg-kertas-200 text-hitam-900" },
  PERINGATAN: { judul: "Pengingat", gaya: "bg-gmnimerah-500 text-white" },
  SUKSES: { judul: "Pencapaian", gaya: "bg-hitam-900 text-white" },
};

function judulTipe(tipe: string): { judul: string; gaya: string } {
  return LABEL_TIPE[tipe] ?? { judul: tipe, gaya: "bg-kertas-200 text-hitam-900" };
}

/** Satu baris kotak masuk dari model Notifikasi. */
type EntriKotakMasuk = {
  id: string;
  judul: string;
  isi: string;
  tipe: string;
  dibaca: boolean;
  createdAt: Date;
};

/**
 * Notifikasi in-app (Sub-fase 4.3) - dua sumber:
 * 1. Kotak masuk model Notifikasi (cron pengingat kader pasif, pencapaian,
 *    pesan sistem), lengkap penanda belum dibaca + tombol "Tandai Semua
 *    Dibaca" (POST /api/notifikasi/baca).
 * 2. Feed status tulisan kader yang diturunkan dari AuditLog (v1, tanpa
 *    model baru - hanya membaca jejak status artikel yang ditulis redaksi).
 */
export default async function HalamanNotifikasi() {
  const user = await requireAuthUser();

  // Kotak masuk model Notifikasi + jumlah belum dibaca (untuk tombol).
  const [kotakMasuk, jumlahBelumDibaca] = await Promise.all([
    amanAsync(
      () =>
        prisma.notifikasi.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: "desc" },
          take: 40,
          select: { id: true, judul: true, isi: true, tipe: true, dibaca: true, createdAt: true },
        }),
      [] as EntriKotakMasuk[],
    ),
    amanAsync(() => prisma.notifikasi.count({ where: { userId: user.id, dibaca: false } }), 0),
  ]);

  const artikelMilik = await amanAsync(
    () => prisma.artikel.findMany({ where: { penulisId: user.id }, select: { id: true } }),
    [] as Array<{ id: string }>,
  );
  const ids = artikelMilik.map((a) => a.id);

  const entri: EntriNotifikasi[] = await amanAsync(async () => {
    if (ids.length === 0) return [];
    const baris = await prisma.auditLog.findMany({
      where: { entitasTipe: "Artikel", entitasId: { in: ids }, aktorId: { not: user.id } },
      orderBy: { tanggal: "desc" },
      take: 30,
      include: { aktor: { select: { namaLengkap: true } }, },
    });
    const petaJudul = new Map(
      (
        await prisma.artikel.findMany({ where: { id: { in: ids } }, select: { id: true, judul: true, status: true } })
      ).map((a) => [a.id, a]),
    );
    return baris.map((b) => ({
      id: b.id,
      aksi: b.aksi,
      tanggal: b.tanggal,
      aktorNama: b.aktor?.namaLengkap ?? null,
      artikelId: b.entitasId,
      artikelJudul: petaJudul.get(b.entitasId)?.judul ?? "(tulisan dihapus)",
      statusArtikel: petaJudul.get(b.entitasId)?.status ?? "-",
    }));
  }, []);

  return (
    <div className="mx-auto max-w-3xl">
      <KickerLabel>Dasbor Kader</KickerLabel>
      <h1 className="mt-2 font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">Notifikasi</h1>
      <p className="mt-1 text-sm text-hitam-500">
        Kotak masuk kader &amp; pembaruan status tulisanmu oleh redaksi - terbaru di atas.
      </p>
      <TombolTandaiDibaca jumlahBelumDibaca={jumlahBelumDibaca} />

      {kotakMasuk.length === 0 && entri.length === 0 ? (
        <div className="mt-8 border-4 border-dashed border-hitam-200 bg-kertas-100 p-10 text-center">
          <p className="font-serif text-xl font-bold text-hitam-900">Belum ada notifikasi.</p>
          <p className="mt-2 text-sm text-hitam-500">
            Pengingat kader pasif dan setiap perubahan status tulisan (ditinjau, revisi,
            terbit) akan tercatat di sini.
          </p>
          <Link href="/dasbor/tulisan-saya" className="mt-5 inline-block border-2 border-hitam-900 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white">Lihat Tulisan Saya</Link>
        </div>
      ) : (
        <>
          {kotakMasuk.length > 0 && (
            <section className="mt-8">
              <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-400">
                Kotak Masuk <span className="text-gmnimerah-600">({kotakMasuk.length})</span>
              </h2>
              <ul className="mt-3 space-y-3">
                {kotakMasuk.map((n) => {
                  const tipe = judulTipe(n.tipe);
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "bg-white p-4",
                        n.dibaca ? "border border-hitam-200" : "border-2 border-hitam-900",
                      )}
                    >
                      <div className="flex flex-wrap items-center gap-2">
                        <span
                          className={cn(
                            "px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest",
                            tipe.gaya,
                          )}
                        >
                          {tipe.judul}
                        </span>
                        {!n.dibaca && (
                          <span className="border border-gmnimerah-500 px-1.5 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-gmnimerah-600">
                            Baru
                          </span>
                        )}
                        <span className="font-mono text-[11px] uppercase tracking-wider text-hitam-400">
                          {fmtTanggal(n.createdAt)}
                        </span>
                      </div>
                      <p className="mt-2 font-serif text-base font-bold text-hitam-900">{n.judul}</p>
                      <p className="mt-1 whitespace-pre-line text-sm text-hitam-500">{n.isi}</p>
                    </li>
                  );
                })}
              </ul>
            </section>
          )}

          <section className="mt-10">
            <h2 className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-400">
              Pembaruan Tulisan <span className="text-gmnimerah-600">({entri.length})</span>
            </h2>
            {entri.length === 0 ? (
              <p className="mt-3 text-sm italic text-hitam-400">
                Belum ada pembaruan status tulisan.
              </p>
            ) : (
              <ul className="mt-6 space-y-3">
                {entri.map((n) => {
                  const label = judulAksi(n.aksi);
                  return (
                    <li key={n.id} className="border border-hitam-200 bg-white p-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={cn("px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest", label.gaya)}>{label.judul}</span>
                        <span className="font-mono text-[11px] uppercase tracking-wider text-hitam-400">{fmtTanggal(n.tanggal)}</span>
                      </div>
                      <p className="mt-2 font-serif text-base font-bold text-hitam-900">{n.artikelJudul}</p>
                      <p className="mt-1 text-sm text-hitam-500">{n.aktorNama ? `oleh ${n.aktorNama}` : "oleh redaksi"}{n.statusArtikel === "DIMINTA_REVISI" ? " - perbaiki tulisanmu." : "."}</p>
                      {n.statusArtikel === "DIMINTA_REVISI" && (
                        <Link href={`/dasbor/tulis?id=${n.artikelId}`} className="mt-3 inline-block bg-gmnimerah-500 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gmnimerah-600">Perbaiki Sekarang</Link>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </section>
        </>
      )}
    </div>
  );
}
