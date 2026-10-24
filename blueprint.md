# BLUEPRINT PROYEK: PORTAL BERITA & KOMUNITAS KADER GMNI

**Status dokumen:** Final v1.0
**Tipe dokumen:** Blueprint teknis & produk — ditujukan untuk dibaca oleh AI (developer agent) maupun manusia (developer, admin GMNI, kader) yang akan membangun, meneruskan, atau memelihara proyek ini.
**Cara membaca dokumen ini:** Baca berurutan dari atas ke bawah. Setiap bagian saling bergantung. Jangan mulai coding sebelum memahami Bagian 1–4 (Visi, Peran, Alur Editorial, Arsitektur Informasi).

---

## DAFTAR ISI

1. Ringkasan Eksekutif & Visi Produk
2. Identitas & Branding
3. Filosofi Desain Visual
4. Arsitektur Informasi (Sitemap)
5. Peran & Hak Akses (RBAC)
6. Alur Editorial (Content Workflow)
7. Skema Data (Entitas & Field)
8. Spesifikasi Modul Fitur
9. Keamanan & Privasi
10. Tech Stack & Infrastruktur
11. Rencana Fase Pembangunan (Roadmap)
12. Konten Seed Awal
13. Lampiran

---

## 1. RINGKASAN EKSEKUTIF & VISI PRODUK

### 1.1 Apa ini?
Sebuah **portal berita digital milik Gerakan Mahasiswa Nasional Indonesia (GMNI)**, dengan sikap editorial sebagai **oposisi kritis terhadap kebijakan pemerintah**, ditulis oleh kader GMNI terverifikasi, dikurasi oleh redaksi (admin), dan dibungkus dengan **lapisan komunitas sosial internal** (profil, pesan langsung, gamifikasi) agar kader termotivasi aktif menulis dan berdiskusi.

### 1.2 Bukan sekadar situs berita
Proyek ini terdiri dari **tiga sistem yang menyatu**:
1. **News CMS** — mesin redaksi: submit, review, edit, publish artikel.
2. **Social Layer** — jaringan sosial tertutup untuk kader: profil, direct message, pencarian pengguna.
3. **Gamification Engine** — leaderboard mingguan, lencana pencapaian, "streak" aktivitas — dirancang untuk memicu candu positif (engagement) di kalangan kader muda.

### 1.3 Prinsip yang tidak boleh dilanggar siapa pun yang mengerjakan proyek ini
- **Anonimitas itu janji, bukan fitur kosmetik.** Begitu admin menandai sebuah tulisan sebagai anonim/disamarkan, sistem WAJIB memastikan tidak ada jalur (link, pencarian, leaderboard, log publik) yang bisa mengarah balik ke identitas penulis asli.
- **Admin harus bisa mengelola organisasi tanpa developer.** Semua hal yang sifatnya akan berubah dari waktu ke waktu (struktur pengurus, role, hak akses, konten halaman "Tentang") HARUS bisa diubah lewat dashboard admin — bukan lewat kode.
- **Desain tidak boleh generic/"AI slop".** Setiap elemen visual harus bisa ditelusuri akarnya ke identitas GMNI (lihat Bagian 3). Jika sebuah komponen terlihat seperti template SaaS generik, itu salah.
- **Ini situs oposisi politik** — artinya risiko serangan siber, tekanan hukum, dan kebutuhan perlindungan narasumber/penulis lebih tinggi dari situs berita kampus biasa. Keamanan bukan "nice to have", tapi prasyarat sejak hari pertama.

---

## 2. IDENTITAS & BRANDING

### 2.1 Rekomendasi nama situs
Karena nama diserahkan ke tim pembangun, berikut rekomendasi (final decision tetap di tangan GMNI):

| Nama | Alasan | Domain disarankan |
|---|---|---|
| **info Marhaen** *(rekomendasi utama)* | Langsung merujuk ke Marhaenisme, mudah diingat, terasa seperti media (mirip "Suara Merdeka", "Suara Pembaruan") | `infomarhaen.id` |
| Marhaen Pos | Format "nama + Pos" umum dipakai media, terasa jurnalistik | `marhaenpos.id` |
| Api Marhaen | Lebih militan, cocok dengan nada oposisi/perlawanan | `apimarhaen.id` |
| Garis Marhaen | Menyiratkan "garis perjuangan/haluan", cocok untuk rubrik opini/ideologi | `garismarhaen.id` |

Dokumen ini selanjutnya menyebut proyek sebagai **"Suara Marhaen"** sebagai placeholder nama — ganti secara global (find & replace) begitu nama final dipilih.

### 2.2 Domain & Hosting
- **Hosting:** Vercel (sesuai preferensi tim pembangun — cocok untuk stack Next.js, auto-scaling, CDN global bawaan).
- **Domain:** belum dibeli. Rekomendasi: daftarkan salah satu opsi `.id` di atas via registrar lokal (PANDI-terverifikasi, mis. Niagahoster/Rumahweb/Domainesia) agar terpercaya di mata pembaca Indonesia. Aktifkan proteksi WHOIS privacy jika tersedia (mengingat sensitivitas konten oposisi).
- **DNS & proteksi tambahan:** taruh **Cloudflare** di depan Vercel (mode proxy, bukan cuma DNS) untuk lapisan WAF, rate-limiting, dan mitigasi DDoS ekstra — lihat Bagian 9.

### 2.3 Aset yang sudah tersedia
- `logo.jpg` — logo resmi GMNI, akan diletakkan di folder root aset (`/public/brand/logo.jpg`). Perlu diturunkan jadi: favicon (multi-resolusi), logo versi putih (untuk latar gelap), dan versi ikon saja (untuk avatar default/watermark).

---

## 3. FILOSOFI DESAIN VISUAL

