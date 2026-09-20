import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/session";

/**
 * PATCH /api/admin/hak-jawab/[id] — redaksi menjawab / menolak pengajuan
 * hak jawab pembaca (permission halaman_statis.edit atau laporan.tinjau).
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await requirePermission("halaman_statis.edit", "laporan.tinjau");
  const { id } = await params;

  const pengajuan = await prisma.hakJawab.findUnique({ where: { id } });
  if (!pengajuan) {
    return NextResponse.json({ error: "Pengajuan tidak ditemukan." }, { status: 404 });
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const status = body.status;
  const jawaban = typeof body.jawabanRedaksi === "string" ? body.jawabanRedaksi.trim() : "";
  if (status !== "DIPROSES" && status !== "DIJAWAB" && status !== "DITOLAK") {
    return NextResponse.json({ error: "Status tidak valid." }, { status: 400 });
  }
  if (status === "DIJAWAB" && jawaban.length < 10) {
    return NextResponse.json(
      { error: "Jawaban redaksi wajib diisi (minimal 10 karakter)." },
      { status: 400 },
    );
  }

  const [diperbarui] = await prisma.$transaction([
    prisma.hakJawab.update({
      where: { id },
      data: {
        status,
        jawabanRedaksi: jawaban || (status === "DIJAWAB" ? undefined : pengajuan.jawabanRedaksi),
        dijawabOlehId: status === "DIJAWAB" || status === "DITOLAK" ? user.id : undefined,
        dijawabAt: status === "DIJAWAB" || status === "DITOLAK" ? new Date() : undefined,
      },
    }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: `hakjawab.${status.toLowerCase()}`,
        entitasTipe: "HakJawab",
        entitasId: id,
        dataSebelum: { status: pengajuan.status },
        dataSesudah: { status },
      },
    }),
  ]);

  return NextResponse.json({ ok: true, status: diperbarui.status });
}