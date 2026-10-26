ALTER TABLE "PembayaranKas"
ADD COLUMN "kodeAnonim" TEXT;

UPDATE "PembayaranKas"
SET "kodeAnonim" = upper(substr(md5(random()::text || clock_timestamp()::text), 1, 12))
WHERE "kodeAnonim" IS NULL;

ALTER TABLE "PembayaranKas"
ALTER COLUMN "kodeAnonim" SET NOT NULL;

CREATE UNIQUE INDEX "PembayaranKas_kodeAnonim_key"
ON "PembayaranKas"("kodeAnonim");