Desain **wajib diturunkan dari makna lambang GMNI**, bukan dipilih berdasarkan tren desain umum. Setiap keputusan warna/bentuk harus bisa dijawab: "ini mewakili elemen lambang yang mana?"

| Elemen Lambang | Makna Asli | Penerapan di UI |
|---|---|---|
| **Merah** | Keberanian militan | Warna aksen utama: tombol aksi (submit, publish), highlight breaking news, indikator status "aktif/live" |
| **Putih** | Kesucian arah perjuangan | Latar dasar (background) — dominan putih/off-white, bukan gelap, kesan bersih & lugas seperti media cetak |
| **Hitam** | Keteguhan tekad kader | Warna teks utama, header, footer — tegas dan mudah dibaca (kontras tinggi, aksesibilitas) |
| **Bintang** | Cita-cita kerakyatan | Dipakai sebagai ikon pencapaian/badge di profil kader (bukan sekadar dekorasi acak) |
| **Banteng** | Rakyat Marhaen yang dibela | Jadi motif watermark halus di halaman kategori "Marhaenisme", atau maskot ikon di halaman 404/kosong |
| **Tiga sudut (Trisila)** | Sosio-nasionalisme, Sosio-demokrasi, Ketuhanan | Bisa jadi motif garis/divider geometris berulang di section break, bukan literal digambar tiga sudut |

### 3.1 Aturan Anti-"AI Slop"
- **Jangan** pakai gradient ungu-biru generik ala startup SaaS.
- **Jangan** pakai font default sistem tanpa pertimbangan (Arial/generic sans) — pilih pasangan tipografi yang terasa "pers/jurnalistik": misal serif tegas untuk judul artikel (kesan otoritatif, seperti media cetak nasional), sans-serif untuk UI/body text.
- **Jangan** bikin ikon generik "flat illustration orang-orang abstrak" yang dipakai semua situs.
- **Harus** ada elemen yang jelas-jelas cuma masuk akal untuk GMNI: warna merah-putih-hitam yang konsisten, motif bintang/banteng, tone tulisan (headline) yang tegas & agitatif — bukan halus/soft seperti media lifestyle.
- Rujuk `/mnt/skills/public/frontend-design/SKILL.md` (atau setara di lingkungan pembangunan) untuk detail token desain saat implementasi.

### 3.2 Nada Tulisan (Tone of Voice)
Berdasarkan data ideologis yang diberikan (anti-imperialisme, anti-kapitalisme, berpihak ke rakyat kecil, Trisila): nada situs harus **lugas, berani, berpihak** — bukan "netral-datar" ala media mainstream. Ini memengaruhi microcopy (contoh: tombol bukan "Kirim" tapi bisa "Terbitkan Suara", pesan error tetap informatif tapi tidak kaku).

---

## 4. ARSITEKTUR INFORMASI (SITEMAP)

```
/ (Beranda)
├── /berita
│   ├── /berita/politik
│   ├── /berita/ekonomi
│   ├── /berita/hukum
│   ├── /berita/pendidikan
│   ├── /berita/lingkungan
│   ├── /berita/daerah
│   └── /berita/nasional
├── /marhaenisme                  ← kategori khusus (wajib ada)
├── /opini
├── /kaderisasi                   ← agenda & liputan internal organisasi (PPAB, KTD, KTM, KTP)
├── /tokoh                        ← profil tokoh/alumni kader
├── /tentang                      ← profil GMNI, sejarah, editable admin, seed dari data awal
├── /redaksi                      ← struktur redaksi & susunan pengurus (editable admin)
├── /pedoman-media-siber          ← legal
├── /hak-jawab                    ← legal (form pengajuan hak jawab)
├── /kontak-pengaduan             ← legal + form pengaduan
├── /kebijakan-privasi            ← legal (UU PDP)
├── /artikel/[slug]               ← halaman artikel individual
├── /kategori/[slug]
├── /tag/[slug]
├── /cari?q=                      ← pencarian situs
├── /leaderboard                  ← papan peringkat mingguan (publik, read-only utk non-kader)
│
├── /login
├── /daftar                       ← form pendaftaran kader; token undangan opsional
├── /lupa-password
│
├── /profil/[username]            ← profil publik kader (terlihat oleh semua, DM hanya sesama kader)
│
├── /dasbor (khusus kader login)
│   ├── /dasbor/tulis              ← editor artikel baru
│   ├── /dasbor/tulisan-saya       ← status semua submission (draft/review/revisi/terbit/ditolak)
│   ├── /dasbor/pesan               ← inbox DM
│   ├── /dasbor/notifikasi
│   ├── /dasbor/pencapaian          ← badge & histori leaderboard pribadi
│   ├── /dasbor/kas                 ← pengajuan iuran mingguan & status pembayaran pribadi
│   └── /dasbor/pengaturan          ← termasuk toggle "sembunyikan profil dari pencarian/DM"
│
└── /admin (khusus admin/role dgn izin)
    ├── /admin/redaksi              ← antrian review artikel masuk
    ├── /admin/artikel               ← kelola semua artikel (edit, jadwalkan, arsipkan, hapus)
    ├── /admin/pengguna              ← kelola akun kader, invite baru, suspend
    ├── /admin/peran                 ← RBAC: buat/edit role & hak akses tanpa kode
    ├── /admin/komentar               ← moderasi komentar
    ├── /admin/laporan                ← laporan penyalahgunaan DM/komentar
    ├── /admin/audit-log              ← jejak semua perubahan
    ├── /admin/leaderboard            ← atur/override pemenang "Penulis Terbaik"
    ├── /admin/halaman                ← edit konten halaman statis (Tentang, Redaksi, dll — no-code)
    ├── /admin/tampilan               ← pengaturan tema/branding dasar
    ├── /admin/iklan-donasi           ← kelola slot iklan/donasi
    ├── /admin/kas                   ← rekap, verifikasi, input tunai & ekspor iuran kader
    └── /admin/pengaturan             ← konfigurasi umum situs
```

