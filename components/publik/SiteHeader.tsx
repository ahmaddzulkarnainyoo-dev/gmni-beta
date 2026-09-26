import Link from "next/link";
import Image from "next/image";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import {
  KATEGORI_BERITA,
  NAV_UTAMA,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/lib/site";
import { MobileNav } from "@/components/publik/MobileNav";
import { NavDesktop } from "@/components/publik/NavDesktop";
import { TickerBerita } from "@/components/publik/TickerBerita";
import { SlotIklanHeader } from "@/components/publik/SlotIklanHeader";
import { TombolKeluar } from "@/components/ui/TombolKeluar";
import { bolehMasukAdmin } from "@/lib/nav";
import { prisma } from "@/lib/prisma";

function TanggalHariIni() {
  const tanggal = new Date().toLocaleDateString("id-ID", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  return <time className="uppercase">{tanggal}</time>;
}

/** 12 artikel terbit terbaru untuk ticker "TERBARU" marquee (fallback [] bila DB offline). */
async function ambilBeritaTicker(): Promise<Array<{ judul: string; slug: string }>> {
  try {
    return await prisma.artikel.findMany({
      where: { status: "TERBIT" },
      orderBy: [{ disematkan: "desc" }, { tanggalTerbit: "desc" }],
      take: 12,
      select: { judul: true, slug: true },
    });
  } catch {
    return [];
  }
}

export async function SiteHeader() {
  const sess = await getServerSession(authOptions);
  const user = sess?.user;
  const beritaTicker = await ambilBeritaTicker();
  return (
    <header className="static w-full">
      {/* Kanal atas — tanggal dan sikap editorial */}
      <div className="border-b-[3px] border-double border-black bg-hitam-900 text-kertas-200">
        <div className="mx-auto flex min-h-10 max-w-6xl flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-1.5 font-sans text-[10px] font-medium uppercase tracking-wide sm:text-[11px]">
          <span className="shrink-0 text-kertas-300">
            <TanggalHariIni />
          </span>
          <span className="hidden min-w-0 flex-1 truncate text-center text-kertas-300 lg:block">
            Suara rakyat kecil — oposisi kebijakan
          </span>
          <nav aria-label="Akun" className="ml-auto flex shrink-0 items-center gap-1.5 sm:gap-2.5">
            {user ? (
              <>
                {/* Satu pintu adaptif: admin/editor → /admin, kader → /dasbor. */}
                {bolehMasukAdmin(user.roleNama) ? (
                  <Link
                    href="/admin"
                    className="inline-flex min-h-7 items-center rounded-sm border border-white/30 px-2.5 py-1 text-[10px] font-semibold text-kertas-200 transition-colors hover:border-white hover:text-white"
                  >
                    Dasbor Admin
                  </Link>
                ) : (
                  <Link
                    href="/dasbor"
                    className="inline-flex min-h-6 items-center px-1 text-kertas-200 transition-colors hover:text-white hover:underline underline-offset-4"
                  >
                    Dasbor
                  </Link>
                )}
                <TombolKeluar variant="link-terang" />
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="inline-flex min-h-7 items-center px-1 text-[10px] text-kertas-200 transition-colors hover:text-white hover:underline underline-offset-4"
                >
                  Masuk
                </Link>
                <Link
                  href="/daftar"
                  className="inline-flex min-h-7 items-center rounded-sm border border-white/30 px-2.5 py-1 text-[10px] font-semibold text-white transition-colors hover:border-white hover:bg-white/10"
                >
                  <span className="sm:hidden">Daftar</span>
                  <span className="hidden sm:inline">Registrasi Kader</span>
                </Link>
              </>
            )}
          </nav>
        </div>
      </div>

      {/* Masthead — wordmark media */}
      <div className="border-b-[3px] border-double border-hitam-900 bg-kertas-50">
        <div className="mx-auto flex max-w-6xl items-center justify-center px-4 py-8 sm:py-10 lg:py-12">
          <Link href="/" className="flex min-w-0 items-center gap-4 sm:gap-5 lg:gap-7" aria-label={SITE_NAME}>
            {/* Logo resmi GMNI (public/logo.png) */}
            <Image
              src="/logo.png"
              alt=""
              width={1456}
              height={1440}
              sizes="(min-width: 1024px) 96px, (min-width: 640px) 80px, 48px"
              className="h-14 w-14 shrink-0 object-contain sm:h-22 sm:w-22 lg:h-28 lg:w-28"
            />
            <div className="min-w-0 leading-none">
              <p className="whitespace-nowrap font-serif text-[clamp(2rem,8vw,3.25rem)] font-bold leading-none tracking-tight text-hitam-900 sm:text-6xl lg:text-7xl">
                info <span className="text-red-600">Marhaen</span>
              </p>
              <p className="mt-3 border-t border-hitam-900/35 pt-2.5 font-sans text-[9px] font-medium uppercase leading-relaxed tracking-[0.1em] text-hitam-600 sm:text-[11px] sm:tracking-[0.18em] lg:text-xs">
                {SITE_TAGLINE}
              </p>
            </div>
          </Link>
        </div>
      </div>

      {/* Ticker berita — bar netral dengan badge merah ringkas */}
      <div className="border-y border-black/10 bg-[#F9F9FB] text-hitam-900">
        <div className="mx-auto flex min-h-10 max-w-6xl items-center gap-3 px-4 py-2 sm:gap-4">
          <span className="shrink-0 rounded-sm bg-red-600 px-2 py-0.5 font-sans text-xs font-bold text-white">
            TERBARU
          </span>
          <TickerBerita berita={beritaTicker} />
        </div>
      </div>

      {/* Navigasi utama — kategori */}
      <div className="border-b-[3px] border-double border-hitam-900 bg-kertas-50">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between px-4">
          <NavDesktop navUtama={NAV_UTAMA} kategoriBerita={KATEGORI_BERITA} />

          <MobileNav
            navUtama={NAV_UTAMA}
            kategoriBerita={KATEGORI_BERITA}
            user={{ masuk: Boolean(user), roleNama: user?.roleNama ?? null }}
          />
        </div>
      </div>

      {/* Slot iklan header — bar non-intrusif (Fase 4.1), render bila ada banner tayang */}
      <SlotIklanHeader />
    </header>
  );
}