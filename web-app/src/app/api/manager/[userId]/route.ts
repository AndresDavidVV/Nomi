import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params;

    // Auth check
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current user with role
    const currentUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { role: true }
    });

    // Check if user is MANAGER
    if (!currentUser || currentUser.role !== 'MANAGER') {
      return NextResponse.json({ error: 'Forbidden - Manager access required' }, { status: 403 });
    }

    // Get target user
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        empresas: {
          include: {
            necesidades: true,
            ofertas: true,
            contactos: true
          }
        },
        conversations: {
          include: {
            messages: {
              orderBy: {
                createdAt: 'asc'
              }
            }
          },
          orderBy: {
            lastMessageAt: 'desc'
          }
        }
      }
    });

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    // Calculate activity timeline (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMessages = user.conversations.flatMap(c => 
      c.messages.filter(m => m.createdAt >= thirtyDaysAgo && m.role === 'user')
    );

    // Group messages by day
    const activityByDay: Record<string, number> = {};
    recentMessages.forEach(msg => {
      const dateKey = msg.createdAt.toISOString().split('T')[0];
      activityByDay[dateKey] = (activityByDay[dateKey] || 0) + 1;
    });

    const activityTimeline = Object.entries(activityByDay)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));

    return NextResponse.json({
      user: {
        id: user.id,
        name: user.name,
        phone: user.phone,
        email: user.email,
        role: user.role,
        createdAt: user.createdAt
      },
      empresas: user.empresas,
      conversations: user.conversations,
      activityTimeline
    });

  } catch (error) {
    console.error('Manager drilldown API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