### 4.1 Alur Registrasi & Login
- Tombol **Daftar** membuka form pendaftaran standar. Form yang sama tetap tersedia bila pengguna datang melalui tautan undangan yang tidak valid atau sudah dipakai; undangan yang valid dapat mengisi konteks pengundang.
- Pendaftaran terbuka membuat akun berstatus **PENDING** sampai diverifikasi Admin Redaksi. Tautan undangan valid tetap didukung sesuai mekanisme yang berlaku.
- Admin dan kader memakai **satu halaman dan satu mekanisme login**. Setelah autentikasi berhasil, tujuan diarahkan berdasarkan role/permission (admin ke `/admin`, kader ke `/dasbor`); tidak ada jalur login admin terpisah.
- Perubahan selama implementasi yang menyentuh alur ini harus terlebih dahulu dicatat di blueprint agar dokumen tetap menjadi sumber kebenaran.

---

## 5. PERAN & HAK AKSES (RBAC)

### 5.1 Prinsip
Sistem role **tidak boleh hardcoded**. Dibangun sebagai:
- **Role** = kumpulan **Permission** (izin granular).
- Admin (Super Admin) bisa membuat Role baru, mengganti nama, menghapus, dan mencentang/menghapus Permission dari UI dashboard `/admin/peran` — tanpa developer.

### 5.2 Role bawaan sistem (default, tidak bisa dihapus, hanya bisa diduplikasi jadi role baru)

| Role | Deskripsi | Permission Kunci |
|---|---|---|
| **Super Admin** | Akun pertama sistem, akses penuh mutlak | Semua permission, termasuk membuat/mengubah role lain |
| **Editor/Redaksi** | Bisa direview & diturunkan haknya dari Super Admin | Review, edit, publish, tolak artikel; moderasi komentar |
| **Kontributor (Kader)** | Role default akun kader baru | Tulis & submit artikel; kirim DM; komentar; edit profil sendiri |
| **Pembaca Terdaftar** *(opsional, jika nanti dibuka)* | Akun non-kader | Hanya baca, komentar (dengan verifikasi), tidak bisa menulis/DM |

### 5.3 Struktur Permission (contoh granularitas)
`artikel.buat`, `artikel.edit_milik_sendiri`, `artikel.edit_semua`, `artikel.publish`, `artikel.hapus`, `artikel.jadwalkan`, `komentar.moderasi`, `pengguna.undang`, `pengguna.suspend`, `role.kelola`, `halaman_statis.edit`, `leaderboard.override`, `laporan.tinjau`, `audit_log.lihat`, `kas.kelola` *(mengelola, memverifikasi, mencatat pembayaran tunai, dan mengekspor rekap iuran kas)*, `wilayah.kelola_kanal_daerah` *(disiapkan untuk Fase future: DPC/kanal daerah)*.

Permission `kas.kelola` diberikan kepada Super Admin dan dapat diberikan melalui `/admin/peran` kepada Editor atau role khusus **Bendahara**. Akses ke `/admin/kas`, setiap endpoint terkait, dan item navigasi wajib mengikuti permission ini, bukan hanya nama role.

### 5.4 Ekspansi ke depan (arsitektur harus mendukung, walau belum diaktifkan di Fase 1)
Struktur data role & permission dirancang **multi-tenant siap pakai** agar nanti bisa dibuat konsep **"kanal daerah" (DPC)** dengan admin lokal per cabang, tanpa migrasi database besar-besaran — cukup aktifkan fitur & buat role baru lewat UI yang sudah ada.

---

## 6. ALUR EDITORIAL (CONTENT WORKFLOW)

### 6.1 Status artikel (state machine)
```
DRAFT → DIAJUKAN (submitted) → SEDANG_DITINJAU (in review)
  → [DIMINTA_REVISI → DRAFT (loop balik ke penulis)]
  → DISETUJUI → TERBIT (published)
  → DITOLAK (rejected, dengan catatan alasan wajib diisi admin)
  → DIARSIPKAN (archived, artikel lama disembunyikan tanpa dihapus)
```

### 6.2 Aturan penting
- Kader **tidak bisa** langsung publish sendiri — semua wajib lewat redaksi (Editor/Admin).
- Saat admin mengedit tulisan kader, sistem **wajib mencatat audit log**: siapa, kapan, apa yang diubah (lihat Bagian 9.2).
- Penjadwalan (`artikel.jadwalkan`) memungkinkan artikel disetujui tapi tayang otomatis di waktu tertentu.
- Setiap perubahan status memicu **notifikasi ke penulis** lewat kombinasi: email + WhatsApp + notifikasi dashboard (in-app).
- Field **visibilitas nama penulis** per artikel, dikontrol admin, dengan 3 opsi:
  1. **Nama asli** — tampil & tertaut ke `/profil/[username]`.
  2. **Nama samaran/redaksi** — admin isi nama tampilan manual (misal "Kontributor Investigasi"), **TIDAK** tertaut ke profil manapun, tidak bisa diklik.
  3. **Atas nama Redaksi** — byline generik "Redaksi Suara Marhaen", tanpa individu.
- Jika opsi 2 dipilih: artikel tersebut **otomatis dikecualikan** dari seluruh sistem gamifikasi/leaderboard (lihat Bagian 8.4), dan penulis asli mendapat opsi tambahan untuk **menyembunyikan profil pribadinya** dari pencarian & DM selama periode sensitif (toggle manual di `/dasbor/pengaturan`, independen dari status artikel).

---

