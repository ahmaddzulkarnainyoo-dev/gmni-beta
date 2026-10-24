-- CreateTable
CREATE TABLE "KonfigurasiKas" (
    "id" TEXT NOT NULL DEFAULT 'utama',
    "bankNama" TEXT NOT NULL,
    "rekeningNomor" TEXT NOT NULL,
    "atasNama" TEXT NOT NULL,
    "qrisUrl" TEXT,
    "diubahOlehId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "KonfigurasiKas_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "KonfigurasiKas" ADD CONSTRAINT "KonfigurasiKas_diubahOlehId_fkey"
    FOREIGN KEY ("diubahOlehId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
