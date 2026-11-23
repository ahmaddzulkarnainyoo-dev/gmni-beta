import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveSessionUser } from "@/lib/session";
import { mdKeHtml } from "@/lib/markdown";
import { urlGambarValid } from "@/lib/image-url";
import type { StatusArtikel, VisibilitasPenulis } from "@prisma/client";
import { catatAktivitas, evaluasiBadgeKader, perbaruiStreak, tarikPoinEntitas } from "@/lib/gamifikasi";

const ROLES_ADMIN = ["Super Admin", "Editor"];
const VISIBILITAS: VisibilitasPenulis[] = ["ASLI", "SAMARAN", "REDAKSI"];
const STATUS: StatusArtikel[] = [
  "DRAFT",
  "DIAJUKAN",
  "SEDANG_DITINJAU",
  "DIMINTA_REVISI",
  "DISETUJUI",
  "TERBIT",
  "DITOLAK",
  "DIARSIPKAN",
];

function teks(v: unknown): string | null {
  return typeof v === "string" ? v.trim() : null;
}

function tolakhak() {
  return NextResponse.json(
    { error: "Hanya Super Admin atau Editor yang dapat mengelola artikel." },
    { status: 403 },
  );
}

/** PATCH — edit penuh artikel oleh Super Admin/Editor + audit log. */
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.roleNama || !ROLES_ADMIN.includes(user.roleNama)) return tolakhak();

  const { id } = await params;
  const artikel = await prisma.artikel.findUnique({ where: { id } });
  if (!artikel) {
    return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
  }

  try {
    const body = (await request.json()) as Record<string, unknown>;
    const data: Record<string, unknown> = {};
    const statusLama = artikel.status;

    const judul = teks(body.judul);
    if (judul !== null) {
      if (judul.length < 8) {
        return NextResponse.json({ error: "Judul minimal 8 karakter." }, { status: 400 });
      }
      data.judul = judul;
    }

    const slugUsulan = teks(body.slug);
    if (slugUsulan !== null) {
      if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(slugUsulan)) {
        return NextResponse.json(
          { error: "Slug hanya huruf kecil, angka, dan tanda hubung." },
          { status: 400 },
        );
      }
      const bentrok = await prisma.artikel.findFirst({
        where: { slug: slugUsulan, id: { not: id } },
      });
      if (bentrok) {
        return NextResponse.json({ error: "Slug sudah dipakai artikel lain." }, { status: 409 });
      }
      data.slug = slugUsulan;
    }

    const ringkasan = teks(body.ringkasan);
    if (ringkasan !== null) data.ringkasan = ringkasan || null;

    const konten = teks(body.konten);
    if (konten !== null) {
      if (konten.length < 40) {
        return NextResponse.json({ error: "Isi artikel minimal 40 karakter." }, { status: 400 });
      }
      data.konten = mdKeHtml(konten);
    }

    const gambar = teks(body.gambarUtama);
    if (gambar !== null) {
      const gambarDipangkas = gambar.slice(0, 2000);
      if (gambarDipangkas && !urlGambarValid(gambarDipangkas)) {
        return NextResponse.json({ error: "URL gambar utama tidak valid." }, { status: 400 });
      }
      data.gambarUtama = gambarDipangkas || null;
    }

    const kategoriId = teks(body.kategoriId);
    if (kategoriId !== null && kategoriId !== artikel.kategoriId) {
      const kategori = await prisma.kategori.findUnique({ where: { id: kategoriId } });
      if (!kategori) {
        return NextResponse.json({ error: "Kategori tidak ditemukan." }, { status: 400 });
      }
      data.kategoriId = kategoriId;
    }

    const penulisUsulan = teks(body.penulisId ?? "");
    if (penulisUsulan && penulisUsulan !== artikel.penulisId) {
      const penulis = await prisma.user.findUnique({ where: { id: penulisUsulan } });
      if (!penulis || penulis.statusAkun !== "AKTIF") {
        return NextResponse.json(
          { error: "Penulis tidak ditemukan atau nonaktif." },
          { status: 400 },
        );
      }
      data.penulisId = penulis.id;
    }

    if (body.visibilitasPenulis !== undefined) {
      const v = VISIBILITAS.includes(body.visibilitasPenulis as VisibilitasPenulis)
        ? (body.visibilitasPenulis as VisibilitasPenulis)
        : artikel.visibilitasPenulis;
      data.visibilitasPenulis = v;
      data.namaTampilanKustom = v === "SAMARAN" ? teks(body.namaTampilanKustom) : null;
      if (v === "SAMARAN" && !data.namaTampilanKustom) {
        return NextResponse.json(
          { error: "Nama samaran wajib diisi saat Visibilitas Penulis = Samaran." },
          { status: 400 },
        );
      }
      data.dikecualikanDariLeaderboard = v !== "ASLI"; // SAMARAN & REDAKSI dikecualikan (blueprint 8.4).
    }

    if (body.disematkan !== undefined) data.disematkan = body.disematkan === true;

    const statusBaru = teks(body.status);
    if (statusBaru !== null) {
      const s = STATUS.includes(statusBaru as StatusArtikel)
        ? (statusBaru as StatusArtikel)
        : null;
      if (!s) {
        return NextResponse.json({ error: "Status tidak dikenal." }, { status: 400 });
      }
      data.status = s;
      if (s === "TERBIT" && !artikel.tanggalTerbit) data.tanggalTerbit = new Date();
      if (s === "DIAJUKAN" && !artikel.tanggalDiajukan) data.tanggalDiajukan = new Date();
      if (s === "DIMINTA_REVISI" || s === "DITOLAK") {
        const catatan = teks(body.catatanRevisi);
        if (!catatan) {
          return NextResponse.json(
            { error: "Catatan revisi/penolakan wajib diisi." },
            { status: 400 },
          );
        }
        data.catatanRevisi = catatan;
      }
      if (s === "TERBIT") data.disetujuiOlehId = user.id;
    }

    const jadwalMentah = teks(body.tanggalJadwal);
    if (jadwalMentah !== null) {
      data.tanggalDijadwalkan =
        jadwalMentah && !Number.isNaN(Date.parse(jadwalMentah))
          ? new Date(jadwalMentah)
          : null;
    }

    const tagIds = Array.isArray(body.tagIds)
      ? [...new Set(body.tagIds.filter((t) => typeof t === "string"))].slice(0, 5)
      : null;

    const hasil = await prisma.$transaction(async (tx) => {
      const diperbarui = await tx.artikel.update({ where: { id }, data });
      if (tagIds) {
        await tx.artikelTag.deleteMany({ where: { artikelId: id } });
        if (tagIds.length > 0) {
          await tx.artikelTag.createMany({
            data: tagIds.map((tagId) => ({ artikelId: id, tagId })),
          });
        }
      }
      await tx.auditLog.create({
        data: {
          aktorId: user.id,
          aksi: "artikel.update",
          entitasTipe: "Artikel",
          entitasId: id,
          dataSebelum: { status: statusLama, judul: artikel.judul },
          dataSesudah: { status: (data.status as string) ?? statusLama },
        },
      });
      return diperbarui;
    });

    // Poin penerbitan (disetujui penuh): transisi pertama ke TERBIT dengan
    // visibilitas ASLI memberi poin; penarikan dari TERBIT menariknya kembali.
    const visibilitasAkhir =
      (data.visibilitasPenulis as VisibilitasPenulis | undefined) ??
      artikel.visibilitasPenulis;
    const dikecualikanAkhir =
      (data.dikecualikanDariLeaderboard as boolean | undefined) ??
      artikel.dikecualikanDariLeaderboard;
    if (statusLama !== "TERBIT" && hasil.status === "TERBIT") {
      if (visibilitasAkhir === "ASLI" && !dikecualikanAkhir) {
        const penulisId = hasil.penulisId;
        catatAktivitas(penulisId, "ARTIKEL_TERBIT", { detail: hasil.id })
          .then(() => catatAktivitas(penulisId, "AKTIF_HARIAN"))
          .then(() => perbaruiStreak(penulisId))
          .then(() => evaluasiBadgeKader(penulisId))
          .catch(() => undefined);
      }
    } else if (
      statusLama === "TERBIT" &&
      (hasil.status === "DIARSIPKAN" || hasil.status === "DITOLAK")
    ) {
      tarikPoinEntitas(hasil.id).catch(() => undefined);
    }

    return NextResponse.json({
      ok: true,
      id: hasil.id,
      slug: hasil.slug,
      status: hasil.status,
    });
  } catch (error) {
    console.error("[admin/artikel] Gagal memperbarui:", error);
    return NextResponse.json({ error: "Gagal menyimpan perubahan artikel." }, { status: 500 });
  }
}