## 7. SKEMA DATA (ENTITAS & FIELD)

Ini adalah rancangan model data konseptual — acuan untuk membuat skema database (lihat Bagian 10 untuk pilihan teknologi).

### 7.1 `User`
```
id, nama_lengkap, username (unik), email, nomor_wa (terverifikasi OTP),
password_hash, foto_profil, bio (long text), daerah_asal/DPC,
role_id (FK → Role), status_akun (aktif/suspend),
profil_tersembunyi (boolean, default false),
diundang_oleh (FK → User, admin yang invite), token_undangan,
tanggal_bergabung, terakhir_aktif
```

### 7.2 `Role` & `Permission`
```
Role: id, nama, deskripsi, dibuat_oleh (FK → User), is_system_default (boolean)
Permission: id, kode (mis. "artikel.publish"), deskripsi
RolePermission: role_id, permission_id  (tabel pivot many-to-many)
```

### 7.3 `Artikel`
```
id, judul, slug, konten (rich text/HTML), ringkasan, gambar_utama,
kategori_id (FK), tag[] (many-to-many),
penulis_id (FK → User), status, visibilitas_penulis (asli/samaran/redaksi),
nama_tampilan_kustom (jika samaran),
dikecualikan_dari_leaderboard (boolean, auto-true jika samaran),
disetujui_oleh (FK → User admin), catatan_revisi,
jumlah_dilihat, jumlah_dibagikan, jumlah_komentar,
tanggal_dibuat, tanggal_diajukan, tanggal_terbit, tanggal_dijadwalkan
```

### 7.4 `Kategori` & `Tag`
```
Kategori: id, nama, slug, deskripsi   (termasuk kategori tetap "Marhaenisme")
Tag: id, nama, slug
```

### 7.5 `Komentar`
```
id, artikel_id (FK), user_id/nama_tamu, isi, status (tayang/disembunyikan/dihapus),
terverifikasi_via (recaptcha/otp), dilaporkan (boolean), tanggal
```

### 7.6 `PesanLangsung (DM)`
```
Percakapan: id, peserta[] (2× FK → User)
Pesan: id, percakapan_id, pengirim_id, isi, dibaca (boolean), tanggal
Laporan: id, pesan_id/percakapan_id, pelapor_id, alasan, status_tinjau, ditinjau_oleh
```

### 7.7 `Leaderboard` & `Pencapaian`
```
LeaderboardMingguan: id, minggu_mulai, minggu_selesai, kategori
  (penulis_terbaik/penulis_terajin/pembaca_teraktif/paling_aktif_diskusi/paling_banyak_share),
  user_id (FK), nilai/skor, dipilih_manual_oleh (FK admin, khusus kategori "penulis_terbaik")

Pencapaian (Badge): id, user_id, jenis_badge, minggu_periode, tanggal_diperoleh
  (disimpan permanen sebagai "trophy case" di profil, walau leaderboard mingguan sudah reset)

StreakDM: id, user_id_a, user_id_b, jumlah_hari_beruntun, terakhir_interaksi
```

### 7.8 `AuditLog`
```
id, aktor_id (FK → User/admin), aksi, entitas_terdampak (tipe + id),
data_sebelum (snapshot), data_sesudah (snapshot), alamat_ip, tanggal
```

### 7.9 `HalamanStatis` (untuk konten no-code)
```
id, slug (mis. "tentang", "redaksi", "pedoman-media-siber"),
judul, konten (rich text, editable admin), terakhir_diubah_oleh, tanggal
```

### 7.10 `LangganNewsletter`
```
id, email, status (aktif/berhenti), tanggal_daftar
```

### 7.11 `SlotIklanDonasi`
```
id, posisi (header/sidebar/inline-artikel/footer), tipe (iklan/donasi),
gambar/kode_embed, tautan_tujuan, aktif (boolean), tanggal_mulai, tanggal_selesai
```

### 7.12 `KonfigurasiIuranKas`
```
id (singleton), nominal_per_minggu (Rupiah), diubah_oleh (FK → User),
tanggal_diperbarui
```
Nominal berlaku sebagai acuan untuk pengajuan baru. Nilai nominal yang sudah ditetapkan pada minggu/pengajuan lama harus tetap tersimpan sebagai snapshot agar perubahan tarif tidak mengubah histori pembayaran.

### 7.13 `IuranKas`, `PembayaranKas` & `BuktiKas`
```
IuranKas: id, kader_id (FK → User), minggu_mulai (Senin WIB),
  nominal (snapshot Rupiah), status (BELUM_BAYAR/MENUNGGU_VERIFIKASI/LUNAS),
  tanggal_lunas, UNIQUE(kader_id, minggu_mulai)

PembayaranKas: id, kader_id (FK → User), tanggal_bayar, jumlah_minggu,
  total_nominal, metode (TRANSFER/TUNAI), catatan,
  status_verifikasi (MENUNGGU_VERIFIKASI/DISETUJUI/DITOLAK),
  diverifikasi_oleh (FK opsional → User), diverifikasi_at, alasan_penolakan,
  dibuat_at

AlokasiIuranKas: pembayaran_id (FK → PembayaranKas),
  iuran_kas_id (FK → IuranKas), nominal (snapshot), UNIQUE(pembayaran_id, iuran_kas_id)
Relasi many-to-many mempertahankan riwayat beberapa pengajuan (termasuk
yang ditolak) untuk minggu yang sama.

BuktiKas: id, pembayaran_id (FK → PembayaranKas), storage_key (path privat),
  nama_file, tipe_konten, ukuran_byte, diunggah_at
```
Satu pengajuan dapat mengalokasikan pembayaran untuk minggu berjalan dan sejumlah minggu ke depan tanpa batas maksimum jumlah minggu. Setiap minggu kader hanya boleh memiliki satu alokasi aktif yang menunggu verifikasi atau sudah lunas; validasi harus atomik untuk mencegah pengajuan bersamaan yang menggandakan minggu. Pembayaran yang ditolak tetap tersimpan sebagai riwayat, tetapi alokasi minggu dibuka kembali untuk pengajuan baru. `BELUM_BAYAR` dan `MENUNGGAK` dapat dibedakan pada tampilan setelah tenggat minggu berlalu; usulan default tenggat adalah akhir minggu berjalan dalam zona WIB, dan minggu mendatang yang belum dibayar bukan tunggakan. Bukti disimpan privat dan hanya dapat diakses oleh kader pemilik serta petugas yang berhak.

