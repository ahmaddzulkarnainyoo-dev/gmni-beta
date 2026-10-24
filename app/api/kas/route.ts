import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  awalMingguKas,
  mingguDalamTahun,
  nominalUntukMinggu,
  parseTanggalDateOnly,
  statusTampilanKas,
  tanggalDateOnly,
  tanggalWib,
} from "@/lib/kas";
import { buatPembayaranKas } from "@/lib/kas-server";
import {
  buktiKasValid,
  ekstensiBuktiKas,
  hapusBuktiKas,
  unggahBuktiKas,
} from "@/lib/storage-kas";

const MAKS_NOMINAL_RUPIAH = 2_147_483_647;

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

function pesanKonflikKas(error: unknown): boolean {
  return (
    error instanceof Error && error.message === "KONFLIK_MINGGU_KAS"
  ) || (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    (error.code === "P2002" || error.code === "P2034")
  );
}

/** GET /api/kas — status mingguan dan riwayat kas kader yang sedang masuk. */
export async function GET() {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }

  try {
    const tahun = Number(tanggalWib(new Date()).slice(0, 4));
    const minggu = mingguDalamTahun(tahun);
    const mulai = minggu[0];
    const akhir = new Date(minggu[minggu.length - 1].getTime() + 7 * 86_400_000);
    const [iuran, tarif, pembayaran, konfigurasi] = await Promise.all([
      prisma.iuranKas.findMany({
        where: { kaderId: user.id, mingguMulai: { gte: mulai, lt: akhir } },
        select: { mingguMulai: true, nominal: true, status: true, tanggalLunas: true },
      }),
      prisma.konfigurasiIuranKas.findMany({
        orderBy: { berlakuMulai: "asc" },
        select: { berlakuMulai: true, nominal: true },
      }),
      prisma.pembayaranKas.findMany({
        where: { kaderId: user.id },
        orderBy: { createdAt: "desc" },
        take: 30,
        include: {
          bukti: { select: { id: true, namaFile: true } },
          alokasi: {
            include: {
              iuranKas: { select: { mingguMulai: true } },
            },
            orderBy: { iuranKas: { mingguMulai: "asc" } },
          },
        },
      }),
      prisma.konfigurasiKas.findUnique({ where: { id: "utama" }, select: { bankNama: true, rekeningNomor: true, atasNama: true, qrisUrl: true } }),
    ]);

    const statusPerMinggu = new Map(
      iuran.map((baris) => [tanggalDateOnly(baris.mingguMulai), baris]),
    );
    const mingguKas = minggu.map((mingguMulai) => {
      const catatan = statusPerMinggu.get(tanggalDateOnly(mingguMulai));
      return {
        mingguMulai: tanggalDateOnly(mingguMulai),
        nominal:
          catatan?.nominal ?? nominalUntukMinggu(tarif, mingguMulai),
        status: statusTampilanKas(catatan?.status ?? null, mingguMulai),
        tanggalLunas: catatan?.tanggalLunas?.toISOString() ?? null,
      };
    });

    return NextResponse.json({
      ok: true,
      tahun,
      konfigurasiKas: konfigurasi,
      tarif: tarif.map((baris) => ({
        nominal: baris.nominal,
        berlakuMulai: baris.berlakuMulai.toISOString().slice(0, 10),
      })),
      minggu: mingguKas,
      pembayaran: pembayaran.map((baris) => ({
        id: baris.id,
        tanggalBayar: tanggalDateOnly(baris.tanggalBayar),
        jumlahMinggu: baris.jumlahMinggu,
        totalNominal: baris.totalNominal,
        metode: baris.metode,
        status: baris.status,
        catatan: baris.catatan,
        alasanPenolakan: baris.alasanPenolakan,
        createdAt: baris.createdAt.toISOString(),
        bukti: baris.bukti,
        minggu: baris.alokasi.map((alokasi) =>
          tanggalDateOnly(alokasi.iuranKas.mingguMulai),
        ),
      })),
    });
  } catch (error) {
    console.error("[kas] Gagal memuat ringkasan kader:", error);
    return NextResponse.json(
      { error: "Data kas belum dapat dimuat. Coba lagi sebentar." },
      { status: 500 },
    );
  }
}

