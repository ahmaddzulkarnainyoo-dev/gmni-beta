import type { Metadata } from "next";
import Link from "next/link";
import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { LABEL_STATUS, GAYA_STATUS } from "@/lib/label-status";
import { TombolAjukan } from "@/components/dasbor/TombolAjukan";
import { TombolArsipTulisan } from "@/components/dasbor/TombolArsipTulisan";
import { amanAsync } from "@/lib/kueri-aman";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Tulisan Saya" };
export const dynamic = "force-dynamic";

export default async function HalamanTulisanSaya() {
  const user = await requirePermission("artikel.buat");

  const daftar = await amanAsync(
    () =>
      prisma.artikel.findMany({
        where: { penulisId: user.id },
        orderBy: { updatedAt: "desc" },
        select: {
          id: true,
          judul: true,
          slug: true,
          status: true,
          visibilitasPenulis: true,
          namaTampilanKustom: true,
          catatanRevisi: true,
          tanggalDiajukan: true,
          tanggalTerbit: true,
          kategori: { select: { nama: true } },
        },
      }),
    null,
  );

  if (!daftar) {
    return (
      <div className="mx-auto max-w-4xl">
        <p
          role="alert"
          className="border-2 border-gmnimerah-500 bg-gmnimerah-50 px-3 py-2 text-sm font-semibold text-gmnimerah-700"
        >
          Daftar tulisan belum dapat dimuat. Coba muat ulang halaman - tulisan
          Anda aman tersimpan di database.
        </p>
      </div>
    );
  }

  const bisaDiajukan = (status: string) => status === "DRAFT" || status === "DIMINTA_REVISI";
  const bisaDiajukanUlang = (status: string) => status === "DITOLAK" || status === "DIARSIPKAN";
  const bisaDiarsipkan = (status: string) =>
    status === "DRAFT" || status === "DIAJUKAN" || status === "DIMINTA_REVISI" || status === "DITOLAK";
  const bisaDikonfirmasi = (status: string) => status === "DIAJUKAN" || status === "SEDANG_DITINJAU";

  return (
    <div className="mx-auto max-w-4xl">
      <div className="flex flex-wrap items-end justify-between gap-3 border-b-2 border-hitam-900 pb-3">
        <div>
          <h1 className="font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
            Tulisan Saya
          </h1>
          <p className="mt-1 text-sm text-hitam-500">
            Status setiap tulisan dalam alur redaksi: draf, tinjauan, revisi,
            hingga terbit.
          </p>
        </div>
        <Link
          href="/dasbor/tulis"
          className="bg-gmnimerah-500 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gmnimerah-600"
        >
          + Tulis Baru
        </Link>
      </div>

      {daftar.length === 0 ? (
        <div className="mt-10 border-4 border-dashed border-hitam-200 bg-kertas-100 p-10 text-center">
          <p className="font-serif text-xl font-bold text-hitam-900">
            Belum ada tulisan.
          </p>
          <p className="mt-2 text-sm text-hitam-500">
            Mulai menulis sekarang - suara kader adalah bahan bakar perjuangan.
          </p>
          <Link
            href="/dasbor/tulis"
            className="mt-5 inline-block bg-gmnimerah-500 px-6 py-3 font-sans text-sm font-bold uppercase tracking-wide text-white transition-colors hover:bg-gmnimerah-600"
          >
            Tulis Artikel Pertama
          </Link>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {daftar.map((a) => (
            <li key={a.id} className="border border-hitam-200 bg-white p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={cn(
                        "border border-hitam-900 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest",
                        GAYA_STATUS[a.status],
                      )}
                    >
                      {LABEL_STATUS[a.status]}
                    </span>
                    <span className="font-mono text-[11px] uppercase tracking-wider text-hitam-400">
                      {a.kategori.nama}
                    </span>
                    {a.visibilitasPenulis !== "ASLI" && (
                      <span className="font-mono text-[11px] uppercase tracking-wider text-gmnimerah-600">
                        {a.visibilitasPenulis === "SAMARAN" ? "samaran" : "redaksi"}
                      </span>
                    )}
                  </div>
                  <Link
                    href={a.status === "TERBIT" ? `/artikel/${a.slug}` : "#"}
                    className={cn(
                      "mt-2 block font-serif text-lg font-bold leading-snug text-hitam-900 hover:text-gmnimerah-600",
                      a.status !== "TERBIT" && "pointer-events-none",
                    )}
                  >
                    {a.judul}
                  </Link>
                  {(a.status === "DIMINTA_REVISI" || a.status === "DITOLAK") &&
                    a.catatanRevisi && (
                      <p className="mt-2 border-l-2 border-gmnimerah-500 bg-kertas-150 px-3 py-2 text-sm text-hitam-600">
                        <strong className="font-mono text-[10px] uppercase tracking-widest text-gmnimerah-700">
                          Catatan redaksi:{" "}
                        </strong>
                        {a.catatanRevisi}
                      </p>
                    )}
                </div>
                <div className="flex shrink-0 flex-col items-end gap-2">
                  {bisaDiajukan(a.status) && (
                    <>
                      <Link
                        href={`/dasbor/tulis?id=${a.id}`}
                        className="border-2 border-hitam-900 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
                      >
                        {a.status === "DIMINTA_REVISI" ? "Perbaiki" : "Edit"}
                      </Link>
                      <TombolAjukan id={a.id} />
                    </>
                  )}
                  {bisaDiajukanUlang(a.status) && (
                    <>
                      <Link
                        href={`/dasbor/tulis?id=${a.id}`}
                        className="border-2 border-hitam-900 px-3 py-1 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
                      >
                        Edit
                      </Link>
                      <TombolAjukan id={a.id} mode="AJUKAN_ULANG" />
                    </>
                  )}
                  {bisaDiarsipkan(a.status) && <TombolArsipTulisan id={a.id} judul={a.judul} />}
                  {bisaDikonfirmasi(a.status) && (
                    <span className="py-1 font-mono text-[11px] uppercase tracking-wider text-hitam-400">
                      Menunggu redaksi
                    </span>
                  )}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}