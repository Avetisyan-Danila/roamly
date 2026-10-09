-- CreateEnum
CREATE TYPE "PropertyStatus" AS ENUM ('DRAFT', 'PUBLISHED');

-- DropIndex
DROP INDEX "Property_ownerId_idx";

-- AlterTable
ALTER TABLE "Property"
ADD COLUMN "status" "PropertyStatus" NOT NULL DEFAULT 'DRAFT',
ALTER COLUMN "title" DROP NOT NULL,
ALTER COLUMN "description" DROP NOT NULL,
ALTER COLUMN "country" DROP NOT NULL,
ALTER COLUMN "city" DROP NOT NULL,
ALTER COLUMN "address" DROP NOT NULL,
ALTER COLUMN "latitude" DROP NOT NULL,
ALTER COLUMN "longitude" DROP NOT NULL,
ALTER COLUMN "pricePerNight" DROP NOT NULL,
ALTER COLUMN "maxGuests" DROP NOT NULL,
ALTER COLUMN "bedrooms" DROP NOT NULL,
ALTER COLUMN "beds" DROP NOT NULL,
ALTER COLUMN "bathrooms" DROP NOT NULL,
ALTER COLUMN "currency" DROP NOT NULL;

-- Preserve existing properties as published
UPDATE "Property"
SET "status" = 'PUBLISHED'
WHERE "status" = 'DRAFT';

-- CreateIndex
CREATE INDEX "Property_ownerId_status_idx"
ON "Property"("ownerId", "status");