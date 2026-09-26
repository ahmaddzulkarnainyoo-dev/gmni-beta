/**
 * ============================================================
 * info Marhaen — Seed Data Awal
 * Sumber kebenaran: blueprint.md Bagian 5 (RBAC), 7 (skema),
 * dan 12 (konten seed).
 *
 * CATATAN KONTEN:
 * Teks raw resmi GMNI/Marhaenisme (identitas & sejarah fusi, makna
 * lambang, pemahaman Marhaenisme & Trisila, sistem kaderisasi
 * PPAB–KTP, dan tokoh kader nasional) sudah disuntikkan ke halaman
 * tentang, kaderisasi, tokoh, dan marhaenisme. Halaman Redaksi &
 * legal (Pedoman Media Siber, Hak Jawab, Kontak, Kebijakan Privasi)
 * tetap menunggu input admin/pemilik proyek (blueprint 12).
 *
 * Seed ini IDEMPOTEN — aman dijalankan berulang (upsert).
 * ============================================================
 */
import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

// ============================================================
// PERMISSION — granularitas izin (blueprint 5.3)
// ============================================================
const PERMISSIONS: Array<{ kode: string; deskripsi: string }> = [
  { kode: "artikel.buat", deskripsi: "Membuat artikel baru" },
  { kode: "artikel.submit", deskripsi: "Mengajukan artikel ke redaksi" },
  { kode: "artikel.edit_milik_sendiri", deskripsi: "Mengedit artikel milik sendiri" },
  { kode: "artikel.edit_semua", deskripsi: "Mengedit semua artikel" },
  { kode: "artikel.publish", deskripsi: "Menerbitkan artikel" },
  { kode: "artikel.hapus", deskripsi: "Menghapus artikel" },
  { kode: "artikel.jadwalkan", deskripsi: "Menjadwalkan tayang artikel" },
  { kode: "komentar.moderasi", deskripsi: "Memoderasi komentar" },
  { kode: "komentar.buat", deskripsi: "Menulis komentar" },
  { kode: "pesan.kirim", deskripsi: "Mengirim pesan langsung (DM)" },
  { kode: "profil.edit_sendiri", deskripsi: "Mengedit profil sendiri" },
  { kode: "pengguna.undang", deskripsi: "Mengundang kader baru" },
  { kode: "pengguna.suspend", deskripsi: "Menangguhkan akun kader" },
  { kode: "role.kelola", deskripsi: "Membuat/mengubah peran & hak akses" },
  { kode: "halaman_statis.edit", deskripsi: "Mengedit halaman statis" },
  { kode: "leaderboard.override", deskripsi: "Mengatur pemenang Penulis Terbaik" },
  { kode: "laporan.tinjau", deskripsi: "Meninjau laporan penyalahgunaan" },
  { kode: "audit_log.lihat", deskripsi: "Melihat jejak audit" },
  { kode: "monetisasi.kelola", deskripsi: "Mengelola slot iklan & donasi" },
  {
    kode: "wilayah.kelola_kanal_daerah",
    deskripsi: "Mengelola kanal daerah/DPC (disiapkan untuk fase future)",
  },
];

// ============================================================
// ROLE bawaan sistem (blueprint 5.2) — isSystemDefault: tidak bisa dihapus
// ============================================================
const KODE_SUPER_ADMIN = PERMISSIONS.map((p) => p.kode);
const KODE_EDITOR = [
  "artikel.buat",
  "artikel.submit",
  "artikel.edit_milik_sendiri",
  "artikel.edit_semua",
  "artikel.publish",
  "artikel.hapus",
  "artikel.jadwalkan",
  "komentar.moderasi",
  "komentar.buat",
  "pesan.kirim",
  "profil.edit_sendiri",
  "halaman_statis.edit",
  "leaderboard.override",
  "laporan.tinjau",
  "audit_log.lihat",
  "monetisasi.kelola",
];
const KODE_KONTRIBUTOR = [
  "artikel.buat",
  "artikel.submit",
  "artikel.edit_milik_sendiri",
  "komentar.buat",
  "pesan.kirim",
  "profil.edit_sendiri",
];

