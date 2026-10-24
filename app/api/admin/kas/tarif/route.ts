import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  awalMingguKas,
  parseTanggalDateOnly,
  tanggalDateOnly,
} from "@/lib/kas";

/** POST /api/admin/kas/tarif — buat atau perbarui tarif efektif per pekan. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.permissions.includes("kas.kelola")) {
    return NextResponse.json({ error: "Izin kas.kelola diperlukan." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const nominal = typeof body?.nominal === "number" ? body.nominal : Number(body?.nominal);
  const berlakuMulaiText = typeof body?.berlakuMulai === "string" ? body.berlakuMulai : "";
  const berlakuMulai = parseTanggalDateOnly(berlakuMulaiText);
  if (!Number.isSafeInteger(nominal) || nominal < 1 || nominal > 2_147_483_647) {
    return NextResponse.json(
      { error: "Nominal tarif harus bilangan Rupiah positif yang valid." },
      { status: 400 },
    );
  }
  if (
    !berlakuMulai ||
    tanggalDateOnly(awalMingguKas(berlakuMulai)) !== berlakuMulaiText
  ) {
    return NextResponse.json(
      { error: "Tanggal berlaku harus hari Senin (awal minggu WIB)." },
      { status: 400 },
    );
  }
  const mingguIni = awalMingguKas(new Date());
  if (berlakuMulai < mingguIni) {
    return NextResponse.json(
      { error: "Tarif baru hanya boleh berlaku mulai minggu ini atau minggu mendatang." },
      { status: 400 },
    );
  }

  try {
    const sebelum = await prisma.konfigurasiIuranKas.findUnique({
      where: { berlakuMulai },
      select: { id: true, nominal: true },
    });
    await prisma.$transaction(async (tx) => {
      const tarif = await tx.konfigurasiIuranKas.upsert({
        where: { berlakuMulai },
        create: { nominal, berlakuMulai, dibuatOlehId: user.id },
        update: { nominal, dibuatOlehId: user.id },
      });
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "kas.tarif",
          entitasTipe: "KonfigurasiIuranKas",
          entitasId: tarif.id,
          dataSebelum: sebelum
            ? { nominal: sebelum.nominal, berlakuMulai: berlakuMulaiText }
            : Prisma.JsonNull,
          dataSesudah: { nominal, berlakuMulai: berlakuMulaiText },
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/kas] Gagal menyimpan tarif:", error);
    return NextResponse.json({ error: "Tarif kas gagal disimpan." }, { status: 500 });
  }
}
