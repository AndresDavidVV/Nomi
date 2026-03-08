// Run database migrations at startup using raw node pg
const { Client } = require('pg');

const SQL = `
CREATE TABLE IF NOT EXISTS "User" (
  "id" TEXT NOT NULL, "phone" TEXT NOT NULL, "name" TEXT, "email" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "User_phone_key" ON "User"("phone");

CREATE TABLE IF NOT EXISTS "OTPCode" (
  "id" TEXT NOT NULL, "phone" TEXT NOT NULL, "code" TEXT NOT NULL,
  "expiresAt" TIMESTAMP(3) NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "OTPCode_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "OTPCode_phone_expiresAt_idx" ON "OTPCode"("phone", "expiresAt");

CREATE TABLE IF NOT EXISTS "Empresa" (
  "id" TEXT NOT NULL, "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "nombreLegal" TEXT NOT NULL, "alias" TEXT, "rut" TEXT, "sector" TEXT,
  "ubicacion" TEXT, "web" TEXT, "propuestaValor" TEXT, "evidenciaDif" TEXT,
  "nit" TEXT,
  "completitud" INTEGER NOT NULL DEFAULT 0, "camposFaltantes" TEXT NOT NULL DEFAULT '[]',
  "estadoFicha" TEXT NOT NULL DEFAULT 'INCOMPLETO',
  "creadoPorId" TEXT,
  CONSTRAINT "Empresa_pkey" PRIMARY KEY ("id")
);
CREATE UNIQUE INDEX IF NOT EXISTS "Empresa_rut_key" ON "Empresa"("rut");

CREATE TABLE IF NOT EXISTS "Contacto" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "nombre" TEXT NOT NULL,
  "cargo" TEXT, "telefono" TEXT, "email" TEXT,
  "esDecisor" BOOLEAN NOT NULL DEFAULT false, "origen" TEXT NOT NULL DEFAULT 'MANUAL',
  CONSTRAINT "Contacto_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Necesidad" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "enunciado" TEXT NOT NULL,
  "categoria" TEXT, "urgencia" TEXT, "plazo" TEXT, "impacto" TEXT, "barrera" TEXT,
  "magnitud" DOUBLE PRECISION,
  "proximoPaso" TEXT, "responsable" TEXT, "fechaEstimada" TIMESTAMP(3), "prioridad" TEXT,
  "estado" TEXT NOT NULL DEFAULT 'ABIERTO',
  CONSTRAINT "Necesidad_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Oferta" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "capacidad" TEXT NOT NULL,
  "target" TEXT, "disponibilidad" TEXT, "evidencia" TEXT,
  CONSTRAINT "Oferta_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Reunion" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "resumen" TEXT NOT NULL, "audioUrl" TEXT, "transcripcion" TEXT,
  CONSTRAINT "Reunion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Accion" (
  "id" TEXT NOT NULL, "empresaId" TEXT NOT NULL, "descripcion" TEXT NOT NULL,
  "responsable" TEXT, "fechaLimite" TIMESTAMP(3),
  "estado" TEXT NOT NULL DEFAULT 'PENDIENTE',
  CONSTRAINT "Accion_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "Seguimiento" (
  "id" TEXT NOT NULL, "necesidadId" TEXT NOT NULL,
  "accion" TEXT NOT NULL, "resultado" TEXT,
  "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "creadoPorId" TEXT,
  CONSTRAINT "Seguimiento_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "_NecesidadToReunion" (
  "A" TEXT NOT NULL, "B" TEXT NOT NULL,
  CONSTRAINT "_NecesidadToReunion_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX IF NOT EXISTS "_NecesidadToReunion_B_index" ON "_NecesidadToReunion"("B");

CREATE TABLE IF NOT EXISTS "_OfertaToReunion" (
  "A" TEXT NOT NULL, "B" TEXT NOT NULL,
  CONSTRAINT "_OfertaToReunion_AB_pkey" PRIMARY KEY ("A","B")
);
CREATE INDEX IF NOT EXISTS "_OfertaToReunion_B_index" ON "_OfertaToReunion"("B");

CREATE TABLE IF NOT EXISTS "Conversation" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "title" TEXT NOT NULL DEFAULT 'Nueva conversación',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "lastMessageAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Conversation_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Conversation_userId_lastMessageAt_idx" ON "Conversation"("userId", "lastMessageAt");

CREATE TABLE IF NOT EXISTS "Message" (
  "id" TEXT NOT NULL,
  "conversationId" TEXT NOT NULL,
  "role" TEXT NOT NULL,
  "content" TEXT NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Message_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Message_conversationId_createdAt_idx" ON "Message"("conversationId", "createdAt");

CREATE TABLE IF NOT EXISTS "Feedback" (
  "id" TEXT NOT NULL,
  "userId" TEXT NOT NULL,
  "conversationId" TEXT,
  "rating" INTEGER NOT NULL,
  "comment" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "Feedback_pkey" PRIMARY KEY ("id")
);
CREATE INDEX IF NOT EXISTS "Feedback_userId_idx" ON "Feedback"("userId");
CREATE INDEX IF NOT EXISTS "Feedback_rating_idx" ON "Feedback"("rating");
CREATE INDEX IF NOT EXISTS "Feedback_createdAt_idx" ON "Feedback"("createdAt");
`;

