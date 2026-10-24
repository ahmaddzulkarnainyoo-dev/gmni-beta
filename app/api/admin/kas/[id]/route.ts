import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { tanggalDateOnly } from "@/lib/kas";

type Context = { params: Promise<{ id: string }> };

/** PATCH /api/admin/kas/[id] — setujui atau tolak pengajuan transfer. */
export async function PATCH(request: Request, { params }: Context) {
  const user = await getSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.permissions.includes("kas.kelola")) {
    return NextResponse.json({ error: "Izin kas.kelola diperlukan." }, { status: 403 });
  }

  const { id } = await params;
  const body = (await request.json().catch(() => null)) as Record<string, unknown> | null;
  const aksi = typeof body?.aksi === "string" ? body.aksi.toUpperCase() : "";
  const alasan =
    typeof body?.alasanPenolakan === "string" ? body.alasanPenolakan.trim() : "";
  if (aksi !== "SETUJUI" && aksi !== "TOLAK") {
    return NextResponse.json({ error: "Aksi harus SETUJUI atau TOLAK." }, { status: 400 });
  }
  if (aksi === "TOLAK" && (alasan.length < 3 || alasan.length > 500)) {
    return NextResponse.json(
      { error: "Alasan penolakan wajib diisi (3–500 karakter)." },
      { status: 400 },
    );
  }

  try {
    await prisma.$transaction(
      async (tx) => {
        const pembayaran = await tx.pembayaranKas.findUnique({
          where: { id },
          include: {
            alokasi: {
              include: { iuranKas: { select: { id: true, status: true, mingguMulai: true } } },
            },
          },
        });
        if (!pembayaran) throw new Error("KAS_TIDAK_DITEMUKAN");
        if (pembayaran.status !== "MENUNGGU_VERIFIKASI") {
          throw new Error("KAS_SUDAH_DIPROSES");
        }
        if (
          pembayaran.alokasi.length === 0 ||
          pembayaran.alokasi.some((alokasi) => alokasi.iuranKas.status !== "MENUNGGU_VERIFIKASI")
        ) {
          throw new Error("KAS_ALOKASI_TIDAK_VALID");
        }

        const sekarang = new Date();
        const status = aksi === "SETUJUI" ? "DISETUJUI" : "DITOLAK";
        const diperbarui = await tx.pembayaranKas.updateMany({
          where: { id, status: "MENUNGGU_VERIFIKASI" },
          data: {
            status,
            diverifikasiOlehId: user.id,
            diverifikasiAt: sekarang,
            alasanPenolakan: aksi === "TOLAK" ? alasan : null,
          },
        });
        if (diperbarui.count !== 1) throw new Error("KAS_SUDAH_DIPROSES");

        const idsIuran = pembayaran.alokasi.map((alokasi) => alokasi.iuranKas.id);
        const diubah = await tx.iuranKas.updateMany({
          where: {
            id: { in: idsIuran },
            status: "MENUNGGU_VERIFIKASI",
          },
          data:
            aksi === "SETUJUI"
              ? { status: "LUNAS", tanggalLunas: sekarang }
              : { status: "BELUM_BAYAR", tanggalLunas: null },
        });
        if (diubah.count !== idsIuran.length) throw new Error("KAS_ALOKASI_TIDAK_VALID");

        await tx.auditLog.create({
          data: {
            aktorId: user.id,
            aksi: aksi === "SETUJUI" ? "kas.setujui" : "kas.tolak",
            entitasTipe: "PembayaranKas",
            entitasId: pembayaran.id,
            dataSebelum: { status: pembayaran.status },
            dataSesudah: {
              status,
              alasanPenolakan: aksi === "TOLAK" ? alasan : null,
              minggu: pembayaran.alokasi.map((alokasi) =>
                tanggalDateOnly(alokasi.iuranKas.mingguMulai),
              ),
            },
          },
        });
        await tx.notifikasi.create({
          data: {
            userId: pembayaran.kaderId,
            judul:
              aksi === "SETUJUI" ? "Iuran kas terverifikasi" : "Pengajuan kas perlu diperbaiki",
            isi:
              aksi === "SETUJUI"
                ? "Pembayaran kas Anda telah diverifikasi dan minggu yang dialokasikan berstatus lunas."
                : `Pengajuan kas ditolak: ${alasan}`,
            tipe: aksi === "SETUJUI" ? "SUKSES" : "PERINGATAN",
            tautan: "/dasbor/kas",
          },
        });
      },
      { isolationLevel: Prisma.TransactionIsolationLevel.Serializable },
    );
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error) {
      if (error.message === "KAS_TIDAK_DITEMUKAN") {
        return NextResponse.json({ error: "Pengajuan kas tidak ditemukan." }, { status: 404 });
      }
      if (error.message === "KAS_SUDAH_DIPROSES") {
        return NextResponse.json(
          { error: "Pengajuan ini sudah diproses oleh petugas lain." },
          { status: 409 },
        );
      }
      if (error.message === "KAS_ALOKASI_TIDAK_VALID") {
        return NextResponse.json(
          { error: "Status alokasi minggu tidak konsisten; pengajuan tidak diubah." },
          { status: 409 },
        );
      }
    }
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2034"
    ) {
      return NextResponse.json(
        { error: "Data berubah bersamaan. Muat ulang lalu coba lagi." },
        { status: 409 },
      );
    }
    console.error("[admin/kas] Gagal memverifikasi pembayaran:", error);
    return NextResponse.json({ error: "Verifikasi kas gagal diproses." }, { status: 500 });
  }
}