const ROLES: Array<{
  nama: string;
  deskripsi: string;
  permissions: string[];
}> = [
  {
    nama: "Super Admin",
    deskripsi:
      "Akun pertama sistem, akses penuh mutlak — termasuk membuat/mengubah role lain.",
    permissions: KODE_SUPER_ADMIN,
  },
  {
    nama: "Editor",
    deskripsi:
      "Redaksi: review, edit, publish, tolak artikel; moderasi komentar; kelola halaman statis.",
    permissions: KODE_EDITOR,
  },
  {
    nama: "Kontributor",
    deskripsi: "Role default akun kader baru: menulis & submit artikel, DM, komentar, edit profil.",
    permissions: KODE_KONTRIBUTOR,
  },
];

// ============================================================
// KATEGORI — sesuai sitemap Bagian 4 (incl. kategori tetap Marhaenisme)
// ============================================================
const KATEGORI: Array<{
  nama: string;
  slug: string;
  deskripsi: string;
  isTetap?: boolean;
}> = [
  { nama: "Politik", slug: "politik", deskripsi: "Pergulatan kekuasaan, kebijakan, dan nasib rakyat kecil." },
  { nama: "Ekonomi", slug: "ekonomi", deskripsi: "Ekonomi kerakyatan versus kapitalisme dan ketergantungan." },
  { nama: "Hukum", slug: "hukum", deskripsi: "Penegakan hukum, keadilan sosial, dan perlindungan Marhaen." },
  { nama: "Pendidikan", slug: "pendidikan", deskripsi: "Kebijakan pendidikan, kampus, dan masa depan anak rakyat." },
  { nama: "Lingkungan", slug: "lingkungan", deskripsi: "Perlawanan atas perampasan sumber daya alam." },
  { nama: "Daerah", slug: "daerah", deskripsi: "Suara Marhaen dari wilayah: DPC, kader, dan dinamika lokal." },
  { nama: "Nasional", slug: "nasional", deskripsi: "Arus utama politik nasional dalam kacamata kerakyatan." },
  { nama: "Opini", slug: "opini", deskripsi: "Esai, analisis, dan sikap kader atas keadaan zaman." },
  {
    nama: "Marhaenisme",
    slug: "marhaenisme",
    isTetap: true,
    deskripsi:
      "Rubrik wajib: pemahaman Marhaenisme, Trisila, dan pemikiran Bung Karno. Artikel di sini disematkan di atas kanal lain.",
  },
];

// ============================================================
// TAG — untuk Fase 1 (halaman /tag/[slug])
// ============================================================
const TAG = [
  { nama: "Marhaenisme", slug: "marhaenisme" },
  { nama: "Trisila", slug: "trisila" },
  { nama: "Bung Karno", slug: "bung-karno" },
  { nama: "Kaderisasi", slug: "kaderisasi" },
  { nama: "PPAB", slug: "ppab" },
  { nama: "KTD", slug: "ktd" },
  { nama: "KTM", slug: "ktm" },
  { nama: "KTP", slug: "ktp" },
  { nama: "Ekonomi Kerakyatan", slug: "ekonomi-kerakyatan" },
  { nama: "Lingkungan", slug: "lingkungan" },
];

