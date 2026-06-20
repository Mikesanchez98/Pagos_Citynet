/*
  Warnings:

  - You are about to drop the column `servicioId` on the `Factura` table. All the data in the column will be lost.
  - You are about to alter the column `monto` on the `Factura` table. The data in that column could be lost. The data in that column will be cast from `Decimal(10,2)` to `DoublePrecision`.
  - You are about to drop the column `plan` on the `Servicio` table. All the data in the column will be lost.
  - You are about to drop the column `precio` on the `Servicio` table. All the data in the column will be lost.
  - Added the required column `clienteId` to the `Factura` table without a default value. This is not possible if the table is not empty.
  - Added the required column `paqueteId` to the `Servicio` table without a default value. This is not possible if the table is not empty.

*/
-- DropForeignKey
ALTER TABLE "Factura" DROP CONSTRAINT "Factura_servicioId_fkey";

-- DropForeignKey
ALTER TABLE "Servicio" DROP CONSTRAINT "Servicio_clienteId_fkey";

-- AlterTable
ALTER TABLE "Cliente" ADD COLUMN     "diaCobro" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "saldo" DOUBLE PRECISION NOT NULL DEFAULT 0,
ADD COLUMN     "telefono" TEXT;

-- AlterTable
ALTER TABLE "Factura" DROP COLUMN "servicioId",
ADD COLUMN     "clienteId" INTEGER NOT NULL,
ALTER COLUMN "monto" SET DATA TYPE DOUBLE PRECISION;

-- AlterTable
ALTER TABLE "Servicio" DROP COLUMN "plan",
DROP COLUMN "precio",
ADD COLUMN     "antenaId" INTEGER,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "latitud" DOUBLE PRECISION,
ADD COLUMN     "longitud" DOUBLE PRECISION,
ADD COLUMN     "macAddress" TEXT,
ADD COLUMN     "paqueteId" TEXT NOT NULL,
ADD COLUMN     "torreId" INTEGER,
ADD COLUMN     "ultimaSincronizacion" TIMESTAMP(3);

-- CreateTable
CREATE TABLE "Torre" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "latitud" DOUBLE PRECISION,
    "longitud" DOUBLE PRECISION,
    "ipPrincipal" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Torre_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Pago" (
    "id" SERIAL NOT NULL,
    "monto" DOUBLE PRECISION NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mesCorrespondiente" TEXT NOT NULL,
    "metodoPago" TEXT NOT NULL,
    "notas" TEXT,
    "clienteId" INTEGER NOT NULL,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Ticket" (
    "id" SERIAL NOT NULL,
    "titulo" TEXT NOT NULL,
    "descripcion" TEXT,
    "estatus" TEXT NOT NULL DEFAULT 'PENDIENTE',
    "prioridad" TEXT NOT NULL DEFAULT 'MEDIA',
    "notasAdmin" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "clienteId" INTEGER NOT NULL,

    CONSTRAINT "Ticket_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Paquete" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "velocidad" INTEGER NOT NULL,
    "precio" DOUBLE PRECISION NOT NULL,
    "descripcion" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Paquete_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Antena" (
    "id" SERIAL NOT NULL,
    "nombre" TEXT NOT NULL,
    "descripcion" TEXT,
    "ipGateway" TEXT,
    "subred" TEXT,
    "torreId" INTEGER NOT NULL,
    "interfaceName" TEXT,
    "tipoInterfaz" TEXT,
    "activa" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Antena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CambioAntena" (
    "id" SERIAL NOT NULL,
    "servicioId" INTEGER NOT NULL,
    "antenaAnteriorId" INTEGER,
    "antenaActualId" INTEGER NOT NULL,
    "ipAnterior" TEXT,
    "ipActual" TEXT,
    "macAddress" TEXT,
    "detectedBy" TEXT NOT NULL,
    "razon" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CambioAntena_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ClienteMikrotik" (
    "id" SERIAL NOT NULL,
    "numCliente" TEXT NOT NULL,
    "nombreMikrotik" TEXT NOT NULL,
    "profile" TEXT NOT NULL,
    "routerOrigen" TEXT NOT NULL,
    "servicio" TEXT NOT NULL,
    "deshabilitado" BOOLEAN NOT NULL DEFAULT false,
    "sincronizado" BOOLEAN NOT NULL DEFAULT false,
    "clienteId" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ClienteMikrotik_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MikrotikLog" (
    "id" SERIAL NOT NULL,
    "accion" TEXT NOT NULL,
    "cliente" TEXT NOT NULL,
    "router" TEXT NOT NULL,
    "estado" TEXT NOT NULL,
    "error" TEXT,
    "timestamp" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MikrotikLog_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Antena_nombre_key" ON "Antena"("nombre");

-- CreateIndex
CREATE UNIQUE INDEX "ClienteMikrotik_numCliente_key" ON "ClienteMikrotik"("numCliente");

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_torreId_fkey" FOREIGN KEY ("torreId") REFERENCES "Torre"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_antenaId_fkey" FOREIGN KEY ("antenaId") REFERENCES "Antena"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_paqueteId_fkey" FOREIGN KEY ("paqueteId") REFERENCES "Paquete"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Servicio" ADD CONSTRAINT "Servicio_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Ticket" ADD CONSTRAINT "Ticket_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Antena" ADD CONSTRAINT "Antena_torreId_fkey" FOREIGN KEY ("torreId") REFERENCES "Torre"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CambioAntena" ADD CONSTRAINT "CambioAntena_servicioId_fkey" FOREIGN KEY ("servicioId") REFERENCES "Servicio"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CambioAntena" ADD CONSTRAINT "CambioAntena_antenaAnteriorId_fkey" FOREIGN KEY ("antenaAnteriorId") REFERENCES "Antena"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CambioAntena" ADD CONSTRAINT "CambioAntena_antenaActualId_fkey" FOREIGN KEY ("antenaActualId") REFERENCES "Antena"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ClienteMikrotik" ADD CONSTRAINT "ClienteMikrotik_clienteId_fkey" FOREIGN KEY ("clienteId") REFERENCES "Cliente"("id") ON DELETE SET NULL ON UPDATE CASCADE;
