/**
 * Helper monetisasi (Fase 4.1): konstanta donasi resmi + validasi iklan/donasi.
 * Single source of truth — halaman /donasi & API memakai nilai yang sama.
 */

/** Batas validasi donasi publik (Rupiah). */
export const DONASI_MINIMAL = 1000;
export const DONASI_MAKSIMAL = 500_000_000;
export const DONASI_NAMA_MIN = 2;
export const DONASI_NAMA_MAKS = 80;
export const DONASI_PESAN_MAKS = 500;

/** Rekening/bank resmi pers Marhaen — placeholder, wajib diganti bendahara. */
export const REKENING_DONASI: Array<{
  bank: string;
  nomor: string;
  atasNama: string;
}> = [
  { bank: "Bank Rakyat Indonesia (BRI)", nomor: "0000-0100-0000-000", atasNama: "Redaksi info Marhaen" },
];

/** QRIS statis di /public — diganti file asli oleh bendahara. */
export const QRIS_DONASI_SRC = "/qris-donasi.png";

/** Nilai enum yang diterima form/API (menjaga typo string). */
export const LOKASI_SLOT = ["HEADER", "SIDEBAR"] as const;
export type LokasiSlot = (typeof LOKASI_SLOT)[number];

export const STATUS_IKLAN = ["DRAFT", "AKTIF", "DIARSIPKAN"] as const;
export type StatusIklanInput = (typeof STATUS_IKLAN)[number];

/** Format Rupiah id-ID tanpa desimal: 15000 → "Rp15.000". */
export function fmtRupiah(nominal: number): string {
  return `Rp${nominal.toLocaleString("id-ID")}`;
}

export type KonfigDonasiTampilan = {
  bankNama: string;
  rekeningNomor: string;
  atasNama: string;
  qrisUrl: string | null;
  dariDb: boolean;
};

/**
 * Ambil konfigurasi donasi: baris DB (dikelola bendahara via /admin/iklan-donasi)
 * bila ada; bila kosong/gagal, jatuh ke konstanta resmi di bawah. Tidak pernah
 * melempar — halaman publik /donasi harus selalu render.
 */
export async function ambilKonfigurasiDonasi(
  db: { konfigurasiDonasi: { findUnique: (args: { where: { id: string } }) => Promise<{
    bankNama: string;
    rekeningNomor: string;
    atasNama: string;
    qrisUrl: string | null;
  } | null> } },
): Promise<KonfigDonasiTampilan> {
  try {
    const cfg = await db.konfigurasiDonasi.findUnique({ where: { id: "utama" } });
    if (cfg) {
      return { ...cfg, dariDb: true };
    }
  } catch {
    // DB tidak terjangkau / tabel belum di-push — pakai konstanta.
  }
  return {
    bankNama: REKENING_DONASI[0]?.bank ?? "Bank resmi redaksi",
    rekeningNomor: REKENING_DONASI[0]?.nomor ?? "-",
    atasNama: REKENING_DONASI[0]?.atasNama ?? "Redaksi info Marhaen",
    qrisUrl: QRIS_DONASI_SRC,
    dariDb: false,
  };
}

/** Tautan tujuan iklan harus http(s) absolut — cegah open-redirect & javascript:. */
export function tautanIklanValid(url: string): boolean {
  try {
    const u = new URL(url.trim());
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

/**
 * Apakah iklan boleh dirender publik: status AKTIF + dalam rentang
 * tanggalMulai–tanggalSelesai (null = tak berbatas sisi itu).
 */
export function iklanSedangTayang(iklan: {
  status: string;
  tanggalMulai: Date | null;
  tanggalSelesai: Date | null;
}): boolean {
  if (iklan.status !== "AKTIF") return false;
  const kini = new Date();
  if (iklan.tanggalMulai && iklan.tanggalMulai > kini) return false;
  if (iklan.tanggalSelesai && iklan.tanggalSelesai < kini) return false;
  return true;
}

/** Validasi payload donasi publik — mengembalikan pesan eror atau null bila sah. */
export function validasiDonasi(input: {
  namaDonatur: string;
  nominal: number;
  pesan?: string | null;
}): string | null {
  const nama = input.namaDonatur.trim();
  if (nama.length < DONASI_NAMA_MIN || nama.length > DONASI_NAMA_MAKS) {
    return `Nama donatur ${DONASI_NAMA_MIN}–${DONASI_NAMA_MAKS} karakter.`;
  }
  if (!Number.isInteger(input.nominal) || input.nominal < DONASI_MINIMAL) {
    return `Nominal minimal ${fmtRupiah(DONASI_MINIMAL)}.`;
  }
  if (input.nominal > DONASI_MAKSIMAL) {
    return `Nominal maksimal ${fmtRupiah(DONASI_MAKSIMAL)}.`;
  }
  if (input.pesan && input.pesan.length > DONASI_PESAN_MAKS) {
    return `Pesan maksimal ${DONASI_PESAN_MAKS} karakter.`;
  }
  return null;
}
