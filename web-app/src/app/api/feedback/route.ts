import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

// POST /api/feedback - Submit feedback
export async function POST(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const { rating, comment, conversationId } = await req.json();

    if (!rating || rating < 1 || rating > 5) {
      return new Response(JSON.stringify({ error: 'Rating debe ser entre 1 y 5' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const feedback = await prisma.feedback.create({
      data: {
        userId: session.id,
        rating: Math.round(rating),
        comment: comment?.trim() || null,
        conversationId: conversationId || null,
      },
    });

    return new Response(JSON.stringify(feedback), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error creating feedback:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// GET /api/feedback - Get feedback with filters
export async function GET(req: Request) {
  try {
    const session = await getSession();
    if (!session) {
      return new Response(JSON.stringify({ error: 'No autenticado' }), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    const url = new URL(req.url);
    const filterRating = url.searchParams.get('rating');
    const filterStatus = url.searchParams.get('status');
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = 20;

    const where: any = {};
    if (filterRating) {
      where.rating = parseInt(filterRating);
    }
    if (filterStatus) {
      where.status = filterStatus;
    }

    // Get stats
    const allFeedback = await prisma.feedback.groupBy({
      by: ['rating'],
      _count: { rating: true },
    });

    const totalCount = allFeedback.reduce((sum, f) => sum + f._count.rating, 0);
    const weightedSum = allFeedback.reduce((sum, f) => sum + f.rating * f._count.rating, 0);
    const averageRating = totalCount > 0 ? weightedSum / totalCount : 0;

    const distribution: Record<number, number> = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    allFeedback.forEach(f => {
      distribution[f.rating] = f._count.rating;
    });

    // Status counts
    const statusCounts = await prisma.feedback.groupBy({
      by: ['status'],
      _count: { status: true },
    });
    const statusDistribution: Record<string, number> = { pending: 0, reviewed: 0, resolved: 0 };
    statusCounts.forEach(s => {
      statusDistribution[s.status] = s._count.status;
    });

    // Get filtered count for pagination
    const filteredCount = await prisma.feedback.count({ where });

    // Get paginated feedback, newest first
    const feedbacks = await prisma.feedback.findMany({
      where,
      orderBy: [{ createdAt: 'desc' }],
      skip: (page - 1) * limit,
      take: limit,
      include: {
        user: {
          select: { name: true, phone: true },
        },
      },
    });

    return new Response(JSON.stringify({
      stats: {
        averageRating: Math.round(averageRating * 10) / 10,
        totalCount,
        distribution,
        statusDistribution,
      },
      feedbacks,
      page,
      totalPages: Math.ceil(filteredCount / limit),
    }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error: any) {
    console.error('Error fetching feedback:', error);
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

// PATCH /api/feedback - Update feedback status (admin via key)
export async function PATCH(req: Request) {
  try {
    const url = new URL(req.url);
    const adminKey = url.searchParams.get('key');

    // Admin key is sufficient — no session needed
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
      return new Response(JSON.stringify({ error: 'Status inválido' }), {
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

    return new Response(JSON.stringify(updated), {
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
