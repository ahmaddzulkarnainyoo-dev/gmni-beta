import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { LOKASI_SLOT, STATUS_IKLAN, tautanIklanValid } from "@/lib/monetisasi";

const ROLES_ADMIN = ["Super Admin", "Editor"];

function teks(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

async function tolak(user: Awaited<ReturnType<typeof getActiveSessionUser>>) {
  if (!user) return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  return NextResponse.json(
    { error: "Hanya Super Admin atau Editor yang dapat mengelola iklan." },
    { status: 403 },
  );
}

/** GET /api/admin/iklan — daftar semua iklan (Super Admin/Editor). */
export async function GET() {
  const user = await getActiveSessionUser();
  if (!user || !user.roleNama || !ROLES_ADMIN.includes(user.roleNama)) {
    return tolak(user);
  }
  const iklan = await prisma.iklan.findMany({
    orderBy: [{ lokasiSlot: "asc" }, { urutan: "asc" }, { createdAt: "desc" }],
    include: { dibuatOleh: { select: { namaLengkap: true, username: true } } },
  });
  return NextResponse.json({ iklan });
}

/** POST /api/admin/iklan — buat slot iklan baru (Super Admin/Editor). */
export async function POST(request: Request) {
  const user = await getActiveSessionUser();
  if (!user || !user.roleNama || !ROLES_ADMIN.includes(user.roleNama)) {
    return tolak(user);
  }

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });

  const nama = teks(body.nama);
  if (!nama || nama.length < 3 || nama.length > 120) {
    return NextResponse.json({ error: "Nama iklan 3–120 karakter." }, { status: 400 });
  }
  const gambarUrl = teks(body.gambarUrl);
  if (!gambarUrl || gambarUrl.length > 2000 || !tautanIklanValid(gambarUrl) && !gambarUrl.startsWith("/")) {
    return NextResponse.json(
      { error: "URL gambar tidak valid (http(s) atau path / lokal)." },
      { status: 400 },
    );
  }
  const tautanUrl = teks(body.tautanUrl);
  if (!tautanUrl || !tautanIklanValid(tautanUrl)) {
    return NextResponse.json({ error: "Tautan tujuan harus URL http(s) absolut." }, { status: 400 });
  }
  const lokasiSlot = teks(body.lokasiSlot)?.toUpperCase() ?? "";
  if (!(LOKASI_SLOT as readonly string[]).includes(lokasiSlot)) {
    return NextResponse.json({ error: "Lokasi slot harus HEADER atau SIDEBAR." }, { status: 400 });
  }
  const status = (teks(body.status)?.toUpperCase() ?? "DRAFT") as string;
  if (!(STATUS_IKLAN as readonly string[]).includes(status)) {
    return NextResponse.json({ error: "Status harus DRAFT, AKTIF, atau DIARSIPKAN." }, { status: 400 });
  }
  const urutanRaw = body.urutan;
  const urutan =
    typeof urutanRaw === "number" && Number.isFinite(urutanRaw)
      ? Math.max(0, Math.trunc(urutanRaw))
      : 0;

  const tanggalMulai =
    typeof body.tanggalMulai === "string" && body.tanggalMulai ? new Date(body.tanggalMulai) : null;
  const tanggalSelesai =
    typeof body.tanggalSelesai === "string" && body.tanggalSelesai ? new Date(body.tanggalSelesai) : null;
  if (tanggalMulai && Number.isNaN(tanggalMulai.getTime())) {
    return NextResponse.json({ error: "Tanggal mulai tidak valid." }, { status: 400 });
  }
  if (tanggalSelesai && Number.isNaN(tanggalSelesai.getTime())) {
    return NextResponse.json({ error: "Tanggal selesai tidak valid." }, { status: 400 });
  }
  if (tanggalMulai && tanggalSelesai && tanggalSelesai < tanggalMulai) {
    return NextResponse.json(
      { error: "Tanggal selesai tidak boleh sebelum tanggal mulai." },
      { status: 400 },
    );
  }

  try {
    const dibuat = await prisma.$transaction(async (tx) => {
      const iklan = await tx.iklan.create({
        data: {
          nama,
          gambarUrl,
          tautanUrl,
          lokasiSlot: lokasiSlot as "HEADER" | "SIDEBAR",
          urutan,
          tanggalMulai,
          tanggalSelesai,
          status: status as "DRAFT" | "AKTIF" | "DIARSIPKAN",
          dibuatOlehId: user.id,
        },
      });
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "iklan.create",
          entitasTipe: "Iklan",
          entitasId: iklan.id,
          dataSesudah: { nama, lokasiSlot, status },
        },
      });
      return iklan;
    });
    return NextResponse.json({ ok: true, id: dibuat.id }, { status: 201 });
  } catch (error) {
    console.error("[admin/iklan] Gagal membuat iklan:", error);
    return NextResponse.json({ error: "Gagal membuat iklan." }, { status: 500 });
  }
}
