import { KickerLabel } from "@/components/ui/KickerLabel";
import { requireAuthUser } from "@/lib/session";
import { LABEL_BADGE, evaluasiBadgeKader, ambilKatalogBadge } from "@/lib/gamifikasi";
import { prisma } from "@/lib/prisma";
import { fmtTanggal } from "@/lib/articles";
import { amanAsync } from "@/lib/kueri-aman";

export const dynamic = "force-dynamic";

/**
 * Trophy case pribadi kader (blueprint 8.4): badge permanen milik sendiri,
 * tidak hilang saat leaderboard mingguan reset.
 */
export default async function HalamanPencapaian() {
  const user = await requireAuthUser();
  await evaluasiBadgeKader(user.id);
  const badge =
    (await amanAsync(
      () =>
        prisma.pencapaian.findMany({
          where: { userId: user.id },
          orderBy: { tanggalDiperoleh: "desc" },
        }),
      [],
    )) ?? [];
  const katalog = (await amanAsync(() => ambilKatalogBadge(), new Map())) ?? new Map();

  return (
    <div>
      <KickerLabel>Pencapaian</KickerLabel>
      <h1 className="mt-2 font-serif text-3xl font-extrabold text-hitam-900">Trophy Case</h1>
      <p className="mt-2 text-sm text-hitam-500">
        {badge.length} lencana terkumpul - tersimpan permanen sebagai bukti perjuangan.
      </p>

      {badge.length === 0 ? (
        <div className="mt-6 border-4 border-dashed border-hitam-200 bg-kertas-100 p-10 text-center">
          <p className="font-serif text-xl font-bold text-hitam-900">Belum ada lencana.</p>
          <p className="mt-2 text-sm text-hitam-500">
            Terbitkan tulisan pertama, berkomentar, dan aktif tiap hari untuk membuka lencana.
          </p>
        </div>
      ) : (
        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {badge.map((b) => {
            const katalogEntri = katalog.get(b.jenisBadge);
            const label = katalogEntri?.label ?? LABEL_BADGE[b.jenisBadge] ?? b.jenisBadge;
            const gambar = katalogEntri?.gambarUrl ?? null;
            return (
            <div key={b.id} className="border-2 border-hitam-900 bg-white p-5 text-center">
              {gambar ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={gambar}
                  alt={label}
                  className="mx-auto h-16 w-16 border-2 border-hitam-900 object-cover"
                />
              ) : (
                <span
                  aria-hidden
                  className="mx-auto grid h-12 w-12 place-items-center bg-gmnimerah-500 font-serif text-2xl font-extrabold text-white"
                  style={{ clipPath: "polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%)" }}
                >
                  &starf;
                </span>
              )}
              <p className="mt-3 font-serif text-lg font-bold text-hitam-900">
                {label}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-hitam-400">
                {b.periode === "SEMUA" ? "Sepanjang masa" : `Periode ${b.periode}`}
              </p>
              <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-hitam-400">
                {fmtTanggal(b.tanggalDiperoleh)}
              </p>
            </div>
            );
          })}
        </div>
      )}
    </div>
  );
}