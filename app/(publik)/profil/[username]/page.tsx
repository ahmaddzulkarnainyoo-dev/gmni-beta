import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
import { PILIH_ARTIKEL_PUBLIK, bylineArtikel, fmtTanggal } from "@/lib/articles";
import { LABEL_BADGE, evaluasiBadgeKader, ambilKatalogBadge } from "@/lib/gamifikasi";
import { KartuArtikel } from "@/components/ui/KartuArtikel";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { TombolIkuti } from "@/components/publik/TombolIkuti";

export const dynamic = "force-dynamic";

type ParamsProfil = { username: string };

export async function generateMetadata({
  params,
}: {
  params: Promise<ParamsProfil>;
}): Promise<Metadata> {
  const { username } = await params;
  const profil = await prisma.user.findUnique({
    where: { username },
    select: {
      id: true,
      namaLengkap: true,
      bio: true,
      profilTersembunyi: true,
      statusAkun: true,
    },
  });
  // Nonaktif/tak ada → judul generik (detail ditangani notFound di halaman).
  if (!profil || profil.statusAkun !== "AKTIF") {
    return { title: "Kader Tidak Ditemukan" };
  }
  // Jangan bocorkan nama/bio lewat metadata bila profil terkunci;
  // pemilik & staf moderasi tetap melihat penuh.
  const sesi = await getSessionUser();
  const boleh =
    !profil.profilTersembunyi ||
    sesi?.id === profil.id ||
    sesi?.permissions.includes("komentar.moderasi") === true;
  if (!boleh) return { title: "Profil Tersembunyi" };
  return {
    title: `${profil.namaLengkap} (@${username})`,
    description: profil.bio ?? undefined,
  };
}

/**
 * Profil publik kader — /profil/[username] (blueprint 8.5).
 * Menghormati toggle `profilTersembunyi`: pengunjung publik melihat
 * state terkunci; pemilik akun & staf moderasi tetap melihat penuh.
 */
