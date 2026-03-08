-- CreateTable
CREATE TABLE "Empresa" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    "nombreLegal" TEXT NOT NULL,
    "alias" TEXT,
    "rut" TEXT,
    "sector" TEXT,
    "ubicacion" TEXT,
    "web" TEXT,
    "diferenciador" TEXT,
    "evidenciaDif" TEXT,
    "completitud" INTEGER NOT NULL DEFAULT 0,
    "camposFaltantes" TEXT NOT NULL,
    "estadoFicha" TEXT NOT NULL DEFAULT 'INCOMPLETO'
);

-- CreateTable
CREATE TABLE "Contacto" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "cargo" TEXT,
    "telefono" TEXT,
    "email" TEXT,
    "esDecisor" BOOLEAN NOT NULL DEFAULT false,
    "origen" TEXT NOT NULL DEFAULT 'MANUAL',
    CONSTRAINT "Contacto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Necesidad" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "enunciado" TEXT NOT NULL,
    "categoria" TEXT,
    "urgencia" TEXT,
    "plazo" TEXT,
    "impacto" TEXT,
    "barrera" TEXT,
    "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
    CONSTRAINT "Necesidad_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Oferta" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "capacidad" TEXT NOT NULL,
    "target" TEXT,
    "disponibilidad" TEXT,
    "evidencia" TEXT,
    CONSTRAINT "Oferta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Reunion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "fecha" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "resumen" TEXT NOT NULL,
    "audioUrl" TEXT,
    "transcripcion" TEXT,
    CONSTRAINT "Reunion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "Accion" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "empresaId" TEXT NOT NULL,
    "descripcion" TEXT NOT NULL,
    "responsable" TEXT,
    "fechaLimite" DATETIME,
    "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
    CONSTRAINT "Accion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_NecesidadToReunion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_NecesidadToReunion_A_fkey" FOREIGN KEY ("A") REFERENCES "Necesidad" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_NecesidadToReunion_B_fkey" FOREIGN KEY ("B") REFERENCES "Reunion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "_OfertaToReunion" (
    "A" TEXT NOT NULL,
    "B" TEXT NOT NULL,
    CONSTRAINT "_OfertaToReunion_A_fkey" FOREIGN KEY ("A") REFERENCES "Oferta" ("id") ON DELETE CASCADE ON UPDATE CASCADE,
    CONSTRAINT "_OfertaToReunion_B_fkey" FOREIGN KEY ("B") REFERENCES "Reunion" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "Empresa_rut_key" ON "Empresa"("rut");

-- CreateIndex
CREATE UNIQUE INDEX "_NecesidadToReunion_AB_unique" ON "_NecesidadToReunion"("A", "B");

-- CreateIndex
CREATE INDEX "_NecesidadToReunion_B_index" ON "_NecesidadToReunion"("B");

-- CreateIndex
CREATE UNIQUE INDEX "_OfertaToReunion_AB_unique" ON "_OfertaToReunion"("A", "B");

-- CreateIndex
CREATE INDEX "_OfertaToReunion_B_index" ON "_OfertaToReunion"("B");
