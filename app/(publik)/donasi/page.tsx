import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { FormDonasi } from "@/components/publik/FormDonasi";
import { ambilKonfigurasiDonasi, fmtRupiah } from "@/lib/monetisasi";
import { fmtTanggal } from "@/lib/articles";

export const metadata: Metadata = {
  title: "Donasi Pers Marhaen",
  description: "Sokong pers Marhaen yang merdeka — donasi transparan terverifikasi bendahara.",
};
export const dynamic = "force-dynamic";

export default async function HalamanDonasi() {
  let donasi: Array<{
    id: string;
    namaDonatur: string;
    nominal: number;
    pesan: string | null;
    createdAt: Date;
  }> = [];
  let totalNominal = 0;
  let konfig: Awaited<ReturnType<typeof ambilKonfigurasiDonasi>> | null = null;
  try {
    donasi = await prisma.donasi.findMany({
      where: { status: "TERVERIFIKASI" },
      orderBy: [{ createdAt: "desc" }],
      take: 10,
      select: { id: true, namaDonatur: true, nominal: true, pesan: true, createdAt: true },
    });
    const agregat = await prisma.donasi.aggregate({
      where: { status: "TERVERIFIKASI" },
      _sum: { nominal: true },
    });
    totalNominal = agregat._sum.nominal ?? 0;
    konfig = await ambilKonfigurasiDonasi(prisma);
  } catch {
    donasi = [];
    konfig = await ambilKonfigurasiDonasi(prisma);
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10">
      <header className="border-b-2 border-hitam-900 pb-4">
        <KickerLabel>Pers Marhaen</KickerLabel>
        <h1 className="mt-2 font-serif text-3xl font-extrabold text-hitam-900 md:text-4xl">
          Donasi: Sokong Pers yang Merdeka
        </h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-hitam-600">
          info Marhaen hidup dari keringat kader dan sokongan pembaca — bukan
          dari iklan oligarki. Setiap rupiah dicatat bendahara, diverifikasi
          manual, dan ditampilkan transparan di bawah. Merdeka!
        </p>
      </header>

      <div className="mt-8 grid gap-8 md:grid-cols-2">
        <section aria-label="Kanal donasi resmi">
          <KickerLabel>Langkah 1 — Transfer</KickerLabel>
          <div className="mt-3 border-2 border-hitam-900 bg-white p-5">
            <div className="border-b border-hitam-100 pb-4">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-500">
                {konfig.bankNama}
              </p>
              <p className="mt-1 font-mono text-2xl font-bold tracking-wide text-hitam-900">
                {konfig.rekeningNomor}
              </p>
              <p className="mt-1 text-sm text-hitam-600">a.n. {konfig.atasNama}</p>
            </div>
            <div className="mt-4 pt-4 text-center">
              <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-500">
                Atau pindai QRIS
              </p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={konfig.qrisUrl ?? "/qris-donasi.png"}
                alt="Kode QRIS donasi pers Marhaen"
                className="mx-auto mt-2 h-48 w-48 border-2 border-hitam-900 object-contain"
              />
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-hitam-400">
                Berkas QRIS resmi diganti bendahara
              </p>
            </div>
          </div>
        </section>

        <section aria-label="Catat donasi">
          <KickerLabel>Langkah 2 — Catat</KickerLabel>
          <div className="mt-3">
            <FormDonasi />
          </div>
        </section>
      </div>
      <WidgetTransparansi donasi={donasi} totalNominal={totalNominal} />
    </div>
  );
}

function WidgetTransparansi({
  donasi,
  totalNominal,
}: {
  donasi: Array<{
    id: string;
    namaDonatur: string;
    nominal: number;
    pesan: string | null;
    createdAt: Date;
  }>;
  totalNominal: number;
}) {
  return (
    <section aria-label="Transparansi donasi" className="mt-12">
      <KickerLabel>Transparansi</KickerLabel>
      <div className="mt-3 grid gap-4 md:grid-cols-3">
        <div className="border-2 border-hitam-900 bg-hitam-900 p-5 text-white">
          <p className="font-mono text-[11px] uppercase tracking-widest text-kertas-300">
            Total Terkumpul
          </p>
          <p className="mt-1 font-mono text-3xl font-bold">{fmtRupiah(totalNominal)}</p>
          <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-kertas-400">
            Terverifikasi bendahara
          </p>
        </div>
        <div className="border-2 border-hitam-900 bg-white p-5 md:col-span-2">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-500">
            Donatur Terakhir
          </p>
          {donasi.length === 0 ? (
            <div className="mt-3 border-4 border-dashed border-hitam-200 bg-kertas-100 p-6 text-center">
              <p className="font-serif text-lg font-bold text-hitam-900">
                Belum ada donasi terverifikasi.
              </p>
              <p className="mt-1 text-sm text-hitam-500">
                Jadilah yang pertama menyokong pers Marhaen.
              </p>
            </div>
          ) : (
            <ul className="mt-3 divide-y divide-hitam-100">
              {donasi.map((d) => (
                <li key={d.id} className="flex items-baseline justify-between gap-3 py-2">
                  <div className="min-w-0">
                    <p className="truncate text-sm font-bold text-hitam-900">{d.namaDonatur}</p>
                    {d.pesan && (
                      <p className="truncate text-xs italic text-hitam-500">“{d.pesan}”</p>
                    )}
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-mono text-sm font-bold text-gmnimerah-600">
                      {fmtRupiah(d.nominal)}
                    </p>
                    <p className="font-mono text-[10px] uppercase tracking-widest text-hitam-400">
                      {fmtTanggal(d.createdAt)}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}