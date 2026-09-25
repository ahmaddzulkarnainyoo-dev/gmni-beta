import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { kirimEmailResend } from "@/lib/email";

/**
 * GET /api/cron/notifikasi — pengingat kader pasif (Sub-fase 4.3).
 * Dijadwalkan via Vercel Cron (vercel.json, Senin 06:00) atau scheduler
 * eksternal. Gate: header `x-cron-secret` / `?secret=` harus sama dengan
 * env CRON_SECRET (tanpa secret → 403).
 *
 * Aturan pemicu: kader AKTIF yang belum aktif >= 14 hari DAN tidak punya
 * kegiatan poin dalam 7 hari terakhir → dapat Notifikasi PERINGATAN in-app
 * (+ email rekap bila RESEND_API_KEY tersedia) maksimal sekali per 14 hari
 * (jeda dinilai dari Notifikasi terakhir tipe PERINGATAN).
 */
const AMBANG_HARI_PASIF = 14;
const AMBANG_HARI_KEGIATAN = 7;
const JEDA_ANTAR_PENGINGAT_MS = 14 * 24 * 60 * 60 * 1000;

export async function GET(request: Request) {
  const url = new URL(request.url);
  const secretDiberikan =
    request.headers.get("x-cron-secret") ?? url.searchParams.get("secret") ?? "";
  const secretBenar = process.env.CRON_SECRET ?? "";
  if (!secretBenar || secretDiberikan !== secretBenar) {
    return NextResponse.json({ error: "Akses cron ditolak." }, { status: 403 });
  }

  try {
    const batasKegiatan = new Date(Date.now() - AMBANG_HARI_KEGIATAN * 86400000);
    const batasPasif = new Date(Date.now() - AMBANG_HARI_PASIF * 86400000);

    // Kandidat: kader AKTIF, tidak aktif >= 14 hari, tanpa kegiatan 7 hari terakhir.
    const kandidat = await prisma.user.findMany({
      where: {
        statusAkun: "AKTIF",
        OR: [
          { terakhirAktif: null },
          { terakhirAktif: { lt: batasPasif } },
        ],
        kegiatan: { none: { tanggal: { gte: batasKegiatan } } },
      },
      select: { id: true, email: true, namaLengkap: true },
      take: 200,
    });

    let terkirim = 0;
    for (const kader of kandidat) {
      // Jangan spam: skip bila pengingat PERINGATAN masih segar (<= 14 hari).
      const pengingatLama = await prisma.notifikasi.findFirst({
        where: { userId: kader.id, tipe: "PERINGATAN", createdAt: { gte: new Date(Date.now() - JEDA_ANTAR_PENGINGAT_MS) } },
        select: { id: true },
      });
      if (pengingatLama) continue;

      const subjek = "Nalar Marhaen butuh apimu — tulis lagi!";
      const isi =
        "Halo kader perjuangan! Sudah dua minggu naskahmu tidak muncul di info Marhaen. " +
        "Bagikan cerita, opini, atau laporan lapangan — nalar kritis kadermu dihitung " +
        "di papan perjuangan: artikel 10 poin, komentar 2, aktif harian 1. Tulis lagi!";
      await prisma.notifikasi.create({
        data: { userId: kader.id, judul: subjek, isi, tipe: "PERINGATAN" },
      });
      await kirimEmailResend(kader.email, subjek, isi);
      terkirim += 1;
    }

    return NextResponse.json({ ok: true, dikunjungi: kandidat.length, terkirim });
  } catch (error) {
    console.error("[cron/notifikasi] Gagal:", error);
    return NextResponse.json({ error: "Pekerjaan cron gagal." }, { status: 500 });
  }
}