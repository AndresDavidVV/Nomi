import { query, queryOne } from '@/app/db';
import { randomUUID } from 'crypto';
import { getSession } from '@/lib/auth';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export const maxDuration = 60;

// ── pg_trgm initialization ────────────────────────────────────

let pgTrgmInitialized = false;

async function ensurePgTrgm() {
  if (pgTrgmInitialized) return;
  try {
    await query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    pgTrgmInitialized = true;
  } catch (e) {
    // Extension might already exist or user lacks permission — try using it anyway
    pgTrgmInitialized = true;
  }
}

// ── DB Operations ──────────────────────────────────────────────

async function buscarEmpresaDB(search: string, _userId?: string) {
  if (!search) return [];
  await ensurePgTrgm();
  
  // Fuzzy search using pg_trgm similarity — cross-user visibility (no creadoPorId filter)
  const results = await query(
    `SELECT *, 
       GREATEST(
         similarity("nombreLegal", $1),
         similarity(COALESCE("alias",''), $1)
       ) AS sim
     FROM "Empresa"
     WHERE "nombreLegal" ILIKE $2 
        OR "alias" ILIKE $2
        OR similarity("nombreLegal", $1) > 0.25
        OR similarity(COALESCE("alias",''), $1) > 0.25
     ORDER BY sim DESC
     LIMIT 10`,
    [search, `%${search}%`]
  );
  return results;
}

