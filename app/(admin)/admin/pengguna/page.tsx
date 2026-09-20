import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { PanelPengguna } from "@/components/admin/PanelPengguna";
import { PanelVerifikasiKader } from "@/components/admin/PanelVerifikasiKader";
import { GeneratorUndangan } from "@/components/admin/GeneratorUndangan";

export const metadata: Metadata = { title: "Pengguna & Undangan" };
export const dynamic = "force-dynamic";

export default async function HalamanPenggunaAdmin() {
  const user = await requirePermission("pengguna.undang", "pengguna.suspend");

  const [daftar, menunggu, roles] = await Promise.all([
    prisma.user.findMany({
      orderBy: [{ namaLengkap: "asc" }, { tanggalBergabung: "asc" }],
      select: {
        id: true,
        namaLengkap: true,
        email: true,
        nim: true,
        username: true,
        statusAkun: true,
        tokenUndangan: true,
        tanggalBergabung: true,
        role: { select: { id: true, nama: true } },
        diundangOleh: { select: { email: true } },
      },
    }),
    prisma.user.findMany({
      where: { statusAkun: "PENDING" },
      orderBy: { namaLengkap: "asc" },
      select: {
        id: true,
        namaLengkap: true,
        email: true,
        nim: true,
        username: true,
        cabangKomisariat: true,
        tanggalBergabung: true,
      },
    }),
    // Daftar peran untuk dropdown ubah peran (Super Admin dilindungi).
    prisma.role.findMany({
      where: { nama: { not: "Super Admin" } },
      orderBy: { nama: "asc" },
      select: { id: true, nama: true },
    }),
  ]);

  const data = daftar.map((u) => ({
    id: u.id,
    namaLengkap: u.namaLengkap,
    email: u.email,
    nim: u.nim,
    username: u.username,
    statusAkun: u.statusAkun,
    roleId: u.role.id,
    roleNama: u.role.nama,
    tokenUndangan: u.tokenUndangan,
    diundangOlehEmail: u.diundangOleh?.email ?? null,
    tanggalBergabung: u.tanggalBergabung.toISOString(),
  }));

  const dataMenunggu = menunggu.map((u) => ({
    id: u.id,
    namaLengkap: u.namaLengkap,
    email: u.email,
    nim: u.nim,
    username: u.username,
    cabangKomisariat: u.cabangKomisariat,
    tanggalBergabung: u.tanggalBergabung.toISOString(),
  }));

  return (
    <div className="mx-auto max-w-4xl">
      <div className="border-b-2 border-hitam-900 pb-3">
        <h1 className="font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
          Pengguna & Undangan
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Kelola akun kader, verifikasi pendaftaran baru, buat tautan undangan
          sekali pakai, dan tangguhkan akun bila diperlukan.
        </p>
      </div>
      {user.permissions.includes("pengguna.undang") && <GeneratorUndangan />}
      <section aria-label="Verifikasi pendaftaran kader" className="mt-8">
        <div className="flex flex-wrap items-center gap-2 border-b-2 border-hitam-900 pb-2">
          <h2 className="font-serif text-xl font-extrabold text-hitam-900">
            Verifikasi Pendaftaran Kader
          </h2>
          {dataMenunggu.length > 0 && (
            <span className="bg-gmnimerah-500 px-2 py-0.5 font-mono text-[11px] font-bold uppercase tracking-widest text-white">
              {dataMenunggu.length} menunggu
            </span>
          )}
        </div>
        <PanelVerifikasiKader pendaftar={dataMenunggu} />
      </section>
      <section aria-label="Kader dan undangan" id="seksi-kader-undangan" className="mt-10 scroll-mt-20">
        <h2 className="border-b-2 border-hitam-900 pb-2 font-serif text-xl font-extrabold text-hitam-900">
          Kader & Undangan
        </h2>
        <PanelPengguna
          pengguna={data}
          roles={roles}
          bisaSuspend={user.permissions.includes("pengguna.suspend")}
          bisaHapus={user.permissions.includes("pengguna.suspend")}
          bisaUbahRole={user.permissions.includes("role.kelola")}
        />
      </section>
    </div>
  );
}