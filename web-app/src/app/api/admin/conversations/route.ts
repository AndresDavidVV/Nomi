import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// GET /api/admin/conversations?key=<secret>&limit=20&userId=xxx&conversationId=xxx
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
    const limit = Math.min(parseInt(url.searchParams.get('limit') || '20'), 50);
    const userId = url.searchParams.get('userId');
    const conversationId = url.searchParams.get('conversationId');
    const phone = url.searchParams.get('phone');

    // If specific conversation requested
    if (conversationId) {
      const conv = await prisma.conversation.findUnique({
        where: { id: conversationId },
        include: {
          user: { select: { name: true, phone: true } },
          messages: { orderBy: { createdAt: 'asc' } },
        },
      });
      if (!conv) {
        return Response.json({ error: 'Conversation not found' }, { status: 404 });
      }
      return Response.json(conv);
    }

    // Resolve phone to userId
    let resolvedUserId = userId;
    if (phone && !resolvedUserId) {
      const user = await prisma.user.findFirst({ where: { phone: { contains: phone } } });
      if (user) resolvedUserId = user.id;
    }

    // List conversations
    const where: any = {};
    if (resolvedUserId) where.userId = resolvedUserId;

    const conversations = await prisma.conversation.findMany({
      where,
      orderBy: { lastMessageAt: 'desc' },
      take: limit,
      include: {
        user: { select: { name: true, phone: true } },
        messages: {
          orderBy: { createdAt: 'asc' },
          take: 50, // max messages per conversation
        },
        _count: { select: { messages: true } },
      },
    });

    return Response.json({
      total: conversations.length,
      conversations: conversations.map(c => ({
        id: c.id,
        user: c.user,
        title: c.title,
        messageCount: c._count.messages,
        createdAt: c.createdAt,
        lastMessageAt: c.lastMessageAt,
        messages: c.messages.map(m => ({
          role: m.role,
          content: m.content,
          createdAt: m.createdAt,
        })),
      })),
    });
  } catch (error: any) {
    console.error('Admin conversations error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
}