export default async function HalamanProfil({
  params,
}: {
  params: Promise<ParamsProfil>;
}) {
  const { username } = await params;

  const profil = await prisma.user.findUnique({
    where: { username },
    include: { role: { select: { nama: true } } },
  });
  if (!profil || profil.statusAkun !== "AKTIF") notFound();

  const sesi = await getSessionUser();
  const pemilik = sesi?.id === profil.id;
  const bisaDm =
    !!sesi &&
    sesi.id !== profil.id &&
    sesi.permissions.includes("pesan.kirim");
  const stafModerasi = sesi?.permissions.includes("komentar.moderasi") === true;
  const kunciPublik = profil.profilTersembunyi && !pemilik && !stafModerasi;

  if (kunciPublik) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-10 md:py-14">
        <KickerLabel>Profil Kader</KickerLabel>
        <section className="mt-6 border-2 border-hitam-900 bg-white p-8 text-center md:p-12">
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            aria-hidden
            className="mx-auto h-12 w-12 text-hitam-400"
          >
            <rect x="4" y="10" width="16" height="10" rx="1" />
            <path d="M8 10V7a4 4 0 0 1 8 0v3" />
          </svg>
          <h1 className="mt-4 font-serif text-2xl font-extrabold text-hitam-900 md:text-3xl">
            Profil Tersembunyi
          </h1>
          <p className="mx-auto mt-2 max-w-md text-sm text-hitam-500">
            Kader{" "}
            <span className="font-mono font-bold text-hitam-700">
              @{profil.username}
            </span>{" "}
            memilih menyembunyikan profilnya dari publik. Biodata dan daftar
            tulisan tidak ditampilkan.
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
            <Link
              href="/login"
              className="bg-hitam-900 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gmnimerah-600"
            >
              Masuk sebagai Kader
            </Link>
            <Link
              href="/"
              className="border-2 border-hitam-900 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-900 transition-colors hover:bg-hitam-900 hover:text-white"
            >
              Kembali ke Beranda
            </Link>
          </div>
        </section>
      </div>
    );
  }

  // Hanya artikel TERBIT dengan visibilitas ASLI yang tampil di profil —
  // artikel SAMARAN/REDAKSI dikecualikan demi anonimitas (blueprint 6.2).
  const artikel = await prisma.artikel.findMany({
    where: {
      penulisId: profil.id,
      status: "TERBIT",
      visibilitasPenulis: "ASLI",
    },
    orderBy: [{ disematkan: "desc" }, { tanggalTerbit: "desc" }],
    take: 30,
    select: PILIH_ARTIKEL_PUBLIK,
  });

  // Badge publik (lazily, blueprint 8.4) — hanya untuk profil terbuka.
  await evaluasiBadgeKader(profil.id);
  const [lencana, statPengikut, statDiikuti, sudahMengikuti, katalogBadge] = await Promise.all([
    prisma.pencapaian.findMany({
      where: { userId: profil.id },
      orderBy: { tanggalDiperoleh: "desc" },
      take: 12,
    }),
    prisma.follower.count({ where: { diikutiId: profil.id } }),
    prisma.follower.count({ where: { pengikutId: profil.id } }),
    sesi
      ? prisma.follower
          .findUnique({
            where: { pengikutId_diikutiId: { pengikutId: sesi.id, diikutiId: profil.id } },
            select: { id: true },
          })
          .catch(() => null)
      : Promise.resolve(null),
    ambilKatalogBadge(),
  ]);

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 md:py-14">
      <KickerLabel>Profil Kader</KickerLabel>

      {profil.profilTersembunyi && pemilik && (
        <div className="mt-4 border-2 border-gmnimerah-500 bg-gmnimerah-50 px-4 py-3 text-sm font-semibold text-gmnimerah-700">
          Profil kamu sedang tersembunyi dari publik.{" "}
          <Link
            href="/dasbor/pengaturan"
            className="underline hover:text-gmnimerah-900"
          >
            Ubah di Pengaturan.
          </Link>
        </div>
      )}

      <section className="mt-6 flex flex-col gap-6 border-2 border-hitam-900 bg-white p-6 md:flex-row md:p-8">
        <div className="h-28 w-28 shrink-0 overflow-hidden border-2 border-hitam-900 bg-hitam-900 md:h-36 md:w-36">
          {profil.fotoProfil ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={profil.fotoProfil}
              alt={`Foto ${profil.namaLengkap}`}
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="grid h-full w-full place-items-center font-serif text-5xl font-extrabold text-white/80">
              {profil.namaLengkap.slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[11px] font-bold uppercase tracking-widest text-gmnimerah-600">
              @{profil.username}
            </span>
            <span className="border border-hitam-900 bg-kertas-200 px-2 py-0.5 font-mono text-[10px] font-bold uppercase tracking-widest text-hitam-700">
              {profil.role.nama}
            </span>
          </div>
          <h1 className="mt-2 font-serif text-3xl font-extrabold leading-tight text-hitam-900 md:text-4xl">
            {profil.namaLengkap}
          </h1>
          {profil.daerahAsal && (
            <p className="mt-1 font-mono text-[12px] uppercase tracking-widest text-hitam-400">
              {profil.daerahAsal}
            </p>
          )}
          {(profil.cabangDpc || profil.komisariat || profil.cabangKomisariat) && (
            <p className="mt-1 font-mono text-[12px] uppercase tracking-widest text-hitam-400">
              {[profil.cabangDpc, profil.komisariat ?? profil.cabangKomisariat]
                .filter(Boolean)
                .join(" · ")}
            </p>
          )}
          {profil.bio ? (
            <p className="mt-3 max-w-2xl whitespace-pre-line text-sm leading-relaxed text-hitam-600">
              {profil.bio}
            </p>
          ) : (
            <p className="mt-3 text-sm italic text-hitam-400">
              Kader ini belum menulis bio.
            </p>
          )}
          <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-hitam-400">
            Bergabung {fmtTanggal(profil.tanggalBergabung)}
          </p>
          {bisaDm && (
            <Link
              href={`/dasbor/pesan?dengan=${profil.username}`}
              className="mt-4 inline-block bg-gmnimerah-500 px-4 py-2 font-mono text-[11px] font-bold uppercase tracking-widest text-white transition-colors hover:bg-gmnimerah-600"
            >
              Kirim Pesan
            </Link>
          )}
          {!pemilik && (
            <TombolIkuti
              username={profil.username}
              awalMengikuti={Boolean(sudahMengikuti)}
              login={Boolean(sesi)}
            />
          )}
          <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-hitam-400">
            <span className="font-bold text-hitam-700">{statPengikut}</span> Pengikut ·{" "}
            <span className="font-bold text-hitam-700">{statDiikuti}</span> Mengikuti
          </p>
        </div>
      </section>

      <section className="mt-12">
        <KickerLabel>Lencana Perjuangan</KickerLabel>
        <h2 className="mt-2 font-serif text-2xl font-extrabold text-hitam-900">
          Trophy Case <span className="text-gmnimerah-600">({lencana.length})</span>
        </h2>
        {lencana.length === 0 ? (
          <p className="mt-4 text-sm italic text-hitam-400">
            Kader ini belum meraih lencana.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {lencana.map((b) => {
              const entri = katalogBadge.get(b.jenisBadge);
              const label = entri?.label ?? LABEL_BADGE[b.jenisBadge] ?? b.jenisBadge;
              const gambar = entri?.gambarUrl ?? null;
              return (
                <span
                  key={b.id}
                  title={`${label} — ${b.periode}`}
                  className="flex items-center gap-1.5 border-2 border-hitam-900 bg-white px-3 py-1.5 font-mono text-[11px] font-bold uppercase tracking-widest text-hitam-700"
                >
                  {gambar ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={gambar} alt="" className="h-5 w-5 border border-hitam-900 object-cover" />
                  ) : (
                    <span aria-hidden className="text-gmnimerah-600">★</span>
                  )}
                  {label}
                </span>
              );
            })}
          </div>
        )}
      </section>

      <section className="mt-12">
        <KickerLabel>Tulisan Kader</KickerLabel>
        <h2 className="mt-2 font-serif text-2xl font-extrabold text-hitam-900">
          Artikel Terbit <span className="text-gmnimerah-600">({artikel.length})</span>
        </h2>
        {artikel.length === 0 ? (
          <div className="mt-6 border-4 border-dashed border-hitam-200 bg-kertas-100 p-10 text-center">
            <p className="font-serif text-xl font-bold text-hitam-900">
              Belum ada artikel terbit.
            </p>
            <p className="mt-2 text-sm text-hitam-500">
              Tulisan kader yang sudah disetujui redaksi akan tampil di sini.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {artikel.map((a) => (
              <KartuArtikel
                key={a.id}
                judul={a.judul}
                ringkasan={a.ringkasan ?? undefined}
                kategori={{ nama: a.kategori.nama, slug: a.kategori.slug }}
                tanggal={fmtTanggal(a.tanggalTerbit)}
                penulis={bylineArtikel(a).nama}
                gambar={a.gambarUtama}
                slug={a.slug}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

