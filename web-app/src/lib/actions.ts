'use server';

import { PrismaClient } from '@prisma/client';
import { getSession } from '@/lib/auth';

const prisma = new PrismaClient();

// ── Pipeline Metrics (DVA) ─────────────────────────────────────

export async function getPipelineMetrics() {
  const establecimientos = await prisma.establecimiento.findMany({
    include: { oportunidades: true },
  });

  const todasOportunidades = establecimientos.flatMap(e => e.oportunidades);

  const porEtapa = todasOportunidades.reduce((acc: any, o) => {
    acc[o.etapaActual] = (acc[o.etapaActual] || 0) + 1;
    return acc;
  }, {});

  const porTipo = establecimientos.reduce((acc: any, e) => {
    acc[e.tipo] = (acc[e.tipo] || 0) + 1;
    return acc;
  }, {});

  const porNivelInteres = todasOportunidades.reduce((acc: any, o) => {
    const nivel = o.nivelInteres || 'sin_dato';
    acc[nivel] = (acc[nivel] || 0) + 1;
    return acc;
  }, {});

  const porResultado = todasOportunidades
    .filter(o => o.resultadoFinal)
    .reduce((acc: any, o) => {
      acc[o.resultadoFinal!] = (acc[o.resultadoFinal!] || 0) + 1;
      return acc;
    }, {});

  return {
    totalEstablecimientos: establecimientos.length,
    totalOportunidades: todasOportunidades.length,
    porEtapa,
    porTipo,
    porNivelInteres,
    porResultado,
  };
}

// ── Establecimientos ───────────────────────────────────────────

export async function getEstablecimientos() {
  return await prisma.establecimiento.findMany({
    orderBy: { updatedAt: 'desc' },
    include: {
      contactos: true,
      oportunidades: true,
      creadoPor: { select: { name: true, phone: true } },
    },
  });
}

// ── Oportunidades por Etapa ────────────────────────────────────

export async function getOportunidadesPorEtapa(etapa: string) {
  return await prisma.oportunidad.findMany({
    where: { etapaActual: etapa },
    orderBy: { updatedAt: 'desc' },
    include: {
      establecimiento: {
        select: { nombre: true, tipo: true, ciudad: true, pais: true },
      },
    },
  });
}

// ── Seguimientos Recientes ─────────────────────────────────────

export async function obtenerSeguimientosRecientes(limit = 10) {
  return await prisma.seguimiento.findMany({
    take: limit,
    orderBy: { fecha: 'desc' },
    include: {
      oportunidad: {
        include: {
          establecimiento: {
            select: { nombre: true },
          },
        },
      },
      creadoPor: {
        select: { name: true },
      },
    },
  });
}

// ── Oportunidades próximas a seguimiento ───────────────────────

export async function getProximosSeguimientos(dias = 7) {
  const ahora = new Date();
  const limite = new Date();
  limite.setDate(limite.getDate() + dias);

  return await prisma.oportunidad.findMany({
    where: {
      fechaSeguimiento: {
        gte: ahora,
        lte: limite,
      },
      etapaActual: { not: 'CERRADO' },
    },
    orderBy: { fechaSeguimiento: 'asc' },
    include: {
      establecimiento: {
        select: { nombre: true, tipo: true, ciudad: true },
      },
    },
  });
}

// ── Oportunidades vencidas (seguimiento pasado) ────────────────

export async function getOportunidadesVencidas() {
  const ahora = new Date();

  return await prisma.oportunidad.findMany({
    where: {
      fechaSeguimiento: { lt: ahora },
      etapaActual: { not: 'CERRADO' },
    },
    orderBy: { fechaSeguimiento: 'asc' },
    include: {
      establecimiento: {
        select: { nombre: true, tipo: true, ciudad: true },
      },
    },
  });
}
