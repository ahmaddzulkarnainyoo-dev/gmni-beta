import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  mingguDalamTahun,
  nominalUntukMinggu,
  statusTampilanKas,
  tanggalDateOnly,
  tanggalWib,
  type StatusTampilanKas,
} from "@/lib/kas";

function punyaAksesKas(permissions: string[]): boolean {
  return permissions.includes("kas.kelola");
}

function validasiTahun(value: string | null): number {
  const tahun = value === null ? Number(tanggalWib(new Date()).slice(0, 4)) : Number(value);
  if (!Number.isInteger(tahun) || tahun < 1900 || tahun > 9998) {
    throw new Error("Tahun harus antara 1900 dan 9998.");
  }
  return tahun;
}

/** GET /api/admin/kas — matrix tahun, tarif, dan antrean pembayaran. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!punyaAksesKas(user.permissions)) {
    return NextResponse.json({ error: "Izin kas.kelola diperlukan." }, { status: 403 });
  }

  const url = new URL(request.url);
  let tahun: number;
  try {
    tahun = validasiTahun(url.searchParams.get("tahun"));
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Tahun tidak valid." },
      { status: 400 },
    );
  }

  const cari = url.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const cabang = url.searchParams.get("cabang")?.trim().slice(0, 100) ?? "";
  const komisariat = url.searchParams.get("komisariat")?.trim().slice(0, 120) ?? "";
  const minggu = mingguDalamTahun(tahun);
  const mulai = minggu[0];
  const akhir = new Date(minggu[minggu.length - 1].getTime() + 7 * 86_400_000);
  const wherePengguna = {
    statusAkun: "AKTIF" as const,
    ...(cabang ? { cabangDpc: { contains: cabang, mode: "insensitive" as const } } : {}),
    ...(komisariat
      ? { komisariat: { contains: komisariat, mode: "insensitive" as const } }
      : {}),
    ...(cari
      ? {
          OR: [
            { namaLengkap: { contains: cari, mode: "insensitive" as const } },
            { username: { contains: cari, mode: "insensitive" as const } },
            { nim: { contains: cari, mode: "insensitive" as const } },
          ],
        }
      : {}),
  };

  try {
    const [pengguna, iuran, tarif, pembayaran, pembayaranAgregat] = await Promise.all([
      prisma.user.findMany({
        where: wherePengguna,
        orderBy: [{ cabangDpc: "asc" }, { komisariat: "asc" }, { namaLengkap: "asc" }],
        select: {
          id: true,
          namaLengkap: true,
          username: true,
          nim: true,
          cabangDpc: true,
          komisariat: true,
        },
      }),
      prisma.iuranKas.findMany({
        where: { mingguMulai: { gte: mulai, lt: akhir } },
        select: {
          kaderId: true,
          mingguMulai: true,
          nominal: true,
          status: true,
          tanggalLunas: true,
        },
      }),
      prisma.konfigurasiIuranKas.findMany({
        where: { berlakuMulai: { lte: akhir } },
        orderBy: { berlakuMulai: "asc" },
        select: { id: true, nominal: true, berlakuMulai: true, createdAt: true },
      }),
      prisma.pembayaranKas.findMany({
        where: {
          status: "MENUNGGU_VERIFIKASI",
          kader: wherePengguna,
        },
        orderBy: { createdAt: "asc" },
        include: {
          kader: {
            select: {
              namaLengkap: true,
              username: true,
              cabangDpc: true,
              komisariat: true,
            },
          },
          bukti: { select: { id: true, namaFile: true, ukuranByte: true } },
          alokasi: {
            include: { iuranKas: { select: { mingguMulai: true, nominal: true } } },
            orderBy: { iuranKas: { mingguMulai: "asc" } },
          },
        },
      }),
      prisma.pembayaranKas.groupBy({
        by: ["status"],
        where: { tanggalBayar: { gte: mulai, lt: akhir } },
        _count: { _all: true },
        _sum: { totalNominal: true },
      }),
    ]);

    const idPengguna = new Set(pengguna.map((kader) => kader.id));
    const iuranPerMinggu = new Map(
      iuran
        .filter((baris) => idPengguna.has(baris.kaderId))
        .map((baris) => [
          `${baris.kaderId}:${tanggalDateOnly(baris.mingguMulai)}`,
          baris,
        ]),
    );
    const matrix = pengguna.map((kader) => ({
      ...kader,
      minggu: minggu.map((mingguMulai) => {
        const key = `${kader.id}:${tanggalDateOnly(mingguMulai)}`;
        const catatan = iuranPerMinggu.get(key);
        return {
          mingguMulai: tanggalDateOnly(mingguMulai),
          nominal: catatan?.nominal ?? nominalUntukMinggu(tarif, mingguMulai),
          status: statusTampilanKas(catatan?.status ?? null, mingguMulai),
        };
      }),
    }));

    const statusIuran = matrix.flatMap((kader) => kader.minggu.map((item) => item.status));
    const hitungStatus = (status: StatusTampilanKas) => statusIuran.filter((item) => item === status).length;
    const kaderLunas = new Set(matrix.filter((kader) => kader.minggu.some((item) => item.status === "LUNAS")).map((kader) => kader.id));
    const agregat = (status: "DISETUJUI" | "MENUNGGU_VERIFIKASI") => pembayaranAgregat.find((item) => item.status === status);
    return NextResponse.json({
      ok: true,
      tahun,
      minggu: minggu.map(tanggalDateOnly),
      matrix,
      tarif: tarif.map((item) => ({
        id: item.id,
        nominal: item.nominal,
        berlakuMulai: tanggalDateOnly(item.berlakuMulai),
        createdAt: item.createdAt.toISOString(),
      })),
      pembayaran: pembayaran.map((item) => ({
        id: item.id,
        kader: item.kader,
        tanggalBayar: tanggalDateOnly(item.tanggalBayar),
        jumlahMinggu: item.jumlahMinggu,
        totalNominal: item.totalNominal,
        catatan: item.catatan,
        createdAt: item.createdAt.toISOString(),
        bukti: item.bukti,
        minggu: item.alokasi.map((alokasi) => ({
          mulai: tanggalDateOnly(alokasi.iuranKas.mingguMulai),
          nominal: alokasi.nominal,
        })),
      })),
      ringkasan: {
        kaderAktif: pengguna.length,
        kaderSudahBayar: kaderLunas.size,
        mingguLunas: hitungStatus("LUNAS"),
        mingguMenunggu: hitungStatus("MENUNGGU_VERIFIKASI"),
        mingguBelumBayar: hitungStatus("BELUM_BAYAR") + hitungStatus("MENUNGGAK"),
        totalKasMasuk: agregat("DISETUJUI")?._sum.totalNominal ?? 0,
        totalMenunggu: agregat("MENUNGGU_VERIFIKASI")?._sum.totalNominal ?? 0,
        pengajuanDisetujui: agregat("DISETUJUI")?._count._all ?? 0,
        pengajuanMenunggu: agregat("MENUNGGU_VERIFIKASI")?._count._all ?? 0,
      },
    });
  } catch (error) {
    console.error("[admin/kas] Gagal memuat rekap:", error);
    return NextResponse.json({ error: "Rekap kas belum dapat dimuat." }, { status: 500 });
  }
}
