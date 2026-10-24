import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  awalMingguKas,
  nominalUntukMinggu,
  parseTanggalDateOnly,
  tanggalDateOnly,
} from "@/lib/kas";
import { buatPembayaranKas } from "@/lib/kas-server";

function mingguDariRentang(mulai: Date, jumlah: number): Date[] | null {
  const akhir = new Date(mulai);
  akhir.setUTCDate(akhir.getUTCDate() + (jumlah - 1) * 7);
  if (!Number.isFinite(akhir.getTime()) || akhir.getUTCFullYear() > 9998) return null;
  return Array.from({ length: jumlah }, (_, indeks) => {
    const minggu = new Date(mulai);
    minggu.setUTCDate(minggu.getUTCDate() + indeks * 7);
    return minggu;
  });
}

/** POST /api/admin/kas/manual — catat pembayaran tunai yang langsung diterima. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.permissions.includes("kas.kelola")) {
    return NextResponse.json({ error: "Izin kas.kelola diperlukan." }, { status: 403 });
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const kaderId = typeof body?.kaderId === "string" ? body.kaderId.trim() : "";
  const mingguMulaiText = typeof body?.mingguMulai === "string" ? body.mingguMulai : "";
  const mingguMulai = parseTanggalDateOnly(mingguMulaiText);
  const jumlahMinggu = Number(body?.jumlahMinggu);
  const tanggalBayarText = typeof body?.tanggalBayar === "string" ? body.tanggalBayar : "";
  const tanggalBayar = parseTanggalDateOnly(tanggalBayarText);
  const catatan = typeof body?.catatan === "string" ? body.catatan.trim() : "";

  if (!kaderId) {
    return NextResponse.json({ error: "Pilih kader yang membayar." }, { status: 400 });
  }
  if (
    !mingguMulai ||
    tanggalDateOnly(awalMingguKas(mingguMulai)) !== mingguMulaiText
  ) {
    return NextResponse.json(
      { error: "Awal minggu harus merupakan tanggal Senin." },
      { status: 400 },
    );
  }
  if (!Number.isSafeInteger(jumlahMinggu) || jumlahMinggu < 1) {
    return NextResponse.json({ error: "Jumlah minggu harus bilangan bulat positif." }, { status: 400 });
  }
  if (!tanggalBayar || catatan.length > 500) {
    return NextResponse.json(
      { error: !tanggalBayar ? "Tanggal pembayaran tidak valid." : "Catatan maksimal 500 karakter." },
      { status: 400 },
    );
  }

  const minggu = mingguDariRentang(mingguMulai, jumlahMinggu);
  if (!minggu) {
    return NextResponse.json({ error: "Rentang minggu berada di luar tanggal yang didukung." }, { status: 400 });
  }

  try {
    const [kader, tarif] = await Promise.all([
      prisma.user.findFirst({
        where: { id: kaderId, statusAkun: "AKTIF" },
        select: { id: true },
      }),
      prisma.konfigurasiIuranKas.findMany({
        where: { berlakuMulai: { lte: minggu[minggu.length - 1] } },
        orderBy: { berlakuMulai: "asc" },
        select: { berlakuMulai: true, nominal: true },
      }),
    ]);
    if (!kader) {
      return NextResponse.json({ error: "Kader aktif tidak ditemukan." }, { status: 404 });
    }
    const mingguDenganTarif = minggu.map((mulai) => ({
      mulai,
      nominal: nominalUntukMinggu(tarif, mulai),
    }));
    const mingguFinal: Array<{ mulai: Date; nominal: number }> = [];
    for (const baris of mingguDenganTarif) {
      if (baris.nominal === null) {
        return NextResponse.json(
          { error: "Nominal iuran belum dikonfigurasi untuk seluruh minggu yang dipilih." },
          { status: 409 },
        );
      }
      mingguFinal.push({ mulai: baris.mulai, nominal: baris.nominal });
    }
    const totalNominal = mingguFinal.reduce((total, baris) => total + baris.nominal, 0);
    if (!Number.isSafeInteger(totalNominal) || totalNominal > 2_147_483_647) {
      return NextResponse.json({ error: "Total nominal melampaui batas yang didukung." }, { status: 400 });
    }

    const sekarang = new Date();
    const pembayaran = await prisma.$transaction(
      async (tx) => {
        const hasil = await buatPembayaranKas(tx, {
          kaderId,
          minggu: mingguFinal,
          tanggalBayar,
          jumlahMinggu,
          totalNominal,
          metode: "TUNAI",
          catatan: catatan || null,
          dicatatOlehId: user.id,
          status: "DISETUJUI",
          diverifikasiOlehId: user.id,
          diverifikasiAt: sekarang,
        });
        await tx.auditLog.create({
          data: {
            aktorId: user.id,
            aksi: "kas.tunai",
            entitasTipe: "PembayaranKas",
            entitasId: hasil.id,
            dataSesudah: {
              kaderId,
              jumlahMinggu,
              totalNominal,
              minggu: mingguFinal.map((baris) => tanggalDateOnly(baris.mulai)),
            },
          },
        });
        await tx.notifikasi.create({
          data: {
            userId: kaderId,
            judul: "Pembayaran kas dicatat",
            isi: "Bendahara telah mencatat pembayaran tunai Anda sebagai lunas.",
            tipe: "SUKSES",
            tautan: "/dasbor/kas",
          },
        });
        return hasil;
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ ok: true, id: pembayaran.id }, { status: 201 });
  } catch (error) {
    if (
      error instanceof Error &&
      error.message === "KONFLIK_MINGGU_KAS"
    ) {
      return NextResponse.json(
        { error: "Satu atau beberapa minggu sudah lunas atau menunggu verifikasi." },
        { status: 409 },
      );
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      (error.code === "P2002" || error.code === "P2034")
    ) {
      return NextResponse.json(
        { error: "Data kas berubah bersamaan. Muat ulang dan coba lagi." },
        { status: 409 },
      );
    }
    console.error("[admin/kas] Gagal mencatat pembayaran tunai:", error);
    return NextResponse.json({ error: "Pembayaran tunai gagal dicatat." }, { status: 500 });
  }
}