// ============================================================
// HALAMAN STATIS — konten no-code, editable admin (/admin/halaman).
// KONTEN RESMI -- teks raw GMNI/Marhaenisme sudah disuntikkan (blueprint 12).
// ============================================================
const HALAMAN: Array<{ slug: string; judul: string; konten: string }> = [
  {
    slug: "tentang",
    judul: "Tentang GMNI",
    konten: `
<h2>Identitas</h2>
<p><strong>Gerakan Mahasiswa Nasional Indonesia (GMNI)</strong> adalah organisasi kemahasiswaan ekstrakampus yang lahir sebagai manifestasi perjuangan rakyat kecil menuju Indonesia yang berdaulat, adil, dan makmur.</p>
<ul>
  <li><strong>Nama Resmi:</strong> Gerakan Mahasiswa Nasional Indonesia (GMNI)</li>
  <li><strong>Tanggal Kelahiran:</strong> 23 Maret 1954 (Kongres I di Surabaya)</li>
  <li><strong>Azas:</strong> Marhaenisme (ajaran Bung Karno)</li>
  <li><strong>Status:</strong> Organisasi kemahasiswaan ekstrakampus</li>
</ul>
<h2>Sejarah Kelahiran &amp; Fusi</h2>
<p>GMNI lahir dari fusi 3 organisasi mahasiswa Marhaenis pada <strong>September 1953</strong> di rumah dinas Walikota Jakarta Raya (Soediro), Jalan Taman Suropati:</p>
<table>
  <thead>
    <tr><th>Organisasi</th><th>Basis</th><th>Delegasi</th></tr>
  </thead>
  <tbody>
    <tr><td>Gerakan Mahasiswa Demokrat Indonesia (GMDI)</td><td>Jakarta</td><td>S.M. Hadiprabowo, Djawadi Hadipradoko, Sulomo</td></tr>
    <tr><td>Gerakan Mahasiswa Merdeka</td><td>Surabaya</td><td>Slamet Djajawidjaja, Slamet Rahardjo, Heruman</td></tr>
    <tr><td>Gerakan Mahasiswa Marhaenis</td><td>Yogyakarta</td><td>Wahyu Widodo, Subagio Masrukin, Sri Sumantri M.</td></tr>
  </tbody>
</table>
<p>Proses fusi tersebut kemudian dipuncaki melalui <strong>Kongres I</strong> yang digelar di <strong>Surabaya pada 23 Maret 1954</strong> — tanggal ini ditetapkan sebagai tanggal kelahiran resmi GMNI.</p>
<h2>Makna Lambang</h2>
<p>Setiap elemen lambang GMNI lahir dari makna perjuangan, bukan sekadar hiasan:</p>
<ul>
  <li><strong>Merah</strong> — Keberanian militan dalam perlawanan.</li>
  <li><strong>Putih</strong> — Kesucian arah perjuangan.</li>
  <li><strong>Hitam</strong> — Keteguhan tekad kader.</li>
  <li><strong>Bintang</strong> — Ketinggian cita-cita kerakyatan.</li>
  <li><strong>Banteng</strong> — Simbol rakyat Marhaen yang dibela oleh GMNI.</li>
  <li><strong>Tiga Sudut</strong> — Perwujudan Trisila Marhaenisme.</li>
</ul>
`,
  },
  {
    slug: "kaderisasi",
    judul: "Kaderisasi",
    konten: `
<h2>Sistem Kaderisasi GMNI</h2>
<p>Kaderisasi adalah urat nadi keberlanjutan perjuangan. Jenjang pendidikan kader di GMNI dijalankan berurutan:</p>
<ul>
  <li><strong>PPAB</strong> — Pekan Penerimaan Anggota Baru. Tahap awal rekrutmen kader.</li>
  <li><strong>KTD</strong> — Kaderisasi Tingkat Dasar. Indoktrinasi ideologi dasar.</li>
  <li><strong>KTM</strong> — Kaderisasi Tingkat Menengah. Penguatan analisis &amp; kepemimpinan.</li>
  <li><strong>KTP</strong> — Kaderisasi Tingkat Pelopor. Puncak kaderisasi ideologis &amp; taktis.</li>
</ul>
<p>Agenda dan liputan kegiatan kaderisasi akan ditayangkan di kanal ini.</p>
`,
  },
  {
    slug: "tokoh",
    judul: "Tokoh",
    konten: `
<h2>Tokoh Nasional dari Kader GMNI</h2>
<p>Berikut tokoh nasional yang lahir dari kaderisasi GMNI, satu entri per tokoh:</p>
<ul>
  <li>Megawati Soekarnoputri</li>
  <li>Ganjar Pranowo</li>
  <li>Djarot Saiful Hidayat</li>
  <li>Taufiq Kiemas</li>
  <li>Antasari Azhar</li>
  <li>Arief Hidayat</li>
  <li>Siswono Yudo Husodo</li>
</ul>
<p>Profil lengkap masing-masing tokoh akan dimutakhirkan oleh admin melalui /admin/halaman.</p>
`,
  },
  {
    slug: "marhaenisme",
    judul: "Marhaenisme",
    konten: `
<h2>Pemahaman Marhaenisme</h2>
<p><strong>Marhaenisme</strong> adalah ideologi sosialis/Marxisme yang disesuaikan dengan kondisi dan budaya Indonesia, dicetuskan oleh Ir. Soekarno (1926–1927).</p>
<p><strong>Asal nama:</strong> terinspirasi dari Mang Aen (Marhaen), seorang petani kecil di Bandung Selatan yang memiliki alat produksi sendiri (lahan &amp; cangkul), tetapi hasilnya hanya cukup untuk makan sekeluarga karena himpitan sistem.</p>
<p><strong>Kaum Marhaen</strong> mencakup buruh (proletar), petani melarat, dan kaum miskin Indonesia lainnya yang memiliki alat produksi kecil namun tetap dieksploitasi oleh sistem kapitalisme dan imperialisme.</p>
<h2>Trisila Marhaenisme</h2>
<ul>
  <li><strong>Sosio-Nasionalisme</strong> — Nasionalisme yang memihak rakyat kecil dan menempatkan persatuan di atas kepentingan golongan.</li>
  <li><strong>Sosio-Demokrasi</strong> — Demokrasi politik sekaligus demokrasi ekonomi untuk kesejahteraan rakyat.</li>
  <li><strong>Ketuhanan Yang Maha Esa</strong>.</li>
</ul>
<h2>Prinsip Perjuangan</h2>
<p>Anti-Imperialisme, Anti-Kapitalisme, dan Berdiri di Kaki Sendiri (Berdikari).</p>
`,
  },
  {
    slug: "redaksi",
    judul: "Redaksi",
    konten: `
<h2>Struktur Redaksi</h2>
<p>Struktur kepengurusan periode berjalan diisi oleh admin melalui /admin/halaman.</p>
`,
  },
  {
    slug: "pedoman-media-siber",
    judul: "Pedoman Media Siber",
    konten: `
<h2>Pedoman Pemberitaan Media Siber</h2>
<p>Redaksi info Marhaen bekerja berlandaskan <strong>Pedoman Pemberitaan Media Siber (PPMS) Dewan Pers</strong> beserta perubahannya, serta <strong>Kode Etik Jurnalistik (KEJ)</strong>. Seluruh jurnalis, kontributor kader, dan redaktur wajib menaatinya.</p>
<h3>Prinsip Dasar</h3>
<ul>
<li><strong>Keakuratan &amp; verifikasi.</strong> Setiap informasi dicek silang ke minimal dua sumber independen; rumor dan tangkapan layar yang belum terverifikasi dilarang dimuat sebagai fakta.</li>
<li><strong>Keberimbangan.</strong> Pihak yang diberitakan, dikritik, atau disudutkan wajib diberi ruang tanggapan secara proporsional dalam pemberitaan yang sama.</li>
<li><strong>Kejelasan sumber.</strong> Identitas narasumber dicantumkan terang; penyamaran sumber hanya untuk keselamatan dan harus seizin pemimpin redaksi.</li>
<li><strong>Perlindungan narasumber rentan.</strong> Identitas anak, korban kekerasan seksual, dan saksi dalam ancaman wajib disamarkan; detail yang membahayakan keselamatan dilarang dipublikasikan.</li>
<li><strong>Pemisahan fakta dan opini.</strong> Berita menyajikan fakta terverifikasi; opini dan analisis ditandai jelas sebagai rubrik Opini.</li>
<li><strong>Tanpa prasangka SARA.</strong> Pemberitaan dilarang memuat ujaran kebencian, fitnah, hasutan, dan diskriminasi atas dasar suku, agama, ras, maupun antargolongan.</li>
<li><strong>Koreksi dan pencabutan.</strong> Kesalahan diakui terbuka melalui ralat, revisi berstempel waktu, atau pencabutan berita, serta hak jawab sesuai ketentuan yang berlaku.</li>
</ul>
<h3>Ralat, Revisi, dan Hak Jawab</h3>
<p>Pembaca yang menemukan kekeliruan dapat mengajukan koreksi melalui halaman Hak Jawab. Setiap ralat dimuat transparan dengan penanda waktu pembaruan, tanpa menghapus jejak versi sebelumnya kecuali bertentangan dengan putusan hukum yang berkekuatan tetap.</p>
`,
  },
  {
    slug: "hak-jawab",
    judul: "Hak Jawab",
    konten: `
<h2>Hak Jawab</h2>
<p>Setiap pihak yang merasa dirugikan oleh pemberitaan di info Marhaen berhak mengajukan hak jawab sesuai Peraturan Dewan Pers No. 10/Reg/SUM/XII/2006 dan peraturan perundang-undangan yang berlaku.</p>
<h3>Ketentuan Pengajuan</h3>
<ul>
<li>Pengajuan disampaikan maksimal <strong>14 (empat belas) hari</strong> sejak pemberitaan dimuat.</li>
<li>Sertakan identitas jelas: nama, kontak (email/WhatsApp), dan tautan atau judul pemberitaan yang dipersoalkan.</li>
<li>Uraikan dengan ringkas dan jelas bagian mana yang dianggap merugikan, disertai dasar/data pendukung.</li>
<li>Isi hak jawab tidak boleh mengandung unsur fitnah, hasutan, ujaran kebencian, atau pelanggaran hukum lain.</li>
</ul>
<h3>Alur Penanganan</h3>
<ul>
<li><strong>1. Pengajuan</strong> — isi formulir hak jawab di halaman ini; pengajuan tercatat otomatis dan masuk antrian redaksi.</li>
<li><strong>2. Tinjauan</strong> — redaksi memverifikasi identitas, objek berita, dan kelengkapan syarat.</li>
<li><strong>3. Jawaban</strong> — bila diterima, hak jawab dimuat penuh dan tidak diolah (dipersingkat, diberi judul, atau diedit redaksi) paling lambat <strong>2×24 jam</strong> sejak pengajuan; bila ditolak, disampaikan alasannya.</li>
</ul>
<h3>Formulir Pengajuan</h3>
<p>Gunakan formulir pengajuan hak jawab di bawah pada halaman ini. Untuk klarifikasi, koreksi, atau pengaduan lain, lihat halaman Kontak &amp; Pengaduan.</p>
`,
  },
  {
    slug: "kontak-pengaduan",
    judul: "Kontak & Pengaduan",
    konten: `
<h2>Kontak Redaksi</h2>
<p>Email dan WhatsApp redaksi diumumkan melalui kanal resmi info Marhaen. Untuk sementara, sampaikan keperluan redaksi melalui formulir di halaman ini.</p>
<h3>Form Pengaduan</h3>
<p>Formulir pengaduan resmi tersedia di bawah. Setiap laporan tercatat dan ditindaklanjuti redaksi sesuai urgensi: koreksi pemberitaan, pelanggaran kode etik, serta penyalahgunaan platform.</p>
`,
  },
  {
    slug: "kebijakan-privasi",
    judul: "Kebijakan Privasi",
    konten: `
<h2>Kebijakan Privasi</h2>
<p>info Marhaen tunduk pada <strong>Undang-Undang Pelindungan Data Pribadi (UU PDP) No. 27 Tahun 2022</strong> beserta peraturan pelaksananya.</p>
<ul>
<li><strong>Data yang dikumpulkan:</strong> nama, email, nomor WhatsApp, cookie, dan data aktivitas pembaca yang relevan untuk penyelenggaraan layanan.</li>
<li><strong>Tujuan penggunaan:</strong> pelaksanaan layanan, verifikasi kader, notifikasi, dan statistik redaksi. Data tidak diperjualbelikan.</li>
<li><strong>Hak pengguna:</strong> mengakses, memperbaiki, menghapus, menarik persetujuan, dan mengajukan keberatan atas pemrosesan data pribadi melalui kontak redaksi.</li>
<li><strong>Keamanan dan retensi:</strong> data dilindungi kontrol akses berlapis dan disimpan hanya selama diperlukan, lalu dihapus atau dianonimkan.</li>
<li><strong>Cookie:</strong> situs memakai cookie fungsional dan analitik agregat; pembaca dapat mengaturnya melalui peramban masing-masing.</li>
</ul>
<p>Pertanyaan atau pengaduan terkait data pribadi dapat disampaikan melalui halaman Kontak dan Pengaduan; redaksi menindaklanjutinya sesuai peraturan perundang-undangan.</p>
<ul>
  <li><strong>Data yang dikumpulkan:</strong> nama, email, nomor WhatsApp, cookie, dan data aktivitas pembaca yang relevan.</li>
  <li><strong>Tujuan penggunaan:</strong> pelaksanaan layanan, verifikasi kader, notifikasi, dan statistik redaksi.</li>
  <li><strong>Hak pengguna:</strong> mengakses, memperbaiki, menghapus, dan menarik persetujuan atas data pribadi.</li>
</ul>
`,
  },
];

