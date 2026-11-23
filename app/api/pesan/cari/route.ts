import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";

/** GET /api/pesan/cari?q= — cari kader untuk memulai percakapan baru. */
export async function GET(request: Request) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Harus masuk terlebih dahulu." },
      { status: 401 },
    );
  }
  if (!user.permissions.includes("pesan.kirim")) {
    return NextResponse.json(
      { error: "Akun Anda tidak memiliki izin berkirim pesan." },
      { status: 403 },
    );
  }

  const { searchParams } = new URL(request.url);
  const q = (searchParams.get("q") ?? "").trim();
  if (q.length < 2) {
    return NextResponse.json({ kader: [] });
  }

  const staf = user.permissions.includes("komentar.moderasi");

  const kader = await prisma.user.findMany({
    where: {
      id: { not: user.id },
      statusAkun: "AKTIF",
      // Non-staf tidak melihat kader yang menyembunyikan profil (Fase 2→3).
      ...(staf ? {} : { profilTersembunyi: false }),
      OR: [
        { namaLengkap: { contains: q, mode: "insensitive" } },
        { username: { contains: q, mode: "insensitive" } },
      ],
    },
    orderBy: { namaLengkap: "asc" },
    take: 10,
    select: {
      id: true,
      namaLengkap: true,
      username: true,
      fotoProfil: true,
    },
  });

  return NextResponse.json({ kader });
}
