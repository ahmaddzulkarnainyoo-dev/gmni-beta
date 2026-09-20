import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

/**
 * PATCH /api/admin/leaderboard/papan — sembunyikan / tampilkan kader di papan
 * leaderboard publik (User.sembunyikanDariPapan; khusus Super Admin).
 */
export async function PATCH(request: Request) {
  const user = await requirePermission("leaderboard.override");

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const userId = typeof body.userId === "string" ? body.userId.trim() : "";
  const sembunyikan = body.sembunyikan === true;
  if (!userId) return NextResponse.json({ error: "Kader wajib dipilih." }, { status: 400 });

  const target = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true, namaLengkap: true, sembunyikanDariPapan: true },
  });
  if (!target) return NextResponse.json({ error: "Kader tidak ditemukan." }, { status: 404 });
  if (target.sembunyikanDariPapan === sembunyikan) {
    return NextResponse.json({ ok: true, sembunyikanDariPapan: sembunyikan });
  }

  await prisma.$transaction([
    prisma.user.update({ where: { id: userId }, data: { sembunyikanDariPapan: sembunyikan } }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: sembunyikan ? "leaderboard.sembunyikan" : "leaderboard.tampilkan",
        entitasTipe: "User",
        entitasId: userId,
        dataSesudah: { sembunyikanDariPapan: sembunyikan },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, sembunyikanDariPapan: sembunyikan });
}