async function crearEmpresaDB(nombre: string, userId?: string, sector?: string) {
  await ensurePgTrgm();
  
  // Dedup: check for similar empresa before creating
  const similar = await query(
    `SELECT *, similarity("nombreLegal", $1) AS sim
     FROM "Empresa"
     WHERE similarity("nombreLegal", $1) > 0.4
     ORDER BY sim DESC LIMIT 1`,
    [nombre]
  );
  
  if (similar.length > 0) {
    const existing = similar[0];
    // If new sector provided and different from existing, append it
    if (sector && existing.sector && !existing.sector.toLowerCase().includes(sector.toLowerCase())) {
      const newSector = `${existing.sector}, ${sector}`;
      await query(
        `UPDATE "Empresa" SET "sector"=$1, "updatedAt"=$2 WHERE "id"=$3`,
        [newSector, new Date().toISOString(), existing.id]
      );
      return { 
        id: existing.id, 
        nombreLegal: existing.nombreLegal, 
        sector: newSector, 
        completitud: existing.completitud,
        action: 'EXISTING_UPDATED',
        message: `Empresa "${existing.nombreLegal}" ya existía (similitud ${(existing.sim * 100).toFixed(0)}%). Se agregó sector "${sector}".`
      };
    }
    return { 
      id: existing.id, 
      nombreLegal: existing.nombreLegal, 
      sector: existing.sector, 
      completitud: existing.completitud,
      action: 'ALREADY_EXISTS',
      message: `Empresa "${existing.nombreLegal}" ya existe (similitud ${(existing.sim * 100).toFixed(0)}%). Usa empresaId="${existing.id}" para agregar información.`
    };
  }
  
  const id = randomUUID();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO "Empresa" ("id","createdAt","updatedAt","nombreLegal","sector","camposFaltantes","completitud","estadoFicha","creadoPorId") VALUES ($1,$2,$2,$3,$4,$5,0,'INCOMPLETO',$6)`,
    [id, now, nombre, sector || null, JSON.stringify(["contacto", "necesidad", "oferta", "diferenciador"]), userId || null]
  );
  return { id, nombreLegal: nombre, sector: sector || null, completitud: 0, action: 'CREATED' };
}

async function guardarNecesidadDB(empresaId: string, enunciado: string, urgencia?: string) {
  const id = randomUUID();
  await query(
    `INSERT INTO "Necesidad" ("id","empresaId","enunciado","urgencia","estado") VALUES ($1,$2,$3,$4,'ABIERTO')`,
    [id, empresaId, enunciado, urgencia || null]
  );
  return { id, enunciado, urgencia: urgencia || null };
}

async function guardarOfertaDB(empresaId: string, capacidad: string, target?: string) {
  const id = randomUUID();
  await query(
    `INSERT INTO "Oferta" ("id","empresaId","capacidad","target") VALUES ($1,$2,$3,$4)`,
    [id, empresaId, capacidad, target || null]
  );
  return { id, capacidad, target: target || null };
}

async function guardarContactoDB(empresaId: string, nombre: string, cargo?: string, telefono?: string, email?: string) {
  const id = randomUUID();
  await query(
    `INSERT INTO "Contacto" ("id","empresaId","nombre","cargo","telefono","email") VALUES ($1,$2,$3,$4,$5,$6)`,
    [id, empresaId, nombre, cargo || null, telefono || null, email || null]
  );
  return { id, nombre, cargo: cargo || null };
}

async function actualizarPropuestaValorDB(empresaId: string, propuestaValor: string) {
  await query(
    `UPDATE "Empresa" SET "propuestaValor"=$1, "updatedAt"=$2 WHERE "id"=$3`,
    [propuestaValor, new Date().toISOString(), empresaId]
  );
  return { propuestaValor };
}

async function guardarSeguimientoDB(necesidadId: string, accion: string, userId: string, resultado?: string) {
  const id = randomUUID();
  await query(
    `INSERT INTO "Seguimiento" ("id","necesidadId","accion","resultado","creadoPorId","fecha") VALUES ($1,$2,$3,$4,$5,NOW())`,
    [id, necesidadId, accion, resultado || null, userId]
  );
  return { id, accion, resultado: resultado || null };
}

async function actualizarNecesidadDB(necesidadId: string, updates: any) {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.magnitud !== undefined) { sets.push(`"magnitud"=$${idx++}`); values.push(updates.magnitud); }
  if (updates.proximoPaso !== undefined) { sets.push(`"proximoPaso"=$${idx++}`); values.push(updates.proximoPaso); }
  if (updates.responsable !== undefined) { sets.push(`"responsable"=$${idx++}`); values.push(updates.responsable); }
  if (updates.fechaEstimada !== undefined) { sets.push(`"fechaEstimada"=$${idx++}`); values.push(updates.fechaEstimada); }
  if (updates.prioridad !== undefined) { sets.push(`"prioridad"=$${idx++}`); values.push(updates.prioridad); }
  if (updates.estado !== undefined) { sets.push(`"estado"=$${idx++}`); values.push(updates.estado); }
  if (updates.categoria !== undefined) { sets.push(`"categoria"=$${idx++}`); values.push(updates.categoria); }
  if (updates.urgencia !== undefined) { sets.push(`"urgencia"=$${idx++}`); values.push(updates.urgencia); }

  if (sets.length === 0) return { error: 'No updates provided' };

  sets.push(`"updatedAt"=$${idx++}`);
  values.push(new Date().toISOString());
  values.push(necesidadId);

  await query(
    `UPDATE "Necesidad" SET ${sets.join(',')} WHERE "id"=$${idx}`,
    values
  );

  return { success: true };
}

async function getPortfolioMetricsDB(_userId: string) {
  // Cross-user: all empresas visible to everyone
  const necesidades = await query(
    `SELECT n.*, e."nombreLegal" FROM "Necesidad" n JOIN "Empresa" e ON n."empresaId"=e."id"`
  );
  
  const valorTotal = necesidades.reduce((sum: number, n: any) => sum + (parseFloat(n.magnitud) || 0), 0);
  const porEstado = necesidades.reduce((acc: any, n: any) => {
    acc[n.estado] = (acc[n.estado] || 0) + 1;
    return acc;
  }, {});
  const porPrioridad = necesidades.reduce((acc: any, n: any) => {
    const p = n.prioridad || 'sin_asignar';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  const empresas = await query(
    `SELECT COUNT(DISTINCT "id") as total FROM "Empresa"`
  );

  return {
    totalEmpresas: parseInt(empresas[0]?.total || '0'),
    totalNecesidades: necesidades.length,
    valorTotal,
    porEstado,
    porPrioridad,
  };
}

async function buscarNecesidadesDB(_userId: string, filters: any) {
  let sql = `SELECT n.*, e."nombreLegal" FROM "Necesidad" n JOIN "Empresa" e ON n."empresaId"=e."id" WHERE 1=1`;
  const params: any[] = [];
  let idx = 1;

  if (filters.estado) {
    sql += ` AND n."estado"=$${idx++}`;
    params.push(filters.estado);
  }
  if (filters.prioridad) {
    sql += ` AND n."prioridad"=$${idx++}`;
    params.push(filters.prioridad);
  }
  if (filters.magnitudMin !== undefined) {
    sql += ` AND n."magnitud">=$${idx++}`;
    params.push(filters.magnitudMin);
  }
  if (filters.magnitudMax !== undefined) {
    sql += ` AND n."magnitud"<=$${idx++}`;
    params.push(filters.magnitudMax);
  }

  sql += ` ORDER BY n."magnitud" DESC NULLS LAST LIMIT 20`;

  return await query(sql, params);
}

async function getNecesidadesVencidasDB(_userId: string) {
  return await query(
    `SELECT n.*, e."nombreLegal" FROM "Necesidad" n JOIN "Empresa" e ON n."empresaId"=e."id" WHERE n."fechaEstimada"<NOW() AND n."estado"!='RESUELTO' ORDER BY n."fechaEstimada" ASC`
  );
}

// ── Acciones Pendientes (by responsable, with filters) ─────────

async function getAccionesPendientesDB(filters: { responsable?: string, orderBy?: string, limit?: number }) {
  let sql = `SELECT n.*, e."nombreLegal" 
    FROM "Necesidad" n 
    JOIN "Empresa" e ON n."empresaId"=e."id" 
    WHERE n."responsable" IS NOT NULL 
      AND n."estado" != 'RESUELTO'`;
  const params: any[] = [];
  let idx = 1;

  if (filters.responsable) {
    sql += ` AND LOWER(n."responsable") LIKE LOWER($${idx++})`;
    params.push(`%${filters.responsable}%`);
  }

  const orderBy = filters.orderBy || 'deadline';
  switch (orderBy) {
    case 'impact':
      sql += ` ORDER BY n."magnitud" DESC NULLS LAST`;
      break;
    case 'urgency':
      sql += ` ORDER BY CASE n."prioridad" WHEN 'alta' THEN 1 WHEN 'media' THEN 2 WHEN 'baja' THEN 3 ELSE 4 END, n."fechaEstimada" ASC NULLS LAST`;
      break;
    case 'deadline':
    default:
      sql += ` ORDER BY n."fechaEstimada" ASC NULLS LAST`;
      break;
  }

  sql += ` LIMIT $${idx}`;
  params.push(filters.limit || 20);

  return await query(sql, params);
}

async function getEmpresaMetricsDB(empresaId: string) {
  const empresa = await queryOne(`SELECT * FROM "Empresa" WHERE "id"=$1`, [empresaId]);
  if (!empresa) return { error: 'Empresa no encontrada' };

  const necesidades = await query(`SELECT * FROM "Necesidad" WHERE "empresaId"=$1`, [empresaId]);
  const valorTotal = necesidades.reduce((sum: number, n: any) => sum + (parseFloat(n.magnitud) || 0), 0);
  const porEstado = necesidades.reduce((acc: any, n: any) => {
    acc[n.estado] = (acc[n.estado] || 0) + 1;
    return acc;
  }, {});

  return {
    empresa: {
      nombreLegal: empresa.nombreLegal,
      sector: empresa.sector,
      propuestaValor: empresa.propuestaValor,
    },
    totalNecesidades: necesidades.length,
    valorTotal,
    porEstado,
  };
}

async function obtenerFichaDB(empresaId: string) {
  const empresa = await queryOne(`SELECT * FROM "Empresa" WHERE "id"=$1`, [empresaId]);
  if (!empresa) return { error: 'Empresa no encontrada' };
  const contactos = await query(`SELECT "nombre","cargo","telefono","email" FROM "Contacto" WHERE "empresaId"=$1`, [empresaId]);
  const necesidades = await query(`SELECT "enunciado","urgencia","estado" FROM "Necesidad" WHERE "empresaId"=$1`, [empresaId]);
  const ofertas = await query(`SELECT "capacidad","target" FROM "Oferta" WHERE "empresaId"=$1`, [empresaId]);
  return { empresa, contactos, necesidades, ofertas };
}

async function recalcularCompletitud(empresaId: string) {
  const contactos = await query(`SELECT COUNT(*) as c FROM "Contacto" WHERE "empresaId"=$1`, [empresaId]);
  const necesidades = await query(`SELECT COUNT(*) as c FROM "Necesidad" WHERE "empresaId"=$1`, [empresaId]);
  const ofertas = await query(`SELECT COUNT(*) as c FROM "Oferta" WHERE "empresaId"=$1`, [empresaId]);
  const empresa = await queryOne(`SELECT "propuestaValor" FROM "Empresa" WHERE "id"=$1`, [empresaId]);

  let score = 0;
  const missing: string[] = [];
  if (parseInt(contactos[0]?.c) > 0) score += 25; else missing.push("contacto");
  if (parseInt(necesidades[0]?.c) > 0) score += 25; else missing.push("necesidad");
  if (parseInt(ofertas[0]?.c) > 0) score += 25; else missing.push("oferta");
  if (empresa?.propuestaValor) score += 25; else missing.push("propuesta de valor");

  const estado = score === 100 ? 'COMPLETO' : score >= 50 ? 'MINIMO' : 'INCOMPLETO';
  await query(
    `UPDATE "Empresa" SET "completitud"=$1,"camposFaltantes"=$2,"estadoFicha"=$3,"updatedAt"=$4 WHERE "id"=$5`,
    [score, JSON.stringify(missing), estado, new Date().toISOString(), empresaId]
  );
  return { score, missing, estado };
}

// ── Tool definitions for Gemini API ────────────────────────────

const TOOLS = [{
  functionDeclarations: [
    {
      name: 'buscarEmpresa',
      description: 'Buscar empresa por nombre o alias. Usar SIEMPRE antes de crear para evitar duplicados.',
      parameters: { type: 'OBJECT', properties: { searchQuery: { type: 'STRING', description: 'Nombre a buscar' } }, required: ['searchQuery'] }
    },
    {
      name: 'crearEmpresa',
      description: 'Crear empresa nueva. Solo usar después de buscar y confirmar que no existe.',
      parameters: { type: 'OBJECT', properties: { nombre: { type: 'STRING' }, sector: { type: 'STRING' } }, required: ['nombre'] }
    },
    {
      name: 'guardarNecesidad',
      description: 'Registrar una necesidad de una empresa. Campos opcionales: magnitud, proximoPaso, responsable, fechaEstimada, prioridad, categoria.',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          empresaId: { type: 'STRING' }, 
          enunciado: { type: 'STRING' }, 
          urgencia: { type: 'STRING' },
          magnitud: { type: 'NUMBER', description: 'Valor económico del problema en COP (opcional)' },
          proximoPaso: { type: 'STRING', description: 'Próxima acción a tomar (opcional)' },
          responsable: { type: 'STRING', description: 'Persona responsable (opcional)' },
          fechaEstimada: { type: 'STRING', description: 'Fecha estimada de resolución en formato ISO (opcional)' },
          prioridad: { type: 'STRING', description: 'alta, media o baja (opcional)' },
          categoria: { type: 'STRING', description: 'Categoría estratégica: Inversión, Innovación, Internacionalización o General (opcional, por defecto General)' }
        }, 
        required: ['empresaId', 'enunciado'] 
      }
    },
    {
      name: 'actualizarNecesidad',
      description: 'Actualizar campos de una necesidad existente (magnitud, proximoPaso, responsable, fechaEstimada, prioridad, estado).',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          necesidadId: { type: 'STRING' },
          magnitud: { type: 'NUMBER' },
          proximoPaso: { type: 'STRING' },
          responsable: { type: 'STRING' },
          fechaEstimada: { type: 'STRING' },
          prioridad: { type: 'STRING' },
          estado: { type: 'STRING' }
        }, 
        required: ['necesidadId'] 
      }
    },
    {
      name: 'guardarOferta',
      description: 'Registrar una oferta o capacidad de una empresa.',
      parameters: { type: 'OBJECT', properties: { empresaId: { type: 'STRING' }, capacidad: { type: 'STRING' }, target: { type: 'STRING' } }, required: ['empresaId', 'capacidad'] }
    },
    {
      name: 'guardarContacto',
      description: 'Registrar un contacto de una empresa.',
      parameters: { type: 'OBJECT', properties: { empresaId: { type: 'STRING' }, nombre: { type: 'STRING' }, cargo: { type: 'STRING' }, telefono: { type: 'STRING' }, email: { type: 'STRING' } }, required: ['empresaId', 'nombre'] }
    },
    {
      name: 'actualizarPropuestaValor',
      description: 'Registrar o actualizar la propuesta de valor de una empresa (lo que la hace única).',
      parameters: { type: 'OBJECT', properties: { empresaId: { type: 'STRING' }, propuestaValor: { type: 'STRING' } }, required: ['empresaId', 'propuestaValor'] }
    },
    {
      name: 'obtenerFicha',
      description: 'Obtener la ficha completa de una empresa con contactos, necesidades y ofertas.',
      parameters: { type: 'OBJECT', properties: { empresaId: { type: 'STRING' } }, required: ['empresaId'] }
    },
    {
      name: 'analizar_portafolio',
      description: 'Obtener métricas del portafolio completo del usuario: total empresas, necesidades, valor de problemas, distribución por estado/prioridad.',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'buscar_necesidades',
      description: 'Buscar y filtrar necesidades por estado, prioridad o rango de magnitud.',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          estado: { type: 'STRING' },
          prioridad: { type: 'STRING' },
          magnitudMin: { type: 'NUMBER' },
          magnitudMax: { type: 'NUMBER' }
        }
      }
    },
    {
      name: 'agregar_seguimiento',
      description: 'Agregar un seguimiento a una necesidad (acción tomada, resultado obtenido).',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          necesidadId: { type: 'STRING' },
          accion: { type: 'STRING', description: 'Acción realizada' },
          resultado: { type: 'STRING', description: 'Resultado obtenido (opcional)' }
        },
        required: ['necesidadId', 'accion']
      }
    },
    {
      name: 'ver_vencidas',
      description: 'Obtener todas las necesidades vencidas (fechaEstimada pasada y no resueltas).',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'drill_down_empresa',
      description: 'Análisis profundo de una empresa: total necesidades, valor, distribución por estado.',
      parameters: { type: 'OBJECT', properties: { empresaId: { type: 'STRING' } }, required: ['empresaId'] }
    },
    {
      name: 'ver_acciones_pendientes',
      description: 'Ver acciones/necesidades pendientes con responsable asignado. Filtrar por responsable, ordenar por impacto (magnitud), urgencia (prioridad), o deadline (fecha más próxima). Ideal para "¿qué tiene Bryan pendiente?", "top 3 más urgentes", "acciones próximas a vencer".',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          responsable: { type: 'STRING', description: 'Filtrar por nombre del responsable (parcial OK, ej: "Bryan")' },
          orderBy: { type: 'STRING', description: 'Criterio de orden: "impact" (mayor magnitud), "urgency" (mayor prioridad), "deadline" (más próxima a vencer). Default: deadline' },
          limit: { type: 'NUMBER', description: 'Cantidad máxima de resultados. Default: 20' }
        }
      }
    },
    {
      name: 'ver_historial_empresa',
      description: 'Ver todo lo que se ha registrado/hablado sobre una empresa: necesidades, ofertas, contactos, acciones, por todos los usuarios. Ideal para "¿qué sabemos de Claxen?" o "¿qué se ha hablado con Sucroal?".',
      parameters: { type: 'OBJECT', properties: { empresaId: { type: 'STRING' } }, required: ['empresaId'] }
    },
  ]
}];

const SYSTEM_PROMPT = `Eres un Analista de Inteligencia Económica de la Cámara de Comercio de Cali. Eres conversacional, flexible y humano.

Tu trabajo: registrar empresas, contactos, necesidades y ofertas a partir de conversaciones o resúmenes de reuniones.

CHECKLIST por empresa (guía, NO bloqueo):
- Contacto (25%) — nombre y datos de una persona de contacto
- Necesidad (25%) — qué necesita la empresa
- Oferta (25%) — qué ofrece o en qué es fuerte
- Propuesta de Valor (25%) — qué la hace única, su diferenciador clave

FILOSOFÍA DE GUARDADO:
- **Guarda info parcial sin bloquear**: Si el usuario da nombre de empresa + una percepción/insight relevante, ¡guárdalo! No exijas todos los campos.
- **Sé conversacional, no interrogatorio**: Si el usuario da más info (magnitud, próximo paso, responsable, fecha, prioridad), genial, guárdala. Si no, NO insistas.
- **Respeta decisiones**: Si el usuario dice "guárdalo así" o "eso es todo", guarda lo que hay sin preguntar más.
- **Pregunta amablemente**: Puedes sugerir agregar más datos ("¿Conoces la magnitud del problema?" o "¿Hay un responsable asignado?"), pero si dice "no" o "no sé", acepta y guarda.
- **Magnitud/proximoPaso/responsable/fechaEstimada/prioridad son opcionales**: Ayudan a priorizar, pero NO son obligatorios para guardar.

CATEGORÍAS ESTRATÉGICAS (3i + General):
- Cuando registres una necesidad, clasifícala en una de estas 4 categorías:
  • **Inversión**: Necesidades relacionadas con capital, financiamiento, expansión de operaciones
  • **Innovación**: Necesidades de tecnología, R&D, nuevos productos/procesos, transformación digital
  • **Internacionalización**: Necesidades de exportación, mercados externos, alianzas internacionales
  • **General**: Si no encaja claramente en las 3i, usa esta categoría
- Asigna la categoría automáticamente según el contexto de la necesidad. Si no es claro, usa "General".

INFERENCIA AUTOMÁTICA (NO preguntar al usuario):
- **Sector**: SIEMPRE infiere el sector de la empresa a partir del contexto (ej: "panadería" → "Alimentos", "laboratorio farmacéutico" → "Farmacéutico", "empresa de software" → "Tecnología"). NUNCA preguntes "¿cuál es el sector?" — dedúcelo tú.
- **Categoría de necesidad**: Clasifícala automáticamente en las 3i o General sin preguntar.
- **Propuesta de valor**: Si el usuario da suficiente contexto, infiérela. Si no, déjala para después.
- Regla de oro: Si puedes deducirlo del contexto, NO lo preguntes. Solo pregunta lo que NO se puede inferir.

FLUJO DE TRABAJO:
- Usa las herramientas para TODAS las operaciones de base de datos. No inventes datos.
- Cuando el usuario mencione una empresa nueva, PRIMERO búscala. Si no existe, créala CON el sector inferido.
- CRÍTICO: Cuando crees una empresa, el resultado incluye un "id" (UUID). USA ESE ID EXACTO como empresaId en todas las operaciones siguientes (guardarNecesidad, guardarOferta, guardarContacto). NO uses el nombre de la empresa como empresaId.
- Después de crear o encontrar una empresa, registra necesidades, ofertas, contactos y propuesta de valor según la info disponible.
- NUNCA digas "he registrado" si no ejecutaste el tool call correspondiente. Solo confirma lo que realmente guardaste.
- Siempre indica la completitud actual y qué falta para completar la ficha (pero como guía, no como bloqueo).
- Si el usuario da un resumen de reunión, extrae TODA la info y registra todo de una vez.
- Usa 'propuesta de valor' en lugar de 'diferenciador' en todas tus respuestas.

REGLA CRÍTICA — MÚLTIPLES REGISTROS EN UN MISMO MENSAJE:
- Si el usuario menciona MÚLTIPLES empresas o registros en un solo mensaje, DEBES procesarlos TODOS antes de dar una respuesta de texto.
- NO generes una respuesta de texto después de procesar solo la primera empresa. Continúa haciendo tool calls hasta que TODAS las empresas/registros estén guardados.
- Flujo correcto: buscar empresa A → crear A → guardar datos A → buscar empresa B → crear B → guardar datos B → AHORA SÍ responde con texto confirmando AMBOS registros.
- Si mencionan 2 empresas, deben haber al menos 2 llamadas a crearEmpresa (o buscarEmpresa si ya existen). Si solo hiciste 1, NO has terminado.
- Esto aplica también a múltiples necesidades, ofertas o contactos para la misma empresa — procesa TODOS antes de responder.

BÚSQUEDA DIRECTA:
- Cuando el usuario pide "busca empresa X" o "muéstrame datos de empresa X", AUTOMÁTICAMENTE usa 'buscarEmpresa' seguido de 'obtenerFicha' y muestra la información completa sin preguntar si quiere verla.
- No preguntes "¿quieres ver la ficha?" — muéstrala directamente.
- La búsqueda es fuzzy: si el usuario escribe "Lactive" y existe "Lactive Cali", la encontrará. No necesita el nombre exacto.

VISIBILIDAD CROSS-USUARIO:
- TODAS las empresas son visibles para TODOS los usuarios del equipo. No hay filtro por usuario.
- Varios usuarios pueden aportar información a la misma empresa. Cada aporte SUMA (nunca sobreescribe).
- Si alguien pregunta "¿qué sabemos de Claxen?", usa 'ver_historial_empresa' para mostrar TODO lo registrado por cualquier usuario.

ACCIONES PENDIENTES:
- Las acciones/tareas pendientes se derivan del campo "responsable" y "proximoPaso" en las necesidades.
- Cuando el usuario pregunte por acciones pendientes, tareas, o seguimientos, usa 'ver_acciones_pendientes'.
- Soporta filtros: por responsable ("¿qué tiene Bryan?"), por impacto ("top 3 más importantes"), por urgencia ("más urgentes"), por deadline ("próximas a vencer").
- Ejemplo: "dime las 3 acciones más urgentes" → ver_acciones_pendientes(orderBy: "urgency", limit: 3)

Responde en español, directo y profesional.`;

// ── Execute tool calls ─────────────────────────────────────────

// Resolve empresaId: if it's not a UUID, search by name (fuzzy)
async function resolveEmpresaId(empresaId: string, _userId?: string): Promise<string | null> {
  // Check if it looks like a UUID
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(empresaId)) {
    return empresaId;
  }
  // Fuzzy search all empresas (cross-user)
  const results = await buscarEmpresaDB(empresaId);
  if (results.length > 0) return results[0].id;
  return null;
}

async function executeTool(name: string, args: any, userId?: string): Promise<any> {
  // For tools that need empresaId, resolve name to UUID
  if (args.empresaId && name !== 'buscarEmpresa' && name !== 'crearEmpresa') {
    const resolvedId = await resolveEmpresaId(args.empresaId, userId);
    if (!resolvedId) return { error: `Empresa "${args.empresaId}" no encontrada. Búscala primero.` };
    args.empresaId = resolvedId;
  }

  switch (name) {
    case 'buscarEmpresa': return buscarEmpresaDB(args.searchQuery, userId);
    case 'crearEmpresa': {
      const result = await crearEmpresaDB(args.nombre, userId, args.sector);
      return { ...result, message: `Empresa creada exitosamente. IMPORTANTE: usa empresaId="${result.id}" para todas las operaciones siguientes con esta empresa.` };
    }
    case 'guardarNecesidad': {
      // Check if similar necesidad already exists for this empresa
      const existentes = await query(
        `SELECT * FROM "Necesidad" WHERE "empresaId"=$1 AND LOWER("enunciado") LIKE $2 LIMIT 1`,
        [args.empresaId, `%${args.enunciado.toLowerCase().substring(0, 30)}%`]
      );
      
      if (existentes.length > 0) {
        // Similar necesidad exists — update it instead of creating new
        const existing = existentes[0];
        const updates: any = {};
        if (args.magnitud && !existing.magnitud) updates.magnitud = args.magnitud;
        if (args.proximoPaso && !existing.proximoPaso) updates.proximoPaso = args.proximoPaso;
        if (args.responsable && !existing.responsable) updates.responsable = args.responsable;
        if (args.fechaEstimada && !existing.fechaEstimada) updates.fechaEstimada = args.fechaEstimada;
        if (args.prioridad && !existing.prioridad) updates.prioridad = args.prioridad;
        if (args.urgencia && !existing.urgencia) updates.urgencia = args.urgencia;
        if (args.categoria && !existing.categoria) updates.categoria = args.categoria;
        
        if (Object.keys(updates).length > 0) {
          await actualizarNecesidadDB(existing.id, updates);
          const comp = await recalcularCompletitud(args.empresaId);
          return { 
            id: existing.id, 
            enunciado: existing.enunciado, 
            action: 'ACTUALIZADA',
            completitud: comp,
            message: 'Necesidad existente actualizada con nuevos campos'
          };
        }
        
        return {
          id: existing.id,
          enunciado: existing.enunciado,
          action: 'YA_EXISTE',
          message: 'Esta necesidad ya estaba registrada y completa'
        };
      }
      
      // No existe — crear nueva
      const categoria = args.categoria || 'General';
      
      const id = randomUUID();
      await query(
        `INSERT INTO "Necesidad" ("id","empresaId","enunciado","categoria","urgencia","magnitud","proximoPaso","responsable","fechaEstimada","prioridad","estado") VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'ABIERTO')`,
        [
          id, 
          args.empresaId, 
          args.enunciado,
          categoria,
          args.urgencia || null,
          args.magnitud || null,
          args.proximoPaso || null,
          args.responsable || null,
          args.fechaEstimada || null,
          args.prioridad || null
        ]
      );
      
      const comp = await recalcularCompletitud(args.empresaId);
      return { 
        id, 
        enunciado: args.enunciado,
        categoria,
        action: 'CREADA',
        completitud: comp
      };
    }
    case 'actualizarNecesidad': {
      const result = await actualizarNecesidadDB(args.necesidadId, args);
      return result;
    }
    case 'guardarOferta': {
      const result = await guardarOfertaDB(args.empresaId, args.capacidad, args.target);
      const comp = await recalcularCompletitud(args.empresaId);
      return { ...result, completitud: comp };
    }
    case 'guardarContacto': {
      const result = await guardarContactoDB(args.empresaId, args.nombre, args.cargo, args.telefono, args.email);
      const comp = await recalcularCompletitud(args.empresaId);
      return { ...result, completitud: comp };
    }
    case 'actualizarPropuestaValor': {
      const result = await actualizarPropuestaValorDB(args.empresaId, args.propuestaValor);
      const comp = await recalcularCompletitud(args.empresaId);
      return { ...result, completitud: comp };
    }
    case 'obtenerFicha': return obtenerFichaDB(args.empresaId);
    case 'analizar_portafolio': return userId ? getPortfolioMetricsDB(userId) : { error: 'Usuario no autenticado' };
    case 'buscar_necesidades': return userId ? buscarNecesidadesDB(userId, args) : { error: 'Usuario no autenticado' };
    case 'agregar_seguimiento': return userId ? guardarSeguimientoDB(args.necesidadId, args.accion, userId, args.resultado) : { error: 'Usuario no autenticado' };
    case 'ver_vencidas': return userId ? getNecesidadesVencidasDB(userId) : { error: 'Usuario no autenticado' };
    case 'drill_down_empresa': return getEmpresaMetricsDB(args.empresaId);
    case 'ver_acciones_pendientes': return getAccionesPendientesDB({ responsable: args.responsable, orderBy: args.orderBy, limit: args.limit });
    case 'ver_historial_empresa': {
      const resolvedId = await resolveEmpresaId(args.empresaId, userId);
      if (!resolvedId) return { error: `Empresa "${args.empresaId}" no encontrada.` };
      const empresa = await queryOne(`SELECT * FROM "Empresa" WHERE "id"=$1`, [resolvedId]);
      const contactos = await query(`SELECT c.*, u."name" as "creadoPorNombre" FROM "Contacto" c LEFT JOIN "User" u ON c."origen"=u."id" WHERE c."empresaId"=$1 ORDER BY c."nombre"`, [resolvedId]);
      const necesidades = await query(`SELECT * FROM "Necesidad" WHERE "empresaId"=$1 ORDER BY "id"`, [resolvedId]);
      const ofertas = await query(`SELECT * FROM "Oferta" WHERE "empresaId"=$1 ORDER BY "id"`, [resolvedId]);
      const acciones = await query(`SELECT * FROM "Accion" WHERE "empresaId"=$1 ORDER BY "fechaLimite" ASC NULLS LAST`, [resolvedId]);
      const reuniones = await query(`SELECT * FROM "Reunion" WHERE "empresaId"=$1 ORDER BY "fecha" DESC`, [resolvedId]);
      return { empresa, contactos, necesidades, ofertas, acciones, reuniones, totalInteracciones: contactos.length + necesidades.length + ofertas.length + acciones.length + reuniones.length };
    }
    default: return { error: `Unknown tool: ${name}` };
  }
}

// ── Gemini API direct call ─────────────────────────────────────

async function callGemini(contents: any[], userId?: string, maxSteps = 20): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  let currentContents = [...contents];

  for (let step = 0; step < maxSteps; step++) {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: currentContents,
        tools: TOOLS,
        systemInstruction: { parts: [{ text: SYSTEM_PROMPT }] },
      }),
    });

    const data = await res.json();
    
    if (!data.candidates?.[0]?.content) {
      console.error('Gemini error:', JSON.stringify(data));
      return 'Lo siento, hubo un error al procesar tu solicitud.';
    }

    const candidate = data.candidates[0].content;
    currentContents.push(candidate);

    // Check if there are function calls
    const functionCalls = candidate.parts?.filter((p: any) => p.functionCall);
    
    if (!functionCalls || functionCalls.length === 0) {
      // No tool calls — return text
      const text = candidate.parts?.map((p: any) => p.text).filter(Boolean).join('');
      return text || '';
    }

    // Execute all function calls and add results
    const functionResponses: any[] = [];
    for (const part of functionCalls) {
      const { name, args } = part.functionCall;
      console.log(`[Step ${step}] Tool call: ${name}(${JSON.stringify(args)})`);
      try {
        const result = await executeTool(name, args, userId);
        console.log(`[Step ${step}] Tool result: ${JSON.stringify(result)}`);
        functionResponses.push({
          functionResponse: { name, response: { name, content: JSON.stringify(result) } }
        });
      } catch (toolError: any) {
        console.error(`[Step ${step}] Tool ERROR: ${name} — ${toolError.message}`);
        functionResponses.push({
          functionResponse: { name, response: { name, content: JSON.stringify({ error: toolError.message, tool: name }) } }
        });
      }
    }

    currentContents.push({ role: 'user', parts: functionResponses });
  }

  return 'Se alcanzó el límite de pasos. Por favor intenta de nuevo.';
}

// ── Generate Title with Gemini ─────────────────────────────────

async function generateTitle(userMessage: string, assistantMessage: string): Promise<string> {
  const apiKey = process.env.GOOGLE_API_KEY;
  const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`;

  const prompt = `Genera un título corto (máximo 50 caracteres) para esta conversación basado en el primer intercambio. Solo responde con el título, sin puntos ni comillas:

Usuario: ${userMessage}
Asistente: ${assistantMessage}

Ejemplos de buenos títulos:
- "Registro TechValle SAS"
- "Métricas generales"
- "Búsqueda sector agro"
- "Contacto Carlos Mendoza"

Título:`;

  try {
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      }),
    });

    const data = await res.json();
    const title = data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'Conversación';
    return title.substring(0, 50);
  } catch (error) {
    console.error('Error generating title:', error);
    return 'Conversación';
  }
}

// ── Route Handler ──────────────────────────────────────────────

export async function POST(req: Request) {
  try {
    // Get the logged-in user
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, conversationId } = await req.json();

    // Get user message (last message in array)
    const userMessage = messages[messages.length - 1];

    // Convert chat messages to Gemini format
    const contents: any[] = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const responseText = await callGemini(contents, session.id);

    // Save messages to conversation if conversationId is provided
    if (conversationId) {
      try {
        // Save user message
        await prisma.message.create({
          data: {
            conversationId,
            role: 'user',
            content: userMessage.content,
          },
        });

        // Save assistant message
        await prisma.message.create({
          data: {
            conversationId,
            role: 'assistant',
            content: responseText,
          },
        });

        // Update lastMessageAt
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });

        // Generate title if this is the first exchange (2 messages total: user + assistant)
        const messageCount = await prisma.message.count({
          where: { conversationId },
        });

        if (messageCount === 2) {
          // Generate title based on first exchange
          const title = await generateTitle(userMessage.content, responseText);
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title },
          });
        }
      } catch (dbError) {
        console.error('Error saving messages to conversation:', dbError);
        // Continue even if DB save fails
      }
    }

    // Return plain text response (parsed by frontend ReadableStream reader)
    return new Response(responseText, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
      },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
