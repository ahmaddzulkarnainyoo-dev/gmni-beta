import { prisma } from "@/lib/prisma";

export type HalamanData = { slug: string; judul: string; konten: string };

/** Bagian 1 dari fallback konten rapi untuk halaman publik (format HTML). */
export const FALLBACK_A: Record<string, { judul: string; konten: string }> = {
  tentang: {
    judul: "Tentang GMNI",
    konten:
      "<h2>Identitas</h2>" +
      "<p><strong>Gerakan Mahasiswa Nasional Indonesia (GMNI)</strong> adalah organisasi kemahasiswaan ekstrakampus yang lahir sebagai manifestasi perjuangan rakyat kecil menuju Indonesia yang berdaulat, adil, dan makmur.</p>" +
      "<ul><li><strong>Nama Resmi:</strong> Gerakan Mahasiswa Nasional Indonesia (GMNI)</li><li><strong>Tanggal Kelahiran:</strong> 23 Maret 1954 (Kongres I di Surabaya)</li><li><strong>Azas:</strong> Marhaenisme (ajaran Bung Karno)</li><li><strong>Status:</strong> Organisasi kemahasiswaan ekstrakampus</li></ul>" +
      "<h2>Sejarah Kelahiran &amp; Fusi</h2>" +
      "<p>GMNI lahir dari fusi 3 organisasi mahasiswa Marhaenis pada <strong>September 1953</strong> di rumah dinas Walikota Jakarta Raya (Soediro), Jalan Taman Suropati, dan dipuncaki melalui <strong>Kongres I di Surabaya pada 23 Maret 1954</strong> — tanggal kelahiran resmi GMNI.</p>" +
      "<h2>Makna Lambang</h2>" +
      "<ul><li><strong>Merah</strong> — Keberanian militan dalam perlawanan.</li><li><strong>Putih</strong> — Kesucian arah perjuangan.</li><li><strong>Hitam</strong> — Keteguhan tekad kader.</li><li><strong>Bintang</strong> — Ketinggian cita-cita kerakyatan.</li><li><strong>Banteng</strong> — Simbol rakyat Marhaen yang dibela oleh GMNI.</li><li><strong>Tiga Sudut</strong> — Perwujudan Trisila Marhaenisme.</li></ul>",
  },
  kaderisasi: {
    judul: "Kaderisasi",
    konten:
      "<h2>Sistem Kaderisasi GMNI</h2>" +
      "<p>Kaderisasi adalah urat nadi keberlanjutan perjuangan. Jenjang pendidikan kader di GMNI dijalankan berurutan:</p>" +
      "<ul><li><strong>PPAB</strong> — Pekan Penerimaan Anggota Baru. Tahap awal rekrutmen kader.</li><li><strong>KTD</strong> — Kaderisasi Tingkat Dasar. Indoktrinasi ideologi dasar.</li><li><strong>KTM</strong> — Kaderisasi Tingkat Menengah. Penguatan analisis &amp; kepemimpinan.</li><li><strong>KTP</strong> — Kaderisasi Tingkat Pelopor. Puncak kaderisasi ideologis &amp; taktis.</li></ul>" +
      "<p>Agenda dan liputan kegiatan kaderisasi akan ditayangkan di kanal ini.</p>",
  },
};


/** Bagian 2 dari fallback konten rapi untuk halaman publik (format HTML). */
export const FALLBACK_B: Record<string, { judul: string; konten: string }> = {
  tokoh: {
    judul: "Tokoh",
    konten:
      "<h2>Tokoh Nasional dari Kader GMNI</h2>" +
      "<p>Berikut tokoh nasional yang lahir dari kaderisasi GMNI, satu entri per tokoh:</p>" +
      "<ul><li>Megawati Soekarnoputri</li><li>Ganjar Pranowo</li><li>Djarot Saiful Hidayat</li><li>Taufiq Kiemas</li><li>Antasari Azhar</li><li>Arief Hidayat</li><li>Siswono Yudo Husodo</li></ul>" +
      "<p>Profil lengkap masing-masing tokoh akan dimutakhirkan oleh admin melalui /admin/halaman.</p>",
  },
  marhaenisme: {
    judul: "Marhaenisme",
    konten:
      "<h2>Pemahaman Marhaenisme</h2>" +
      "<p><strong>Marhaenisme</strong> adalah ideologi sosialis/Marxisme yang disesuaikan dengan kondisi dan budaya Indonesia, dicetuskan oleh Ir. Soekarno (1926–1927).</p>" +
      "<p><strong>Kaum Marhaen</strong> mencakup buruh (proletar), petani melarat, dan kaum miskin Indonesia lainnya yang memiliki alat produksi kecil namun tetap dieksploitasi oleh sistem kapitalisme dan imperialisme.</p>" +
      "<h2>Trisila Marhaenisme</h2>" +
      "<ul><li><strong>Sosio-Nasionalisme</strong> — Nasionalisme yang memihak rakyat kecil dan menempatkan persatuan di atas kepentingan golongan.</li><li><strong>Sosio-Demokrasi</strong> — Demokrasi politik sekaligus demokrasi ekonomi untuk kesejahteraan rakyat.</li><li><strong>Ketuhanan Yang Maha Esa</strong>.</li></ul>" +
      "<h2>Prinsip Perjuangan</h2>" +
      "<p>Anti-Imperialisme, Anti-Kapitalisme, dan Berdiri di Kaki Sendiri (Berdikari).</p>",
  },
};

