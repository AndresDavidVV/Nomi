import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/stats?key=<secret>
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
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      select: { phone: true, name: true, createdAt: true },
    });

    const convsWithMsgs = await prisma.conversation.count({
      where: { messages: { some: {} } },
    });

    const emptyConvs = await prisma.conversation.count({
      where: { messages: { none: {} } },
    });

    const totalMsgs = await prisma.message.count();

    const totalEstablecimientos = await prisma.establecimiento.count();

    const totalOportunidades = await prisma.oportunidad.count();

    // Pipeline by stage
    const oportunidadesPorEtapa = await prisma.oportunidad.groupBy({
      by: ['etapaActual'],
      _count: true,
    });

    // Feedback
    let feedbacks: any[] = [];
    try {
      feedbacks = await prisma.feedback.findMany({
        orderBy: [{ rating: 'asc' }, { createdAt: 'desc' }],
        include: { user: { select: { name: true, phone: true } } },
      });
    } catch (e) { /* table may not exist yet */ }

    return new Response(JSON.stringify({
      users,
      totalUsers: users.length,
      convsWithMsgs,
      emptyConvs,
      totalMsgs,
      totalEstablecimientos,
      totalOportunidades,
      pipeline: oportunidadesPorEtapa.reduce((acc: any, g: any) => {
        acc[g.etapaActual] = g._count;
        return acc;
      }, {}),
      feedbacks,
    }, null, 2), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
