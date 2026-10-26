/** Server-only wrapper for Supabase Storage uploads. */

export type HasilUnggah =
  | { ok: true; url: string; bucket: string; jalur: string }
  | { ok: false; error: string; status: number };

function konfigurasiStorage(bucketUsulan?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const bucket = bucketUsulan ?? process.env.SUPABASE_STORAGE_BUCKET ?? "artikel";

  if (!url || !key) {
    throw new Error(
      "Storage server belum dikonfigurasi. Atur NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!/^[a-z0-9-]+$/.test(bucket)) {
    throw new Error("Nama bucket storage tidak valid.");
  }
  return { url, key, bucket };
}

function jalurEncoded(jalur: string): string {
  return jalur
    .split("/")
    .map((bagian) => encodeURIComponent(bagian))
    .join("/");
}

function pesanGagal(status: number, keterangan: string): string {
  const ringkas = keterangan.replace(/\s+/g, " ").slice(0, 200);
  if (status === 404 || /Bucket not found|does not exist/i.test(keterangan)) {
    return `Bucket storage tidak ditemukan. Pastikan bucket sudah dibuat di Supabase. Detail: ${ringkas}`;
  }
  if (status === 403 || /securityError|policy|row-level/i.test(keterangan)) {
    return `Supabase menolak operasi storage. Periksa service role key dan konfigurasi bucket. Detail: ${ringkas}`;
  }
  return `Upload gagal (kode ${status}). Coba lagi. Detail: ${ringkas}`;
}

/** Buat bucket public hanya sebagai pemulihan konfigurasi server. */
async function buatBucket(url: string, key: string, bucket: string): Promise<boolean> {
  try {
    const res = await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: bucket,
        name: bucket,
        public: true,
        file_size_limit: 5 * 1024 * 1024,
        allowed_mime_types: ["image/png", "image/jpeg", "image/webp", "image/gif"],
      }),
    });
    return res.ok || res.status === 409;
  } catch {
    return false;
  }
}

/** Upload via service role; this function must only be imported by server code. */
export async function unggahKeSupabase(
  bytes: Buffer,
  namaJalur: string,
  tipeKonten: string,
  bucketUsulan?: string,
): Promise<HasilUnggah> {
  let konfigurasi: ReturnType<typeof konfigurasiStorage>;
  try {
    konfigurasi = konfigurasiStorage(bucketUsulan);
  } catch (error) {
    return {
      ok: false,
      status: 500,
      error: error instanceof Error ? error.message : "Storage server belum dikonfigurasi.",
    };
  }

  const { url, key, bucket } = konfigurasi;
  const endpoint = `${url}/storage/v1/object/${bucket}/${jalurEncoded(namaJalur)}`;
  const headers = {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": tipeKonten,
    "x-upsert": "true",
  };

  let res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: new Uint8Array(bytes),
  });

  if (res.status === 404 && (await buatBucket(url, key, bucket))) {
    res = await fetch(endpoint, {
      method: "POST",
      headers,
      body: new Uint8Array(bytes),
    });
  }

  if (res.ok) {
    return {
      ok: true,
      url: `${url}/storage/v1/object/public/${bucket}/${jalurEncoded(namaJalur)}`,
      bucket,
      jalur: namaJalur,
    };
  }

  const keterangan = await res.text().catch(() => "");
  console.error(`[storage] Upload bucket "${bucket}" gagal (${res.status}):`, keterangan.slice(0, 200));
  return { ok: false, status: res.status, error: pesanGagal(res.status, keterangan) };
}

export function pesanErrorUnggah(hasil: HasilUnggah): string | null {
  return hasil.ok ? null : hasil.error;
}
