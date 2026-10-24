CREATE TYPE "StatusIuranKas" AS ENUM ('BELUM_BAYAR', 'MENUNGGU_VERIFIKASI', 'LUNAS');
CREATE TYPE "StatusVerifikasiKas" AS ENUM ('MENUNGGU_VERIFIKASI', 'DISETUJUI', 'DITOLAK');
CREATE TYPE "MetodePembayaranKas" AS ENUM ('TRANSFER', 'TUNAI');

CREATE TABLE "KonfigurasiIuranKas" (
    "id" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    "berlakuMulai" DATE NOT NULL,
    "dibuatOlehId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "KonfigurasiIuranKas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "IuranKas" (
    "id" TEXT NOT NULL,
    "kaderId" TEXT NOT NULL,
    "mingguMulai" DATE NOT NULL,
    "nominal" INTEGER NOT NULL,
    "status" "StatusIuranKas" NOT NULL DEFAULT 'BELUM_BAYAR',
    "tanggalLunas" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "IuranKas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "PembayaranKas" (
    "id" TEXT NOT NULL,
    "kaderId" TEXT NOT NULL,
    "dicatatOlehId" TEXT NOT NULL,
    "tanggalBayar" TIMESTAMP(3) NOT NULL,
    "jumlahMinggu" INTEGER NOT NULL,
    "totalNominal" INTEGER NOT NULL,
    "metode" "MetodePembayaranKas" NOT NULL,
    "catatan" TEXT,
    "status" "StatusVerifikasiKas" NOT NULL DEFAULT 'MENUNGGU_VERIFIKASI',
    "diverifikasiOlehId" TEXT,
    "diverifikasiAt" TIMESTAMP(3),
    "alasanPenolakan" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "PembayaranKas_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "AlokasiIuranKas" (
    "pembayaranId" TEXT NOT NULL,
    "iuranKasId" TEXT NOT NULL,
    "nominal" INTEGER NOT NULL,
    CONSTRAINT "AlokasiIuranKas_pkey" PRIMARY KEY ("pembayaranId", "iuranKasId")
);

CREATE TABLE "BuktiKas" (
    "id" TEXT NOT NULL,
    "pembayaranId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "namaFile" TEXT NOT NULL,
    "tipeKonten" TEXT NOT NULL,
    "ukuranByte" INTEGER NOT NULL,
    "diunggahAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BuktiKas_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "KonfigurasiIuranKas_berlakuMulai_key" ON "KonfigurasiIuranKas"("berlakuMulai");
CREATE UNIQUE INDEX "IuranKas_kaderId_mingguMulai_key" ON "IuranKas"("kaderId", "mingguMulai");
CREATE INDEX "IuranKas_mingguMulai_status_idx" ON "IuranKas"("mingguMulai", "status");
CREATE INDEX "IuranKas_kaderId_status_idx" ON "IuranKas"("kaderId", "status");
CREATE INDEX "PembayaranKas_status_createdAt_idx" ON "PembayaranKas"("status", "createdAt");
CREATE INDEX "PembayaranKas_kaderId_createdAt_idx" ON "PembayaranKas"("kaderId", "createdAt");
CREATE INDEX "AlokasiIuranKas_iuranKasId_idx" ON "AlokasiIuranKas"("iuranKasId");
CREATE UNIQUE INDEX "BuktiKas_pembayaranId_key" ON "BuktiKas"("pembayaranId");
CREATE UNIQUE INDEX "BuktiKas_storageKey_key" ON "BuktiKas"("storageKey");

ALTER TABLE "KonfigurasiIuranKas"
    ADD CONSTRAINT "KonfigurasiIuranKas_dibuatOlehId_fkey"
    FOREIGN KEY ("dibuatOlehId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "IuranKas"
    ADD CONSTRAINT "IuranKas_kaderId_fkey"
    FOREIGN KEY ("kaderId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "PembayaranKas"
    ADD CONSTRAINT "PembayaranKas_kaderId_fkey"
    FOREIGN KEY ("kaderId") REFERENCES "User"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "PembayaranKas"
    ADD CONSTRAINT "PembayaranKas_dicatatOlehId_fkey"
    FOREIGN KEY ("dicatatOlehId") REFERENCES "User"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "PembayaranKas"
    ADD CONSTRAINT "PembayaranKas_diverifikasiOlehId_fkey"
    FOREIGN KEY ("diverifikasiOlehId") REFERENCES "User"("id")
    ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "AlokasiIuranKas"
    ADD CONSTRAINT "AlokasiIuranKas_pembayaranId_fkey"
    FOREIGN KEY ("pembayaranId") REFERENCES "PembayaranKas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AlokasiIuranKas"
    ADD CONSTRAINT "AlokasiIuranKas_iuranKasId_fkey"
    FOREIGN KEY ("iuranKasId") REFERENCES "IuranKas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "BuktiKas"
    ADD CONSTRAINT "BuktiKas_pembayaranId_fkey"
    FOREIGN KEY ("pembayaranId") REFERENCES "PembayaranKas"("id")
    ON DELETE CASCADE ON UPDATE CASCADE;
