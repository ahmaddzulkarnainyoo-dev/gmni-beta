import Link from "next/link";
import { requireAuthUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { amanAsync } from "@/lib/kueri-aman";
import { LogoGMNI } from "@/components/brand/LogoGMNI";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { DasborDrawer } from "@/components/dasbor/DasborDrawer";
import { TombolKeluar } from "@/components/ui/TombolKeluar";

// Named export selain default/metadata dilarang Next 16 di layout - konstanta lokal.
const MENU_DASBOR: Array<{ label: string; href: string }> = [
  { label: "Ringkasan", href: "/dasbor" },
  { label: "Tulis Artikel", href: "/dasbor/tulis" },
  { label: "Tulisan Saya", href: "/dasbor/tulisan-saya" },
  { label: "Pesan", href: "/dasbor/pesan" },
  { label: "Notifikasi", href: "/dasbor/notifikasi" },
  { label: "Pencapaian", href: "/dasbor/pencapaian" },
  { label: "Pengaturan", href: "/dasbor/pengaturan" },
];

/** Item menu dasbor + lencana opsional (jumlah notifikasi belum dibaca). */
type ItemMenuDasbor = { label: string; href: string; lencana?: number };

/** Label kecil di kanan menu (mis. jumlah notifikasi belum dibaca). */
function LencanaMenu({ nilai }: { nilai: number }) {
  if (nilai <= 0) {
    return (
      <span
        aria-hidden
        className="ml-1 inline-block h-1.5 w-1.5 rounded-full bg-gmnimerah-500/40"
      />
    );
  }
  return (
    <span className="ml-auto inline-flex min-w-5 items-center justify-center rounded-full bg-gmnimerah-500 px-1.5 py-0.5 font-mono text-[10px] font-bold leading-none text-white">
      {nilai > 99 ? "99+" : nilai}
    </span>
  );
}

export default async function DasborLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  // Hanya kader terverifikasi yang bisa mengakses dasbor.
  const user = await requireAuthUser();

  // Badge notifikasi belum dibaca (best-effort: DB lambat → tanpa badge).
  const belumDibaca = await amanAsync(
    () => prisma.notifikasi.count({ where: { userId: user.id, dibaca: false } }),
    0,
  );
  const menu: ItemMenuDasbor[] = MENU_DASBOR.map((m) =>
    m.href === "/dasbor/notifikasi" ? { ...m, lencana: belumDibaca } : m,
  );

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-hitam-900 text-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center gap-3 px-4">
          {/* Drawer mobile (hamburger + breadcrumb) — tersembunyi di md ke atas */}
          <DasborDrawer menu={menu} namaKader={user.name ?? "Kader"} />
          <LogoGMNI warne="putih" className="hidden h-8 w-8 md:block" />
          <Link href="/dasbor" className="font-serif text-lg font-bold">
            info{" "}
            <span className="italic text-gmnimerah-400">Marhaen</span>
          </Link>
          <span className="ml-2 hidden border border-gmnimerah-500 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-gmnimerah-400 sm:inline-block">
            Dasbor Kader
          </span>
          <Link
            href="/"
            className="ml-auto font-mono text-[11px] uppercase tracking-widest text-kertas-300 hover:text-gmnimerah-400"
          >
            Lihat Situs
          </Link>
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-6xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-52 shrink-0 md:block">
          <nav
            aria-label="Menu dasbor"
            className="sticky top-4 flex flex-col gap-1"
          >
            <KickerLabel className="mb-2">Dasbor</KickerLabel>
            {menu.map((m) => (
              <Link
                key={m.href}
                href={m.href}
                className="flex items-center gap-2 border-l-2 border-transparent px-3 py-2 font-sans text-sm font-medium text-hitam-700 transition-colors hover:border-gmnimerah-500 hover:bg-white hover:text-hitam-900"
              >
                <span>{m.label}</span>
                {m.lencana !== undefined && <LencanaMenu nilai={m.lencana} />}
              </Link>
            ))}
            <span className="mt-4 border-t border-hitam-200 pt-3 font-mono text-[11px] uppercase tracking-widest text-hitam-400">
              Masuk sebagai {user.name}
            </span>
            <TombolKeluar variant="link-hari" className="mt-2" />
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}