import { NextResponse } from 'next/server';
import { getSession } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export async function GET() {
  try {
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

    // Get all users with their stats
    const users = await prisma.user.findMany({
      include: {
        empresas: {
          select: {
            id: true,
            completitud: true
          }
        },
        conversations: {
          include: {
            messages: {
              select: {
                id: true,
                createdAt: true
              }
            }
          }
        }
      }
    });

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const teamMembers = users.map(user => {
      const empresasCount = user.empresas.length;
      const avgCompletitud = empresasCount > 0 
        ? user.empresas.reduce((sum, e) => sum + e.completitud, 0) / empresasCount 
        : 0;
      
      const conversationsCount = user.conversations.length;
      const allMessages = user.conversations.flatMap(c => c.messages);
      const messagesCount = allMessages.length;
      
      const lastActivity = allMessages.length > 0
        ? new Date(Math.max(...allMessages.map(m => m.createdAt.getTime())))
        : null;

      return {
        id: user.id,
        name: user.name || 'Sin nombre',
        phone: user.phone,
        role: user.role,
        createdAt: user.createdAt,
        empresasCount,
        conversationsCount,
        messagesCount,
        lastActivity,
        avgCompletitud: Math.round(avgCompletitud)
      };
    });

    // Global stats
    const totalEmpresas = await prisma.empresa.count();
    const totalNecesidades = await prisma.necesidad.count();
    const allEmpresas = await prisma.empresa.findMany({
      select: { completitud: true }
    });
    const avgCompletitudGlobal = allEmpresas.length > 0
      ? Math.round(allEmpresas.reduce((sum, e) => sum + e.completitud, 0) / allEmpresas.length)
      : 0;
    
    const totalConversations = await prisma.conversation.count();
    const totalMessages = await prisma.message.count();
    
    const activeUsersLast7Days = await prisma.user.count({
      where: {
        conversations: {
          some: {
            messages: {
              some: {
                createdAt: {
                  gte: sevenDaysAgo
                }
              }
            }
          }
        }
      }
    });

    const globalStats = {
      totalEmpresas,
      totalNecesidades,
      avgCompletitud: avgCompletitudGlobal,
      totalConversations,
      totalMessages,
      activeUsersLast7Days
    };

    // Alertas
    const usersWithoutEmpresas = teamMembers.filter(u => u.empresasCount === 0);
    const inactiveUsers = teamMembers.filter(u => {
      if (!u.lastActivity) return true;
      const daysSinceActivity = (Date.now() - u.lastActivity.getTime()) / (1000 * 60 * 60 * 24);
      return daysSinceActivity > 7;
    });

    const alertas = {
      usersWithoutEmpresas,
      inactiveUsers
    };

    return NextResponse.json({
      teamMembers,
      globalStats,
      alertas
    });

  } catch (error) {
    console.error('Manager API error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