// Migration ALTER statements for existing databases
const MIGRATIONS = [
  // Empresa new columns
  'ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "creadoPorId" TEXT',
  'ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "propuestaValor" TEXT',
  'ALTER TABLE "Empresa" ADD COLUMN IF NOT EXISTS "nit" TEXT',
  // Rename diferenciador -> propuestaValor (copy data if old column exists)
  `DO $$ BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Empresa' AND column_name='diferenciador')
    AND EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='Empresa' AND column_name='propuestaValor') THEN
      UPDATE "Empresa" SET "propuestaValor" = "diferenciador" WHERE "propuestaValor" IS NULL AND "diferenciador" IS NOT NULL;
      ALTER TABLE "Empresa" DROP COLUMN "diferenciador";
    END IF;
  END $$`,
  // Necesidad new columns
  'ALTER TABLE "Necesidad" ADD COLUMN IF NOT EXISTS "magnitud" DOUBLE PRECISION',
  'ALTER TABLE "Necesidad" ADD COLUMN IF NOT EXISTS "proximoPaso" TEXT',
  'ALTER TABLE "Necesidad" ADD COLUMN IF NOT EXISTS "responsable" TEXT',
  'ALTER TABLE "Necesidad" ADD COLUMN IF NOT EXISTS "fechaEstimada" TIMESTAMP(3)',
  'ALTER TABLE "Necesidad" ADD COLUMN IF NOT EXISTS "prioridad" TEXT',
];

const FKEYS = [
  'ALTER TABLE "Empresa" ADD CONSTRAINT "Empresa_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE',
  'ALTER TABLE "Contacto" ADD CONSTRAINT "Contacto_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "Necesidad" ADD CONSTRAINT "Necesidad_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "Oferta" ADD CONSTRAINT "Oferta_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "Reunion" ADD CONSTRAINT "Reunion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "Accion" ADD CONSTRAINT "Accion_empresaId_fkey" FOREIGN KEY ("empresaId") REFERENCES "Empresa"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "Seguimiento" ADD CONSTRAINT "Seguimiento_necesidadId_fkey" FOREIGN KEY ("necesidadId") REFERENCES "Necesidad"("id") ON DELETE RESTRICT ON UPDATE CASCADE',
  'ALTER TABLE "Seguimiento" ADD CONSTRAINT "Seguimiento_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE',
  'ALTER TABLE "_NecesidadToReunion" ADD CONSTRAINT "_NecesidadToReunion_A_fkey" FOREIGN KEY ("A") REFERENCES "Necesidad"("id") ON DELETE CASCADE ON UPDATE CASCADE',
  'ALTER TABLE "_NecesidadToReunion" ADD CONSTRAINT "_NecesidadToReunion_B_fkey" FOREIGN KEY ("B") REFERENCES "Reunion"("id") ON DELETE CASCADE ON UPDATE CASCADE',
  'ALTER TABLE "_OfertaToReunion" ADD CONSTRAINT "_OfertaToReunion_A_fkey" FOREIGN KEY ("A") REFERENCES "Oferta"("id") ON DELETE CASCADE ON UPDATE CASCADE',
  'ALTER TABLE "_OfertaToReunion" ADD CONSTRAINT "_OfertaToReunion_B_fkey" FOREIGN KEY ("B") REFERENCES "Reunion"("id") ON DELETE CASCADE ON UPDATE CASCADE',
  'ALTER TABLE "Conversation" ADD CONSTRAINT "Conversation_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE',
  'ALTER TABLE "Message" ADD CONSTRAINT "Message_conversationId_fkey" FOREIGN KEY ("conversationId") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE',
  'ALTER TABLE "Feedback" ADD CONSTRAINT "Feedback_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE'
];

