/**
 * Util editor Markdown (admin & dasbor): sisip teks pada posisi kursor
 * textarea dan ekstraksi ID video YouTube dari URL/ID mentah.
 */

/** Sisip `teks` pada seleksi kursor `ta`, mengembalikan nilai baru + posisi karet berikutnya. */
export function sisipAtKursor(
  ta: HTMLTextAreaElement,
  nilai: string,
  teks: string,
): { nilai: string; posisi: number } {
  const mulai = ta.selectionStart ?? nilai.length;
  const akhir = ta.selectionEnd ?? mulai;
  return {
    nilai: `${nilai.slice(0, mulai)}${teks}${nilai.slice(akhir)}`,
    posisi: mulai + teks.length,
  };
}

/** Ambil ID video YouTube dari URL penuh (watch/youtu.be/embed/shorts) atau ID polos. */
export function idYoutube(masukan: string): string | null {
  const pola = masukan.match(/(?:v=|youtu\.be\/|embed\/|shorts\/)([A-Za-z0-9_-]{6,20})/);
  if (pola) return pola[1];
  const polos = masukan.trim().match(/^([A-Za-z0-9_-]{6,20})$/);
  return polos ? polos[1] : null;
}