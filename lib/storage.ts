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

/** Buat satu bucket secara idempoten sebagai pemulihan konfigurasi server. */
async function buatBucket(
  url: string,
  key: string,
  konfigurasi: KonfigurasiBucket,
): Promise<boolean> {
  try {
    const cek = await fetch(`${url}/storage/v1/bucket/${encodeURIComponent(konfigurasi.id)}`, {
      method: "GET",
      headers: { Authorization: `Bearer ${key}`, apikey: key },
    });
    if (cek.ok) return true;
    if (cek.status !== 404) return false;

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
    return res.ok || res.status === 409;
  } catch {
    return false;
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
  if (!(await buatBucket(url, key, konfigurasi))) {
    throw new Error(`Bucket storage "${bucket}" belum tersedia atau tidak dapat dibuat.`);
  }
}

export async function pastikanSemuaBucketStorage(): Promise<void> {
  const konfigurasi = konfigurasiStorage();
  const hasil = await Promise.all(
    daftarKonfigurasiBucket().map((bucket) => buatBucket(konfigurasi.url, konfigurasi.key, bucket)),
  );
  if (hasil.some((berhasil) => !berhasil)) {
    throw new Error("Satu atau beberapa bucket storage belum tersedia dan gagal dibuat.");
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
    await pastikanSemuaBucketStorage();
  } catch (error) {
    return {
      ok: false,
      status: 502,
      error: error instanceof Error ? error.message : "Bucket storage belum tersedia.",
    };
  }
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

  if (res.status === 404 && (await buatBucket(url, key, {
    id: bucket,
    public: bucket !== (process.env.SUPABASE_KAS_BUCKET ?? "bukti-kas"),
    fileSizeLimit: 5 * 1024 * 1024,
    allowedMimeTypes: [],
  }))) {
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
