import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { validasiHakJawab } from "@/lib/hakjawab";

/**
 * POST /api/hak-jawab — pengajuan hak jawab pembaca (tanpa login).
 * Masuk sebagai MENUNGGU; ditinjau redaksi via /admin/halaman.
 * Rate-limit in-memory: maks 3 kiriman per IP tiap 60 detik.
 */

const JENDELA_MS = 60 * 1000;
const MAKS_PER_JENDELA = 3;
const kirimanIp = new Map<string, number[]>();

function alamatIp(request: Request): string {
  const header =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    request.headers.get("x-real-ip")?.trim();
  return header && header.length > 0 ? header : "tanpa-ip";
}

function lewatBatas(ip: string): boolean {
  const sekarang = Date.now();
  const riwayat = (kirimanIp.get(ip) ?? []).filter((t) => sekarang - t < JENDELA_MS);
  if (riwayat.length >= MAKS_PER_JENDELA) {
    kirimanIp.set(ip, riwayat);
    return false;
  }
  riwayat.push(sekarang);
  kirimanIp.set(ip, riwayat);
  if (kirimanIp.size > 5000) {
    for (const [k, v] of kirimanIp) {
      if (v.every((t) => sekarang - t >= JENDELA_MS)) kirimanIp.delete(k);
    }
  }
  return true;
}

export async function POST(request: Request) {
  if (!lewatBatas(alamatIp(request))) {
    return NextResponse.json(
      { error: "Terlalu banyak pengajuan. Coba lagi sebentar lagi." },
      { status: 429 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Payload tidak valid." }, { status: 400 });
  }

  const input = {
    namaPengaju: typeof body.namaPengaju === "string" ? body.namaPengaju.trim() : "",
    emailPengaju: typeof body.emailPengaju === "string" ? body.emailPengaju.trim() : "",
    judulPemberitaan: typeof body.judulPemberitaan === "string" ? body.judulPemberitaan.trim() : "",
    urlPemberitaan: typeof body.urlPemberitaan === "string" ? body.urlPemberitaan.trim() : "",
    isi: typeof body.isi === "string" ? body.isi.trim() : "",
  };

  const eror = validasiHakJawab(input);
  if (eror) return NextResponse.json({ error: eror }, { status: 400 });

  try {
    const hakJawab = await prisma.hakJawab.create({
      data: {
        namaPengaju: input.namaPengaju,
        emailPengaju: input.emailPengaju || null,
        judulPemberitaan: input.judulPemberitaan,
        urlPemberitaan: input.urlPemberitaan || null,
        isi: input.isi,
      },
      select: { id: true, createdAt: true },
    });
    return NextResponse.json({ ok: true, id: hakJawab.id }, { status: 201 });
  } catch (error) {
    console.error("[hak-jawab] Gagal menyimpan pengajuan:", error);
    return NextResponse.json({ error: "Gagal menyimpan pengajuan." }, { status: 500 });
  }
}