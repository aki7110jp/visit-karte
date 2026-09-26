import { neon } from '@neondatabase/serverless';

if (!process.env.DATABASE_URL) {
  console.error('DATABASE_URL を設定してください（例: node --env-file=.env.local setup-db.mjs）');
  process.exit(1);
}
const sql = neon(process.env.DATABASE_URL);

async function setup() {
  console.log('テーブルを作成しています...');
  await sql`
    CREATE TABLE IF NOT EXISTS visits (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      visit_date DATE NOT NULL,
      patient_name TEXT NOT NULL,
      karte TEXT DEFAULT '',
      kyotaku TEXT DEFAULT '',
      mcs TEXT DEFAULT '',
      created_by TEXT NOT NULL,
      updated_by TEXT NOT NULL,
      updated_at TIMESTAMPTZ DEFAULT NOW(),
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✓ visitsテーブル作成完了');
  await sql`
    CREATE TABLE IF NOT EXISTS allowed_users (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      email TEXT UNIQUE NOT NULL,
      role TEXT NOT NULL DEFAULT 'viewer',
      added_by TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    )
  `;
  console.log('✓ allowed_usersテーブル作成完了');
  console.log('\nDBセットアップ完了！');
}

setup().catch(err => {
  console.error('エラー:', err);
  process.exit(1);
});