// Seed data - 10 synthetic empresas with necesidades, ofertas, seguimientos
const SEED_SQL = `
-- Only seed if no empresas exist yet
DO $$ 
DECLARE
  empresa_count INTEGER;
  u_id TEXT := 'seed-user-001';
  e1 TEXT := 'seed-emp-001'; e2 TEXT := 'seed-emp-002'; e3 TEXT := 'seed-emp-003';
  e4 TEXT := 'seed-emp-004'; e5 TEXT := 'seed-emp-005'; e6 TEXT := 'seed-emp-006';
  e7 TEXT := 'seed-emp-007'; e8 TEXT := 'seed-emp-008'; e9 TEXT := 'seed-emp-009';
  e10 TEXT := 'seed-emp-010';
BEGIN
  SELECT COUNT(*) INTO empresa_count FROM "Empresa";
  IF empresa_count > 2 THEN
    RAISE NOTICE 'Seed skipped: already have data';
    RETURN;
  END IF;

  -- Ensure seed user exists (link to existing user if any)
  INSERT INTO "User" ("id", "phone", "name", "email", "createdAt", "updatedAt")
  VALUES (u_id, '+573001111111', 'Demo Director', 'demo@ccc.org.co', NOW(), NOW())
  ON CONFLICT ("id") DO NOTHING;

  -- 10 Empresas
  INSERT INTO "Empresa" ("id","nombreLegal","alias","nit","sector","ubicacion","propuestaValor","completitud","estadoFicha","creadoPorId","createdAt","updatedAt") VALUES
  (e1,'Industrias del Pacífico S.A.S.','IndPacífico','900123456-1','Manufactura','Cali, Valle','Producción de envases biodegradables con 40% menos costo',85,'COMPLETO',u_id,NOW(),NOW()),
  (e2,'TechValle S.A.S.','TechValle','900234567-2','Tecnología','Cali, Valle','Plataforma IoT para monitoreo agroindustrial en tiempo real',70,'EN_PROGRESO',u_id,NOW(),NOW()),
  (e3,'AgroExport del Cauca Ltda.','AgroExport','900345678-3','Agroindustria','Popayán, Cauca','Red de 200 productores certificados orgánicos',60,'EN_PROGRESO',u_id,NOW(),NOW()),
  (e4,'Constructora Horizonte S.A.','Horizonte','900456789-4','Construcción','Cali, Valle','Vivienda sostenible con materiales reciclados al 30%',90,'COMPLETO',u_id,NOW(),NOW()),
  (e5,'Logística Sur S.A.S.','LogiSur','900567890-5','Logística','Palmira, Valle','Flota 100% eléctrica para última milla',55,'EN_PROGRESO',u_id,NOW(),NOW()),
  (e6,'Clínica Valle Salud','ValleSalud','900678901-6','Salud','Cali, Valle','Telemedicina rural con cobertura en 15 municipios',75,'EN_PROGRESO',u_id,NOW(),NOW()),
  (e7,'Educación Digital Colombia','EduDigital','900789012-7','Educación','Bogotá','Plataforma de formación técnica con IA adaptativa',65,'EN_PROGRESO',u_id,NOW(),NOW()),
  (e8,'Alimentos del Valle S.A.','AliValle','900890123-8','Alimentos','Yumbo, Valle','Snacks saludables con frutas exóticas del Pacífico',80,'COMPLETO',u_id,NOW(),NOW()),
  (e9,'Energía Verde Pacífico','EnVerde','900901234-9','Energía','Buenaventura','Micro-hidroeléctricas para comunidades rurales aisladas',45,'INCOMPLETO',u_id,NOW(),NOW()),
  (e10,'Textiles Modernos S.A.S.','TexMod','901012345-0','Textil','Cali, Valle','Moda sostenible con algodón orgánico certificado',50,'EN_PROGRESO',u_id,NOW(),NOW())
  ON CONFLICT DO NOTHING;

  -- Necesidades (12 total, variadas en magnitud/prioridad/estado)
  INSERT INTO "Necesidad" ("id","empresaId","enunciado","categoria","urgencia","magnitud","proximoPaso","responsable","fechaEstimada","prioridad","estado") VALUES
  ('seed-nec-001',e1,'Necesitamos proveedor de resina biodegradable a escala','Proveedores','ALTA',350000000,'Solicitar muestras a 3 proveedores','Carlos Méndez','2026-03-15','alta','ABIERTO'),
  ('seed-nec-002',e1,'Certificación ISO 14001 para exportación','Certificaciones','MEDIA',120000000,'Contratar consultor ISO','María Torres','2026-06-01','media','EN_PROCESO'),
  ('seed-nec-003',e2,'Financiación Serie A para expansión regional','Financiamiento','ALTA',2000000000,'Pitch a 5 fondos de inversión','Andrés Gómez','2026-04-30','alta','ABIERTO'),
  ('seed-nec-004',e3,'Canal de distribución en Europa para café orgánico','Comercialización','ALTA',800000000,'Asistir a feria Biofach 2026','Pedro Caicedo','2026-09-01','alta','ABIERTO'),
  ('seed-nec-005',e4,'Terreno de 5 hectáreas zona sur para nuevo proyecto','Infraestructura','MEDIA',5000000000,'Evaluar 3 lotes preseleccionados','Luis Arango','2026-05-15','alta','EN_PROCESO'),
  ('seed-nec-006',e5,'10 vehículos eléctricos de carga para flota','Equipamiento','ALTA',1500000000,'Cotizar con BYD y JAC','Sandra Ruiz','2026-04-01','alta','ABIERTO'),
  ('seed-nec-007',e6,'Especialistas en dermatología para telemedicina','Talento','MEDIA',90000000,'Publicar convocatoria en redes médicas','Dr. Ramírez','2026-03-01','media','ABIERTO'),
  ('seed-nec-008',e7,'Alianza con SENA para certificación de cursos','Alianzas','BAJA',50000000,'Reunión con director regional SENA','Carolina Paz','2026-07-01','baja','ABIERTO'),
  ('seed-nec-009',e8,'Línea de empaque compostable para nueva línea','Proveedores','MEDIA',200000000,'Evaluar proveedores de empaques','Jorge Vallejo','2026-04-15','media','EN_PROCESO'),
  ('seed-nec-010',e9,'Estudio de factibilidad para 3 micro-hidroeléctricas','Consultoría','ALTA',180000000,'Contratar firma de ingeniería','Ing. Mosquera','2026-03-30','alta','ABIERTO'),
  ('seed-nec-011',e10,'Diseñador de moda sostenible senior','Talento','MEDIA',72000000,'Buscar en LinkedIn y referidos','Ana Giraldo','2026-02-10','media','VENCIDO'),
  ('seed-nec-012',e2,'Desarrolladores fullstack con experiencia IoT','Talento','ALTA',240000000,'Contratar reclutador especializado','Andrés Gómez','2026-02-15','alta','VENCIDO')
  ON CONFLICT DO NOTHING;

  -- Ofertas
  INSERT INTO "Oferta" ("id","empresaId","capacidad","target","disponibilidad") VALUES
  ('seed-ofe-001',e1,'Producción de envases biodegradables (50k unidades/mes)','Empresas de alimentos y cosméticos','Inmediata'),
  ('seed-ofe-002',e2,'Plataforma IoT personalizable para agroindustria','Ingenios, fincas cafeteras, floricultores','30 días'),
  ('seed-ofe-003',e4,'Construcción sostenible VIS y VIP','Gobiernos municipales, cajas de compensación','Por proyecto'),
  ('seed-ofe-004',e6,'Telemedicina general y especializada','Empresas, EPS, alcaldías rurales','Inmediata'),
  ('seed-ofe-005',e8,'Snacks saludables marca blanca','Cadenas de supermercados, tiendas fitness','Inmediata')
  ON CONFLICT DO NOTHING;

  -- Seguimientos
  INSERT INTO "Seguimiento" ("id","necesidadId","accion","resultado","fecha","creadoPorId") VALUES
  ('seed-seg-001','seed-nec-001','Contacto inicial con proveedor BioResinas Colombia','Interesados, enviarán muestras en 2 semanas','2026-02-10',u_id),
  ('seed-seg-002','seed-nec-002','Reunión con consultor ISO GreenCert','Propuesta recibida por $45M, evaluando','2026-02-12',u_id),
  ('seed-seg-003','seed-nec-003','Pitch a Fondo Cali Angels','Feedback positivo, piden due diligence','2026-02-08',u_id),
  ('seed-seg-004','seed-nec-005','Visita a lote en zona Pance','Cumple 80% de requisitos, precio alto','2026-02-14',u_id),
  ('seed-seg-005','seed-nec-006','Cotización recibida de BYD Colombia','$150M por unidad, descuento por volumen posible','2026-02-16',u_id),
  ('seed-seg-006','seed-nec-009','Evaluación de EcoPack Colombia','Buenos precios pero capacidad limitada','2026-02-18',u_id)
  ON CONFLICT DO NOTHING;

  RAISE NOTICE 'Seed data inserted successfully!';
END $$;
`;

async function main() {
  const url = process.env.DATABASE_URL;
  if (!url) { console.log('No DATABASE_URL, skipping init'); return; }
  const client = new Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
  try {
    await client.connect();
    console.log('Connected to database');
    
    // Create tables
    await client.query(SQL);
    console.log('Tables created/verified');
    
    // Run migrations (ALTER TABLE for existing DBs)
    for (const mig of MIGRATIONS) {
      try { await client.query(mig); } catch(e) { /* already applied */ }
    }
    console.log('Migrations applied');
    
    // Foreign keys
    for (const fk of FKEYS) {
      try { await client.query(fk); } catch(e) { /* already exists */ }
    }
    console.log('Foreign keys set');
    
    // Seed data
    try {
      await client.query(SEED_SQL);
      console.log('Seed data checked/inserted');
    } catch(e) {
      console.log('Seed note:', e.message);
    }
    
    await client.end();
    console.log('DB init complete!');
  } catch(e) {
    console.error('DB init error:', e.message);
    try { await client.end(); } catch(_) {}
  }
}
main();
