import { query } from '@/app/db';

// GET /api/admin/migrate-feedback?key=ccc-admin-2026-stats
// One-time migration to add status fields to Feedback table
export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (key !== 'ccc-admin-2026-stats') {
    return new Response('Unauthorized', { status: 401 });
  }

  const results: string[] = [];

  try {
    // Add status column
    await query(`ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'pending'`);
    results.push('✅ Added status column');
  } catch (e: any) {
    results.push(`⚠️ status: ${e.message}`);
  }

  try {
    // Add adminNote column
    await query(`ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "adminNote" TEXT`);
    results.push('✅ Added adminNote column');
  } catch (e: any) {
    results.push(`⚠️ adminNote: ${e.message}`);
  }

  try {
    // Add resolvedAt column
    await query(`ALTER TABLE "Feedback" ADD COLUMN IF NOT EXISTS "resolvedAt" TIMESTAMP`);
    results.push('✅ Added resolvedAt column');
  } catch (e: any) {
    results.push(`⚠️ resolvedAt: ${e.message}`);
  }

  try {
    // Add index on status
    await query(`CREATE INDEX IF NOT EXISTS "Feedback_status_idx" ON "Feedback" ("status")`);
    results.push('✅ Added status index');
  } catch (e: any) {
    results.push(`⚠️ status index: ${e.message}`);
  }

  return new Response(JSON.stringify({ results }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
