import type {
  MetodePembayaranKas,
  Prisma,
  StatusVerifikasiKas,
} from "@prisma/client";
import { tanggalDateOnly } from "@/lib/kas";

type AlokasiKasMasuk = {
  kaderId: string;
  minggu: Array<{ mulai: Date; nominal: number }>;
  tanggalBayar: Date;
  jumlahMinggu: number;
  totalNominal: number;
  metode: MetodePembayaranKas;
  catatan: string | null;
  dicatatOlehId: string;
  status: StatusVerifikasiKas;
  diverifikasiOlehId?: string | null;
  diverifikasiAt?: Date | null;
  bukti?: {
    storageKey: string;
    namaFile: string;
    tipeKonten: string;
    ukuranByte: number;
  };
};

export async function buatPembayaranKas(
  tx: Prisma.TransactionClient,
  masukan: AlokasiKasMasuk,
) {
  const mingguDates = masukan.minggu.map((minggu) => minggu.mulai);
  const ada = await tx.iuranKas.findMany({
    where: {
      kaderId: masukan.kaderId,
      mingguMulai: { in: mingguDates },
    },
    select: { id: true, mingguMulai: true, status: true },
  });

  if (ada.some((baris) => baris.status !== "BELUM_BAYAR")) {
    throw new Error("KONFLIK_MINGGU_KAS");
  }
  const idPerMinggu = new Map(
    ada.map((baris) => [tanggalDateOnly(baris.mingguMulai), baris.id]),
  );

  const pembayaran = await tx.pembayaranKas.create({
    data: {
      kaderId: masukan.kaderId,
      dicatatOlehId: masukan.dicatatOlehId,
      tanggalBayar: masukan.tanggalBayar,
      jumlahMinggu: masukan.jumlahMinggu,
      totalNominal: masukan.totalNominal,
      metode: masukan.metode,
      catatan: masukan.catatan,
      status: masukan.status,
      diverifikasiOlehId: masukan.diverifikasiOlehId ?? null,
      diverifikasiAt: masukan.diverifikasiAt ?? null,
      ...(masukan.bukti
        ? {
            bukti: {
              create: masukan.bukti,
            },
          }
        : {}),
    },
  });

  const mingguBaru = masukan.minggu.filter(
    (minggu) => !idPerMinggu.has(tanggalDateOnly(minggu.mulai)),
  );
  if (mingguBaru.length > 0) {
    await tx.iuranKas.createMany({
      data: mingguBaru.map((minggu) => ({
        kaderId: masukan.kaderId,
        mingguMulai: minggu.mulai,
        nominal: minggu.nominal,
        status:
          masukan.status === "DISETUJUI" ? "LUNAS" : "MENUNGGU_VERIFIKASI",
        tanggalLunas:
          masukan.status === "DISETUJUI" ? masukan.diverifikasiAt ?? new Date() : null,
      })),
    });
  }

  const mingguLama = masukan.minggu.filter((minggu) =>
    idPerMinggu.has(tanggalDateOnly(minggu.mulai)),
  );
  for (const minggu of mingguLama) {
    await tx.iuranKas.update({
      where: {
        kaderId_mingguMulai: {
          kaderId: masukan.kaderId,
          mingguMulai: minggu.mulai,
        },
      },
      data: {
        nominal: minggu.nominal,
        status:
          masukan.status === "DISETUJUI" ? "LUNAS" : "MENUNGGU_VERIFIKASI",
        tanggalLunas:
          masukan.status === "DISETUJUI" ? masukan.diverifikasiAt ?? new Date() : null,
      },
    });
  }

  const semuaIuran = await tx.iuranKas.findMany({
    where: { kaderId: masukan.kaderId, mingguMulai: { in: mingguDates } },
    select: { id: true, mingguMulai: true },
  });
  const nominalPerMinggu = new Map(
    masukan.minggu.map((minggu) => [tanggalDateOnly(minggu.mulai), minggu.nominal]),
  );
  const dataAlokasi = semuaIuran.map((iuran) => {
    const nominal = nominalPerMinggu.get(tanggalDateOnly(iuran.mingguMulai));
    if (nominal === undefined) {
      throw new Error("NOMINAL_ALOKASI_KAS_TIDAK_DITEMUKAN");
    }
    return {
      pembayaranId: pembayaran.id,
      iuranKasId: iuran.id,
      nominal,
    };
  });
  await tx.alokasiIuranKas.createMany({ data: dataAlokasi });

  return pembayaran;
}
