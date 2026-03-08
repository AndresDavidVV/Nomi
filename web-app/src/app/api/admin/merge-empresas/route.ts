import { query } from '@/app/db';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  
  if (key !== 'ccc-admin-2026-stats') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { keepId, removeId, mergeSector } = await req.json();
    
    if (!keepId || !removeId) {
      return NextResponse.json({ error: 'keepId and removeId required' }, { status: 400 });
    }

    // Get both empresas
    const keep = (await query(`SELECT * FROM "Empresa" WHERE "id"=$1`, [keepId]))[0];
    const remove = (await query(`SELECT * FROM "Empresa" WHERE "id"=$1`, [removeId]))[0];
    
    if (!keep || !remove) {
      return NextResponse.json({ error: 'Empresa not found' }, { status: 404 });
    }

    // Move all related records to the keep empresa
    const moved = {
      necesidades: (await query(`UPDATE "Necesidad" SET "empresaId"=$1 WHERE "empresaId"=$2 RETURNING id`, [keepId, removeId])).length,
      ofertas: (await query(`UPDATE "Oferta" SET "empresaId"=$1 WHERE "empresaId"=$2 RETURNING id`, [keepId, removeId])).length,
      contactos: (await query(`UPDATE "Contacto" SET "empresaId"=$1 WHERE "empresaId"=$2 RETURNING id`, [keepId, removeId])).length,
      acciones: (await query(`UPDATE "Accion" SET "empresaId"=$1 WHERE "empresaId"=$2 RETURNING id`, [keepId, removeId])).length,
      reuniones: (await query(`UPDATE "Reunion" SET "empresaId"=$1 WHERE "empresaId"=$2 RETURNING id`, [keepId, removeId])).length,
    };

    // Merge sector if requested
    if (mergeSector && remove.sector) {
      const currentSector = keep.sector || '';
      if (!currentSector.toLowerCase().includes(remove.sector.toLowerCase())) {
        const newSector = currentSector ? `${currentSector}, ${remove.sector}` : remove.sector;
        await query(`UPDATE "Empresa" SET "sector"=$1, "updatedAt"=NOW() WHERE "id"=$2`, [newSector, keepId]);
      }
    }

    // Delete the duplicate
    await query(`DELETE FROM "Empresa" WHERE "id"=$1`, [removeId]);

    // Recalculate completitud for the kept empresa
    const contactos = await query(`SELECT COUNT(*) as c FROM "Contacto" WHERE "empresaId"=$1`, [keepId]);
    const necesidades = await query(`SELECT COUNT(*) as c FROM "Necesidad" WHERE "empresaId"=$1`, [keepId]);
    const ofertas = await query(`SELECT COUNT(*) as c FROM "Oferta" WHERE "empresaId"=$1`, [keepId]);
    const empresa = (await query(`SELECT "propuestaValor" FROM "Empresa" WHERE "id"=$1`, [keepId]))[0];

    let score = 0;
    const missing: string[] = [];
    if (parseInt(contactos[0]?.c) > 0) score += 25; else missing.push("contacto");
    if (parseInt(necesidades[0]?.c) > 0) score += 25; else missing.push("necesidad");
    if (parseInt(ofertas[0]?.c) > 0) score += 25; else missing.push("oferta");
    if (empresa?.propuestaValor) score += 25; else missing.push("propuesta de valor");

    const estado = score === 100 ? 'COMPLETO' : score >= 50 ? 'MINIMO' : 'INCOMPLETO';
    await query(
      `UPDATE "Empresa" SET "completitud"=$1,"camposFaltantes"=$2,"estadoFicha"=$3,"updatedAt"=NOW() WHERE "id"=$4`,
      [score, JSON.stringify(missing), estado, keepId]
    );

    return NextResponse.json({
      success: true,
      kept: { id: keepId, nombre: keep.nombreLegal },
      removed: { id: removeId, nombre: remove.nombreLegal },
      moved,
      newCompletitud: score,
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// GET: list duplicates
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  
  if (key !== 'ccc-admin-2026-stats') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const dupes = await query(`
      SELECT e1.id as id1, e1."nombreLegal" as name1, e1.sector as sector1, e1.completitud as comp1,
             e2.id as id2, e2."nombreLegal" as name2, e2.sector as sector2, e2.completitud as comp2,
             similarity(e1."nombreLegal", e2."nombreLegal") as sim
      FROM "Empresa" e1
      JOIN "Empresa" e2 ON e1.id < e2.id
      WHERE similarity(e1."nombreLegal", e2."nombreLegal") > 0.4
      ORDER BY sim DESC
    `);
    
    return NextResponse.json({ duplicates: dupes });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
