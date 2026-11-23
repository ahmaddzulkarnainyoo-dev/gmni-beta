import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { apakahStaf, cariPercakapanSatuLawanSatu } from "@/lib/dm";

/** GET /api/pesan/percakapan — daftar room aktif milikku (blueprint 8.5). */
export async function GET(request: Request) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json(
      { error: "Harus masuk terlebih dahulu." },
      { status: 401 },
    );
  }
  if (!user.permissions.includes("pesan.kirim")) {
    return NextResponse.json(
      { error: "Akun Anda tidak memiliki izin berkirim pesan." },
      { status: 403 },
    );
  }

  // Cabang ringan: resolusi percakapan 1-on-1 dengan satu kader (berdasarkan
  // id atau @username). Dipakai klien sebelum membuat room sementara agar
  // riwayat lama langsung tampil, bukan "Belum ada pesan".
  const { searchParams } = new URL(request.url);
  const dengan = searchParams.get("dengan")?.trim();
  if (dengan) {
    const staf = apakahStaf(user);
    const target = await prisma.user.findFirst({
      where: {
        OR: [{ id: dengan }, { username: { equals: dengan, mode: "insensitive" } }],
      },
      select: {
        id: true,
        namaLengkap: true,
        username: true,
        fotoProfil: true,
        statusAkun: true,
        profilTersembunyi: true,
      },
    });
    if (!target || target.statusAkun !== "AKTIF" || (!staf && target.profilTersembunyi)) {
      return NextResponse.json({ percakapanId: null, lawan: null });
    }
    const percakapanId = await cariPercakapanSatuLawanSatu(user.id, target.id);
    return NextResponse.json({
      percakapanId,
      lawan: {
        id: target.id,
        namaLengkap: target.namaLengkap,
        username: target.username,
        fotoProfil: target.fotoProfil,
        statusAkun: target.statusAkun,
      },
    });
  }

  const keanggotaan = await prisma.anggotaPercakapan
    .findMany({
      where: { userId: user.id },
      orderBy: { percakapan: { pesanTerakhirAt: "desc" } },
      take: 50,
      include: {
        percakapan: {
          include: {
            anggota: {
              where: { userId: { not: user.id } },
              include: {
                user: {
                  select: {
                    id: true,
                    namaLengkap: true,
                    username: true,
                    fotoProfil: true,
                    statusAkun: true,
                  },
                },
              },
            },
            pesan: {
              orderBy: { tanggal: "desc" },
              take: 1,
              select: {
                id: true,
                isi: true,
                status: true,
                tanggal: true,
                pengirimId: true,
              },
            },
          },
        },
      },
    })
    .catch((e: unknown) => {
      console.error("[pesan] gagal memuat daftar percakapan", e);
      return null;
    });

  // Gagal query → 503 eksplisit (bukan daftar kosong yang terlihat seperti
  // "pesan tidak sampai"; klien menampilkan banner dari respons ini).
  if (!keanggotaan) {
    return NextResponse.json(
      { error: "Layanan pesan sedang bermasalah. Coba lagi sebentar." },
      { status: 503 },
    );
  }

  const percakapan = await Promise.all(
    keanggotaan.map(async (a) => {
      const lawan = a.percakapan.anggota[0]?.user ?? null;
      const terakhir = a.percakapan.pesan[0] ?? null;
      const acuan = a.terakhirDibacaAt ?? a.tanggalBergabung;
      const belumDibaca = terakhir
        ? await prisma.pesan.count({
            where: {
              percakapanId: a.percakapanId,
              tanggal: { gt: acuan },
              pengirimId: { not: user.id },
            },
          })
        : 0;
      return {
        id: a.percakapanId,
        pesanTerakhirAt: a.percakapan.pesanTerakhirAt,
        lawan,
        pesanTerakhir: terakhir,
        belumDibaca,
      };
    }),
  );

  return NextResponse.json({ percakapan });
}