// Profil tokoh Marhaenis (Fase 3) — redaksi dapat menambah via /admin/tokoh.
const TOKOH = [
  {
    slug: "ir-soekarno",
    nama: "Ir. Soekarno",
    julukan: "Bung Karno · Penggali Marhaenisme",
    lahir: 1901,
    wafat: 1970,
    urutan: 1,
    kutipan: "Berdirilah di atas kaki sendiri!",
    biografi:
      "Presiden Pertama Republik Indonesia. Pada 1933 menggali paham Marhaenisme dari kisah Pak Marhaen, petani miskin Sukabumi yang memiliki sedikit sawah, kambing, dan kerajinan — namun berdiri di atas kaki sendiri. Marhaenisme menempatkan Marhaen sebagai proletaris sekaligus pendiri kekuatan bangsa, melampaui paham proletaris Eropa.",
  },
  {
    slug: "sutjipto-marhaen",
    nama: "Sutjipto Marhaen",
    julukan: "Penulis Marhaenisme 2000",
    lahir: 1909,
    wafat: 1987,
    urutan: 2,
    kutipan: null,
    biografi:
      "Pejuang Marhaenisme yang dalam bukunya \"Marhaenisme 2000\" (Pasardha, 1984) menyempurnakan gagasan Pak Marhaen — berdiri di atas kaki sendiri menuju masyarakat adil dan makmur tanpa eksploitasi. Meraih gelar doktor dari Universitas Indonesia pada usia 73 tahun; gelar \"Marhaen\" dianugerahkan langsung oleh Ir. Soekarno.",
  },
];

