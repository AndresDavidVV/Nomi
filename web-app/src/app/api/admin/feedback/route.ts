import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// PATCH /api/admin/feedback?key=ccc-admin-2026-stats - Update feedback status
export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const adminKey = url.searchParams.get('key');

    if (adminKey !== 'ccc-admin-2026-stats') {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { feedbackId, status, adminNote } = await req.json();

    if (!feedbackId || !status) {
      return new Response(JSON.stringify({ error: 'feedbackId y status requeridos' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!['pending', 'reviewed', 'resolved'].includes(status)) {
      return new Response(JSON.stringify({ error: 'Status inválido. Usar: pending, reviewed, resolved' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const updated = await prisma.feedback.update({
      where: { id: feedbackId },
      data: {
        status,
        adminNote: adminNote || null,
        resolvedAt: status === 'resolved' ? new Date() : null,
      },
    });

    return new Response(JSON.stringify({ success: true, feedback: updated }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error updating feedback:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/admin/feedback?key=ccc-admin-2026-stats - List all feedback with status
export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const adminKey = url.searchParams.get('key');

    if (adminKey !== 'ccc-admin-2026-stats') {
      return new Response(JSON.stringify({ error: 'No autorizado' }), {
        status: 403,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const filterStatus = url.searchParams.get('status');
    const where: any = {};
    if (filterStatus) where.status = filterStatus;

    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        user: { select: { name: true, phone: true } },
      },
    });

    const statusCounts = await prisma.feedback.groupBy({
      by: ['status'],
      _count: { status: true },
    });

    return new Response(JSON.stringify({ feedbacks, statusCounts }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
