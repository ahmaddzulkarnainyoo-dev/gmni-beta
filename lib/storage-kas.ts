import { pastikanSemuaBucketStorage } from "@/lib/storage";

const MAX_BUKTI_BYTE = 5 * 1024 * 1024;
const TIPE_BUKTI = new Set(["image/jpeg", "image/png", "image/webp"]);

function konfigurasiStorage() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  const bucket = process.env.SUPABASE_KAS_BUCKET?.trim() || "bukti-kas";
  if (!url || !key) {
    throw new Error(
      "Storage bukti kas belum dikonfigurasi. Atur NEXT_PUBLIC_SUPABASE_URL dan SUPABASE_SERVICE_ROLE_KEY.",
    );
  }
  if (!/^[a-z0-9-]+$/.test(bucket)) {
    throw new Error("Nama bucket bukti kas tidak valid.");
  }
  return { url: url.replace(/\/+$/, ""), key, bucket };
}

function jalurEncoded(jalur: string): string {
  return jalur.split("/").map(encodeURIComponent).join("/");
}

async function errorStorage(res: Response, aksi: string): Promise<Error> {
  const detail = (await res.text()).replace(/\s+/g, " ").slice(0, 250);
  return new Error(`Storage bukti kas gagal ${aksi} (HTTP ${res.status}): ${detail}`);
}

export async function buktiKasValid(file: File): Promise<string | null> {
  if (file.size <= 0) return "File bukti pembayaran kosong.";
  if (file.size > MAX_BUKTI_BYTE) return "Ukuran bukti pembayaran maksimal 5 MB.";
  if (!TIPE_BUKTI.has(file.type)) return "Bukti harus berupa gambar JPEG, PNG, atau WebP.";
  const bytes = new Uint8Array(await file.slice(0, 12).arrayBuffer());
  const jpeg =
    file.type === "image/jpeg" &&
    bytes.length >= 3 &&
    bytes[0] === 0xff &&
    bytes[1] === 0xd8 &&
    bytes[2] === 0xff;
  const png =
    file.type === "image/png" &&
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47 &&
    bytes[4] === 0x0d &&
    bytes[5] === 0x0a &&
    bytes[6] === 0x1a &&
    bytes[7] === 0x0a;
  const webp =
    file.type === "image/webp" &&
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50;
  if (!jpeg && !png && !webp) {
    return "Isi file tidak sesuai dengan format gambar yang dipilih.";
  }
  return null;
}

export function ekstensiBuktiKas(tipe: string): string {
  if (tipe === "image/jpeg") return "jpg";
  if (tipe === "image/png") return "png";
  if (tipe === "image/webp") return "webp";
  throw new Error("Tipe bukti pembayaran tidak didukung.");
}

export async function unggahBuktiKas(
  jalur: string,
  bytes: Uint8Array,
  tipeKonten: string,
): Promise<void> {
  const { url, key, bucket } = konfigurasiStorage();
  await pastikanSemuaBucketStorage();
  const res = await fetch(
    `${url}/storage/v1/object/${bucket}/${jalurEncoded(jalur)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": tipeKonten,
        "x-upsert": "false",
      },
      body: new Uint8Array(bytes),
    },
  );
  if (!res.ok) throw await errorStorage(res, "mengunggah");
}

export async function hapusBuktiKas(jalur: string): Promise<void> {
  const { url, key, bucket } = konfigurasiStorage();
  const res = await fetch(`${url}/storage/v1/object/${bucket}`, {
    method: "DELETE",
    headers: {
      Authorization: `Bearer ${key}`,
      apikey: key,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ prefixes: [jalur] }),
  });
  if (!res.ok) throw await errorStorage(res, "menghapus");
}

export async function urlSementaraBuktiKas(jalur: string): Promise<string> {
  const { url, key, bucket } = konfigurasiStorage();
  const res = await fetch(
    `${url}/storage/v1/object/sign/${bucket}/${jalurEncoded(jalur)}`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        apikey: key,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ expiresIn: 120 }),
    },
  );
  if (!res.ok) throw await errorStorage(res, "membuat tautan sementara");
  const data = (await res.json()) as { signedURL?: string };
  if (!data.signedURL) throw new Error("Storage tidak mengembalikan tautan bukti.");
  return new URL(data.signedURL, `${url}/storage/v1`).toString();
}