// ============================================================
// SEED UTAMA — idempoten (upsert)
// ============================================================

async function seedPermissions() {
  for (const p of PERMISSIONS) {
    await prisma.permission.upsert({
      where: { kode: p.kode },
      update: { deskripsi: p.deskripsi },
      create: p,
    });
  }
  console.log(`✓ Permission: ${PERMISSIONS.length} ter-upsert.`);
}

async function seedRoles() {
  for (const r of ROLES) {
    const role = await prisma.role.upsert({
      where: { nama: r.nama },
      update: { deskripsi: r.deskripsi, isSystemDefault: true },
      create: {
        nama: r.nama,
        deskripsi: r.deskripsi,
        isSystemDefault: true,
      },
    });

    // Sinkronisasi pivot Role ↔ Permission untuk role bawaan.
    await prisma.rolePermission.deleteMany({ where: { roleId: role.id } });
    for (const kode of r.permissions) {
      const perm = await prisma.permission.findUnique({ where: { kode } });
      if (!perm) {
        console.warn(`  ⚠ Permission "${kode}" tidak ditemukan (role ${r.nama}).`);
        continue;
      }
      await prisma.rolePermission.create({
        data: { roleId: role.id, permissionId: perm.id },
      });
    }
  }
  console.log(`✓ Role: ${ROLES.length} role bawaan ter-upsert.`);
}

