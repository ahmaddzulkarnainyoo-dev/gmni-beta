import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

/**
 * POST /api/admin/leaderboard/ajus — penyesuaian poin manual (khusus Super
 * Admin, permission leaderboard.override). Poin +/- dengan alasan wajib;
 * digabung ke agregasi papan minggu berjalan via lib/gamifikasi.ts.
 */
export async function POST(request: Request) {
  const user = await requirePermission("leaderboard.override");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const alasan = typeof body.alasan === "string" ? body.alasan.trim() : "";
  const poin =
    typeof body.poin === "number" ? Math.trunc(body.poin) : Number.isFinite(Number(body.poin)) ? Math.trunc(Number(body.poin)) : NaN;

  if (!userId) return NextResponse.json({ error: "Kader wajib dipilih." }, { status: 400 });
  if (!Number.isInteger(poin) || poin === 0) {
    return NextResponse.json({ error: "Poin harus bilangan bulat selain nol." }, { status: 400 });
  }
  if (Math.abs(poin) > 1000) {
    return NextResponse.json({ error: "Poin manual maksimal ±1000." }, { status: 400 });
  }
  if (alasan.length < 5 || alasan.length > 500) {
    return NextResponse.json({ error: "Alasan wajib 5–500 karakter (jejak keputusan)." }, { status: 400 });
  }

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, namaLengkap: true, statusAkun: true },
  });
  if (!target) return NextResponse.json({ error: "Kader tidak ditemukan." }, { status: 404 });
  if (target.statusAkun !== "AKTIF") {
    return NextResponse.json({ error: "Hanya kader AKTIF yang dapat diberi penyesuaian poin." }, { status: 400 });
  }

  const [hasil] = await prisma.$transaction([
    prisma.ajusPoin.create({ data: { userId, poin, alasan, dibuatOlehId: user.id } }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: "leaderboard.ajus_poin",
        entitasTipe: "User",
        entitasId: userId,
        dataSesudah: { poin, alasan },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, id: hasil.id, nama: target.namaLengkap, poin }, { status: 201 });
}

/** GET — riwayat penyesuaian poin terakhir (untuk tabel di panel admin). */
export async function GET() {
  await requirePermission("leaderboard.override");
  const riwayat = await prisma.ajusPoin.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
    include: {
      user: { select: { namaLengkap: true, username: true } },
      dibuatOleh: { select: { namaLengkap: true } },
    },
  });
  return NextResponse.json({
    ok: true,
    riwayat: riwayat.map((r) => ({
      id: r.id,
      poin: r.poin,
      alasan: r.alasan,
      tanggal: r.createdAt.toISOString(),
      kader: r.user?.namaLengkap ?? "(terhapus)",
      username: r.user?.username ?? "",
      oleh: r.dibuatOleh?.namaLengkap ?? "—",
    })),
  });
}