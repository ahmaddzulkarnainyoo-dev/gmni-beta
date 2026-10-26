import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import {
  mingguDalamTahun,
  nominalUntukMinggu,
  statusTampilanKas,
  tanggalDateOnly,
  tanggalWib,
} from "@/lib/kas";

function csvCell(value: string | number): string {
  let teks = String(value);
  if (/^[\s]*[=+\-@]/.test(teks)) teks = `'${teks}`;
  return `"${teks.replace(/"/g, '""')}"`;
}

/** GET /api/admin/kas/ekspor?tahun=YYYY — matrix kas tahunan ke CSV. */
export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.permissions.includes("kas.kelola")) {
    return NextResponse.json({ error: "Izin kas.kelola diperlukan." }, { status: 403 });
  }

  const url = new URL(request.url);
  const lihatPenuh = user.roleNama === "Super Admin" && url.searchParams.get("mode") === "penuh";
  const tahun = Number(
    url.searchParams.get("tahun") ?? tanggalWib(new Date()).slice(0, 4),
  );
  if (!Number.isInteger(tahun) || tahun < 1900 || tahun > 9998) {
    return NextResponse.json({ error: "Tahun ekspor tidak valid." }, { status: 400 });
  }

  const minggu = mingguDalamTahun(tahun);
  const mulai = minggu[0];
  const akhir = new Date(minggu[minggu.length - 1].getTime() + 7 * 86_400_000);
  const cari = url.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const cabang = url.searchParams.get("cabang")?.trim().slice(0, 100) ?? "";
  const komisariat = url.searchParams.get("komisariat")?.trim().slice(0, 120) ?? "";
  const statusDiminta = url.searchParams.get("status") ?? "";
  const statusValid = new Set([
    "LUNAS",
    "MENUNGGU_VERIFIKASI",
    "BELUM_BAYAR",
    "MENUNGGAK",
  ]);
  if (statusDiminta && !statusValid.has(statusDiminta)) {
    return NextResponse.json({ error: "Filter status kas tidak valid." }, { status: 400 });
  }
  const where = {
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
    const [kader, iuran, tarif] = await Promise.all([
      prisma.user.findMany({
        where,
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
        },
      }),
      prisma.konfigurasiIuranKas.findMany({
        where: { berlakuMulai: { lte: akhir } },
        orderBy: { berlakuMulai: "asc" },
        select: { berlakuMulai: true, nominal: true },
      }),
    ]);

    const iuranPerMinggu = new Map(
      iuran.map((baris) => [
        `${baris.kaderId}:${tanggalDateOnly(baris.mingguMulai)}`,
        baris,
      ]),
    );
    const header = [
      "Identitas",
      ...(lihatPenuh ? ["Username", "NIM", "DPC", "Komisariat"] : []),
      ...minggu.map((tanggal) => tanggalDateOnly(tanggal)),
      "Minggu Lunas",
      "Total Nominal Lunas",
    ];
    const barisCsv = [header.map(csvCell).join(",")];
    for (const anggota of kader) {
      let lunas = 0;
      let totalLunas = 0;
      const statusMinggu = minggu.map((mingguMulai) => {
        const key = `${anggota.id}:${tanggalDateOnly(mingguMulai)}`;
        const catatan = iuranPerMinggu.get(key);
        const status = statusTampilanKas(catatan?.status ?? null, mingguMulai);
        if (status === "LUNAS") {
          lunas += 1;
          totalLunas += catatan?.nominal ?? 0;
        }
        const nominal = catatan?.nominal ?? nominalUntukMinggu(tarif, mingguMulai);
        return nominal === null ? status : `${status} (${nominal})`;
      });
      if (statusDiminta && !statusMinggu.some((item) => item.startsWith(statusDiminta))) {
        continue;
      }
      barisCsv.push(
        [
          lihatPenuh ? anggota.namaLengkap : `Kader Anonim #${anggota.id.slice(-6).toUpperCase()}`,
          ...(lihatPenuh ? [anggota.username, anggota.nim ?? "", anggota.cabangDpc ?? "", anggota.komisariat ?? ""] : []),
          ...statusMinggu,
          lunas,
          totalLunas,
        ]
          .map(csvCell)
          .join(","),
      );
    }

    const csv = `\uFEFF${barisCsv.join("\r\n")}`;
    await prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: "kas.ekspor",
        entitasTipe: "IuranKas",
        entitasId: String(tahun),
        dataSesudah: { tahun, jumlahKader: kader.length },
      },
    });
    return new Response(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="rekap-kas-${tahun}.csv"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("[admin/kas] Gagal mengekspor rekap:", error);
    return NextResponse.json({ error: "Ekspor rekap kas gagal." }, { status: 500 });
  }
}
