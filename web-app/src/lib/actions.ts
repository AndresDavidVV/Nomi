'use server';

import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

// ── Seguimiento CRUD ──────────────────────────────────────────

export async function crearSeguimiento(necesidadId: string, accion: string, resultado?: string) {
  const session = await getSession();
  if (!session) throw new Error('No autenticado');

  return await prisma.seguimiento.create({
    data: {
      necesidadId,
      accion,
      resultado: resultado || null,
      creadoPorId: session.id,
    },
    include: {
      necesidad: {
        include: {
          empresa: true,
        },
      },
    },
  });
}

export async function obtenerSeguimientos(necesidadId: string) {
  return await prisma.seguimiento.findMany({
    where: { necesidadId },
    orderBy: { fecha: 'desc' },
    include: {
      creadoPor: {
        select: { name: true },
      },
    },
  });
}

export async function obtenerSeguimientosRecientes(userId: string, limit = 10) {
  return await prisma.seguimiento.findMany({
    where: {
      creadoPorId: userId,
    },
    take: limit,
    orderBy: { fecha: 'desc' },
    include: {
      necesidad: {
        include: {
          empresa: {
            select: { nombreLegal: true },
          },
        },
      },
    },
  });
}

// ── Analytics Queries ──────────────────────────────────────────

export async function getPortfolioMetrics(_userId: string) {
  // Cross-user: all empresas visible to everyone
  const empresas = await prisma.empresa.findMany({
    include: {
      necesidades: true,
    },
  });

  const todasNecesidades = empresas.flatMap(e => e.necesidades);

  // Total valor de problemas
  const valorTotal = todasNecesidades.reduce((sum, n) => sum + (n.magnitud || 0), 0);

  // Por estado
  const porEstado = todasNecesidades.reduce((acc: any, n) => {
    acc[n.estado] = (acc[n.estado] || 0) + 1;
    return acc;
  }, {});

  // Por prioridad
  const porPrioridad = todasNecesidades.reduce((acc: any, n) => {
    const p = n.prioridad || 'sin_asignar';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  // Valor por prioridad
  const valorPorPrioridad = todasNecesidades.reduce((acc: any, n) => {
    const p = n.prioridad || 'sin_asignar';
    acc[p] = (acc[p] || 0) + (n.magnitud || 0);
    return acc;
  }, {});

  // Calcular completitud promedio de todas las empresas
  const completitudPromedio = empresas.length > 0
    ? empresas.reduce((sum, e) => sum + e.completitud, 0) / empresas.length
    : 0;

  return {
    totalEmpresas: empresas.length,
    totalNecesidades: todasNecesidades.length,
    valorTotal,
    completitudPromedio: Math.round(completitudPromedio),
    porEstado,
    porPrioridad,
    valorPorPrioridad,
  };
}

export async function getEmpresaMetrics(empresaId: string) {
  const empresa = await prisma.empresa.findUnique({
    where: { id: empresaId },
    include: {
      necesidades: true,
      ofertas: true,
      contactos: true,
    },
  });

  if (!empresa) return null;

  const valorTotal = empresa.necesidades.reduce((sum, n) => sum + (n.magnitud || 0), 0);
  
  const porEstado = empresa.necesidades.reduce((acc: any, n) => {
    acc[n.estado] = (acc[n.estado] || 0) + 1;
    return acc;
  }, {});

  const porPrioridad = empresa.necesidades.reduce((acc: any, n) => {
    const p = n.prioridad || 'sin_asignar';
    acc[p] = (acc[p] || 0) + 1;
    return acc;
  }, {});

  return {
    empresa: {
      nombreLegal: empresa.nombreLegal,
      sector: empresa.sector,
      propuestaValor: empresa.propuestaValor,
    },
    totalNecesidades: empresa.necesidades.length,
    totalOfertas: empresa.ofertas.length,
    totalContactos: empresa.contactos.length,
    valorTotal,
    porEstado,
    porPrioridad,
  };
}

export async function getNecesidadesPorEstado(_userId: string) {
  const necesidades = await prisma.necesidad.findMany({
    include: {
      empresa: {
        select: { nombreLegal: true },
      },
    },
  });

  const agrupadas = necesidades.reduce((acc: any, n) => {
    if (!acc[n.estado]) acc[n.estado] = [];
    acc[n.estado].push(n);
    return acc;
  }, {});

  return agrupadas;
}

export async function getTopNecesidades(_userId: string, limit = 10) {
  return await prisma.necesidad.findMany({
    where: {
      magnitud: {
        not: null,
      },
    },
    orderBy: {
      magnitud: 'desc',
    },
    take: limit,
    include: {
      empresa: {
        select: { nombreLegal: true },
      },
    },
  });
}

export async function getNecesidadesVencidas(_userId: string) {
  const ahora = new Date();

  return await prisma.necesidad.findMany({
    where: {
      fechaEstimada: {
        lt: ahora,
      },
      estado: {
        not: 'RESUELTO',
      },
    },
    orderBy: {
      fechaEstimada: 'asc',
    },
    include: {
      empresa: {
        select: { nombreLegal: true },
      },
    },
  });
}

export async function getProximasAcciones(_userId: string, dias = 7) {
  const ahora = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);

  return await prisma.necesidad.findMany({
    where: {
      fechaEstimada: {
        gte: ahora,
        lte: limite,
      },
      estado: {
        not: 'RESUELTO',
      },
    },
    orderBy: {
      fechaEstimada: 'asc',
    },
    include: {
      empresa: {
        select: { nombreLegal: true },
      },
    },
  });
}

// ── Acciones Pendientes (for dashboard) ───────────────────────

export async function getAccionesPendientes(filters: { 
  orderBy?: 'impact' | 'urgency' | 'deadline';
  responsable?: string;
  limit?: number;
} = {}) {
  const where: any = {
    responsable: { not: null },
    estado: { not: 'RESUELTO' },
  };

  if (filters.responsable) {
    where.responsable = { contains: filters.responsable, mode: 'insensitive' };
  }

  let orderBy: any;
  switch (filters.orderBy) {
    case 'impact':
      orderBy = { magnitud: 'desc' };
      break;
    case 'urgency':
      orderBy = [{ prioridad: 'asc' }, { fechaEstimada: 'asc' }];
      break;
    case 'deadline':
    default:
      orderBy = { fechaEstimada: 'asc' };
      break;
  }

  return await prisma.necesidad.findMany({
    where,
    orderBy,
    take: filters.limit || 50,
    include: {
      empresa: {
        select: { nombreLegal: true },
      },
    },
  });
}

// Group acciones by responsable for dashboard view
export async function getAccionesPorResponsable() {
  const acciones = await prisma.necesidad.findMany({
    where: {
      responsable: { not: null },
      estado: { not: 'RESUELTO' },
    },
    orderBy: { fechaEstimada: 'asc' },
    include: {
      empresa: {
        select: { nombreLegal: true },
      },
    },
  });

  // Group by responsable
  const grouped: Record<string, any[]> = {};
  for (const a of acciones) {
    const resp = a.responsable || 'Sin asignar';
    if (!grouped[resp]) grouped[resp] = [];
    grouped[resp].push(a);
  }

  return grouped;
}

export async function getMisEmpresas(_userId: string) {
  // Cross-user: all empresas visible to everyone
  return await prisma.empresa.findMany({
    orderBy: {
      updatedAt: 'desc',
    },
    include: {
      necesidades: true,
      ofertas: true,
      contactos: true,
    },
  });
}
