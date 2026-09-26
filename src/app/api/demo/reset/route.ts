// 公開デモ用 API（ログイン不要）。demo_visits を初期データに戻す。
import { NextResponse } from 'next/server';
import { resetDemoVisits, listDemoVisits } from '@/lib/demo-db';

export async function POST() {
  try {
    await resetDemoVisits();
    return NextResponse.json(await listDemoVisits());
  } catch (err) {
    console.error('demo reset failed', err);
    return NextResponse.json({ error: '初期化に失敗しました' }, { status: 500 });
  }
}
