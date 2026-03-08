'use server'

import { query, queryOne } from './db'
import { randomUUID } from 'crypto'

// --- EMPRESAS ---

export async function buscarEmpresa(search: string) {
  if (!search) return []
  const q = `%${search}%`
  return await query(
    `SELECT * FROM "Empresa" WHERE "nombreLegal" ILIKE $1 OR "alias" ILIKE $1 LIMIT 10`,
    [q]
  )
}

export async function crearEmpresa(data: { nombre: string; alias?: string; sector?: string }) {
  const id = randomUUID()
  const now = new Date().toISOString()
  await query(
    `INSERT INTO "Empresa" ("id", "createdAt", "updatedAt", "nombreLegal", "alias", "sector", "camposFaltantes", "completitud", "estadoFicha")
     VALUES ($1, $2, $2, $3, $4, $5, $6, 0, 'INCOMPLETO')`,
    [id, now, data.nombre, data.alias || null, data.sector || null, JSON.stringify(["diferenciador", "oferta", "necesidad"])]
  )
  return { id, nombreLegal: data.nombre, sector: data.sector }
}

export async function obtenerFichaCompleta(id: string) {
  const empresa = await queryOne(`SELECT * FROM "Empresa" WHERE "id" = $1`, [id])
  if (!empresa) return null
  const contactos = await query(`SELECT * FROM "Contacto" WHERE "empresaId" = $1`, [id])
  const necesidades = await query(`SELECT * FROM "Necesidad" WHERE "empresaId" = $1`, [id])
  const ofertas = await query(`SELECT * FROM "Oferta" WHERE "empresaId" = $1`, [id])
  return { ...empresa, contactos, necesidades, ofertas }
}

// --- GUARDADO INCREMENTAL ---

export async function guardarNecesidad(empresaId: string, data: { enunciado: string; urgencia?: string }) {
  const id = randomUUID()
  await query(
    `INSERT INTO "Necesidad" ("id", "empresaId", "enunciado", "urgencia", "estado") VALUES ($1, $2, $3, $4, 'ABIERTO')`,
    [id, empresaId, data.enunciado, data.urgencia || null]
  )
  await recalcularCompletitud(empresaId)
  return { id, enunciado: data.enunciado }
}

export async function guardarOferta(empresaId: string, data: { capacidad: string; target?: string }) {
  const id = randomUUID()
  await query(
    `INSERT INTO "Oferta" ("id", "empresaId", "capacidad", "target") VALUES ($1, $2, $3, $4)`,
    [id, empresaId, data.capacidad, data.target || null]
  )
  await recalcularCompletitud(empresaId)
  return { id, capacidad: data.capacidad }
}

// --- LOGICA DE COMPLETITUD ---

async function recalcularCompletitud(empresaId: string) {
  const ficha = await obtenerFichaCompleta(empresaId)
  if (!ficha) return

  let score = 0
  const missing: string[] = []

  if (ficha.contactos.length > 0) score += 25; else missing.push("contacto")
  if (ficha.necesidades.length > 0) score += 25; else missing.push("necesidad")
  if (ficha.ofertas.length > 0) score += 25; else missing.push("oferta")
  if (ficha.diferenciador) score += 25; else missing.push("diferenciador")

  let estado = "INCOMPLETO"
  if (score >= 50) estado = "MINIMO"
  if (score === 100) estado = "COMPLETO"

  await query(
    `UPDATE "Empresa" SET "completitud" = $1, "camposFaltantes" = $2, "estadoFicha" = $3, "updatedAt" = $4 WHERE "id" = $5`,
    [score, JSON.stringify(missing), estado, new Date().toISOString(), empresaId]
  )
}
