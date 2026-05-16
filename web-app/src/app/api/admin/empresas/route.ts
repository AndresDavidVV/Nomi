import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/empresas?key=<secret>&phone=xxx
// Now returns Establecimiento data for Nomi CRM
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (key !== 'nomi-admin-2026') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const phone = url.searchParams.get('phone');
    const etapa = url.searchParams.get('etapa');
    const where: any = {};
    
    if (phone) {
      const user = await prisma.user.findFirst({ where: { phone: { contains: phone } } });
      if (user) where.creadoPorId = user.id;
    }

    const establecimientos = await prisma.establecimiento.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        contactos: true,
        oportunidades: etapa ? { where: { etapaActual: etapa } } : true,
        creadoPor: { select: { name: true, phone: true } },
      },
    });

    return Response.json({
      total: establecimientos.length,
      establecimientos: establecimientos.map(e => ({
        id: e.id,
        nombre: e.nombre,
        tipo: e.tipo,
        ciudad: e.ciudad,
        pais: e.pais,
        estadoFicha: e.estadoFicha,
        completitud: e.completitud,
        creadoPor: e.creadoPor,
        contactos: e.contactos.length,
        oportunidades: e.oportunidades.length,
        oportunidadesDetalle: e.oportunidades.map(o => ({
          id: o.id,
          etapaActual: o.etapaActual,
          nivelPotencial: o.nivelPotencial,
          nivelInteres: o.nivelInteres,
          resultadoFinal: o.resultadoFinal,
        })),
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
