import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuthUser } from "@/lib/session";

/**
 * POST /api/notifikasi/baca — tandai semua notifikasi kader sebagai dibaca.
 * Dipakai tombol "Tandai Semua Dibaca" di /dasbor/notifikasi.
 */
export async function POST() {
  const user = await requireAuthUser();
  try {
    const hasil = await prisma.notifikasi.updateMany({
      where: { userId: user.id, dibaca: false },
      data: { dibaca: true },
    });
    return NextResponse.json({ ok: true, jumlah: hasil.count });
  } catch (error) {
    console.error("[notifikasi] Gagal menandai dibaca:", error);
    return NextResponse.json({ error: "Gagal menandai dibaca." }, { status: 500 });
  }
}