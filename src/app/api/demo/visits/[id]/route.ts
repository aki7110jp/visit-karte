// 公開デモ用 API（ログイン不要）。demo_visits テーブルだけを扱う。
import { NextRequest, NextResponse } from 'next/server';
import { updateDemoVisit, deleteDemoVisit, isUuid, pickDocs } from '@/lib/demo-db';

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 });
  const docs = pickDocs(await req.json().catch(() => null));
  if (typeof docs === 'string') return NextResponse.json({ error: docs }, { status: 400 });
  try {
    const row = await updateDemoVisit(id, docs);
    if (!row) return NextResponse.json({ error: '記録が見つかりません（削除された可能性があります）' }, { status: 404 });
    return NextResponse.json(row);
  } catch (err) {
    console.error('demo PATCH failed', err);
    return NextResponse.json({ error: 'DBへの保存に失敗しました' }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: '記録が見つかりません' }, { status: 404 });
  try {
    await deleteDemoVisit(id);
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('demo DELETE failed', err);
    return NextResponse.json({ error: 'DBからの削除に失敗しました' }, { status: 500 });
  }
}