---

## 8. SPESIFIKASI MODUL FITUR

### 8.1 Sistem Redaksi (CMS)
- Editor artikel **WYSIWYG/rich text** dengan dukungan: gambar, embed video (YouTube), kutipan, heading, bold/italic, link.
- Draft otomatis tersimpan (autosave) saat kader menulis.
- Dashboard admin `/admin/redaksi`: daftar antrian artikel masuk, filter berdasarkan status/kategori/penulis, aksi cepat (setujui/tolak/minta revisi) langsung dari daftar.
- Penjadwalan tayang (`tanggal_dijadwalkan`) dengan cron job otomatis untuk publish tepat waktu.

### 8.2 SEO (agar tulisan muncul di Google)
- **Meta tag dinamis** per artikel: title, description, Open Graph image, Twitter Card.
- **Structured data (Schema.org `NewsArticle`)** disematkan otomatis di setiap halaman artikel.
- `sitemap.xml` dan `robots.txt` digenerate otomatis (update tiap ada artikel baru).
- URL slug bersih & deskriptif (`/artikel/kritik-kebijakan-tambang-pesisir`, bukan `/artikel/id123`).
- Kecepatan loading tinggi (Next.js SSR/ISR + image optimization otomatis) — Google memberi skor lebih baik untuk situs cepat.
- Integrasi **Google Search Console** & **Google Analytics 4** sejak hari pertama peluncuran.
- Artikel lama tetap dapat diakses (tidak 404) — pakai status "diarsipkan", bukan dihapus permanen, demi menjaga backlink & SEO historis.
- RSS feed (`/rss.xml`) untuk distribusi otomatis.

### 8.3 Komentar
- Terbuka untuk publik, tapi setiap komentator (baik kader login maupun pengunjung) wajib lewat **verifikasi anti-bot**: kombinasi Google reCAPTCHA v3 (invisible, tidak mengganggu UX) + opsi verifikasi nomor WA (OTP) untuk pengunjung yang belum pernah verifikasi di perangkat itu — tujuannya ganda: cegah spam bot **dan** dapat data kasar seberapa banyak pengguna nyata yang berinteraksi.
- Admin/Editor bisa: sembunyikan, hapus, atau tandai komentar sebagai "dilaporkan".
- Pengunjung bisa melaporkan komentar orang lain (tombol "Laporkan").

### 8.4 Gamifikasi & Leaderboard
- **Reset mingguan** (setiap Senin 00:00 WIB, via cron job).
- **5 kategori leaderboard:**
  1. **Penulis Terbaik** — 100% kurasi manual admin/redaksi (bukan algoritmik), dipilih dari artikel yang terbit minggu itu.
  2. **Penulis Terajin** — otomatis dari jumlah artikel yang **berhasil terbit** (bukan sekadar submit) minggu itu.
  3. **Pembaca Teraktif** — otomatis dari jumlah artikel unik yang dibaca (tracked via sesi login) minggu itu.
  4. **Paling Aktif Diskusi** — otomatis dari jumlah komentar yang ditulis (dan tidak dihapus/disembunyikan admin) minggu itu.
  5. **Paling Banyak Membagikan** — otomatis dari klik tombol share yang tercatat per user login minggu itu.
- **Pengecualian mutlak:** artikel dengan `visibilitas_penulis = samaran` **tidak dihitung** di kategori manapun — baik untuk views, share, maupun status "terbit" milik penulis tsb.
- **Badge/Trophy case**: setiap kali menang kategori, tersimpan permanen di `/dasbor/pencapaian` dan tampil di `/profil/[username]` (mis. lencana bertuliskan "Penulis Terajin — Minggu 12, 2026"), agar bisa "dipamerin" secara berkelanjutan, bukan cuma nongol seminggu lalu hilang.
- **Halaman publik `/leaderboard`**: bisa dilihat siapa saja (termasuk non-kader), read-only.

### 8.5 Profil & Direct Message (Social Layer)
- **Profil (`/profil/[username]`)**: foto, nama, bio lengkap, daerah/DPC asal, daftar artikel terbit (yang tidak disembunyikan), badge pencapaian, tombol "Kirim Pesan" (hanya aktif untuk sesama kader yang login).
- **Visibilitas**: profil terlihat oleh siapa saja (publik), TAPI tombol DM hanya berfungsi antar-kader (role Kontributor/Editor/Admin) yang sudah login. Pengunjung non-kader hanya bisa melihat, tidak bisa mengirim pesan.
- **Toggle privasi individu**: kader bisa menyembunyikan profilnya dari hasil pencarian & dari daftar kontak DM (berguna khusus untuk penulis konten sensitif), independen dari pengaturan visibilitas artikel.
- **DM real-time**: chat 1-on-1 antar kader, dengan indikator "dibaca"/read receipt.
- **Streak DM**: indikator visual (mis. ikon api, terinspirasi mekanisme "flame" TikTok/Snapchat) yang menyala selama dua kader saling membalas pesan dalam rentang waktu tertentu setiap hari; padam otomatis jika terputus.
- **Report & Block**: tiap pesan/percakapan bisa dilaporkan ke admin (`/admin/laporan`), dan pengguna bisa memblokir kontak tertentu secara mandiri.
- **Moderasi admin**: admin bisa meninjau laporan (bukan mengintip semua DM secara bebas) — akses ke isi pesan hanya dibuka saat ada laporan resmi yang perlu ditinjau, untuk menjaga ekspektasi privasi wajar.

