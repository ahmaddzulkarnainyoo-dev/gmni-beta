import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

/**
 * PATCH /api/me/pengaturan — ubah preferensi akun sendiri.
 * Mendukung identitas profil, privasi, dan foto profil.
 */
export async function PATCH(request: Request) {
  const user = await requirePermission("profil.edit_sendiri");

  const body = (await request.json().catch(() => null)) as {
    namaLengkap?: unknown;
    bio?: unknown;
    daerahAsal?: unknown;
    cabangDpc?: unknown;
    komisariat?: unknown;
    profilTersembunyi?: unknown;
    fotoProfil?: unknown;
  } | null;
  if (!body) {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const data: {
    namaLengkap?: string;
    bio?: string | null;
    daerahAsal?: string | null;
    cabangDpc?: string | null;
    komisariat?: string | null;
    profilTersembunyi?: boolean;
    fotoProfil?: string | null;
  } = {};

  const teks = (nilai: unknown, label: string, min: number, max: number) => {
    if (typeof nilai !== "string") throw new Error(`${label} tidak valid.`);
    const hasil = nilai.trim();
    if (hasil.length < min || hasil.length > max) throw new Error(`${label} harus ${min}–${max} karakter.`);
    return hasil;
  };
  try {
    if (body.namaLengkap !== undefined) data.namaLengkap = teks(body.namaLengkap, "Nama lengkap", 3, 100);
    if (body.bio !== undefined) data.bio = body.bio === null || body.bio === "" ? null : teks(body.bio, "Bio", 10, 1000);
    if (body.daerahAsal !== undefined) data.daerahAsal = body.daerahAsal === null || body.daerahAsal === "" ? null : teks(body.daerahAsal, "Daerah asal", 2, 100);
    if (body.cabangDpc !== undefined) data.cabangDpc = body.cabangDpc === null || body.cabangDpc === "" ? null : teks(body.cabangDpc, "DPC", 2, 100);
    if (body.komisariat !== undefined) data.komisariat = body.komisariat === null || body.komisariat === "" ? null : teks(body.komisariat, "Komisariat", 3, 120);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Profil tidak valid." }, { status: 400 });
  }

  if (body.profilTersembunyi !== undefined) {
    if (typeof body.profilTersembunyi !== "boolean") {
      return NextResponse.json({ error: "Nilai pengaturan tidak valid." }, { status: 400 });
    }
    data.profilTersembunyi = body.profilTersembunyi;
  }

  if (body.fotoProfil !== undefined) {
    if (body.fotoProfil === null) {
      data.fotoProfil = null;
    } else if (typeof body.fotoProfil === "string") {
      const url = body.fotoProfil.trim();
      let sah = false;
      try {
        const u = new URL(url);
        sah = (u.protocol === "https:" || u.protocol === "http:") && url.length <= 300;
      } catch {
        sah = false;
      }
      if (!sah) {
        return NextResponse.json(
          { error: "URL foto profil tidak valid (http/https, maks 300 karakter)." },
          { status: 400 },
        );
      }
      data.fotoProfil = url;
    } else {
      return NextResponse.json(
        { error: "URL foto profil tidak valid." },
        { status: 400 },
      );
    }
  }

  if (Object.keys(data).length === 0) {
    return NextResponse.json(
      { error: "Tidak ada pengaturan yang dikirim." },
      { status: 400 },
    );
  }

  const hasil = await prisma.user.update({
    where: { id: user.id },
    data,
    select: { namaLengkap: true, bio: true, daerahAsal: true, cabangDpc: true, komisariat: true },
  });

  return NextResponse.json({ ok: true, pengguna: hasil });
}
