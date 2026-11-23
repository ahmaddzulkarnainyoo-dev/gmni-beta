import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { iklanSedangTayang } from "@/lib/monetisasi";

/**
 * GET /api/iklan/[id]/klik — redirect tercatat (counter klik).
 * Tujuan diambil dari DB (bukan query param) → anti open-redirect.
 * Iklan non-aktif/di luar rentang → kembali ke beranda.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  let tujuan: string | null = null;
  try {
    const iklan = await prisma.iklan.findUnique({ where: { id } });
    if (!iklan || !iklanSedangTayang(iklan)) redirect("/");
    let url: URL;
    try {
      url = new URL(iklan.tautanUrl);
    } catch {
      redirect("/");
    }
    if (url.protocol !== "http:" && url.protocol !== "https:") redirect("/");
    tujuan = url.toString();
    await prisma.iklan
      .update({ where: { id }, data: { jumlahKlik: { increment: 1 } } })
      .catch(() => undefined);
  } catch {
    tujuan = null;
  }
  redirect(tujuan ?? "/");
}
