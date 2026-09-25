import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";

/**
 * GET /api/kader/follow — daftar kader yang diikuti + statistik untuk
 * widget dasbor & tombol ikuti (Sub-fase 4.3 — kolaborasi).
 */
export async function GET() {
  const sesi = await getSessionUser();
  if (!sesi) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const [diikuti, jumlahDiikuti, jumlahPengikut] = await Promise.all([
      prisma.follower.findMany({
        where: { pengikutId: sesi.id },
        orderBy: { createdAt: "desc" },
        take: 12,
        include: {
          diikuti: { select: { id: true, namaLengkap: true, username: true, fotoProfil: true } },
        },
      }),
      prisma.follower.count({ where: { pengikutId: sesi.id } }),
      prisma.follower.count({ where: { diikutiId: sesi.id } }),
    ]);

    return NextResponse.json({
      ok: true,
      jumlah: { diikuti: jumlahDiikuti, pengikut: jumlahPengikut },
      diikuti: diikuti.map((f) => ({
        id: f.diikuti.id,
        namaLengkap: f.diikuti.namaLengkap,
        username: f.diikuti.username,
        fotoProfil: f.diikuti.fotoProfil,
      })),
    });
  } catch (error) {
    console.error("[follow] Gagal memuat daftar:", error);
    return NextResponse.json({ error: "Gagal memuat daftar kader." }, { status: 500 });
  }
}