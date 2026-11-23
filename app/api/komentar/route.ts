import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser, getSessionUser } from "@/lib/session";
import { verifikasiRecaptcha } from "@/lib/recaptcha";
import { catatAktivitas, evaluasiBadgeKader, perbaruiStreak } from "@/lib/gamifikasi";
import { lewatRateLimit } from "@/lib/rate-limit";

/**
 * POST /api/komentar — terima komentar publik artikel (blueprint 8.3).
 * - Kader yang login: identitas dari akun (perlu permission komentar.buat).
 * - Pengunjung: wajib nama (3–80) + token reCAPTCHA v3.
 */
export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      slug?: string;
      nama?: string;
      isi?: string;
      recaptchaToken?: string;
    };

    const slug = body.slug?.trim();
    if (!slug) {
      return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
    }

    const artikel = await prisma.artikel.findFirst({
      where: { slug, status: "TERBIT" },
      select: { id: true },
    });
    if (!artikel) {
      return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
    }

    const isi = body.isi?.trim();
    if (!isi || isi.length < 3) {
      return NextResponse.json({ error: "Isi komentar minimal 3 karakter." }, { status: 400 });
    }
    if (isi.length > 1500) {
      return NextResponse.json({ error: "Komentar maksimal 1.500 karakter." }, { status: 400 });
    }

    // Identitas: kader login → akun; pengunjung → nama publik.
    const sesi = await getSessionUser();
    const user = await getActiveSessionUser();
    if (sesi && !user) {
      return NextResponse.json({ error: "Akun Anda tidak aktif." }, { status: 403 });
    }
    let penulisId: string | null = null;
    let namaTamu: string | null = null;
    if (user?.id) {
      if (!user.permissions.includes("komentar.buat")) {
        return NextResponse.json(
          { error: "Akun Anda tidak memiliki izin berkomentar." },
          { status: 403 },
        );
      }
      penulisId = user.id;
    } else {
      const nama = body.nama?.trim() ?? "";
      if (nama.length < 3 || nama.length > 80) {
        return NextResponse.json(
          { error: "Nama pengunjung wajib diisi (3–80 karakter)." },
          { status: 400 },
        );
      }
      namaTamu = nama;
    }

    const alamatIp =
      request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
      request.headers.get("x-real-ip")?.trim() ??
      "tanpa-ip";
    const kunciRateLimit = penulisId ? `komentar:user:${penulisId}` : `komentar:ip:${alamatIp}`;
    if (!lewatRateLimit(kunciRateLimit, penulisId ? 10 : 5, 60_000)) {
      return NextResponse.json(
        { error: "Terlalu banyak komentar. Coba lagi sebentar lagi." },
        { status: 429 },
      );
    }

    // Perlindungan anti-bot (blueprint 8.3 & 14).
    const lolos = await verifikasiRecaptcha(
      body.recaptchaToken ?? "",
      "komentar",
      alamatIp,
    );
    if (!lolos) {
      return NextResponse.json(
        { error: "Verifikasi anti-bot gagal. Silakan muat ulang lalu coba lagi." },
        { status: 400 },
      );
    }

    const [komentar] = await prisma.$transaction([
      prisma.komentar.create({
        data: {
          artikelId: artikel.id,
          ...(penulisId ? { penulisId } : { namaTamu }),
          isi,
          verifikasiVia: process.env.RECAPTCHA_SECRET_KEY ? "recaptcha_v3" : null,
        },
      }),
      prisma.artikel.update({
        where: { id: artikel.id },
        data: { jumlahKomentar: { increment: 1 } },
      }),
    ]);

    // Poin kader (fire-and-forget, blueprint 8.4): hanya komentator login.
    if (penulisId) {
      catatAktivitas(penulisId, "KOMENTAR_TAMPIL", { detail: komentar.id })
        .then(() => catatAktivitas(penulisId, "AKTIF_HARIAN"))
        .then(() => perbaruiStreak(penulisId))
        .then(() => evaluasiBadgeKader(penulisId))
        .catch(() => undefined);
    }

    return NextResponse.json({ ok: true, id: komentar.id });
  } catch (error) {
    console.error("[komentar] Gagal mengirim:", error);
    return NextResponse.json({ error: "Gagal mengirim komentar." }, { status: 500 });
  }
}
