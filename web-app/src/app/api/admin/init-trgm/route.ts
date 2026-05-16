import { query } from '@/app/db';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const key = searchParams.get('key');
  
  if (key !== 'nomi-admin-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    await query(`CREATE EXTENSION IF NOT EXISTS pg_trgm`);
    
    // Verify it works
    const result = await query(`SELECT similarity('test', 'tset') as sim`);
    
    return NextResponse.json({ 
      success: true, 
      message: 'pg_trgm extension created/verified',
      testSimilarity: result[0]?.sim 
    });
  } catch (error: any) {
    return NextResponse.json({ 
      error: error.message,
      hint: 'You may need rds_superuser or rds.allowed_extensions configured'
    }, { status: 500 });
  }
}
