import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { mdKeHtml } from "@/lib/markdown";
import type { StatusArtikel, VisibilitasPenulis } from "@prisma/client";

const PILIHAN_VISIBILITAS: VisibilitasPenulis[] = ["ASLI", "SAMARAN", "REDAKSI"];
const STATUS_BISA_DIEDIT_PENULIS: StatusArtikel[] = ["DRAFT", "DIMINTA_REVISI"];

/**
 * PATCH /api/artikel/[id]
 * - Mode penulis: edit tulisan sendiri (DRAFT / DIMINTA_REVISI) dan/atau
 *   mengajukannya ke redaksi.
 * - Mode redaksi (body.aksi): TINJAU, TERBIT, REVISI, TOLAK — dijalankan
 *   oleh Editor/Super Admin (permission artikel.publish) dengan audit log.
 */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params;
    const user = await getSessionUser();
    if (!user) {
      return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
    }

    const artikel = await prisma.artikel.findUnique({ where: { id } });
    if (!artikel) {
      return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
    }

    let body: Record<string, unknown>;
    try {
      body = (await request.json()) as Record<string, unknown>;
    } catch {
      return NextResponse.json({ error: "Isi permintaan tidak valid." }, { status: 400 });
    }
    const aksi = typeof body.aksi === "string" ? body.aksi : null;
    const aksiPenulis = typeof body.aksiPenulis === "string" ? body.aksiPenulis : null;

    // ── MODE PENULIS: arsipkan / ajukan ulang tulisan sendiri ────────────
    // Kader boleh mengelola tulisannya sendiri tanpa campur tangan redaksi:
    // ARSIPKAN (DRAFT/DIAJUKAN/DIMINTA_REVISI/DITOLAK → DIARSIPKAN) dan
    // AJUKAN_ULANG (DITOLAK/DIARSIPKAN → DIAJUKAN, kembali ke antrean).
    if (aksiPenulis === "ARSIPKAN" || aksiPenulis === "AJUKAN_ULANG") {
      if (artikel.penulisId !== user.id) {
        return NextResponse.json({ error: "Bukan tulisan milik Anda." }, { status: 403 });
      }
      if (aksiPenulis === "ARSIPKAN") {
        if (!["DRAFT", "DIAJUKAN", "DIMINTA_REVISI", "DITOLAK"].includes(artikel.status)) {
          return NextResponse.json(
            { error: "Tulisan pada status ini tidak bisa diarsipkan." },
            { status: 400 },
          );
        }
        await prisma.$transaction([
          prisma.artikel.update({ where: { id }, data: { status: "DIARSIPKAN" } }),
          prisma.auditLog.create({
            data: {
              aktorId: user.id,
              aksi: "artikel.arsip_penulis",
              entitasTipe: "Artikel",
              entitasId: id,
              dataSesudah: { statusLama: artikel.status, statusBaru: "DIARSIPKAN" },
            },
          }),
        ]);
        return NextResponse.json({ ok: true, status: "DIARSIPKAN" });
      }
      // AJUKAN_ULANG
      if (!user.permissions.includes("artikel.submit")) {
        return NextResponse.json(
          { error: "Tidak punya izin mengajukan ke redaksi." },
          { status: 403 },
        );
      }
      if (!["DITOLAK", "DIARSIPKAN"].includes(artikel.status)) {
        return NextResponse.json(
          { error: "Hanya tulisan ditolak/diarsipkan yang bisa diajukan ulang." },
          { status: 400 },
        );
      }
      await prisma.$transaction([
        prisma.artikel.update({
          where: { id },
          data: { status: "DIAJUKAN", tanggalDiajukan: new Date(), catatanRevisi: null },
        }),
        prisma.auditLog.create({
          data: {
            aktorId: user.id,
            aksi: "artikel.ajukan_ulang",
            entitasTipe: "Artikel",
            entitasId: id,
            dataSesudah: { statusLama: artikel.status, statusBaru: "DIAJUKAN" },
          },
        }),
      ]);
      return NextResponse.json({ ok: true, status: "DIAJUKAN" });
    }

  if (aksi) {
    // ── MODE REDAKSI ──────────────────────────────────────────────
    if (!user.permissions.includes("artikel.publish")) {
      return NextResponse.json({ error: "Hanya redaksi yang dapat memproses artikel." }, { status: 403 });
    }
    const catatan = typeof body.catatanRevisi === "string" ? body.catatanRevisi.trim() : "";
    const statusLama = artikel.status;
    let statusBaru: StatusArtikel = artikel.status;

    if (aksi === "TINJAU") {
      if (artikel.status !== "DIAJUKAN") {
        return NextResponse.json({ error: "Hanya artikel berstatus Diajukan yang bisa ditinjau." }, { status: 400 });
      }
      statusBaru = "SEDANG_DITINJAU";
    } else if (aksi === "TERBIT") {
      if (!["SEDANG_DITINJAU", "DIAJUKAN", "DISETUJUI"].includes(artikel.status)) {
        return NextResponse.json({ error: "Artikel belum layak diterbitkan dari status ini." }, { status: 400 });
      }
      statusBaru = "TERBIT";
    } else if (aksi === "REVISI") {
      if (!catatan) {
        return NextResponse.json({ error: "Alasan revisi wajib diisi." }, { status: 400 });
      }
      statusBaru = "DIMINTA_REVISI";
    } else if (aksi === "TOLAK") {
      if (!catatan) {
        return NextResponse.json({ error: "Alasan penolakan wajib diisi." }, { status: 400 });
      }
      statusBaru = "DITOLAK";
    } else {
      return NextResponse.json({ error: "Aksi tidak dikenal." }, { status: 400 });
    }

    const hasil = await prisma.$transaction([
      prisma.artikel.update({
        where: { id },
        data: {
          status: statusBaru,
          ...(statusBaru === "TERBIT"
            ? { tanggalTerbit: new Date(), disetujuiOlehId: user.id }
            : {}),
          ...(statusBaru === "DIMINTA_REVISI" || statusBaru === "DITOLAK"
            ? { catatanRevisi: catatan }
            : {}),
        },
      }),
      prisma.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: `artikel.${aksi.toLowerCase()}`,
          entitasTipe: "Artikel",
          entitasId: artikel.id,
          dataSebelum: { status: statusLama },
          dataSesudah: { status: statusBaru },
        },
      }),
    ]);

    return NextResponse.json({ ok: true, status: hasil[0].status });
  }

  // ── MODE PENULIS ────────────────────────────────────────────────
  if (!user.permissions.includes("artikel.edit_milik_sendiri")) {
    return NextResponse.json({ error: "Tidak punya izin mengedit artikel." }, { status: 403 });
  }
  if (artikel.penulisId !== user.id) {
    return NextResponse.json({ error: "Bukan tulisan milik Anda." }, { status: 403 });
  }
  if (!STATUS_BISA_DIEDIT_PENULIS.includes(artikel.status)) {
    return NextResponse.json(
      { error: "Artikel sudah berada di tangan redaksi dan tidak bisa diubah lagi." },
      { status: 400 },
    );
  }

  // Validasi kategoriIds SEBELUM masuk transaksi: tak boleh kosong/tak dikenal.
  // Mencegah throw Prisma FK di dalam transaksi (yang memicu boundary).
  if (typeof body.kategoriId === "string" && body.kategoriId.trim()) {
    const kategoriAda = await prisma.kategori.findUnique({
      where: { id: body.kategoriId.trim() },
    });
    if (!kategoriAda) {
      return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
    }
  }

  const judul = typeof body.judul === "string" ? body.judul.trim() : null;
  const konten = typeof body.konten === "string" ? body.konten.trim() : null;
  if (judul && judul.length < 8) {
    return NextResponse.json({ error: "Judul minimal 8 karakter." }, { status: 400 });
  }
  if (konten && konten.length < 40) {
    return NextResponse.json({ error: "Isi artikel minimal 40 karakter." }, { status: 400 });
  }

  const visibilitas = PILIHAN_VISIBILITAS.includes(body.visibilitasPenulis as VisibilitasPenulis)
    ? (body.visibilitasPenulis as VisibilitasPenulis)
    : artikel.visibilitasPenulis;
  if (visibilitas === "SAMARAN" && !body.namaTampilanKustom) {
    return NextResponse.json(
      { error: "Nama samaran wajib diisi saat memilih Visibilitas Penulis Samaran." },
      { status: 400 },
    );
  }

  const data: Record<string, unknown> = {};
  if (judul) data.judul = judul;
  if (konten) {
    try {
      data.konten = mdKeHtml(konten);
    } catch {
      data.konten = konten;
    }
  }
  if (typeof body.ringkasan === "string") data.ringkasan = body.ringkasan.trim() || null;
  if (typeof body.kategoriId === "string" && body.kategoriId.trim()) {
    data.kategoriId = body.kategoriId.trim();
  }
  data.visibilitasPenulis = visibilitas;
  data.namaTampilanKustom =
    visibilitas === "SAMARAN" ? String(body.namaTampilanKustom).trim() : null;
  data.dikecualikanDariLeaderboard = visibilitas !== "ASLI";

  const bermintaSubmit = Boolean(body.ajukan);
  if (bermintaSubmit) {
    if (!user.permissions.includes("artikel.submit")) {
      return NextResponse.json({ error: "Tidak punya izin mengajukan ke redaksi." }, { status: 403 });
    }
    data.status = "DIAJUKAN";
    data.tanggalDiajukan = new Date();
    data.catatanRevisi = null;
  }

  const sinkronisasiTag = Array.isArray(body.tagIds)
    ? [...new Set(body.tagIds.filter((t) => typeof t === "string"))].slice(0, 5)
    : null;

  const hasil = await prisma.$transaction(async (tx) => {
    const diperbarui = await tx.artikel.update({ where: { id }, data });
    if (sinkronisasiTag) {
      await tx.artikelTag.deleteMany({ where: { artikelId: id } });
      if (sinkronisasiTag.length > 0) {
        await tx.artikelTag.createMany({
          data: sinkronisasiTag.map((tagId) => ({ artikelId: id, tagId })),
        });
      }
    }
    return diperbarui;
  });

  return NextResponse.json({ ok: true, status: hasil.status });
  } catch (error) {
    console.error("[artikel] Gagal memperbarui:", error);
    return NextResponse.json({ error: "Gagal menyimpan perubahan artikel." }, { status: 500 });
  }
}