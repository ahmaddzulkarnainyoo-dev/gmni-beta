import { NextResponse } from "next/server";
import { getActiveSessionUser } from "@/lib/session";
import { catatAktivitas, perbaruiStreak } from "@/lib/gamifikasi";

/**
 * POST /api/kader/aktivitas — heartbeat kehadiran harian kader.
 * Idempoten 1x/hari (unique user+jenis+hari); dipakai widget dasbor.
 */
export async function POST() {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  await catatAktivitas(user.id, "AKTIF_HARIAN");
  const streak = await perbaruiStreak(user.id);
  return NextResponse.json({ ok: true, streak });
}