/** DELETE — soft delete (arsip) artikel oleh Super Admin/Editor. */
export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getActiveSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Harus masuk terlebih dahulu." }, { status: 401 });
  }
  if (!user.roleNama || !ROLES_ADMIN.includes(user.roleNama)) return tolakhak();

  const { id } = await params;
  const artikel = await prisma.artikel.findUnique({ where: { id } });
  if (!artikel) {
    return NextResponse.json({ error: "Artikel tidak ditemukan." }, { status: 404 });
  }
  if (artikel.status === "DIARSIPKAN") {
    return NextResponse.json({ error: "Artikel sudah diarsipkan." }, { status: 400 });
  }

  await prisma.$transaction([
    prisma.artikel.update({ where: { id }, data: { status: "DIARSIPKAN" } }),
    prisma.auditLog.create({
      data: {
        aktorId: user.id,
        aksi: "artikel.arsip",
        entitasTipe: "Artikel",
        entitasId: id,
        dataSebelum: { status: artikel.status },
        dataSesudah: { status: "DIARSIPKAN" },
      },
    }),
  ]);

  // Retraksi poin arsip (disetujui penuh) — best-effort.
  if (artikel.status === "TERBIT") tarikPoinEntitas(id).catch(() => undefined);

  return NextResponse.json({ ok: true });
}
