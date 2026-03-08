import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

// DELETE /api/conversations/cleanup - Remove empty conversations for current user
export async function DELETE() {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const emptyConvs = await prisma.conversation.findMany({
      where: {
        userId: session.id,
        messages: { none: {} },
      },
      select: { id: true },
    });

    if (emptyConvs.length === 0) {
      return new Response(JSON.stringify({ deleted: 0, message: 'No hay conversaciones vacías' }), {
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const result = await prisma.conversation.deleteMany({
      where: { id: { in: emptyConvs.map(c => c.id) } },
    });

    return new Response(JSON.stringify({ deleted: result.count, message: `Se eliminaron ${result.count} conversaciones vacías` }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error cleaning up conversations:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
