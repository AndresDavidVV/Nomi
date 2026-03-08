import { NextRequest, NextResponse } from 'next/server';
import { query } from '@/app/db';

const ADMIN_KEY = 'ccc-admin-2026-stats';

export async function POST(req: NextRequest) {
  try {
    // Check admin key
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key');
    
    if (key !== ADMIN_KEY) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    console.log('Starting role migration...');
    
    // Add role column if it doesn't exist (idempotent)
    try {
      await query(`
        ALTER TABLE "User" 
        ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'USER'
      `);
      console.log('Role column added or already exists');
    } catch (error) {
      console.error('Error adding role column:', error);
    }

    // Set MANAGER for Andres and Monica Moreno
    const andresPhone = '573176677225';
    const monicaMorenoPhone = '573173631848';
    // Remove MANAGER from Monica Ricardo (was set by mistake)
    const monicaRicardoPhone = '573137207163';
    
    console.log('Removing MANAGER from Monica Ricardo...');
    await query(
      `UPDATE "User" SET role = 'USER' WHERE phone = $1 RETURNING id, name, phone, role`,
      [monicaRicardoPhone]
    );
    
    console.log('Setting MANAGER role for Andres...');
    const andresResult = await query(
      `UPDATE "User" SET role = 'MANAGER' WHERE phone = $1 RETURNING id, name, phone, role`,
      [andresPhone]
    );
    
    console.log('Setting MANAGER role for Monica Moreno...');
    const monicaResult = await query(
      `UPDATE "User" SET role = 'MANAGER' WHERE phone = $1 RETURNING id, name, phone, role`,
      [monicaMorenoPhone]
    );
    
    // Get all managers
    const managers = await query(
      `SELECT id, name, phone, role FROM "User" WHERE role = 'MANAGER' ORDER BY name`
    );
    
    return NextResponse.json({
      success: true,
      message: 'Role migration completed',
      andresUpdated: andresResult.length,
      monicaUpdated: monicaResult.length,
      managers: managers
    });

  } catch (error: any) {
    console.error('Migration error:', error);
    return NextResponse.json(
      { 
        error: 'Migration failed', 
        message: error.message 
      },
      { status: 500 }
    );
  }
}
