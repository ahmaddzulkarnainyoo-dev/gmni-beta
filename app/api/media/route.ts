import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";

const ROLES_ADMIN = ["Super Admin", "Editor"];
const TIPE_DITERIMA = new Set(["image/png", "image/jpeg", "image/webp", "image/gif"]);
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

  const isAdmin = !!user.roleNama && ROLES_ADMIN.includes(user.roleNama);
  const bolehKader = user.permissions.includes("profil.edit_sendiri");
  const bolehUnggah =
    isAdmin ||
    (jenis === "profil" && bolehKader) ||
    // Q3: kader dapat mengunggah gambar untuk isi artikelnya (maks 2 MB).
    (jenis === "artikel" && bolehKader);
  if (!bolehUnggah) {
    return NextResponse.json(
      { error: "Hanya Super Admin atau Editor yang dapat mengunggah media." },
      { status: 403 },
    );
  }

  const supaUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supaUrl || !anon) {
    return NextResponse.json(
      { error: "Storage belum dikonfigurasi (NEXT_PUBLIC_SUPABASE_URL / ANON_KEY)." },
      { status: 501 },
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
    const folder = jenis === "profil" ? "profil" : "artikel";
    const nama = `${folder}/${Date.now()}-${Math.random().toString(36).slice(2, 10)}.${ekstensi}`;
    const bucket = process.env.SUPABASE_STORAGE_BUCKET ?? "artikel";

    const bytes = Buffer.from(await file.arrayBuffer());
    const res = await fetch(`${supaUrl}/storage/v1/object/${bucket}/${nama}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${anon}`,
        apikey: anon,
        "Content-Type": file.type,
        "x-upsert": "true",
      },
      body: bytes,
    });

    if (!res.ok) {
      const keterangan = await res.text().catch(() => "");
      console.error("[media] Upload Supabase gagal:", res.status, keterangan.slice(0, 300));
      return NextResponse.json(
        {
          error:
            "Upload gagal. Pastikan bucket & policy storage sudah dikonfigurasi, atau masukkan URL gambar manual.",
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      ok: true,
      url: `${supaUrl}/storage/v1/object/public/${bucket}/${nama}`,
    });
  } catch (error) {
    console.error("[media] Error unggah:", error);
    return NextResponse.json({ error: "Gagal mengunggah gambar." }, { status: 500 });
  }
}