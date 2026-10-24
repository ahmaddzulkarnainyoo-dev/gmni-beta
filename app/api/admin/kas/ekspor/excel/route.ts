import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { mingguDalamTahun, nominalUntukMinggu, statusTampilanKas, tanggalDateOnly, tanggalWib } from "@/lib/kas";

export async function GET(request: Request) {
  const user = await getSessionUser();
  if (!user) return Response.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  if (!user.permissions.includes("kas.kelola")) return Response.json({ error: "Izin kas.kelola diperlukan." }, { status: 403 });

  const url = new URL(request.url);
  const tahun = Number(url.searchParams.get("tahun") ?? tanggalWib(new Date()).slice(0, 4));
  if (!Number.isInteger(tahun) || tahun < 1900 || tahun > 9998) return Response.json({ error: "Tahun ekspor tidak valid." }, { status: 400 });
  const cari = url.searchParams.get("q")?.trim().slice(0, 100) ?? "";
  const cabang = url.searchParams.get("cabang")?.trim().slice(0, 100) ?? "";
  const komisariat = url.searchParams.get("komisariat")?.trim().slice(0, 120) ?? "";
  const statusDiminta = url.searchParams.get("status") ?? "";
  const statusValid = new Set(["LUNAS", "MENUNGGU_VERIFIKASI", "BELUM_BAYAR", "MENUNGGAK"]);
  if (statusDiminta && !statusValid.has(statusDiminta)) return Response.json({ error: "Filter status kas tidak valid." }, { status: 400 });

  const minggu = mingguDalamTahun(tahun);
  const mulai = minggu[0];
  const akhir = new Date(minggu[minggu.length - 1].getTime() + 7 * 86_400_000);
  const where = {
    statusAkun: "AKTIF" as const,
    ...(cabang ? { cabangDpc: { contains: cabang, mode: "insensitive" as const } } : {}),
    ...(komisariat ? { komisariat: { contains: komisariat, mode: "insensitive" as const } } : {}),
    ...(cari ? { OR: [{ namaLengkap: { contains: cari, mode: "insensitive" as const } }, { username: { contains: cari, mode: "insensitive" as const } }, { nim: { contains: cari, mode: "insensitive" as const } }] } : {}),
  };
  const [kader, iuran, tarif] = await Promise.all([
    prisma.user.findMany({ where, orderBy: [{ cabangDpc: "asc" }, { komisariat: "asc" }, { namaLengkap: "asc" }], select: { id: true, namaLengkap: true, username: true, nim: true, cabangDpc: true, komisariat: true } }),
    prisma.iuranKas.findMany({ where: { mingguMulai: { gte: mulai, lt: akhir } }, select: { kaderId: true, mingguMulai: true, nominal: true, status: true } }),
    prisma.konfigurasiIuranKas.findMany({ where: { berlakuMulai: { lte: akhir } }, orderBy: { berlakuMulai: "asc" }, select: { berlakuMulai: true, nominal: true } }),
  ]);
  const perMinggu = new Map(iuran.map((item) => [`${item.kaderId}:${tanggalDateOnly(item.mingguMulai)}`, item]));
  const rows = kader.flatMap((anggota) => {
    let lunas = 0; let totalLunas = 0;
    const values = minggu.map((mingguMulai) => {
      const item = perMinggu.get(`${anggota.id}:${tanggalDateOnly(mingguMulai)}`);
      const status = statusTampilanKas(item?.status ?? null, mingguMulai);
      if (status === "LUNAS") { lunas += 1; totalLunas += item?.nominal ?? 0; }
      const nominal = item?.nominal ?? nominalUntukMinggu(tarif, mingguMulai);
      return nominal === null ? status : `${status} (${nominal})`;
    });
    if (statusDiminta && !values.some((value) => value.startsWith(statusDiminta))) return [];
    return [{ Nama: anggota.namaLengkap, Username: anggota.username, NIM: anggota.nim ?? "", DPC: anggota.cabangDpc ?? "", Komisariat: anggota.komisariat ?? "", ...Object.fromEntries(minggu.map((date, index) => [tanggalDateOnly(date), values[index]])), "Minggu Lunas": lunas, "Total Nominal Lunas": totalLunas }];
  });
  const workbook = XLSX.utils.book_new();
  const sheet = XLSX.utils.json_to_sheet(rows);
  XLSX.utils.book_append_sheet(workbook, sheet, "Rekap Kas");
  const bytes = XLSX.write(workbook, { bookType: "xlsx", type: "buffer" }) as Buffer;
  await prisma.auditLog.create({ data: { aktorId: user.id, aksi: "kas.ekspor_excel", entitasTipe: "IuranKas", entitasId: String(tahun), dataSesudah: { tahun, jumlahKader: rows.length } } });
  return new Response(new Uint8Array(bytes), { headers: { "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", "Content-Disposition": `attachment; filename="rekap-kas-${tahun}.xlsx"`, "Cache-Control": "private, no-store" } });
}
