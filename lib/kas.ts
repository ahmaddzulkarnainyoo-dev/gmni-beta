import type { StatusIuranKas } from "@prisma/client";

const MS_PER_DAY = 86_400_000;
const OFFSET_WIB_MS = 7 * 60 * 60 * 1000;

export type TarifKas = {
  nominal: number;
  berlakuMulai: Date | string;
};

export type StatusTampilanKas =
  | StatusIuranKas
  | "MENUNGGAK";

export function tanggalWib(value: Date): string {
  const wib = new Date(value.getTime() + OFFSET_WIB_MS);
  return [
    wib.getUTCFullYear(),
    String(wib.getUTCMonth() + 1).padStart(2, "0"),
    String(wib.getUTCDate()).padStart(2, "0"),
  ].join("-");
}

export function tanggalDateOnly(value: Date): string {
  return value.toISOString().slice(0, 10);
}

export function parseTanggalDateOnly(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00.000Z`);
  return Number.isNaN(date.getTime()) || tanggalDateOnly(date) !== value ? null : date;
}

export function awalMingguKas(value: Date | string): Date {
  const tanggal =
    typeof value === "string"
      ? value
      : value.getUTCHours() === 0
        ? tanggalDateOnly(value)
        : tanggalWib(value);
  const parsed = parseTanggalDateOnly(tanggal);
  if (!parsed) throw new Error("Tanggal minggu kas tidak valid.");
  const hari = parsed.getUTCDay();
  parsed.setUTCDate(parsed.getUTCDate() - ((hari + 6) % 7));
  return parsed;
}

export function mingguDalamTahun(tahun: number): Date[] {
  if (!Number.isInteger(tahun) || tahun < 1900 || tahun > 9998) {
    throw new Error("Tahun kas harus antara 1900 dan 9998.");
  }
  const jan1 = new Date(Date.UTC(tahun, 0, 1));
  const start = awalMingguKas(jan1);
  const akhir = new Date(Date.UTC(tahun, 11, 31));
  const minggu: Date[] = [];
  for (
    let cursor = new Date(start);
    cursor <= akhir;
    cursor = new Date(cursor.getTime() + 7 * MS_PER_DAY)
  ) {
    minggu.push(cursor);
  }
  return minggu;
}

export function tanggalMingguAkhir(mingguMulai: Date): Date {
  return new Date(mingguMulai.getTime() + 7 * MS_PER_DAY);
}

export function nominalUntukMinggu(
  tarif: TarifKas[],
  mingguMulai: Date,
): number | null {
  const tanggalMinggu = tanggalDateOnly(mingguMulai);
  let nominal: number | null = null;
  for (const baris of tarif) {
    const berlakuMulai =
      typeof baris.berlakuMulai === "string"
        ? baris.berlakuMulai.slice(0, 10)
        : tanggalDateOnly(baris.berlakuMulai);
    if (berlakuMulai > tanggalMinggu) break;
    nominal = baris.nominal;
  }
  return nominal;
}

export function totalNominalUntukRentang(
  tarif: TarifKas[],
  mingguMulai: Date,
  jumlahMinggu: number,
  batasNominal = 2_147_483_647,
): number | null {
  if (!Number.isSafeInteger(jumlahMinggu) || jumlahMinggu < 1) return null;
  const cursor = new Date(mingguMulai);
  let tersisa = jumlahMinggu;
  let total = 0;

  while (tersisa > 0) {
    const nominal = nominalUntukMinggu(tarif, cursor);
    if (nominal === null) return null;

    const tanggalCursor = tanggalDateOnly(cursor);
    const tarifBerikut = tarif.find((baris) => {
      const berlakuMulai =
        typeof baris.berlakuMulai === "string"
          ? baris.berlakuMulai.slice(0, 10)
          : tanggalDateOnly(baris.berlakuMulai);
      return berlakuMulai > tanggalCursor;
    });
    const tanggalTarifBerikut = tarifBerikut
      ? parseTanggalDateOnly(
          typeof tarifBerikut.berlakuMulai === "string"
            ? tarifBerikut.berlakuMulai.slice(0, 10)
            : tanggalDateOnly(tarifBerikut.berlakuMulai),
        )
      : null;
    const jarakMinggu = tanggalTarifBerikut
      ? Math.ceil(
          (tanggalTarifBerikut.getTime() - cursor.getTime()) / (7 * MS_PER_DAY),
        )
      : tersisa;
    if (!Number.isSafeInteger(jarakMinggu) || jarakMinggu < 1) return null;
    const mingguTarifIni = Math.min(tersisa, jarakMinggu);
    total += nominal * mingguTarifIni;
    if (!Number.isSafeInteger(total) || total > batasNominal) return null;

    tersisa -= mingguTarifIni;
    cursor.setUTCDate(cursor.getUTCDate() + mingguTarifIni * 7);
  }

  return total;
}

export function statusTampilanKas(
  status: StatusIuranKas | null,
  mingguMulai: Date,
  sekarang = new Date(),
): StatusTampilanKas {
  if (status === "LUNAS" || status === "MENUNGGU_VERIFIKASI") return status;
  const tenggat = tanggalDateOnly(tanggalMingguAkhir(mingguMulai));
  return tanggalWib(sekarang) >= tenggat ? "MENUNGGAK" : "BELUM_BAYAR";
}
