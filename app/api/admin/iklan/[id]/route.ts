import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { LOKASI_SLOT, STATUS_IKLAN, tautanIklanValid } from "@/lib/monetisasi";

const ROLES_ADMIN = ["Super Admin", "Editor"];

type Ctx = { params: Promise<{ id: string }> };

function teks(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  return t.length > 0 ? t : null;
}

async function gate() {
  const user = await getActiveSessionUser();
  if (!user) {
    return { eror: NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 }) };
  }
  if (!user.roleNama || !ROLES_ADMIN.includes(user.roleNama)) {
    return {
      eror: NextResponse.json(
        { error: "Hanya Super Admin atau Editor yang dapat mengelola iklan." },
        { status: 403 },
      ),
    };
  }
  return { user };
}

/** PATCH /api/admin/iklan/[id] — edit/persetujuan status banner. */
export async function PATCH(request: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await gate();
  if (!("user" in g) || !g.user) return g.eror;
  const user = g.user;

  const ada = await prisma.iklan.findUnique({ where: { id } });
  if (!ada) return NextResponse.json({ error: "Iklan tidak ditemukan." }, { status: 404 });

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });

  const data: Record<string, unknown> = {};
  const nama = teks(body.nama);
  if (nama !== null) {
    if (nama.length < 3 || nama.length > 120) {
      return NextResponse.json({ error: "Nama iklan 3–120 karakter." }, { status: 400 });
    }
    data.nama = nama;
  }
  const gambarUrl = teks(body.gambarUrl);
  if (gambarUrl !== null) {
    if (gambarUrl.length > 2000 || (!tautanIklanValid(gambarUrl) && !gambarUrl.startsWith("/"))) {
      return NextResponse.json(
        { error: "URL gambar tidak valid (http(s) atau path / lokal)." },
        { status: 400 },
      );
    }
    data.gambarUrl = gambarUrl;
  }
  const tautanUrl = teks(body.tautanUrl);
  if (tautanUrl !== null) {
    if (!tautanIklanValid(tautanUrl)) {
      return NextResponse.json(
        { error: "Tautan tujuan harus URL http(s) absolut." },
        { status: 400 },
      );
    }
    data.tautanUrl = tautanUrl;
  }
  const lokasi = teks(body.lokasiSlot)?.toUpperCase();
  if (lokasi !== undefined && lokasi !== null) {
    if (!(LOKASI_SLOT as readonly string[]).includes(lokasi)) {
      return NextResponse.json({ error: "Lokasi slot harus HEADER atau SIDEBAR." }, { status: 400 });
    }
    data.lokasiSlot = lokasi;
  }
  const status = teks(body.status)?.toUpperCase();
  if (status !== undefined && status !== null) {
    if (!(STATUS_IKLAN as readonly string[]).includes(status)) {
      return NextResponse.json(
        { error: "Status harus DRAFT, AKTIF, atau DIARSIPKAN." },
        { status: 400 },
      );
    }
    data.status = status;
  }
  if (body.urutan !== undefined) {
    const n = typeof body.urutan === "number" ? body.urutan : Number(body.urutan);
    if (!Number.isFinite(n) || n < 0) {
      return NextResponse.json({ error: "Urutan harus angka ≥ 0." }, { status: 400 });
    }
    data.urutan = Math.trunc(n);
  }
  if (body.tanggalMulai !== undefined) {
    if (body.tanggalMulai === null || body.tanggalMulai === "") data.tanggalMulai = null;
    else if (typeof body.tanggalMulai === "string") {
      const d = new Date(body.tanggalMulai);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Tanggal mulai tidak valid." }, { status: 400 });
      }
      data.tanggalMulai = d;
    } else return NextResponse.json({ error: "Tanggal mulai tidak valid." }, { status: 400 });
  }
  if (body.tanggalSelesai !== undefined) {
    if (body.tanggalSelesai === null || body.tanggalSelesai === "") data.tanggalSelesai = null;
    else if (typeof body.tanggalSelesai === "string") {
      const d = new Date(body.tanggalSelesai);
      if (Number.isNaN(d.getTime())) {
        return NextResponse.json({ error: "Tanggal selesai tidak valid." }, { status: 400 });
      }
      data.tanggalSelesai = d;
    } else return NextResponse.json({ error: "Tanggal selesai tidak valid." }, { status: 400 });
  }
  if (Object.keys(data).length === 0) {
    return NextResponse.json({ error: "Tidak ada perubahan." }, { status: 400 });
  }

  const mulai = ((data.tanggalMulai as Date | null | undefined) ?? ada.tanggalMulai) as Date | null;
  const selesai = ((data.tanggalSelesai as Date | null | undefined) ?? ada.tanggalSelesai) as Date | null;
  if (mulai && selesai && selesai < mulai) {
    return NextResponse.json(
      { error: "Tanggal selesai tidak boleh sebelum tanggal mulai." },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(async (tx) => {
      await tx.iklan.update({ where: { id }, data });
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "iklan.update",
          entitasTipe: "Iklan",
          entitasId: id,
          dataSebelum: { nama: ada.nama, status: ada.status },
          dataSesudah: JSON.parse(JSON.stringify(data)) as Record<string, string | number | null>,
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/iklan] Gagal memperbarui iklan:", error);
    return NextResponse.json({ error: "Gagal memperbarui iklan." }, { status: 500 });
  }
}

/** DELETE /api/admin/iklan/[id] — hapus banner permanen + audit. */
export async function DELETE(_request: Request, { params }: Ctx) {
  const { id } = await params;
  const g = await gate();
  if (!("user" in g) || !g.user) return g.eror;
  const user = g.user;

  const ada = await prisma.iklan.findUnique({ where: { id } });
  if (!ada) return NextResponse.json({ error: "Iklan tidak ditemukan." }, { status: 404 });

  try {
    await prisma.$transaction(async (tx) => {
      await tx.iklan.delete({ where: { id } });
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "iklan.delete",
          entitasTipe: "Iklan",
          entitasId: id,
          dataSebelum: { nama: ada.nama, lokasiSlot: ada.lokasiSlot },
        },
      });
    });
    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[admin/iklan] Gagal menghapus iklan:", error);
    return NextResponse.json({ error: "Gagal menghapus iklan." }, { status: 500 });
  }
}