async function seedKategori() {
  for (const k of KATEGORI) {
    await prisma.kategori.upsert({
      where: { slug: k.slug },
      update: { nama: k.nama, deskripsi: k.deskripsi, isTetap: k.isTetap ?? false },
      create: { ...k, isTetap: k.isTetap ?? false },
    });
  }
  console.log(`✓ Kategori: ${KATEGORI.length} ter-upsert (incl. Marhaenisme).`);
}

async function seedTag() {
  for (const t of TAG) {
    await prisma.tag.upsert({
      where: { slug: t.slug },
      update: { nama: t.nama },
      create: t,
    });
  }
  console.log(`✓ Tag: ${TAG.length} ter-upsert.`);
}

async function seedHalaman() {
  for (const h of HALAMAN) {
    await prisma.halamanStatis.upsert({
      where: { slug: h.slug },
      update: { judul: h.judul, konten: h.konten },
      create: h,
    });
  }
  console.log(`✓ HalamanStatis: ${HALAMAN.length} ter-upsert.`);
}

/** Profil tokoh Marhaenis untuk halaman publik /tokoh (Fase 3). */
async function seedTokoh() {
  for (const t of TOKOH) {
    await prisma.tokoh.upsert({
      where: { slug: t.slug },
      update: {
        nama: t.nama,
        julukan: t.julukan,
        lahir: t.lahir,
        wafat: t.wafat,
        urutan: t.urutan,
        kutipan: t.kutipan,
        biografi: t.biografi,
        status: "AKTIF",
      },
      create: { ...t, status: "AKTIF" },
    });
  }
  console.log(`✓ Tokoh: ${TOKOH.length} profil Marhaenis ter-upsert.`);
}

