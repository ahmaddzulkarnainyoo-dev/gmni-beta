import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { amanAsync } from "@/lib/kueri-aman";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { PencarianCepat } from "@/components/publik/PencarianCepat";
import { HasilPencarian } from "@/components/publik/HasilPencarian";

export const dynamic = "force-dynamic";

const MAKS_KUERI = 100;

/** Samakan dengan PencarianCepat.samakan (1 sumber kebenaran sisi klien). */
function samakan(mentah?: string): string {
  return (mentah ?? "").replace(/\s+/g, " ").trim().slice(0, MAKS_KUERI);
}

export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}): Promise<Metadata> {
  const { q } = await searchParams;
  const kata = samakan(q);
  return {
    title: kata ? `Pencarian: ${kata}` : "Pencarian",
    description: kata
      ? `Hasil pencarian "${kata}" di info Marhaen — berita, Marhaenisme, kaderisasi, dan kader.`
      : "Cari berita, Marhaenisme, kaderisasi, dan kader di info Marhaen.",
  };
}

/** Halaman pencarian publik — bar ala Google + hasil server dari ?q=. */
export default async function HalamanCari({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const kata = samakan(q);

  // Chips "coba cari" dari kanal berita yang hidup (fallback: statis lib/site).
  const kanal = await amanAsync(
    () =>
      prisma.kategori.findMany({
        orderBy: [{ isTetap: "desc" }, { nama: "asc" }],
        take: 7,
        select: { nama: true },
      }),
    [] as Array<{ nama: string }>,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 md:py-14">
      <header className="text-center">
        <KickerLabel className="justify-center">Pencarian</KickerLabel>
        <h1 className="mx-auto mt-3 max-w-2xl font-serif text-3xl font-extrabold leading-tight text-hitam-900 md:text-5xl">
          Cari di <span className="text-red-600">info Marhaen</span>
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-sm text-hitam-500 md:text-base">
          Berita, Marhaenisme, kaderisasi, opini, dan kader — ketik lalu tekan
          Enter, hasil ikut ter-update saat Anda mengetik.
        </p>
      </header>

      <div className="mt-8">
        <PencarianCepat kueriAwal={kata} autoFokus />
      </div>

      {kata.length >= 2 ? (
        <div className="mt-10">
          <p className="mb-5 font-mono text-xs uppercase tracking-widest text-hitam-400">
            Hasil untuk &ldquo;{kata}&rdquo;
          </p>
          <HasilPencarian q={kata} />
        </div>
      ) : (
        <div className="mx-auto mt-8 max-w-2xl text-center">
          <p className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-400">
            Coba cari
          </p>
          <ul className="mt-3 flex flex-wrap justify-center gap-2">
            {(kanal.length > 0
              ? kanal.map((k) => k.nama)
              : ["Politik", "Ekonomi", "Pendidikan", "Marhaenisme", "Kaderisasi", "Tokoh"]
            ).map((nama) => (
              <li key={nama}>
                <a
                  href={`/cari?q=${encodeURIComponent(nama)}`}
                  className="inline-block rounded-full border border-hitam-200 bg-white px-4 py-1.5 text-sm font-semibold text-hitam-700 transition-all hover:border-hitam-900 hover:shadow-[2px_2px_0_0_var(--color-hitam-900)]"
                >
                  {nama}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
