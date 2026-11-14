-- CreateTable
CREATE TABLE "Bookmark" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "artikelId" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Bookmark_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Bookmark_userId_artikelId_key" ON "Bookmark"("userId", "artikelId");
CREATE INDEX "Bookmark_userId_createdAt_idx" ON "Bookmark"("userId", "createdAt");
CREATE INDEX "Bookmark_artikelId_idx" ON "Bookmark"("artikelId");

-- AddForeignKey
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Bookmark" ADD CONSTRAINT "Bookmark_artikelId_fkey" FOREIGN KEY ("artikelId") REFERENCES "Artikel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
