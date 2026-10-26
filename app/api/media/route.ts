import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
import { unggahKeSupabase } from "@/lib/storage";

const ROLES_ADMIN = ["Super Admin", "Editor"];
const TIPE_DITERIMA = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
const JENIS_DITERIMA = new Set(["artikel", "profil", "kas"]);
const MAKS_BYTE_ARTIKEL = 5 * 1024 * 1024;
/** Foto profil lebih kecil (avatar): maks 2 MB. */
const MAKS_BYTE_PROFIL = 2 * 1024 * 1024;

/**
 * POST /api/media — unggah gambar ke Supabase Storage.
 * - Admin/Editor: gambar unggulan & isi artikel (default, maks 5 MB, prefix artikel/).
 * - Kader ber-permission "profil.edit_sendiri": foto profil (jenis=profil,
 *   maks 2 MB, prefix profil/) DAN gambar isi artikel (jenis=artikel, maks 2 MB).
 * Disusun tanpa dependensi eksternal (REST API storage). Jika bucket/policy
 * belum siap, gunakan fallback URL manual.
 */
export async function POST(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }

  let jenis = "artikel";
  try {
    const pratinjau = await request.clone().formData();
    const v = pratinjau.get("jenis");
    if (typeof v === "string" && v.length > 0) jenis = v;
  } catch {
    // Tanpa field jenis → default artikel (perilaku lama).
  }

  if (!JENIS_DITERIMA.has(jenis)) {
    return NextResponse.json({ error: "Jenis media tidak didukung." }, { status: 400 });
  }

  const isAdmin = !!user.roleNama && ROLES_ADMIN.includes(user.roleNama);
  const bolehKader = user.permissions.includes("profil.edit_sendiri");
  const bolehKas = jenis === "kas" && user.permissions.includes("kas.kelola");
  const bolehUnggah =
    isAdmin ||
    bolehKas ||
    (jenis === "profil" && bolehKader) ||
    // Q3: kader dapat mengunggah gambar untuk isi artikelnya (maks 2 MB).
    (jenis === "artikel" && bolehKader);
  if (!bolehUnggah) {
    return NextResponse.json(
        { error: "Tidak memiliki izin untuk mengunggah media ini." },
      { status: 403 },
    );
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!supaUrl || !serviceRole) {
    return NextResponse.json(
      { error: "Storage server belum dikonfigurasi." },
      { status: 500 },
    );
  }

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json({ error: "File gambar wajib diunggah." }, { status: 400 });
    }
    if (!TIPE_DITERIMA.has(file.type)) {
      return NextResponse.json(
        { error: "Tipe file tidak didukung. Gunakan PNG/JPEG/WebP/GIF." },
        { status: 400 },
      );
    }
    // Kader (foto profil & gambar isi artikel) dibatasi 2 MB; admin 5 MB.
    const maksByte = isAdmin ? MAKS_BYTE_ARTIKEL : MAKS_BYTE_PROFIL;
    if (file.size > maksByte) {
      return NextResponse.json(
        {
          error:
            jenis === "profil"
              ? "Ukuran foto profil maksimal 2 MB."
              : isAdmin
                ? "Ukuran gambar maksimal 5 MB."
                : "Ukuran gambar maksimal 2 MB.",
        },
        { status: 400 },
      );
    }

    const ekstensi =
      file.type === "image/png"
        ? "png"
        : file.type === "image/jpeg"
          ? "jpg"
          : file.type === "image/webp"
            ? "webp"
            : "gif";
    const folder = jenis === "profil" ? "profil" : jenis === "kas" ? "kas" : "artikel";
    const bucket =
      jenis === "profil"
        ? process.env.SUPABASE_AVATAR_BUCKET ?? "avatars"
        : process.env.SUPABASE_STORAGE_BUCKET ?? "artikel";
    const nama = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ekstensi}`;

    const bytes = Buffer.from(await file.arrayBuffer());
    const hasil = await unggahKeSupabase(bytes, nama, file.type, bucket);
    if (!hasil.ok) {
      console.error("[media] Upload Supabase gagal:", hasil.error);
      return NextResponse.json({ error: hasil.error }, { status: hasil.status >= 400 ? hasil.status : 502 });
    }

    return NextResponse.json({ ok: true, url: hasil.url, bucket: hasil.bucket });
  } catch (error) {
    console.error("[media] Error unggah:", error);
    return NextResponse.json({ error: "Gagal mengunggah gambar." }, { status: 500 });
  }
}
