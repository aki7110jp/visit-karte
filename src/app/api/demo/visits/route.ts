// 公開デモ用 API（ログイン不要）。demo_visits テーブルだけを扱う。
import { NextRequest, NextResponse } from 'next/server';
import { listDemoVisits, insertDemoVisit, countDemoVisits, validDate } from '@/lib/demo-db';
import { LIMITS } from '@/lib/demo-data';

export async function GET() {
  try {
    return NextResponse.json(await listDemoVisits());
  } catch (err) {
    console.error('demo GET failed', err);
    return NextResponse.json({ error: 'DBに接続できませんでした' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const visit_date = body?.visit_date;
  const patient_name = typeof body?.patient_name === 'string' ? body.patient_name.trim() : '';
  if (!validDate(visit_date) || !patient_name) {
    return NextResponse.json({ error: '訪問日と患者名を入力してください' }, { status: 400 });
  }
  if (patient_name.length > LIMITS.maxName) {
    return NextResponse.json({ error: `患者名は${LIMITS.maxName}文字までです` }, { status: 400 });
  }
  try {
    if ((await countDemoVisits()) >= LIMITS.maxRows) {
      return NextResponse.json(
        { error: `デモの登録件数が上限（${LIMITS.maxRows}件）に達しています。不要な記録を削除してください` },
        { status: 409 },
      );
    }
    return NextResponse.json(await insertDemoVisit(visit_date, patient_name), { status: 201 });
  } catch (err) {
    console.error('demo POST failed', err);
    return NextResponse.json({ error: 'DBへの保存に失敗しました' }, { status: 500 });
  }
}
