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
    pgTrgmInitialized = true;
  }
}

// ── DB Operations (Modelo DVA) ─────────────────────────────────

async function buscarEstablecimientoDB(search: string) {
  if (!search) return [];
  await ensurePgTrgm();
  
  const results = await query(
    `SELECT *, 
       GREATEST(
         similarity("nombre", $1),
         COALESCE(similarity("ciudad",''), 0)
       ) AS sim
     FROM "Establecimiento"
     WHERE "nombre" ILIKE $2 
        OR "ciudad" ILIKE $2
        OR similarity("nombre", $1) > 0.25
     ORDER BY sim DESC
     LIMIT 10`,
    [search, `%${search}%`]
  );
  return results;
}

async function crearEstablecimientoDB(nombre: string, tipo: string, userId?: string, pais?: string, ciudad?: string, tamano?: string, tipoOtro?: string) {
  await ensurePgTrgm();
  
  // Dedup check
  const similar = await query(
    `SELECT *, similarity("nombre", $1) AS sim
     FROM "Establecimiento"
     WHERE similarity("nombre", $1) > 0.4
     ORDER BY sim DESC LIMIT 1`,
    [nombre]
  );
  
  if (similar.length > 0) {
    const existing = similar[0];
    return { 
      id: existing.id, 
      nombre: existing.nombre, 
      tipo: existing.tipo,
      action: 'ALREADY_EXISTS',
      message: `Establecimiento "${existing.nombre}" ya existe (similitud ${(existing.sim * 100).toFixed(0)}%). Usa establecimientoId="${existing.id}".`
    };
  }
  
  const id = randomUUID();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO "Establecimiento" ("id","createdAt","updatedAt","nombre","tipo","tipoOtro","pais","ciudad","tamano","completitud","estadoFicha","creadoPorId") 
     VALUES ($1,$2,$2,$3,$4,$5,$6,$7,$8,0,'DESCUBRIR',$9)`,
    [id, now, nombre, tipo, tipoOtro || null, pais || null, ciudad || null, tamano || null, userId || null]
  );
  return { id, nombre, tipo, action: 'CREATED' };
}

async function guardarContactoDB(establecimientoId: string, nombre: string, cargo?: string, telefono?: string, email?: string, esDecisor?: boolean) {
  const id = randomUUID();
  await query(
    `INSERT INTO "Contacto" ("id","establecimientoId","nombre","cargo","telefono","email","esDecisor","createdAt") 
     VALUES ($1,$2,$3,$4,$5,$6,$7,NOW())`,
    [id, establecimientoId, nombre, cargo || null, telefono || null, email || null, esDecisor || false]
  );
  return { id, nombre, cargo: cargo || null };
}

async function crearOportunidadDB(establecimientoId: string, comoConocio: string, hipotesisValor?: string, nivelPotencial?: string, teamMemberId?: string) {
  const id = randomUUID();
  const now = new Date().toISOString();
  await query(
    `INSERT INTO "Oportunidad" ("id","establecimientoId","registradoPorId","comoConocio","hipotesisValor","nivelPotencial","etapaActual","createdAt","updatedAt") 
     VALUES ($1,$2,$3,$4,$5,$6,'DESCUBRIR',$7,$7)`,
    [id, establecimientoId, teamMemberId || null, comoConocio, hipotesisValor || null, nivelPotencial || null, now]
  );
  return { id, etapaActual: 'DESCUBRIR', action: 'CREATED' };
}

async function validarOportunidadDB(oportunidadId: string, pedidosMes?: number, puntoExigente?: string, valorNomi?: string, nivelInteres?: string) {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (pedidosMes !== undefined) { sets.push(`"pedidosMes"=$${idx++}`); values.push(pedidosMes); }
  if (puntoExigente) { sets.push(`"puntoExigente"=$${idx++}`); values.push(puntoExigente); }
  if (valorNomi) { sets.push(`"valorNomi"=$${idx++}`); values.push(valorNomi); }
  if (nivelInteres) { sets.push(`"nivelInteres"=$${idx++}`); values.push(nivelInteres); }
  
  sets.push(`"etapaActual"='VALIDAR'`);
  sets.push(`"updatedAt"=$${idx++}`);
  values.push(new Date().toISOString());
  values.push(oportunidadId);

  await query(`UPDATE "Oportunidad" SET ${sets.join(',')} WHERE "id"=$${idx}`, values);
  return { success: true, etapaActual: 'VALIDAR' };
}

async function activarOportunidadDB(oportunidadId: string, updates: any) {
  const sets: string[] = [];
  const values: any[] = [];
  let idx = 1;

  if (updates.confirmacionInteres) { sets.push(`"confirmacionInteres"=$${idx++}`); values.push(updates.confirmacionInteres); }
  if (updates.siguientePaso) { sets.push(`"siguientePaso"=$${idx++}`); values.push(updates.siguientePaso); }
  if (updates.valorPropuesto) { sets.push(`"valorPropuesto"=$${idx++}`); values.push(updates.valorPropuesto); }
  if (updates.alcanceImplementacion) { sets.push(`"alcanceImplementacion"=$${idx++}`); values.push(updates.alcanceImplementacion); }
  if (updates.condiciones) { sets.push(`"condiciones"=$${idx++}`); values.push(updates.condiciones); }
  if (updates.fechaSeguimiento) { sets.push(`"fechaSeguimiento"=$${idx++}`); values.push(updates.fechaSeguimiento); }
  if (updates.comentariosCliente) { sets.push(`"comentariosCliente"=$${idx++}`); values.push(updates.comentariosCliente); }
  if (updates.ajustesSolicitados) { sets.push(`"ajustesSolicitados"=$${idx++}`); values.push(updates.ajustesSolicitados); }
  if (updates.probabilidadCierre) { sets.push(`"probabilidadCierre"=$${idx++}`); values.push(updates.probabilidadCierre); }
  if (updates.resultadoFinal) { sets.push(`"resultadoFinal"=$${idx++}`); values.push(updates.resultadoFinal); }

  sets.push(`"etapaActual"=$${idx++}`);
  values.push(updates.resultadoFinal ? 'CERRADO' : 'ACTIVAR');
  sets.push(`"updatedAt"=$${idx++}`);
  values.push(new Date().toISOString());
  values.push(oportunidadId);

  if (sets.length <= 2) return { error: 'No updates provided' };

  await query(`UPDATE "Oportunidad" SET ${sets.join(',')} WHERE "id"=$${idx}`, values);
  return { success: true, etapaActual: updates.resultadoFinal ? 'CERRADO' : 'ACTIVAR' };
}

async function obtenerFichaEstablecimientoDB(establecimientoId: string) {
  const est = await queryOne(`SELECT * FROM "Establecimiento" WHERE "id"=$1`, [establecimientoId]);
  if (!est) return { error: 'Establecimiento no encontrado' };
  const contactos = await query(`SELECT * FROM "Contacto" WHERE "establecimientoId"=$1`, [establecimientoId]);
  const oportunidades = await query(`SELECT * FROM "Oportunidad" WHERE "establecimientoId"=$1 ORDER BY "createdAt" DESC`, [establecimientoId]);
  return { establecimiento: est, contactos, oportunidades };
}

async function getPipelineMetricsDB() {
  const totalEstablecimientos = await queryOne(`SELECT COUNT(*) as total FROM "Establecimiento"`, []);
  const porEtapa = await query(
    `SELECT "etapaActual", COUNT(*) as total FROM "Oportunidad" GROUP BY "etapaActual"`, []
  );
  const porTipo = await query(
    `SELECT "tipo", COUNT(*) as total FROM "Establecimiento" GROUP BY "tipo"`, []
  );
  const porNivelInteres = await query(
    `SELECT "nivelInteres", COUNT(*) as total FROM "Oportunidad" WHERE "nivelInteres" IS NOT NULL GROUP BY "nivelInteres"`, []
  );
  const totalOportunidades = await queryOne(`SELECT COUNT(*) as total FROM "Oportunidad"`, []);
  
  return {
    totalEstablecimientos: parseInt(totalEstablecimientos?.total || '0'),
    totalOportunidades: parseInt(totalOportunidades?.total || '0'),
    porEtapa: porEtapa.reduce((acc: any, r: any) => { acc[r.etapaActual] = parseInt(r.total); return acc; }, {}),
    porTipo: porTipo.reduce((acc: any, r: any) => { acc[r.tipo] = parseInt(r.total); return acc; }, {}),
    porNivelInteres: porNivelInteres.reduce((acc: any, r: any) => { acc[r.nivelInteres || 'sin_dato'] = parseInt(r.total); return acc; }, {}),
  };
}

async function getOportunidadesPorEtapaDB(etapa: string) {
  return await query(
    `SELECT o.*, e."nombre" as "nombreEstablecimiento", e."tipo", e."ciudad", e."pais"
     FROM "Oportunidad" o 
     JOIN "Establecimiento" e ON o."establecimientoId"=e."id" 
     WHERE o."etapaActual"=$1 
     ORDER BY o."updatedAt" DESC LIMIT 20`,
    [etapa]
  );
}

async function guardarSeguimientoDB(oportunidadId: string, accion: string, userId: string, resultado?: string) {
  const id = randomUUID();
  await query(
    `INSERT INTO "Seguimiento" ("id","oportunidadId","accion","resultado","creadoPorId","fecha") VALUES ($1,$2,$3,$4,$5,NOW())`,
    [id, oportunidadId, accion, resultado || null, userId]
  );
  return { id, accion, resultado: resultado || null };
}

// ── Resolve establecimientoId from name ────────────────────────

async function resolveEstablecimientoId(input: string): Promise<string | null> {
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(input)) {
    return input;
  }
  const results = await buscarEstablecimientoDB(input);
  if (results.length > 0) return results[0].id;
  return null;
}

// ── Tool definitions for Gemini API ────────────────────────────

const TOOLS = [{
  functionDeclarations: [
    {
      name: 'buscarEstablecimiento',
      description: 'Buscar establecimiento por nombre o ciudad. Usar SIEMPRE antes de crear para evitar duplicados.',
      parameters: { type: 'OBJECT', properties: { searchQuery: { type: 'STRING', description: 'Nombre o ciudad a buscar' } }, required: ['searchQuery'] }
    },
    {
      name: 'crearEstablecimiento',
      description: 'Crear establecimiento nuevo. Solo usar después de buscar y confirmar que no existe.',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          nombre: { type: 'STRING' }, 
          tipo: { type: 'STRING', description: 'RESTAURANTE, CLUB, HOTEL, BAR, EXPERIENCIA_TURISTICA, OTRO' },
          tipoOtro: { type: 'STRING', description: 'Si tipo es OTRO, especificar aquí' },
          pais: { type: 'STRING' }, 
          ciudad: { type: 'STRING' },
          tamano: { type: 'STRING', description: 'Tamaño aproximado del establecimiento' }
        }, 
        required: ['nombre', 'tipo'] 
      }
    },
    {
      name: 'guardarContacto',
      description: 'Registrar un contacto del establecimiento.',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          establecimientoId: { type: 'STRING' }, 
          nombre: { type: 'STRING' }, 
          cargo: { type: 'STRING' }, 
          telefono: { type: 'STRING' }, 
          email: { type: 'STRING' },
          esDecisor: { type: 'BOOLEAN', description: 'true si esta persona toma decisiones de tecnología/innovación' }
        }, 
        required: ['establecimientoId', 'nombre'] 
      }
    },
    {
      name: 'crearOportunidad',
      description: 'Crear una nueva oportunidad para un establecimiento (Etapa DESCUBRIR). Registra cómo se conoció, hipótesis de valor y nivel de potencial.',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          establecimientoId: { type: 'STRING' }, 
          comoConocio: { type: 'STRING', description: 'REFERIDO, VISITA, SOCIO, EVENTO, INVESTIGACION, OTRO' },
          hipotesisValor: { type: 'STRING', description: 'Cómo crees que Nomi podría encajar aquí' },
          nivelPotencial: { type: 'STRING', description: 'ALTO, MEDIO, BAJO' }
        }, 
        required: ['establecimientoId', 'comoConocio'] 
      }
    },
    {
      name: 'validarOportunidad',
      description: 'Mover oportunidad a Etapa VALIDAR. Registrar datos de validación: pedidos/mes, punto exigente, dónde Nomi aporta valor, nivel de interés.',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          oportunidadId: { type: 'STRING' },
          pedidosMes: { type: 'NUMBER', description: 'Pedidos aproximados por mes' },
          puntoExigente: { type: 'STRING', description: 'Qué parte del servicio es más exigente: TOMAR_PEDIDOS, EXPLICAR_MENU, DESPLAZAMIENTO_MESEROS, ENVIO_COCINA, ATENCION_SIMULTANEA, OTRO' },
          valorNomi: { type: 'STRING', description: 'Dónde Nomi aporta más valor: TOMA_PEDIDOS, EXPLICACION_MENU, ATENCION_MULTIMESA, CLIENTES_INTERNACIONALES, APOYO_EVENTOS, CAPACITACION, OTRO' },
          nivelInteres: { type: 'STRING', description: 'ALTO, MEDIO, BAJO' }
        }, 
        required: ['oportunidadId'] 
      }
    },
    {
      name: 'activarOportunidad',
      description: 'Mover oportunidad a Etapa ACTIVAR o cerrarla. Registrar confirmación de interés, propuesta, negociación y cierre.',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          oportunidadId: { type: 'STRING' },
          confirmacionInteres: { type: 'STRING', description: 'SI_AVANZAR, INTERES_ALTO_REVISANDO, INTERES_MEDIO, NO_POR_AHORA' },
          siguientePaso: { type: 'STRING', description: 'REUNION_TECNICA, REVISION_COMERCIAL, PRESENTACION_JUNTA, DEFINICION_FECHAS' },
          valorPropuesto: { type: 'STRING' },
          alcanceImplementacion: { type: 'STRING' },
          condiciones: { type: 'STRING' },
          fechaSeguimiento: { type: 'STRING', description: 'Fecha ISO para próximo seguimiento' },
          comentariosCliente: { type: 'STRING' },
          ajustesSolicitados: { type: 'STRING' },
          probabilidadCierre: { type: 'STRING', description: 'ALTA, MEDIA, BAJA' },
          resultadoFinal: { type: 'STRING', description: 'VENTA_CERRADA, EN_PAUSA, DESCARTADA — si se llena, la oportunidad se cierra' }
        }, 
        required: ['oportunidadId'] 
      }
    },
    {
      name: 'obtenerFicha',
      description: 'Obtener la ficha completa de un establecimiento con contactos y oportunidades.',
      parameters: { type: 'OBJECT', properties: { establecimientoId: { type: 'STRING' } }, required: ['establecimientoId'] }
    },
    {
      name: 'verPipeline',
      description: 'Ver métricas del pipeline: total establecimientos, oportunidades por etapa DVA, tipos de establecimiento, niveles de interés.',
      parameters: { type: 'OBJECT', properties: {} }
    },
    {
      name: 'verOportunidadesPorEtapa',
      description: 'Listar oportunidades filtradas por etapa del funnel DVA.',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          etapa: { type: 'STRING', description: 'DESCUBRIR, VALIDAR, ACTIVAR, CERRADO' } 
        }, 
        required: ['etapa'] 
      }
    },
    {
      name: 'agregarSeguimiento',
      description: 'Agregar un seguimiento a una oportunidad (acción tomada, resultado).',
      parameters: { 
        type: 'OBJECT', 
        properties: { 
          oportunidadId: { type: 'STRING' },
          accion: { type: 'STRING', description: 'Acción realizada' },
          resultado: { type: 'STRING', description: 'Resultado obtenido (opcional)' }
        },
        required: ['oportunidadId', 'accion']
      }
    },
  ]
}];

const SYSTEM_PROMPT = `Eres Nomi, la asistente de ventas de la plataforma Nomi — un sistema de atención inteligente para restaurantes y establecimientos gastronómicos.

Tu trabajo: ayudar al equipo comercial de Nomi a registrar, validar y activar oportunidades de venta usando el Modelo DVA (Descubrir · Validar · Activar).

## Modelo DVA

El funnel tiene 3 etapas:

### Etapa 1 — DESCUBRIR
Identificar si vale la pena explorar una oportunidad:
- Nombre y tipo del establecimiento (restaurante, club, hotel, bar, etc.)
- País, ciudad, tamaño
- Cómo lo conociste (referido, visita, socio, evento, investigación)
- Hipótesis de valor: ¿cómo podría Nomi encajar aquí?
- Contacto dentro del establecimiento (si existe)
- Nivel inicial de potencial (alto/medio/bajo)

### Etapa 2 — VALIDAR
Confirmar si Nomi realmente aporta valor:
- ¿Cuántos pedidos aproximados atienden por mes?
- ¿Qué parte del servicio es más exigente? (tomar pedidos, explicar menú, desplazamiento meseros, envío a cocina, atención simultánea)
- ¿Quién toma decisiones de tecnología/innovación?
- ¿Dónde Nomi aporta más valor? (toma de pedidos, explicación menú, atención multimesa, clientes internacionales, eventos, capacitación)
- Nivel de interés del establecimiento

### Etapa 3 — ACTIVAR
Iniciar el proceso de implementación:
- Confirmación de interés
- Responsable interno del establecimiento
- Siguiente paso acordado
- Propuesta comercial (valor, alcance, condiciones)
- Negociación y ajustes
- Cierre (venta cerrada / en pausa / descartada)

## Reglas de Operación

- **Guarda info parcial sin bloquear**: No necesitas todos los campos. Si dan nombre + tipo, crea el establecimiento.
- **Sé conversacional**: No interrogues. Registra lo que te den y sugiere amablemente completar.
- **Infiere automáticamente**: País, ciudad, tipo de establecimiento — dedúcelo del contexto. No preguntes lo obvio.
- **SIEMPRE busca antes de crear**: Evita duplicados.
- **Usa los IDs correctos**: Después de crear, usa el UUID devuelto para operaciones siguientes.
- **Múltiples registros**: Si mencionan varios establecimientos, procesa TODOS antes de responder.
- **Búsqueda directa**: Si piden "busca X", busca y muestra la ficha sin preguntar.
- **Cross-usuario**: Todos los registros son visibles para todo el equipo.

## Tono
Profesional pero cercana. Directa y eficiente. Usas español. Eres parte del equipo Nomi.`;

// ── Execute tool calls ─────────────────────────────────────────

async function executeTool(name: string, args: any, userId?: string): Promise<any> {
  // Resolve establecimientoId from name if needed
  if (args.establecimientoId && name !== 'buscarEstablecimiento' && name !== 'crearEstablecimiento') {
    const resolvedId = await resolveEstablecimientoId(args.establecimientoId);
    if (!resolvedId) return { error: `Establecimiento "${args.establecimientoId}" no encontrado. Búscalo primero.` };
    args.establecimientoId = resolvedId;
  }

  switch (name) {
    case 'buscarEstablecimiento': return buscarEstablecimientoDB(args.searchQuery);
    case 'crearEstablecimiento': {
      const result = await crearEstablecimientoDB(args.nombre, args.tipo, userId, args.pais, args.ciudad, args.tamano, args.tipoOtro);
      return { ...result, message: `Usa establecimientoId="${result.id}" para las operaciones siguientes.` };
    }
    case 'guardarContacto': {
      return guardarContactoDB(args.establecimientoId, args.nombre, args.cargo, args.telefono, args.email, args.esDecisor);
    }
    case 'crearOportunidad': {
      // Try to find team member for this user
      let teamMemberId = null;
      if (userId) {
        const tm = await queryOne(`SELECT "id" FROM "TeamMember" WHERE "userId"=$1`, [userId]);
        teamMemberId = tm?.id || null;
      }
      return crearOportunidadDB(args.establecimientoId, args.comoConocio, args.hipotesisValor, args.nivelPotencial, teamMemberId);
    }
    case 'validarOportunidad': return validarOportunidadDB(args.oportunidadId, args.pedidosMes, args.puntoExigente, args.valorNomi, args.nivelInteres);
    case 'activarOportunidad': return activarOportunidadDB(args.oportunidadId, args);
    case 'obtenerFicha': return obtenerFichaEstablecimientoDB(args.establecimientoId);
    case 'verPipeline': return getPipelineMetricsDB();
    case 'verOportunidadesPorEtapa': return getOportunidadesPorEtapaDB(args.etapa);
    case 'agregarSeguimiento': return userId ? guardarSeguimientoDB(args.oportunidadId, args.accion, userId, args.resultado) : { error: 'No autenticado' };
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

    const functionCalls = candidate.parts?.filter((p: any) => p.functionCall);
    
    if (!functionCalls || functionCalls.length === 0) {
      const text = candidate.parts?.map((p: any) => p.text).filter(Boolean).join('');
      return text || '';
    }

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
          functionResponse: { name, response: { name, content: JSON.stringify({ error: toolError.message }) } }
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

  const prompt = `Genera un título corto (máximo 50 caracteres) para esta conversación de un CRM de restaurantes. Solo responde con el título, sin puntos ni comillas:

Usuario: ${userMessage}
Asistente: ${assistantMessage}

Ejemplos: "Registro La Parrilla Bogotá", "Pipeline de ventas", "Validación Hotel Marina"

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
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { messages, conversationId } = await req.json();
    const userMessage = messages[messages.length - 1];

    const contents: any[] = messages.map((m: any) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: m.content }],
    }));

    const responseText = await callGemini(contents, session.id);

    if (conversationId) {
      try {
        await prisma.message.create({
          data: { conversationId, role: 'user', content: userMessage.content },
        });
        await prisma.message.create({
          data: { conversationId, role: 'assistant', content: responseText },
        });
        await prisma.conversation.update({
          where: { id: conversationId },
          data: { lastMessageAt: new Date() },
        });

        const messageCount = await prisma.message.count({ where: { conversationId } });
        if (messageCount === 2) {
          const title = await generateTitle(userMessage.content, responseText);
          await prisma.conversation.update({
            where: { id: conversationId },
            data: { title },
          });
        }
      } catch (dbError) {
        console.error('Error saving messages:', dbError);
      }
    }

    return new Response(responseText, {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    });
  } catch (error: any) {
    console.error('Chat API error:', error);
    return new Response(JSON.stringify({ error: error?.message || 'Unknown error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
