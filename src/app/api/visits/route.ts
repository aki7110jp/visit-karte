import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import sql from '@/lib/db';

export async function GET() {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const visits = await sql`SELECT * FROM visits ORDER BY visit_date DESC, created_at DESC`;
  return NextResponse.json(visits);
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { visit_date, patient_name } = await req.json();
  const email = session.user?.email ?? '';
  const result = await sql`
    INSERT INTO visits (visit_date, patient_name, karte, kyotaku, mcs, created_by, updated_by)
    VALUES (${visit_date}, ${patient_name}, '', '', '', ${email}, ${email})
    RETURNING *
  `;
  return NextResponse.json(result[0]);
}
