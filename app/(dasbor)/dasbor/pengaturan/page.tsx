import type { Metadata } from "next";
import { requirePermission } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { TogglePrivasi } from "@/components/dasbor/TogglePrivasi";
import { WidgetDuaFaktor } from "@/components/dasbor/WidgetDuaFaktor";
import { WidgetFotoProfil } from "@/components/dasbor/WidgetFotoProfil";
import { FormProfil } from "@/components/dasbor/FormProfil";

export const metadata: Metadata = { title: "Pengaturan" };
export const dynamic = "force-dynamic";

export default async function HalamanPengaturan() {
  const user = await requirePermission("profil.edit_sendiri");

  const pengguna = await prisma.user.findUnique({
    where: { id: user.id },
    select: {
      namaLengkap: true,
      username: true,
      email: true,
      bio: true,
      daerahAsal: true,
      cabangDpc: true,
      komisariat: true,
      fotoProfil: true,
      profilTersembunyi: true,
      is2FAEnabled: true,
    },
  });
  if (!pengguna) return null;

  return (
    <div className="mx-auto max-w-3xl">
      <div className="border-b-2 border-hitam-900 pb-3">
        <h1 className="font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
          Pengaturan
        </h1>
        <p className="mt-1 text-sm text-hitam-500">
          Proyek info Marhaen: profil, sandi, dan privasi akun.
        </p>
      </div>

      <div className="mt-6 border-2 border-hitam-900 bg-white p-5"><p className="font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-600">Akun</p><dl className="mt-3 grid gap-3 text-sm"><div className="flex justify-between gap-4"><dt className="text-hitam-500">Username</dt><dd className="font-mono text-hitam-900">@{pengguna.username}</dd></div><div className="flex justify-between gap-4"><dt className="text-hitam-500">Email</dt><dd className="text-hitam-900">{pengguna.email}</dd></div></dl></div>
      <FormProfil awal={pengguna} />

      <WidgetFotoProfil urlAwal={pengguna.fotoProfil} namaLengkap={pengguna.namaLengkap} />

      <TogglePrivasi aktif={pengguna.profilTersembunyi} />

      <WidgetDuaFaktor aktifAwal={pengguna.is2FAEnabled} />
    </div>
  );
}
