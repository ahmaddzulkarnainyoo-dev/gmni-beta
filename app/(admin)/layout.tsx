import Link from "next/link";
import { redirect } from "next/navigation";
import { requireAuthUser } from "@/lib/session";
import { LogoGMNI } from "@/components/brand/LogoGMNI";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { AdminDrawer } from "@/components/admin/AdminDrawer";
import { TombolKeluar } from "@/components/ui/TombolKeluar";

// Named export selain default/metadata dilarang Next 16 di layout — konstanta lokal.
const MENU_ADMIN: Array<{
  grup: string;
  item: Array<{ label: string; href: string }>;
}> = [
  {
    grup: "Redaksi",
    item: [
      { label: "Ringkasan", href: "/admin" },
      { label: "Antrian Redaksi", href: "/admin/redaksi" },
      { label: "Kelola Artikel", href: "/admin/artikel" },
      { label: "Kategori", href: "/admin/kategori" },
      { label: "Tag", href: "/admin/tag" },
      { label: "Moderasi Komentar", href: "/admin/komentar" },
      { label: "Laporan", href: "/admin/laporan" },
      { label: "Kelola Leaderboard", href: "/admin/leaderboard" },
    ],
  },
  {
    grup: "Keuangan",
    item: [{ label: "Rekap Iuran Kas", href: "/admin/kas" }],
  },
  {
    grup: "Organisasi",
    item: [
      { label: "Pengguna & Undangan", href: "/admin/pengguna" },
      { label: "Peran & Hak Akses", href: "/admin/peran" },
      { label: "Halaman Statis", href: "/admin/halaman" },
      { label: "Tokoh", href: "/admin/tokoh" },
      { label: "Tampilan & Branding", href: "/admin/tampilan" },
      { label: "Iklan & Donasi", href: "/admin/iklan-donasi" },
      { label: "Pengaturan Situs", href: "/admin/pengaturan" },
    ],
  },
  {
    grup: "Sistem",
    item: [{ label: "Audit Log", href: "/admin/audit-log" }],
  },
];

export default async function AdminLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  const user = await requireAuthUser();
  const isAdmin = user.roleNama === "Super Admin" || user.roleNama === "Editor";
  const punyaAksesKas = user.permissions.includes("kas.kelola");
  if (!isAdmin && !punyaAksesKas) redirect("/");
  const menu = isAdmin
    ? MENU_ADMIN.map((kelompok) => ({
        ...kelompok,
        item: kelompok.item.filter(
          (item) => item.href !== "/admin/kas" || punyaAksesKas,
        ),
      })).filter((kelompok) => kelompok.item.length > 0)
    : [
        {
          grup: "Keuangan",
          item: MENU_ADMIN.flatMap((kelompok) => kelompok.item).filter(
            (item) => item.href === "/admin/kas",
          ),
        },
      ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="bg-hitam-900 text-white">
        <div className="mx-auto flex h-14 max-w-7xl items-center gap-3 px-4">
          <AdminDrawer menu={menu} />
          <LogoGMNI warne="putih" className="hidden h-8 w-8 sm:block" />
          <p className="font-serif text-lg font-bold">
            info{" "}
            <span className="italic text-gmnimerah-400">Marhaen</span>
          </p>
          <span className="ml-2 hidden border border-gmnimerah-500 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-widest text-gmnimerah-400 sm:inline-block">
            Admin
          </span>
          <Link
            href="/"
            className="ml-auto font-mono text-[11px] uppercase tracking-widest text-kertas-300 hover:text-gmnimerah-400"
          >
            Lihat Situs
          </Link>
          <TombolKeluar variant="link-terang" />
        </div>
      </header>

      <div className="mx-auto flex w-full max-w-7xl flex-1 gap-6 px-4 py-6">
        <aside className="hidden w-56 shrink-0 md:block">
          <nav aria-label="Menu admin" className="sticky top-4">
            {menu.map((kelompok) => (
              <div key={kelompok.grup} className="mb-4">
                <KickerLabel warne="hitam" className="mb-1.5">
                  {kelompok.grup}
                </KickerLabel>
                <div className="flex flex-col gap-0.5">
                  {kelompok.item.map((m) => (
                    <Link
                      key={m.href}
                      href={m.href}
                      className="border-l-2 border-transparent px-3 py-1.5 font-sans text-sm font-medium text-hitam-700 transition-colors hover:border-gmnimerah-500 hover:bg-white hover:text-hitam-900"
                    >
                      {m.label}
                    </Link>
                  ))}
                </div>
              </div>
            ))}
          </nav>
        </aside>
        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}