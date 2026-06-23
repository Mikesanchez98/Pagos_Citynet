-- AlterTable Servicio: add columns with defaults for existing rows
ALTER TABLE "Servicio"
ADD COLUMN "mikrotikUser" TEXT,
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "requiereReconexion" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- Remove updatedAt default (Prisma manages this at app level)
ALTER TABLE "Servicio" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- CreateIndex
CREATE UNIQUE INDEX IF NOT EXISTS "Servicio_mikrotikUser_key" ON "Servicio"("mikrotikUser");

-- AlterTable Factura: add servicioId as nullable first, then constrain
ALTER TABLE "Factura"
ADD COLUMN "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN "servicioId" INTEGER;

-- Remove updatedAt default
ALTER TABLE "Factura" ALTER COLUMN "updatedAt" DROP DEFAULT;

-- If existing Factura rows lack servicioId, point them to the first Servicio (no-op if table is empty)
UPDATE "Factura" SET "servicioId" = (SELECT id FROM "Servicio" LIMIT 1) WHERE "servicioId" IS NULL;

-- Now make servicioId NOT NULL
ALTER TABLE "Factura" ALTER COLUMN "servicioId" SET NOT NULL;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
