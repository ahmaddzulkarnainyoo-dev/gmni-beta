type Catatan = { mulai: number; jumlah: number };

const catatan = new Map<string, Catatan>();

/** Limiter ringan untuk menjaga endpoint tetap aman tanpa dependensi eksternal. */
export function lewatRateLimit(kunci: string, batas: number, jendelaMs: number): boolean {
  const sekarang = Date.now();
  const lama = catatan.get(kunci);
  if (!lama || sekarang - lama.mulai >= jendelaMs) {
    catatan.set(kunci, { mulai: sekarang, jumlah: 1 });
    return true;
  }
  if (lama.jumlah >= batas) return false;
  lama.jumlah += 1;
  return true;
}

// Cegah map tumbuh tanpa batas pada proses yang hidup lama.
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const batas = Date.now() - 10 * 60_000;
    for (const [kunci, nilai] of catatan) {
      if (nilai.mulai < batas) catatan.delete(kunci);
    }
  }, 10 * 60_000).unref?.();
}
