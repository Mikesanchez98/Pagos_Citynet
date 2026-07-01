-- Migración: Adaptar ClienteMikrotik para clientes DHCP (identificados por MAC)

-- 1. Limpiar registros PPPoE anteriores (ya no son válidos con el nuevo esquema)
DELETE FROM "ClienteMikrotik";

-- 2. macAddress como identificador único (puede ya existir)
ALTER TABLE "ClienteMikrotik" ADD COLUMN IF NOT EXISTS "macAddress" TEXT;
DO $$ BEGIN
  ALTER TABLE "ClienteMikrotik" ADD CONSTRAINT "ClienteMikrotik_macAddress_key" UNIQUE ("macAddress");
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 3. Campos DHCP (todos con IF NOT EXISTS)
ALTER TABLE "ClienteMikrotik" ADD COLUMN IF NOT EXISTS "ipActual"     TEXT;
ALTER TABLE "ClienteMikrotik" ADD COLUMN IF NOT EXISTS "hostname"     TEXT;
ALTER TABLE "ClienteMikrotik" ADD COLUMN IF NOT EXISTS "servidorDhcp" TEXT;
ALTER TABLE "ClienteMikrotik" ADD COLUMN IF NOT EXISTS "comentario"   TEXT;
ALTER TABLE "ClienteMikrotik" ADD COLUMN IF NOT EXISTS "estadoLease"  TEXT NOT NULL DEFAULT 'bound';

-- 4. Eliminar columnas PPPoE que ya no aplican (IF EXISTS para evitar error si no existen)
ALTER TABLE "ClienteMikrotik" DROP COLUMN IF EXISTS "numCliente";
ALTER TABLE "ClienteMikrotik" DROP COLUMN IF EXISTS "nombreMikrotik";
ALTER TABLE "ClienteMikrotik" DROP COLUMN IF EXISTS "profile";
ALTER TABLE "ClienteMikrotik" DROP COLUMN IF EXISTS "servicio";
