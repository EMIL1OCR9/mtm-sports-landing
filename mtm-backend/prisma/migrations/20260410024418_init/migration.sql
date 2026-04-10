-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('NUEVO', 'CONTACTADO', 'EN_PROCESO', 'CERRADO', 'DESCARTADO');

-- CreateTable
CREATE TABLE "Lead" (
    "id" SERIAL NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "nombre" TEXT NOT NULL,
    "telefono" TEXT NOT NULL,
    "ciudad" TEXT,
    "tipoCliente" TEXT,
    "comentarios" TEXT,
    "cancha" TEXT NOT NULL,
    "extras" TEXT NOT NULL,
    "estimadoMin" INTEGER,
    "estimadoMax" INTEGER,
    "status" "LeadStatus" NOT NULL DEFAULT 'NUEVO',
    "notas" TEXT,
    "ip" TEXT,
    "userAgent" TEXT,

    CONSTRAINT "Lead_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Lead_createdAt_idx" ON "Lead"("createdAt");

-- CreateIndex
CREATE INDEX "Lead_status_idx" ON "Lead"("status");
