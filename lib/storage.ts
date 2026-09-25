/**
 * lib/storage.ts — pembungkus unggah Supabase Storage (tanpa dependensi eksternal).
 *
 * Fitur (Sub-fase 4.3 / temuan #2):
 *  - Fallback multi-bucket: coba daftar bucket berurutan sampai sukses.
 *  - Self-healing: bila bucket tidak ada (404) dan SUPABASE_SERVICE_ROLE_KEY
 *    tersedia, bucket public dibuat otomatis lalu unggah diulang.
 *  - Pesan error aksiabel untuk kasus bucket/policy belum siap.
 */

export type HasilUnggah =
  | { ok: true; url: string; bucket: string; jalur: string }
  | { ok: false; error: string };

const BUCKET_FALLBACK = ["artikel", "media", "avatars"];

/** Pesan error yang bisa ditindaklanjui oleh admin/pengguna. */
function pesanGagal(status: number, keterangan: string): string {
  const ringkas = keterangan.replace(/\s+/g, " ").slice(0, 200);
  if (status === 404 || /Bucket not found|does not exist/i.test(keterangan)) {
    return (
      "Bucket storage belum tersedia. " +
      "Buat bucket PUBLIC bernama 'artikel' di Supabase (Dashboard → Storage → New bucket, " +
      "centang Public), atau set SUPABASE_SERVICE_ROLE_KEY agar bucket dibuat otomatis. " +
      `Detail: ${ringkas}`
    );
  }
  if (status === 403 || /securityError|policy|row-level/i.test(keterangan)) {
    return (
      "Policy bucket belum mengizinkan unggahan. Di Supabase: Storage → Policies → " +
      "tambahkan policy INSERT + SELECT untuk role anon pada bucket ini. " +
      `Detail: ${ringkas}`
    );
  }
  return `Upload gagal (kode ${status}). Coba lagi atau masukkan URL gambar manual. Detail: ${ringkas}`;
}

/** Buat bucket public via Service Role (bila key tersedia). */
async function buatBucket(supaUrl: string, nama: string): Promise<boolean> {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!key) return false;
  try {
    const res = await fetch(`${supaUrl}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: nama,
        name: nama,
        public: true,
        file_size_limit: 5 * 1024 * 1024,
        allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"],
      }),
    });
    // 200/201 berhasil; 409 artinya sudah ada → anggap sukses.
    return res.ok || res.status === 409;
  } catch {
    return false;
  }
}

/**
 * Unggah gambar ke Supabase Storage dengan fallback bucket & auto-create.
 * @returns URL public gambar yang dapat langsung ditampilkan.
 */
export async function unggahKeSupabase(
  bytes: Buffer,
  namaJalur: string,
  tipeKonten: string,
): Promise<HasilUnggah> {
  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supaUrl || !anon) {
    return {
      ok: false,
      error:
        "Storage belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY).",
    };
  }

  const primer = process.env.SUPABASE_STORAGE_BUCKET ?? "artikel";
  const kandidat = [primer, ...BUCKET_FALLBACK.filter((b) => b !== primer)];

  let keteranganTerakhir = "";
  for (const bucket of kandidat) {
    const res = await fetch(`${supaUrl}/storage/v1/object/${bucket}/${namaJalur}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anon}`,
        apikey: anon,
        "Content-Type": tipeKonten,
        "x-upsert": "true",
      },
      body: new Uint8Array(bytes),
    });

    if (res.ok) {
      return {
        ok: true,
        url: `${supaUrl}/storage/v1/object/public/${bucket}/${namaJalur}`,
        bucket,
        jalur: namaJalur,
      };
    }

    const keterangan = await res.text().catch(() => "");
    keteranganTerakhir = keterangan;
    console.error(
      `[storage] Unggah ke bucket "${bucket}" gagal (${res.status}):`,
      keterangan.slice(0, 200),
    );

    // Bucket tidak ada → coba buat otomatis lalu sekali lagi.
    if (res.status === 404) {
      const dibuat = await buatBucket(supaUrl, bucket);
      if (dibuat) {
        const ulang = await fetch(`${supaUrl}/storage/v1/object/${bucket}/${namaJalur}`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${anon}`,
            apikey: anon,
            "Content-Type": tipeKonten,
            "x-upsert": "true",
          },
          body: new Uint8Array(bytes),
        });
        if (ulang.ok) {
          return {
            ok: true,
            url: `${supaUrl}/storage/v1/object/public/${bucket}/${namaJalur}`,
            bucket,
            jalur: namaJalur,
          };
        }
        const keteranganUlang = await ulang.text().catch(() => "");
        console.error(
          `[storage] Ulang unggah bucket "${bucket}" gagal (${ulang.status}):`,
          keteranganUlang.slice(0, 200),
        );
        keteranganTerakhir = keteranganUlang;
      }
    }
  }

  return { ok: false, error: pesanGagal(404, keteranganTerakhir) };
}

/** Ambil pesan dari hasil unggah untuk dikirim ke klien. */
export function pesanErrorUnggah(hasil: HasilUnggah): string | null {
  return hasil.ok ? null : hasil.error;
}