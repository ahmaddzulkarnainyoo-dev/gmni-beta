import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

/** DELETE /api/admin/leaderboard/ajus/[id] — batalkan penyesuaian poin manual. */
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requirePermission("leaderboard.override");
  const { id } = await params;

  const ajus = await prisma.ajusPoin.findUnique({ where: { id } });
  if (!ajus) {
    return NextResponse.json({ error: "Penyesuaian tidak ditemukan." }, { status: 404 });
  }

  await prisma.$transaction([
    prisma.ajusPoin.delete({ where: { id } }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: "leaderboard.ajus_batal",
        entitasTipe: "User",
        entitasId: ajus.userId,
        dataSebelum: { poin: ajus.poin, alasan: ajus.alasan },
      },
    }),
  ]);

  return NextResponse.json({ ok: true });
}