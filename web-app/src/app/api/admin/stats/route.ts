import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/stats?key=<secret> - Quick stats (no auth required, uses API key)
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  
  // Simple API key protection
  if (key !== 'ccc-admin-2026-stats') {
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

    const empresasReales = await prisma.empresa.count({
      where: { NOT: { id: { startsWith: 'seed-' } } },
    });

    const totalEmpresas = await prisma.empresa.count();

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
      empresasReales,
      totalEmpresas,
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