/** Bagian 3 dari fallback konten rapi untuk halaman publik (format HTML). */
export const FALLBACK_C: Record<string, { judul: string; konten: string }> = {
  redaksi: {
    judul: "Redaksi",
    konten:
      "<h2>Struktur Redaksi</h2>" +
      "<p>Struktur kepengurusan periode berjalan diisi oleh admin melalui /admin/halaman.</p>",
  },
  "pedoman-media-siber": {
    judul: "Pedoman Media Siber",
    konten:
      "<h2>Pedoman Pemberitaan Media Siber</h2>" +
      "<p>info Marhaen berpedoman pada Pedoman Pemberitaan Media Siber dan Kode Etik Jurnalistik dari Dewan Pers.</p>" +
      "<p>Pedoman ini dijabarkan dalam prinsip keakuratan dan verifikasi, keberimbangan, kejelasan sumber, perlindungan narasumber rentan, pemisahan fakta dan opini, larangan prasangka SARA, serta mekanisme koreksi dan hak jawab. Naskah lengkap dikelola redaksi melalui /admin/halaman.</p>",
  },
  "hak-jawab": {
    judul: "Hak Jawab",
    konten:
      "<h2>Hak Jawab</h2>" +
      "<p>Setiap pihak yang merasa dirugikan oleh pemberitaan berhak mengajukan hak jawab sesuai peraturan perundang-undangan.</p>" +
      "<p>Formulir pengajuan hak jawab tersedia di bagian bawah halaman ini.</p>",
  },
};


/** Bagian 4 dari fallback konten rapi untuk halaman publik (format HTML). */
export const FALLBACK_D: Record<string, { judul: string; konten: string }> = {
  "kontak-pengaduan": {
    judul: "Kontak & Pengaduan",
    konten:
      "<h2>Kontak Redaksi</h2>" +
      "<p>Email dan WhatsApp redaksi diumumkan melalui kanal resmi info Marhaen.</p>" +
      "<p>Formulir pengaduan resmi tersedia di halaman ini; setiap laporan tercatat dan ditindaklanjuti redaksi.</p>",
  },
  "kebijakan-privasi": {
    judul: "Kebijakan Privasi",
    konten:
      "<h2>Kebijakan Privasi</h2>" +
      "<p>info Marhaen tunduk pada Undang-Undang Pelindungan Data Pribadi (UU PDP) No. 27 Tahun 2022.</p>" +
      "<ul><li><strong>Data yang dikumpulkan:</strong> nama, email, nomor WhatsApp, cookie, dan data aktivitas pembaca yang relevan.</li><li><strong>Tujuan penggunaan:</strong> pelaksanaan layanan, verifikasi kader, notifikasi, dan statistik redaksi.</li><li><strong>Hak pengguna:</strong> mengakses, memperbaiki, menghapus, dan menarik persetujuan atas data pribadi.</li></ul>",
  },
};

/**
 * Gabungan fallback (cerminan konten resmi `prisma/seed.ts`). Dipakai hanya
 * ketika baris DB belum ada (belum di-seed) agar halaman publik tidak
 * pernah 404. Data DB selalu menang jika sudah ada (via /admin/halaman).
 */
export const FALLBACK_HALAMAN: Record<string, { judul: string; konten: string }> = {
  ...FALLBACK_A,
  ...FALLBACK_B,
  ...FALLBACK_C,
  ...FALLBACK_D,
};

/**
 * Ambil konten halaman statis: data live dari DB dulu; jika baris belum
 * ada, pakai fallback kode agar halaman publik tetap tampil.
 */
export async function ambilHalaman(slug: string): Promise<HalamanData | null> {
  const h = await prisma.halamanStatis.findUnique({ where: { slug } });
  if (h) return { slug: h.slug, judul: h.judul, konten: h.konten };
  const fb = FALLBACK_HALAMAN[slug];
  if (fb) return { slug, judul: fb.judul, konten: fb.konten };
  return null;
}

/** Ringkasan deskripsi untuk metadata dari konten HTML sebuah halaman. */
export function deskripsiDariHalaman(h: { judul: string; konten: string }): string {
  const bersih = h.konten
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return bersih.slice(0, 160) || h.judul;
}

