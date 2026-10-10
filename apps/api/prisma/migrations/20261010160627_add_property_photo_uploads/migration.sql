-- CreateTable
CREATE TABLE "PropertyPhotoUpload" (
    "id" TEXT NOT NULL,
    "propertyId" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "contentType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PropertyPhotoUpload_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "PropertyPhotoUpload_storageKey_key" ON "PropertyPhotoUpload"("storageKey");

-- CreateIndex
CREATE INDEX "PropertyPhotoUpload_propertyId_expiresAt_idx" ON "PropertyPhotoUpload"("propertyId", "expiresAt");

-- AddForeignKey
ALTER TABLE "PropertyPhotoUpload" ADD CONSTRAINT "PropertyPhotoUpload_propertyId_fkey" FOREIGN KEY ("propertyId") REFERENCES "Property"("id") ON DELETE CASCADE ON UPDATE CASCADE;