/** Super Admin pertama — dari env (blueprint 13.3: keputusan open).
 *
 * BOOTSTRAP PRODUKSI (self-healing, idempoten):
 * - Email default "admin@marhaen.com" bila SEED_ADMIN_EMAIL kosong — email
 *   ini adalah pintu masuk admin yang selalu diuji sehingga tidak boleh
 *   "tidak ditemukan" di produksi.
 * - SEED_ADMIN_PASSWORD wajib diisi — bila kosong, seed di-skip dengan
 *   peringatan (warn-and-skip; tanpa sandi default insecure) agar admin
 *   eksplisit menyetelnya di environment produksi.
 * - Setelah upsert, dicek "punya >= 1 Super Admin AKTIF?" — bila 0, maka
 *   akun legacy admin@marhaen.com di-REAKTIVASI (bukan disuspend) agar
 *   produksi tidak pernah kehabisan pintu masuk admin.
 */
async function seedSuperAdmin() {
  const EMAIL_DEFAULT_ADMIN = "admin@marhaen.com";
  const nama = process.env.SEED_ADMIN_NAMA ?? "Redaksi GMNI";
  const username = process.env.SEED_ADMIN_USERNAME ?? "superadmin";
  const email = process.env.SEED_ADMIN_EMAIL ?? EMAIL_DEFAULT_ADMIN;
  const password = process.env.SEED_ADMIN_PASSWORD;

  if (!password) {
    console.warn(
      "  ⚠ SEED_ADMIN_PASSWORD belum diisi di .env — akun Super Admin dilewati. " +
        "Isi kredensial admin produksi lalu jalankan ulang `npm run db:seed`.",
    );
    return;
  }

  const role = await prisma.role.findUnique({ where: { nama: "Super Admin" } });
  if (!role) throw new Error("Role Super Admin belum ada saat seed user.");

  // Migrasi Fase 2: akun seed lama admin@marhaen.com — jaga agar tidak
  // menimbulkan konflik username dengan akun seed baru, TAPI tanpa
  // menyingkirkan satu-satunya admin aktif dari produksi.
  const LEGACY_SEED_EMAIL = "admin@marhaen.com";
  if (email !== LEGACY_SEED_EMAIL) {
    const legacy = await prisma.user.findUnique({
      where: { email: LEGACY_SEED_EMAIL },
    });
    if (legacy && legacy.username === username) {
      const usernameLegacy = `${username}.legacy`;
      await prisma.user.update({
        where: { id: legacy.id },
        data: { username: usernameLegacy },
      });
      console.log(
        `  ⚠ Username "${username}" dipindahkan ke "${usernameLegacy}" agar dipakai akun seed baru.`,
      );
    }
  }

  const passwordHash = await hash(password, 12);

  const user = await prisma.user.upsert({
    where: { email },
    update: {
      namaLengkap: nama,
      username,
      passwordHash,
      roleId: role.id,
      statusAkun: "AKTIF",
    },
    create: {
      namaLengkap: nama,
      username,
      email,
      passwordHash,
      roleId: role.id,
      statusAkun: "AKTIF",
    },
  });

  // Self-healing: pastikan produksi tidak kehabisan admin aktif. Bila
  // akun target di atas somehow bukan satu-satunya admin aktif dan legacy
  // justru masih SUSPEND, reaktivasi legacy sebagai pintu darurat.
  if (email !== LEGACY_SEED_EMAIL) {
    const legacy = await prisma.user.findUnique({
      where: { email: LEGACY_SEED_EMAIL },
    });
    const jumlahAdminAktif = await prisma.user.count({
      where: { roleId: role.id, statusAkun: "AKTIF" },
    });
    if (legacy && legacy.statusAkun !== "AKTIF" && jumlahAdminAktif === 0) {
      await prisma.user.update({
        where: { id: legacy.id },
        data: { statusAkun: "AKTIF", roleId: role.id, passwordHash },
      });
      console.log(
        `  ⚠ Tidak ada Super Admin AKTIF — akun darurat ${LEGACY_SEED_EMAIL} di-REACTIVASI dengan sandi SEED_ADMIN_PASSWORD.`,
      );
    }
  }

  console.log(`✓ Super Admin "${user.email}" siap (role: Super Admin).`);
  console.log("  ⚠ Ganti sandi bawaan sebelum produksi!");
}

async function main() {
  console.log("── Seed info Marhaen dimulai ──");
  await seedPermissions();
  await seedRoles();
  await seedKategori();
  await seedTag();
  await seedHalaman();
  await seedTokoh();
  await seedSuperAdmin();
  console.log("── Seed selesai. Pastikan tidak ada pesan ⚠ yang tidak diharapkan ──");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });