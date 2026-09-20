/**
 * Helper modul Hak Jawab (Pedoman Media Siber) — validasi pengajuan publik.
 */
export const HAKJAWAB_NAMA_MIN = 2;
export const HAKJAWAB_NAMA_MAKS = 80;
export const HAKJAWAB_JUDUL_MIN = 5;
export const HAKJAWAB_JUDUL_MAKS = 200;
export const HAKJAWAB_ISI_MIN = 20;
export const HAKJAWAB_ISI_MAKS = 5000;

export type InputHakJawab = {
  namaPengaju: string;
  emailPengaju: string;
  judulPemberitaan: string;
  urlPemberitaan: string;
  isi: string;
};

/** Kembalikan pesan eror bila tidak sah, atau null bila sah. */
export function validasiHakJawab(input: InputHakJawab): string | null {
  if (input.namaPengaju.length < HAKJAWAB_NAMA_MIN || input.namaPengaju.length > HAKJAWAB_NAMA_MAKS) {
    return `Nama ${HAKJAWAB_NAMA_MIN}–${HAKJAWAB_NAMA_MAKS} karakter.`;
  }
  if (input.emailPengaju) {
    if (input.emailPengaju.length > 120 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(input.emailPengaju)) {
      return "Alamat email tidak valid.";
    }
  }
  if (
    input.judulPemberitaan.length < HAKJAWAB_JUDUL_MIN ||
    input.judulPemberitaan.length > HAKJAWAB_JUDUL_MAKS
  ) {
    return `Judul pemberitaan ${HAKJAWAB_JUDUL_MIN}–${HAKJAWAB_JUDUL_MAKS} karakter.`;
  }
  if (input.urlPemberitaan) {
    try {
      const u = new URL(input.urlPemberitaan);
      if (u.protocol !== "http:" && u.protocol !== "https:") {
        return "Tautan pemberitaan harus http(s).";
      }
    } catch {
      return "Tautan pemberitaan tidak valid.";
    }
  }
  if (input.isi.length < HAKJAWAB_ISI_MIN || input.isi.length > HAKJAWAB_ISI_MAKS) {
    return `Uraian hak jawab ${HAKJAWAB_ISI_MIN}–${HAKJAWAB_ISI_MAKS} karakter.`;
  }
  return null;
}