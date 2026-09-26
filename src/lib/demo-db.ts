// 公開デモ用の DB 操作。demo_visits テーブルだけを扱い、本番の visits テーブルには触れない。
import sql from '@/lib/db';
import { SEED, SAMPLES, LIMITS, type DemoVisit, type Docs } from '@/lib/demo-data';

// 返す列（固定の文字列なので unsafe で埋め込んでも安全）
const COLUMNS = sql.unsafe(`
  id,
  to_char(visit_date, 'YYYY-MM-DD') AS visit_date,
  patient_name, karte, kyotaku, mcs, sample_key,
  to_char(updated_at AT TIME ZONE 'Asia/Tokyo', 'YYYY-MM-DD HH24:MI:SS') AS updated_at
`);

let ready: Promise<void> | null = null;

// 初回アクセス時にテーブルを作成し、空なら初期データを入れる
export function ensureDemoTable(): Promise<void> {
  if (!ready) {
    ready = (async () => {
      await sql`
        CREATE TABLE IF NOT EXISTS demo_visits (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          visit_date DATE NOT NULL,
          patient_name TEXT NOT NULL,
          karte TEXT NOT NULL DEFAULT '',
          kyotaku TEXT NOT NULL DEFAULT '',
          mcs TEXT NOT NULL DEFAULT '',
          sample_key TEXT,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
        )
      `;
      const [{ n }] = (await sql`SELECT COUNT(*)::int AS n FROM demo_visits`) as { n: number }[];
      if (n === 0) await seed();
    })().catch(err => {
      ready = null; // 失敗したら次のリクエストで再試行する
      throw err;
    });
  }
  return ready;
}

async function seed() {
  // 古い順に入れて、作成日時の新しい順に並べたとき SEED の並びになるようにする
  for (const s of [...SEED].reverse()) {
    const docs: Docs = s.prefilled ? SAMPLES[s.sample_key] : { karte: '', kyotaku: '', mcs: '' };
    await sql`
      INSERT INTO demo_visits (visit_date, patient_name, karte, kyotaku, mcs, sample_key, created_at)
      VALUES (${s.visit_date}, ${s.patient_name}, ${docs.karte}, ${docs.kyotaku}, ${docs.mcs}, ${s.sample_key},
              clock_timestamp())
    `;
  }
}

export async function listDemoVisits(): Promise<DemoVisit[]> {
  await ensureDemoTable();
  return (await sql`
    SELECT ${COLUMNS} FROM demo_visits ORDER BY visit_date DESC, created_at DESC
  `) as DemoVisit[];
}

export async function countDemoVisits(): Promise<number> {
  await ensureDemoTable();
  const [{ n }] = (await sql`SELECT COUNT(*)::int AS n FROM demo_visits`) as { n: number }[];
  return n;
}

export async function insertDemoVisit(visit_date: string, patient_name: string): Promise<DemoVisit> {
  await ensureDemoTable();
  const rows = (await sql`
    INSERT INTO demo_visits (visit_date, patient_name) VALUES (${visit_date}, ${patient_name})
    RETURNING ${COLUMNS}
  `) as DemoVisit[];
  return rows[0];
}

export async function updateDemoVisit(id: string, docs: Partial<Docs>): Promise<DemoVisit | null> {
  await ensureDemoTable();
  const rows = (await sql`
    UPDATE demo_visits SET
      karte = COALESCE(${docs.karte ?? null}, karte),
      kyotaku = COALESCE(${docs.kyotaku ?? null}, kyotaku),
      mcs = COALESCE(${docs.mcs ?? null}, mcs),
      updated_at = NOW()
    WHERE id = ${id}
    RETURNING ${COLUMNS}
  `) as DemoVisit[];
  return rows[0] ?? null;
}

export async function deleteDemoVisit(id: string): Promise<boolean> {
  await ensureDemoTable();
  const rows = await sql`DELETE FROM demo_visits WHERE id = ${id} RETURNING id`;
  return rows.length > 0;
}

export async function resetDemoVisits(): Promise<void> {
  await ensureDemoTable();
  await sql`DELETE FROM demo_visits`;
  await seed();
}

// ---- 入力チェック ----

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const isUuid = (s: string) => UUID.test(s);

export function validDate(s: unknown): s is string {
  if (typeof s !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(`${s}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(s);
}

export function pickDocs(body: unknown): Partial<Docs> | string {
  if (!body || typeof body !== 'object') return '不正なリクエストです';
  const out: Partial<Docs> = {};
  for (const key of ['karte', 'kyotaku', 'mcs'] as const) {
    const v = (body as Record<string, unknown>)[key];
    if (v === undefined) continue;
    if (typeof v !== 'string') return '不正なリクエストです';
    if (v.length > LIMITS.maxDoc) return `1つの文書は${LIMITS.maxDoc}文字までです`;
    out[key] = v;
  }
  return out;
}
