import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { validasiDonasi } from "@/lib/monetisasi";

const ROLES_ADMIN = ["Super Admin", "Editor"];

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
        { error: "Hanya Super Admin atau Editor yang dapat mengelola donasi." },
        { status: 403 },
      ),
    };
  }
  return { user };
}

/** GET /api/admin/donasi — daftar donasi (terbaru dulu). */
export async function GET() {
  const g = await gate();
  if (!("user" in g) || !g.user) return g.eror;
  const donasi = await prisma.donasi.findMany({
    orderBy: [{ createdAt: "desc" }],
    take: 200,
    include: { verifikasiOleh: { select: { namaLengkap: true, username: true } } },
  });
  return NextResponse.json({ donasi });
}

/** POST /api/admin/donasi — pencatatan manual donasi offline (langsung terverifikasi). */
export async function POST(request: Request) {
  const g = await gate();
  if (!("user" in g) || !g.user) return g.eror;
  const user = g.user;

  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  if (!body) return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });

  const namaDonatur = teks(body.namaDonatur) ?? "";
  const nominal = typeof body.nominal === "number" ? Math.trunc(body.nominal) : Number.NaN;
  const pesan = teks(body.pesan);
  const eror = validasiDonasi({ namaDonatur, nominal, pesan });
  if (eror) return NextResponse.json({ error: eror }, { status: 400 });

  try {
    const dibuat = await prisma.$transaction(async (tx) => {
      const d = await tx.donasi.create({
        data: {
          namaDonatur,
          nominal,
          pesan,
          status: "TERVERIFIKASI",
          verifikasiOlehId: user.id,
          verifikasiAt: new Date(),
        },
      });
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "donasi.create",
          entitasTipe: "Donasi",
          entitasId: d.id,
          dataSesudah: { namaDonatur, nominal },
        },
      });
      return d;
    });
    return NextResponse.json({ ok: true, id: dibuat.id }, { status: 201 });
  } catch (error) {
    console.error("[admin/donasi] Gagal mencatat donasi:", error);
    return NextResponse.json({ error: "Gagal mencatat donasi." }, { status: 500 });
  }
}
