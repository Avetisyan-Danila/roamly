-- CreateTable
CREATE TABLE "StorageDeletionTask" (
    "id" TEXT NOT NULL,
    "storageKey" TEXT NOT NULL,
    "availableAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "StorageDeletionTask_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "StorageDeletionTask_storageKey_key" ON "StorageDeletionTask"("storageKey");

-- CreateIndex
CREATE INDEX "StorageDeletionTask_availableAt_idx" ON "StorageDeletionTask"("availableAt");
