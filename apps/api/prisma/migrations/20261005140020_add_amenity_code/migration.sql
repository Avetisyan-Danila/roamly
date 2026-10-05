/*
  Warnings:

  - A unique constraint covering the columns `[code]` on the table `Amenity` will be added. If there are existing duplicate values, this will fail.
  - Added the required column `code` to the `Amenity` table without a default value. This is not possible if the table is not empty.

*/
-- DropIndex
DROP INDEX "Amenity_name_key";

-- AlterTable
ALTER TABLE "Amenity" ADD COLUMN     "code" TEXT NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "Amenity_code_key" ON "Amenity"("code");
