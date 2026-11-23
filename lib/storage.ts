/** Server-only wrapper for Supabase Storage uploads. */

export type HasilUnggah =
  | { ok: true; url: string; bucket: string; jalur: string }
  | { ok: false; error: string; status: number };

function konfigurasiStorage(bucketUsulan?: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim().replace(/\/+$/, "");
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = bucketUsulan?.trim() || process.env.SUPABASE_STORAGE_BUCKET?.trim() || "artikel";

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

type KonfigurasiBucket = {
  id: string;
  public: boolean;
  fileSizeLimit: number;
  allowedMimeTypes: string[];
};

const BUCKET_DEFAULT: KonfigurasiBucket[] = [
  {
    id: "artikel",
    public: true,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  },
  {
    id: "avatars",
    public: true,
    fileSizeLimit: 2 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif"],
  },
  {
    id: "lampiran-pesan",
    public: false,
    fileSizeLimit: 10 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp", "image/gif", "application/pdf"],
  },
  {
    id: "bukti-kas",
    public: false,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: ["image/png", "image/jpeg", "image/webp"],
  },
];

function daftarKonfigurasiBucket(): KonfigurasiBucket[] {
  const namaArtikel = process.env.SUPABASE_STORAGE_BUCKET?.trim();
  const namaAvatar = process.env.SUPABASE_AVATAR_BUCKET?.trim();
  const namaKas = process.env.SUPABASE_KAS_BUCKET?.trim();
  const hasil = [...BUCKET_DEFAULT];
  const tambahan = [
    namaArtikel && { id: namaArtikel, public: true, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: BUCKET_DEFAULT[0].allowedMimeTypes },
    namaAvatar && { id: namaAvatar, public: true, fileSizeLimit: 2 * 1024 * 1024, allowedMimeTypes: BUCKET_DEFAULT[1].allowedMimeTypes },
    namaKas && { id: namaKas, public: false, fileSizeLimit: 5 * 1024 * 1024, allowedMimeTypes: BUCKET_DEFAULT[3].allowedMimeTypes },
  ].filter((bucket): bucket is KonfigurasiBucket => Boolean(bucket));
  for (const bucket of tambahan) {
    if (!hasil.some((sudahAda) => sudahAda.id === bucket.id)) hasil.push(bucket);
  }
  return hasil;
}

function jalurEncoded(jalur: string): string {
  return jalur
    .split("/")
    .map((bagian) => encodeURIComponent(bagian))
    .join("/");
}

function ringkasKeterangan(keterangan: string): string {
  return keterangan.replace(/\s+/g, " ").trim().slice(0, 240);
}

function pesanGagal(status: number, keterangan: string, bucket?: string): string {
  const ringkas = ringkasKeterangan(keterangan);
  const konteks = bucket ? ` Bucket "${bucket}".` : "";
  if (status === 404 || /Bucket not found|does not exist/i.test(keterangan)) {
    return `Bucket storage tidak ditemukan.${konteks} Pastikan bucket sudah dibuat di Supabase. Detail: ${ringkas || "respons kosong"}`;
  }
  if (status === 403 || /securityError|policy|row-level/i.test(keterangan)) {
    return `Supabase menolak operasi storage.${konteks} Periksa service role key dan konfigurasi bucket. Detail: ${ringkas || "respons kosong"}`;
  }
  return `Upload gagal (kode ${status}).${konteks} Coba lagi. Detail: ${ringkas || "respons kosong"}`;
}

type HasilSiapkanBucket =
  | { ok: true }
  | { ok: false; status: number; detail: string };

/** Pastikan satu bucket tersedia secara idempoten sebagai pemulihan konfigurasi server. */
async function buatBucket(
  url: string,
  key: string,
  konfigurasi: KonfigurasiBucket,
): Promise<HasilSiapkanBucket> {
  try {
    const cek = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(konfigurasi.id)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (cek.ok) return { ok: true };
    if (cek.status !== 404) {
      return {
        ok: false,
        status: cek.status,
        detail: ringkasKeterangan(await cek.text().catch(() => "")),
      };
    }

    const res = await fetch(`${url}/storage/v1/bucket`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        id: konfigurasi.id,
        name: konfigurasi.id,
        public: konfigurasi.public,
        file_size_limit: konfigurasi.fileSizeLimit,
        allowed_mime_types: konfigurasi.allowedMimeTypes,
      }),
    });
    if (res.ok || res.status === 409) return { ok: true };
    return {
      ok: false,
      status: res.status,
      detail: ringkasKeterangan(await res.text().catch(() => "")),
    };
  } catch (error) {
    return {
      ok: false,
      status: 0,
      detail: error instanceof Error ? error.message : "permintaan ke Supabase gagal",
    };
  }
}

export async function pastikanBucketStorage(
  bucket: string,
  publicBucket = false,
): Promise<void> {
  const { url, key } = konfigurasiStorage(bucket);
  const konfigurasi = daftarKonfigurasiBucket().find((item) => item.id === bucket) ?? {
    id: bucket,
    public: publicBucket,
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: [],
  };
  const hasil = await buatBucket(url, key, konfigurasi);
  if (!hasil.ok) {
    const status = hasil.status ? `HTTP ${hasil.status}` : "tanpa respons HTTP";
    throw new Error(
      `Bucket storage "${bucket}" gagal disiapkan (${status}). ${hasil.detail || "Detail tidak tersedia."}`,
    );
  }
}

/**
 * Kompatibilitas untuk pemanggil lama. Jalur upload baru wajib menggunakan
 * pastikanBucketStorage agar bucket yang tidak terkait tidak ikut memblokir.
 */
export async function pastikanSemuaBucketStorage(): Promise<void> {
  const konfigurasi = konfigurasiStorage();
  for (const bucket of daftarKonfigurasiBucket()) {
    const hasil = await buatBucket(konfigurasi.url, konfigurasi.key, bucket);
    if (!hasil.ok) {
      const status = hasil.status ? `HTTP ${hasil.status}` : "tanpa respons HTTP";
      throw new Error(
        `Bucket storage "${bucket.id}" gagal disiapkan (${status}). ${hasil.detail || "Detail tidak tersedia."}`,
      );
    }
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
  try {
    await pastikanBucketStorage(
      bucket,
      bucket !== (process.env.SUPABASE_KAS_BUCKET?.trim() || "bukti-kas"),
    );
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error:
        error instanceof Error
          ? `Storage bucket gagal disiapkan: ${error.message}`
          : "Bucket storage belum tersedia.",
    };
  }
  const endpoint = `${url}/storage/v1/object/${bucket}/${jalurEncoded(namaJalur)}`;
  const headers = {
    Authorization: `Bearer ${key}`,
    apikey: key,
    "Content-Type": tipeKonten,
    "x-upsert": "true",
  };

  const res = await fetch(endpoint, {
    method: "POST",
    headers,
    body: new Uint8Array(bytes),
  });

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
  return { ok: false, status: res.status, error: pesanGagal(res.status, keterangan, bucket) };
}

export function pesanErrorUnggah(hasil: HasilUnggah): string | null {
  return hasil.ok ? null : hasil.error;
}