/** POST /api/kas — ajukan transfer untuk rentang minggu berurutan. */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Form pengajuan kas tidak valid." }, { status: 400 });
  }

  const mingguMulaiText = String(form.get("mingguMulai") ?? "");
  const mingguMulai = parseTanggalDateOnly(mingguMulaiText);
  const jumlahMinggu = Number(form.get("jumlahMinggu"));
  const tanggalBayarText = String(form.get("tanggalBayar") ?? "");
  const tanggalBayar = parseTanggalDateOnly(tanggalBayarText);
  const catatanRaw = String(form.get("catatan") ?? "").trim();
  const catatan = catatanRaw || null;
  const file = form.get("bukti");

  if (!mingguMulai || tanggalDateOnly(awalMingguKas(mingguMulai)) !== mingguMulaiText) {
    return NextResponse.json(
      { error: "Pilih tanggal Senin sebagai awal minggu pembayaran." },
      { status: 400 },
    );
  }
  if (!Number.isSafeInteger(jumlahMinggu) || jumlahMinggu < 1) {
    return NextResponse.json({ error: "Jumlah minggu harus bilangan bulat positif." }, { status: 400 });
  }
  if (!tanggalBayar) {
    return NextResponse.json({ error: "Tanggal pembayaran tidak valid." }, { status: 400 });
  }
  if (catatan && catatan.length > 500) {
    return NextResponse.json({ error: "Catatan maksimal 500 karakter." }, { status: 400 });
  }
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Bukti transfer wajib diunggah." }, { status: 400 });
  }
  const alasanFile = await buktiKasValid(file);
  if (alasanFile) {
    return NextResponse.json({ error: alasanFile }, { status: 400 });
  }

  const minggu = mingguDariRentang(mingguMulai, jumlahMinggu);
  if (!minggu) {
    return NextResponse.json({ error: "Rentang minggu berada di luar tanggal yang didukung." }, { status: 400 });
  }

  try {
    const tarif = await prisma.konfigurasiIuranKas.findMany({
      where: { berlakuMulai: { lte: minggu[minggu.length - 1] } },
      orderBy: { berlakuMulai: "asc" },
      select: { berlakuMulai: true, nominal: true },
    });
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
    if (!Number.isSafeInteger(totalNominal) || totalNominal > MAKS_NOMINAL_RUPIAH) {
      return NextResponse.json(
        { error: "Total nominal melebihi batas transaksi yang didukung." },
        { status: 400 },
      );
    }

    const jalur = `pembayaran/${user.id}/${randomUUID()}.${ekstensiBuktiKas(file.type)}`;
    const bytes = new Uint8Array(await file.arrayBuffer());
    await unggahBuktiKas(jalur, bytes, file.type);

    try {
      const pembayaran = await prisma.$transaction(
        async (tx) => {
          const hasil = await buatPembayaranKas(tx, {
            kaderId: user.id,
            minggu: mingguFinal,
            tanggalBayar,
            jumlahMinggu,
            totalNominal,
            metode: "TRANSFER",
            catatan,
            dicatatOlehId: user.id,
            status: "MENUNGGU_VERIFIKASI",
            bukti: {
              storageKey: jalur,
              namaFile: file.name.replace(/[\\/]/g, "_").slice(0, 160) || "bukti",
              tipeKonten: file.type,
              ukuranByte: file.size,
            },
          });
          await tx.auditLog.create({
            data: {
              aktorId: user.id,
              aksi: "kas.pengajuan",
              entitasTipe: "PembayaranKas",
              entitasId: hasil.id,
              dataSesudah: {
                jumlahMinggu,
                totalNominal,
                minggu: mingguFinal.map((baris) => tanggalDateOnly(baris.mulai)),
              },
            },
          });
          return hasil;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
      );
      return NextResponse.json({ ok: true, id: pembayaran.id }, { status: 201 });
    } catch (error) {
      try {
        await hapusBuktiKas(jalur);
      } catch (cleanupError) {
        console.error("[kas] Gagal membersihkan bukti yatim:", cleanupError);
      }
      if (pesanKonflikKas(error)) {
        return NextResponse.json(
          { error: "Satu atau beberapa minggu sudah lunas atau menunggu verifikasi." },
          { status: 409 },
        );
      }
      throw error;
    }
  } catch (error) {
    console.error("[kas] Gagal membuat pengajuan:", error);
    return NextResponse.json(
      { error: "Pengajuan kas gagal diproses. Silakan coba kembali." },
      { status: 500 },
    );
  }
}
