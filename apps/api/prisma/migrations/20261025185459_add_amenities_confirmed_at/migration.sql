-- AlterTable
ALTER TABLE "Property" ADD COLUMN     "amenitiesConfirmedAt" TIMESTAMP(3);

-- Published properties and drafts with amenities already answered the amenities step
UPDATE "Property" AS p
SET "amenitiesConfirmedAt" = p."updatedAt"
WHERE p."status" = 'PUBLISHED'
   OR EXISTS (
     SELECT 1 FROM "_AmenityToProperty" AS ap WHERE ap."B" = p."id"
   );
