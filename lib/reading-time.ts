const KATA_PER_MENIT = 200;

export function estimasiWaktuBaca(html: string): number {
  const teks = html.replace(/<[^>]*>/g, " ").replace(/&nbsp;/g, " ").replace(/\s+/g, " ").trim();
  return Math.max(1, Math.ceil(teks ? teks.split(" ").length / KATA_PER_MENIT : 1));
}