### 8.6 Notifikasi
Kombinasi tiga kanal, dikirim bersamaan untuk event penting (status artikel, ada DM baru, menang leaderboard):
- **Email** (transactional email service)
- **WhatsApp** (via WhatsApp Business API/provider pihak ketiga)
- **In-app** (lonceng notifikasi di dashboard `/dasbor/notifikasi`)

### 8.7 Newsletter
- Form subscribe email di footer & akhir artikel.
- Kirim ringkasan mingguan/artikel terbaru otomatis (via email service terjadwal).
- Halaman unsubscribe wajib ada (kepatuhan anti-spam & UU PDP).

### 8.8 Halaman Legal & Redaksi
- **Pedoman Media Siber** — mengacu prinsip Pedoman Pemberitaan Media Siber (Dewan Pers) — penting untuk kredibilitas & perlindungan hukum, khususnya karena sikap editorial oposisi.
- **Hak Jawab** — form resmi bagi pihak yang merasa dirugikan pemberitaan untuk mengajukan klarifikasi/hak jawab.
- **Redaksi** — struktur susunan redaksi & pengurus, **konten editable oleh admin** via `/admin/halaman` (karena struktur organisasi berubah tiap periode).
- **Kontak/Pengaduan** — form pengaduan resmi + kontak email/WA redaksi.
- **Kebijakan Privasi** — kepatuhan UU PDP (Pelindungan Data Pribadi) No. 27/2022: jelaskan data apa yang dikumpulkan (nama, email, nomor WA, cookies), untuk apa, dan hak pengguna.

### 8.9 Cookies & Consent
- Cookie esensial (sesi login), analitik (GA4), preferensi, dan (nanti) iklan.
- **Cookie consent banner** wajib muncul di kunjungan pertama, sesuai kepatuhan UU PDP — pengguna bisa terima semua/hanya esensial.

### 8.10 Monetisasi (Iklan & Donasi)
- Slot iklan fleksibel: header banner, sidebar, native inline-artikel, footer — dikelola admin lewat `/admin/iklan-donasi` (upload gambar/kode embed, atur jadwal tayang) **tanpa developer**.
- Slot donasi: tombol/banner "Dukung Perjuangan Ini" dengan tautan ke platform donasi (mis. Kitabisa/transfer manual/QRIS) — bisa diaktifkan kapan saja lewat dashboard yang sama.
- Sistem **siap pakai** sejak awal (field database sudah ada), meski slot-nya belum harus terisi konten di hari peluncuran.

### 8.11 Iuran Kas Kader
- **Sifat iuran:** mingguan, tanpa batas jumlah minggu yang dapat dibayar sekaligus. Kader dapat membayar minggu berjalan atau mengalokasikan pembayaran ke beberapa minggu mendatang.
- **Nominal:** nominal per minggu dikelola melalui konfigurasi kas oleh petugas berpermission `kas.kelola`; nominal yang berlaku disalin ke catatan minggu/pengajuan sebagai snapshot. Total pengajuan dihitung dari jumlah minggu × nominal yang berlaku.
- **Dashboard kader `/dasbor/kas`:** tampilkan status per minggu dan riwayat pengajuan. Form mencakup jumlah minggu, tanggal pembayaran, nominal/total yang dihitung, unggah bukti transfer/foto, dan catatan opsional. Kader hanya dapat melihat pengajuan, bukti, dan alokasi miliknya.
- **Dashboard admin/bendahara `/admin/kas`:** tampilkan rekap per kader dalam matrix minggu kalender untuk tahun yang dipilih. Sediakan filter periode, kader, cabang/DPC, komisariat, dan status; tampilkan status yang dapat dibedakan secara visual maupun teks: lunas, menunggu verifikasi, belum bayar, menunggak untuk minggu yang telah lewat, serta minggu mendatang.
- **Verifikasi:** petugas dengan `kas.kelola` dapat meninjau bukti dan menyetujui atau menolak pengajuan. Penolakan wajib menyimpan alasan; minggu yang ditolak kembali tersedia untuk pengajuan, sementara riwayat dan bukti lama tetap tercatat. Persetujuan mengubah seluruh alokasi minggu terkait menjadi lunas secara atomik.
- **Pembayaran tunai:** Bendahara dapat mencatat pembayaran langsung dengan kader, minggu yang dibayar, nominal, tanggal, dan catatan; catatan harus menyimpan petugas pencatat dan tidak memerlukan unggah bukti transfer.
- **Ekspor:** ekspor rekap CSV untuk periode terpilih dengan status per minggu dan jumlah total. Lindungi sel spreadsheet dari formula injection dan batasi akses ekspor ke `kas.kelola`.
- **Keamanan & audit:** semua operasi memvalidasi sesi dan permission pada server. Bukti pembayaran disimpan di object storage privat; unduhan hanya melalui akses terotorisasi/signed URL yang terbatas. Pengajuan, perubahan status, alasan penolakan, input tunai, perubahan nominal, dan ekspor dicatat sesuai kebijakan audit.
- **Konfigurasi storage:** bucket `bukti-kas` (atau nama yang ditetapkan melalui `SUPABASE_KAS_BUCKET`) harus dibuat privat di Supabase Storage. Server memakai `SUPABASE_SERVICE_ROLE_KEY`; kunci ini tidak boleh diekspos ke client atau diberi prefix `NEXT_PUBLIC_`. Tautan bukti bersifat sementara dan hanya dibuat setelah pemeriksaan hak akses.
- **Status matrix:** `MENUNGGU_VERIFIKASI` dan `LUNAS` berasal dari status alokasi/pengajuan. `BELUM_BAYAR` dan `MENUNGGAK` ditentukan dari minggu dan tenggat yang ditetapkan; minggu mendatang tidak ditandai menunggak.

