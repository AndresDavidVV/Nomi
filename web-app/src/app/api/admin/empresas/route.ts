import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/empresas?key=<secret>&phone=xxx
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');

  if (key !== 'ccc-admin-2026-stats') {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const phone = url.searchParams.get('phone');
    const where: any = {};
    
    if (phone) {
      const user = await prisma.user.findFirst({ where: { phone: { contains: phone } } });
      if (user) where.creadoPorId = user.id;
    }

    const empresas = await prisma.empresa.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        necesidades: true,
        ofertas: true,
        contactos: true,
        creadoPor: { select: { name: true, phone: true } },
      },
    });

    return Response.json({
      total: empresas.length,
      empresas: empresas.map(e => ({
        id: e.id,
        nombreLegal: e.nombreLegal,
        sector: e.sector,
        completitud: e.completitud,
        creadoPor: e.creadoPor,
        necesidades: e.necesidades.length,
        ofertas: e.ofertas.length,
        contactos: e.contactos.length,
        createdAt: e.createdAt,
        updatedAt: e.updatedAt,
      })),
    });
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}
