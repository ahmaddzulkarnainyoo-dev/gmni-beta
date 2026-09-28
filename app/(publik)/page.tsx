import Link from "next/link";
import { LogoGMNI } from "@/components/brand/LogoGMNI";
import { DividerTrisila } from "@/components/ui/DividerTrisila";
import { KartuArtikel } from "@/components/ui/KartuArtikel";
import { KickerLabel } from "@/components/ui/KickerLabel";
import { Tombol } from "@/components/ui/Tombol";
import { ambilTerbitTerbaru, ambilTerpopuler, bylineArtikel, fmtTanggal } from "@/lib/articles";

export const dynamic = "force-dynamic";

export default async function Beranda() {
  const terbaru = await ambilTerbitTerbaru(9);
  const terpopuler = await ambilTerpopuler(6);
  const unggulan = terbaru[0] ?? null;
  const lainnya = terbaru.slice(1, 7);
  const marhaenPinned =
    terbaru.find((a) => a.kategori.slug === "marhaenisme") ?? null;
  return (
    <>
      <section className="border-b-4 border-hitam-900 bg-kertas-150">
        <div className="mx-auto grid max-w-6xl gap-8 px-4 py-12 md:grid-cols-[1.2fr_0.8fr] md:py-16">
          <div>
            <KickerLabel>Suara Rakyat Kecil</KickerLabel>
            <h1 className="mt-4 font-serif text-4xl font-extrabold leading-[1.05] text-hitam-900 md:text-6xl">
              Bersuara untuk <span className="italic">Marhaen</span>,<br />
              Menyala untuk Indonesia.
            </h1>
            <DividerTrisila className="mt-6" lebar="h-1.5 w-12" />
            <p className="mt-6 max-w-xl text-base leading-relaxed text-hitam-500 md:text-lg">
              info Marhaen adalah portal berita milik GMNI: oposisi kritis
              terhadap kebijakan pemerintah, ditulis oleh kader
              terverifikasi, dikurasi oleh redaksi. Trisila adalah garis
              perjuangan kami — Sosio-nasionalisme, Sosio-demokrasi,
              Ketuhanan.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Tombol href="/berita" varian="primer" ukuran="besar">
                Mulai Membaca
              </Tombol>
              <Tombol href="/marhaenisme" varian="sekunder" ukuran="besar">
                Pelajari Marhaenisme
              </Tombol>
            </div>
          </div>
          <div className="hidden place-items-center md:grid">
            <div className="grid aspect-square w-64 place-items-center rounded-full border-2 border-gmnimerah-500">
              <LogoGMNI warne="hitam" className="h-32 w-32" />
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-12">
        <div className="flex items-end justify-between border-b-2 border-hitam-900 pb-3">
          <div>
            <KickerLabel>Terbitan Terkini</KickerLabel>
            <h2 className="mt-1 font-serif text-2xl font-bold text-hitam-900 md:text-3xl">
              Edisi Terbaru
            </h2>
          </div>
          <Link
            href="/berita"
            className="font-mono text-[12px] font-semibold uppercase tracking-widest text-gmnimerah-600 hover:text-gmnimerah-700"
          >
            Lihat Semua →
          </Link>
        </div>

        {terbaru.length === 0 ? (
          <div className="mt-8 border-4 border-dashed border-hitam-200 bg-kertas-100 p-10 text-center">
            <p className="font-serif text-xl font-bold text-hitam-900">
              Belum ada terbitan.
            </p>
            <p className="mt-2 text-sm text-hitam-500">
              Redaksi sedang menyiapkan edisi perdana. Kembali lagi segera.
            </p>
          </div>
        ) : (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {unggulan && (
              <KartuArtikel
                varian="besar"
                judul={unggulan.judul}
                ringkasan={unggulan.ringkasan ?? undefined}
                kategori={{ nama: unggulan.kategori.nama, slug: unggulan.kategori.slug }}
                tanggal={fmtTanggal(unggulan.tanggalTerbit)}
                penulis={bylineArtikel(unggulan).nama}
                gambar={unggulan.gambarUtama}
                slug={unggulan.slug}
                className="md:col-span-2 md:row-span-2"
              />
            )}
            {lainnya.map((a) => (
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

      {terpopuler.length > 0 && (
        <section className="mx-auto mt-14 max-w-6xl px-4">
          <div className="flex items-end justify-between border-b-2 border-hitam-900 pb-3">
            <div>
              <KickerLabel>Apresiasi Pembaca</KickerLabel>
              <h2 className="mt-1 font-serif text-2xl font-bold text-hitam-900 md:text-3xl">
                Paling Diapresiasi
              </h2>
            </div>
            <span className="font-mono text-[12px] font-semibold uppercase tracking-widest text-hitam-400">
              👏 Tepuk tangan terbanyak
            </span>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {terpopuler.map((a) => (
              <KartuArtikel
                key={a.id}
                judul={a.judul}
                ringkasan={a.ringkasan ?? undefined}
                kategori={{ nama: a.kategori.nama, slug: a.kategori.slug }}
                tanggal={fmtTanggal(a.tanggalTerbit)}
                penulis={bylineArtikel(a).nama}
                gambar={a.gambarUtama}
                slug={a.slug}
                lencana={`👏 ${a.jumlahApresiasi} tepuk`}
              />
            ))}
          </div>
        </section>
      )}

      <section className="mx-auto mt-14 max-w-6xl px-4">
        <div className="relative overflow-hidden bg-hitam-900 p-8 text-kertas-100 md:p-12">
          <LogoGMNI
            warne="putih"
            className="pointer-events-none absolute -right-8 -top-8 h-56 w-56 opacity-10"
          />
          <KickerLabel warne="merah">Marhaenisme</KickerLabel>
          <h2 className="mt-3 max-w-2xl font-serif text-2xl font-bold leading-snug text-white md:text-3xl">
            Barisan tanpa kata adalah barisan yang menganggur.
          </h2>
          <p className="mt-4 max-w-2xl text-sm leading-relaxed text-kertas-300">
            Rubrik Marhaenisme menjadi banteng permanen: artikel mendasar
            tentang Marhaenisme, Trisila, dan pemikiran Bung Karno —
            disematkan di atas kanal lainnya. Fase 1 mengisinya dari konten
            seed resmi GMNI.
          </p>
          <Tombol
            href="/marhaenisme"
            varian="putih"
            ukuran="sedang"
            className="mt-6"
          >
            Ke Rubrik Marhaenisme
          </Tombol>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pt-14">
        <KickerLabel>Peta Kanal</KickerLabel>
        <div className="mt-4 grid gap-px border border-hitam-100 bg-hitam-100 sm:grid-cols-2 lg:grid-cols-4">
          {[
            { t: "Berita", d: "Politik, ekonomi, hukum, pendidikan, lingkungan, daerah, nasional.", h: "/berita" },
            { t: "Opini", d: "Suara kader dan rakyat kecil atas keadaan zaman.", h: "/opini" },
            { t: "Kaderisasi", d: "Agenda & liputan PPAB, KTD, KTM, KTP.", h: "/kaderisasi" },
            { t: "Tokoh", d: "Profil tokoh nasional dan alumni kader GMNI.", h: "/tokoh" },
          ].map((kanal) => (
            <Link
              key={kanal.t}
              href={kanal.h}
              className="group bg-kertas-150 p-5 transition-colors hover:bg-gmnimerah-500"
            >
              <h3 className="font-serif text-xl font-bold text-hitam-900 group-hover:text-white">
                {kanal.t}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-hitam-500 group-hover:text-kertas-100">
                {kanal.d}
              </p>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}