---

## 9. KEAMANAN & PRIVASI

### 9.1 Ancaman spesifik yang perlu diantisipasi
Karena posisi editorial situs ini adalah oposisi kritis terhadap pemerintah, risiko yang lebih tinggi dari situs berita biasa:
- **DDoS/serangan volumetrik** saat artikel kontroversial viral.
- **Upaya defacement/hack** untuk membungkam narasi.
- **Doxing** terhadap penulis investigatif via kebocoran data.
- **Serangan spam/bot** di kolom komentar untuk membanjiri diskusi (brigading).

### 9.2 Langkah mitigasi wajib
- **Cloudflare (proxy mode)** di depan Vercel: WAF (Web Application Firewall), rate limiting per-IP, mitigasi DDoS layer 3/4/7.
- **Rate limiting aplikasi**: batasi percobaan login, submit komentar, dan request API per user/IP dalam rentang waktu tertentu.
- **HTTPS/SSL wajib** di semua endpoint (otomatis via Vercel + Cloudflare).
- **Audit log menyeluruh** (lihat skema `AuditLog` di 7.8): setiap create/update/delete pada artikel, pengguna, role, dan halaman statis tercatat dengan snapshot sebelum-sesudah, aktor, dan waktu — untuk transparansi internal & forensik jika terjadi insiden.
- **Backup rutin otomatis** database (harian) dengan retensi minimal 30 hari, disimpan terpisah dari server utama.
- **Enkripsi data sensitif** (password di-hash dengan bcrypt/argon2; nomor WA & email disimpan dengan akses terbatas per-role).
- **Proteksi anonimitas berlapis** (lihat 6.2): artikel samaran tidak tertaut ke profil; profil bisa disembunyikan mandiri; keduanya independen satu sama lain sehingga kegagalan satu lapis tidak membongkar identitas.
- **2FA (autentikasi dua faktor)** direkomendasikan wajib untuk akun Admin & Editor (bukan opsional), mengingat level akses mereka.

---

## 10. TECH STACK & INFRASTRUKTUR

Dipilih berdasarkan: kecocokan dengan Vercel (preferensi hosting), kebutuhan SEO tinggi, kebutuhan real-time (DM/streak), dan supaya admin bisa kelola semuanya tanpa developer setelah serah terima.

| Layer | Pilihan | Alasan |
|---|---|---|
| **Framework** | Next.js (App Router, TypeScript) | SSR/ISR bawaan = SEO terbaik untuk situs berita; native di Vercel |
| **Styling** | Tailwind CSS | Cepat diimplementasi sesuai design token GMNI (Bagian 3), konsisten |
| **Database** | PostgreSQL (mis. via Neon/Vercel Postgres) | Relasional — cocok untuk data terstruktur (artikel, user, role, leaderboard) dengan relasi kompleks |
| **ORM** | Prisma | Skema jelas, migrasi aman, cocok untuk tim yang berganti developer di masa depan (dokumentasi skema otomatis) |
| **Autentikasi** | NextAuth/Auth.js + sistem invite token kustom | Login aman, mendukung role-based session |
| **Media Storage** | Vercel Blob / Cloudinary | Vercel serverless tidak punya filesystem persisten — gambar/media wajib di object storage terpisah |
| **Real-time (DM & Streak)** | Pusher / Ably / Supabase Realtime | Vercel serverless tidak cocok untuk koneksi WebSocket persisten — perlu layanan real-time terkelola |
| **Email transactional** | Resend / SendGrid | Untuk notifikasi & newsletter |
| **WhatsApp OTP/Notifikasi** | Provider WA Business API (mis. Fonnte/Twilio WhatsApp API) | Verifikasi komentar & notifikasi status tulisan |
| **Anti-bot** | Google reCAPTCHA v3 | Invisible, tidak ganggu UX pembaca |
| **CDN & WAF** | Cloudflare (di depan Vercel) | Keamanan tambahan (lihat Bagian 9) |
| **Analytics** | Google Analytics 4 + Google Search Console | Pantau trafik & performa SEO |
| **Error monitoring** | Sentry | Pantau bug produksi secara real-time |
| **Cron jobs** | Vercel Cron | Reset leaderboard mingguan, publish artikel terjadwal, kirim newsletter berkala |
| **Search internal** | PostgreSQL full-text search (tahap awal) → upgrade ke Algolia/Meilisearch jika traffic besar | Mulai sederhana, upgrade sesuai kebutuhan |

---

## 11. RENCANA FASE PEMBANGUNAN (ROADMAP)

> Catatan: proyek ini didokumentasikan penuh dari awal sampai akhir (sesuai permintaan), namun **build tetap disarankan berurutan per fase** demi menjaga stabilitas — setiap fase menghasilkan produk yang sudah bisa dipakai, bukan menunggu semuanya selesai baru bisa dipakai.

### **FASE 0 — Fondasi**
- Setup repo, Next.js + Tailwind + Prisma + database.
- Setup domain, hosting Vercel, Cloudflare.
- Implementasi design system dasar (Bagian 3): warna, tipografi, komponen dasar (tombol, kartu, navigasi) memakai `logo.jpg`.
- Skema database inti: `User`, `Role`, `Permission`, `Artikel`, `Kategori`, `HalamanStatis`.

