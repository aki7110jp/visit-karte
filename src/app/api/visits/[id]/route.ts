import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';
import sql from '@/lib/db';

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const { id } = await params;
  const { karte, kyotaku, mcs } = await req.json();
  const email = session.user?.email ?? '';
  const result = await sql`
    UPDATE visits SET
      karte = COALESCE(${karte}, karte),
      kyotaku = COALESCE(${kyotaku}, kyotaku),
      mcs = COALESCE(${mcs}, mcs),
      updated_by = ${email},
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING *
  `;
  return NextResponse.json(result[0] ?? {});
}