### **FASE 1 — MVP Portal Berita**
- Sistem invite & registrasi kader.
- Editor artikel + alur redaksi lengkap (draft → review → publish, termasuk revisi & penolakan).
- Kategori (termasuk Marhaenisme), tag, halaman kategori.
- Halaman statis: Tentang, Redaksi, Pedoman Media Siber, Hak Jawab, Kontak/Pengaduan, Kebijakan Privasi (semua editable admin).
- Konten seed dari data GMNI/Marhaenisme (Bagian 12).
- SEO dasar (meta tag, sitemap, schema.org, GA4, Search Console).
- Cookie consent.
- RBAC dasar (Super Admin, Editor, Kontributor) + panel `/admin/peran`.
- Audit log dasar.
- Keamanan dasar: rate limiting, Cloudflare WAF, backup otomatis, HTTPS.
- **Output Fase 1: situs berita fungsional penuh, siap tayang publik dengan alur redaksi lengkap.**

### **FASE 2 — Komunitas & Interaksi**
- Kolom komentar (+ reCAPTCHA/OTP WA, moderasi admin).
- Newsletter & sistem notifikasi (email + WA + in-app).
- Toggle visibilitas nama penulis (asli/samaran/redaksi) + toggle sembunyikan profil.
- Profil publik kader (`/profil/[username]`) dengan bio lengkap.

### **FASE 3 — Jaringan Sosial & Gamifikasi**
- Direct Message antar-kader (real-time) + streak.
- Report & block + panel `/admin/laporan`.
- Leaderboard mingguan (5 kategori) + sistem badge/trophy case permanen.
- Pengecualian otomatis artikel samaran dari sistem skor.

### **FASE 4 — Monetisasi & Penyempurnaan**
- Slot iklan & donasi (`/admin/iklan-donasi`).
- 2FA untuk Admin/Editor.
- Optimasi performa lanjutan, search upgrade jika diperlukan.
- Persiapan ekspansi "kanal daerah/DPC" (jika organisasi memutuskan lanjut ke sana).

### **FASE 5 — Operasional Organisasi: Iuran Kas Kader**
- Konfigurasi nominal iuran mingguan dan skema data pembayaran/alokasi/bukti.
- Pengajuan pembayaran mingguan dan multi-minggu ke depan oleh kader, termasuk unggah bukti privat.
- Verifikasi pembayaran, penolakan dengan alasan, pencatatan pembayaran tunai, dan audit oleh role yang memiliki `kas.kelola`.
- Matrix rekap tahunan serta ekspor CSV per periode untuk Admin/Bendahara.
- **Output Fase 5:** alur kas mingguan dapat ditelusuri dari pengajuan sampai verifikasi dan rekap.

---

## 12. KONTEN SEED AWAL

Data yang diberikan di awal percakapan (identitas GMNI, sejarah fusi, Marhaenisme, makna lambang, sistem kaderisasi, tokoh nasional) **digunakan langsung sebagai konten default**, bukan hanya referensi gaya. Pemetaannya:

| Data Sumber | Ditaruh di Halaman | Status |
|---|---|---|
| Identitas dasar, tujuan, azas | `/tentang` | Seed awal, **editable admin** via `/admin/halaman` |
| Sejarah kelahiran & fusi (tabel 3 organisasi) | `/tentang` (section sejarah) | Seed awal, editable |
| Pemahaman Marhaenisme, Trisila | `/marhaenisme` (halaman kategori, dijadikan artikel "pinned"/tetap di atas) | Seed awal, editable |
| Makna lambang | `/tentang` (section identitas visual) — juga jadi rujukan desain (Bagian 3) | Seed awal, editable |
| Sistem kaderisasi (PPAB–KTD–KTM–KTP) | `/kaderisasi` | Seed awal, editable |
| Tokoh nasional kader | `/tokoh` | Seed awal per tokoh (satu entri per nama), editable/nambah admin |
| Struktur kepengurusan **saat ini** | `/redaksi` | **TIDAK di-hardcode** — kosong di seed awal, wajib diisi manual oleh admin karena struktur berubah tiap periode kepengurusan |

---

## 13. LAMPIRAN

### 13.1 Istilah Kunci
- **Kader** — anggota GMNI terverifikasi, satu-satunya pihak yang bisa menulis, DM, dan punya profil.
- **Redaksi/Editor** — role yang mengurasi tulisan kader sebelum tayang.
- **Marhaen** — istilah representasi rakyat kecil pemilik alat produksi sendiri namun tetap miskin secara struktural (lihat data awal proyek untuk penjelasan lengkap).
- **DPC** — Dewan Pimpinan Cabang, struktur organisasi daerah GMNI (relevan untuk ekspansi Fase future).

### 13.2 Hal yang sudah diputuskan dan tidak perlu didiskusikan ulang
Semua keputusan di Bagian 1–12 dokumen ini adalah hasil klarifikasi bertahap dan **final** — siapa pun (AI atau manusia) yang melanjutkan proyek ini boleh langsung eksekusi tanpa bertanya ulang ke pemilik proyek, KECUALI menemukan kontradiksi teknis nyata saat implementasi (bukan preferensi selera).

### 13.3 Hal yang masih terbuka untuk diputuskan pemilik proyek (di luar cakupan blueprint ini)
- Nama final situs (dari rekomendasi Bagian 2.1, atau nama lain).
- Registrar & pembelian domain aktual.
- Siapa yang jadi Super Admin pertama & daftar awal kader yang diundang.
- Konten aktual halaman "Redaksi" (struktur kepengurusan tahun berjalan).

---

*Dokumen ini adalah sumber kebenaran tunggal (single source of truth) untuk proyek Suara Marhaen. Update dokumen ini setiap kali ada keputusan baru yang mengubah scope.*