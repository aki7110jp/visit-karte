'use client';
import { useState, useRef, useEffect, useCallback } from 'react';
import { sampleFor, LIMITS, type DemoVisit, type Docs } from '@/lib/demo-data';

// 認証不要のデモ画面。
// 記録は Neon の demo_visits テーブルに保存する（本番の visits テーブルとは別）。
// 「AI生成」は Gemini API を呼ばず、サンプル文書を生成結果として DB に保存する。

type Tab = keyof Docs;
const TAB_LABEL: Record<Tab, string> = { karte: 'カルテ', kyotaku: '居宅', mcs: 'MCS' };
const TAB_PLACEHOLDER: Record<Tab, string> = {
  karte: 'カルテ',
  kyotaku: '居宅療養管理指導',
  mcs: 'MCS報告',
};

function today(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, {
    ...init,
    headers: init?.body ? { 'Content-Type': 'application/json' } : undefined,
    cache: 'no-store',
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data?.error ?? `エラーが発生しました（${res.status}）`);
  return data as T;
}

export default function DemoPage() {
  const [visits, setVisits] = useState<DemoVisit[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Docs | null>(null); // 編集中の内容（未保存）
  const [tab, setTab] = useState<Tab>('karte');
  const [newDate, setNewDate] = useState(today);
  const [newName, setNewName] = useState('');
  const [addError, setAddError] = useState('');
  const [busy, setBusy] = useState<'' | 'add' | 'save' | 'generate' | 'delete' | 'reset'>('');
  const [fileName, setFileName] = useState('');
  const [toast, setToast] = useState<{ text: string; error?: boolean } | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = visits.find(v => v.id === selectedId) ?? null;
  const dirty =
    !!selected && !!draft &&
    (draft.karte !== selected.karte || draft.kyotaku !== selected.kyotaku || draft.mcs !== selected.mcs);

  const notify = (text: string, error = false) => setToast({ text, error });

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const rows = await api<DemoVisit[]>('/api/demo/visits');
      setVisits(rows);
      setLoadError('');
      return rows;
    } catch (e) {
      setLoadError((e as Error).message);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 画面表示時に DB から一覧を読み込む（loading は初期値 true。状態の更新は取得完了後のみ）
    let active = true;
    api<DemoVisit[]>('/api/demo/visits')
      .then(rows => { if (active) setVisits(rows); })
      .catch(e => { if (active) setLoadError((e as Error).message); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  function open(v: DemoVisit | null) {
    setSelectedId(v?.id ?? null);
    setDraft(v ? { karte: v.karte, kyotaku: v.kyotaku, mcs: v.mcs } : null);
  }

  function confirmLeave() {
    return !dirty || confirm('保存していない変更があります。保存せずに移動しますか？');
  }

  function replaceRow(row: DemoVisit) {
    setVisits(prev => prev.map(v => (v.id === row.id ? row : v)));
  }

  async function reloadFromDb() {
    if (!confirmLeave()) return;
    const rows = await load();
    if (!rows) return;
    open(rows.find(v => v.id === selectedId) ?? null);
    notify('DBから最新の内容を読み込みました');
  }

  async function addVisit() {
    const name = newName.trim();
    if (!newDate || !name) {
      setAddError('訪問日と患者名を入力してください');
      return;
    }
    if (!confirmLeave()) return;
    setBusy('add');
    try {
      const row = await api<DemoVisit>('/api/demo/visits', {
        method: 'POST',
        body: JSON.stringify({ visit_date: newDate, patient_name: name }),
      });
      setVisits(prev =>
        [row, ...prev].sort((a, b) => b.visit_date.localeCompare(a.visit_date)),
      );
      open(row);
      setNewName('');
      setAddError('');
      notify(`${name} さんをDBに追加しました`);
    } catch (e) {
      setAddError((e as Error).message);
    } finally {
      setBusy('');
    }
  }

  async function saveDocs(docs: Docs, message: string) {
    if (!selected) return;
    const row = await api<DemoVisit>(`/api/demo/visits/${selected.id}`, {
      method: 'PATCH',
      body: JSON.stringify(docs),
    });
    replaceRow(row);
    setDraft({ karte: row.karte, kyotaku: row.kyotaku, mcs: row.mcs });
    notify(message);
  }

  async function save() {
    if (!draft) return;
    setBusy('save');
    try {
      await saveDocs(draft, 'DBに保存しました');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy('');
    }
  }

  async function generate() {
    if (!selected) return;
    setBusy('generate');
    try {
      // 実際のアプリでは音声を Gemini API で解析する。デモでは待ち時間を再現し、サンプル文書を使う。
      await new Promise(r => setTimeout(r, 2000));
      // 本番アプリと同じく、生成結果はそのまま DB に保存する
      await saveDocs(sampleFor(selected), 'AI生成の結果をDBに保存しました');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy('');
    }
  }

  async function remove() {
    if (!selected || !confirm(`${selected.patient_name} の記録をDBから削除しますか？`)) return;
    setBusy('delete');
    try {
      await api(`/api/demo/visits/${selected.id}`, { method: 'DELETE' });
      setVisits(prev => prev.filter(v => v.id !== selected.id));
      open(null);
      notify('DBから削除しました');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy('');
    }
  }

  async function reset() {
    if (!confirm('デモ用DBの記録をすべて消して、初期データに戻しますか？（他の閲覧者の入力も消えます）')) return;
    setBusy('reset');
    try {
      setVisits(await api<DemoVisit[]>('/api/demo/reset', { method: 'POST' }));
      open(null);
      notify('初期データに戻しました');
    } catch (e) {
      notify((e as Error).message, true);
    } finally {
      setBusy('');
    }
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs md:text-sm px-4 py-2">
        <strong>デモ版</strong>：記録はデモ専用のデータベースに保存され、他の閲覧者とも共有されます。
        <strong>実在の患者情報は入力しないでください。</strong>
        「AI生成」はサンプル文書を生成結果として保存します（音声は送信されません）。
        <button onClick={reset} disabled={!!busy} className="ml-2 underline disabled:opacity-50">初期データに戻す</button>
      </div>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* 左ペイン：一覧 */}
        <div className="md:w-64 bg-white border-b md:border-b-0 md:border-r flex flex-col max-h-[40vh] md:max-h-none">
          <div className="p-4 border-b">
            <h1 className="font-bold text-lg">訪問カルテ</h1>
            <p className="text-xs text-gray-500">デモユーザー（ログイン不要）</p>
            <button onClick={reloadFromDb} disabled={loading || !!busy}
              className="text-xs text-blue-600 mt-1 hover:underline disabled:opacity-50">
              ↻ DBから再読み込み
            </button>
          </div>
          <div className="p-3 border-b space-y-2">
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm" />
            <input type="text" placeholder="患者名（架空の名前）" value={newName} maxLength={LIMITS.maxName}
              onChange={e => { setNewName(e.target.value); setAddError(''); }}
              onKeyDown={e => { if (e.key === 'Enter' && !e.nativeEvent.isComposing) void addVisit(); }}
              className="w-full border rounded px-2 py-1 text-sm" />
            {addError && <p className="text-xs text-red-600">{addError}</p>}
            <button onClick={addVisit} disabled={!!busy}
              className="w-full bg-blue-600 text-white rounded py-1 text-sm hover:bg-blue-700 disabled:opacity-50">
              {busy === 'add' ? '追加中...' : '追加'}
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {loading && visits.length === 0 && <p className="p-3 text-sm text-gray-400">DBから読み込み中...</p>}
            {loadError && (
              <div className="p-3 text-sm text-red-600">
                {loadError}
                <button onClick={() => void load()} className="block mt-1 underline">再試行</button>
              </div>
            )}
            {visits.map(v => (
              <div key={v.id} onClick={() => { if (v.id !== selectedId && confirmLeave()) open(v); }}
                className={`p-3 cursor-pointer border-b hover:bg-blue-50 ${selectedId === v.id ? 'bg-blue-100' : ''}`}>
                <div className="text-sm font-medium">{v.patient_name}</div>
                <div className="text-xs text-gray-500">
                  {v.visit_date}
                  {v.karte ? <span className="ml-2 text-green-600">記録済</span> : <span className="ml-2 text-gray-400">未記録</span>}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 右ペイン */}
        <div className="flex-1 flex flex-col min-h-0">
          {selected && draft ? (
            <>
              <div className="bg-white border-b p-4 flex flex-wrap items-center gap-4">
                <div>
                  <h2 className="font-bold text-lg">{selected.patient_name}</h2>
                  <p className="text-sm text-gray-500">{selected.visit_date}</p>
                  <p className="text-xs text-gray-400">DB最終保存：{selected.updated_at}</p>
                </div>
                <div className="md:ml-auto flex flex-wrap items-center gap-2">
                  <input type="file" ref={fileRef} accept="audio/*" className="text-sm max-w-56"
                    onChange={e => setFileName(e.target.files?.[0]?.name ?? '')} />
                  <button onClick={generate} disabled={!!busy}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
                    {busy === 'generate' ? '生成中...' : 'AI生成'}
                  </button>
                </div>
                {!fileName && (
                  <p className="w-full text-xs text-gray-400">
                    デモでは音声ファイルを選ばなくても「AI生成」を押せます。
                  </p>
                )}
              </div>
              <div className="flex items-center border-b bg-white">
                {(['karte', 'kyotaku', 'mcs'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-4 md:px-6 py-3 text-sm font-medium ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
                    {TAB_LABEL[t]}
                  </button>
                ))}
                <div className="ml-auto flex items-center gap-2 pr-3">
                  {dirty && <span className="hidden sm:inline text-xs text-amber-600">未保存の変更あり</span>}
                  <button onClick={remove} disabled={!!busy} className="text-xs text-red-500 px-2 py-1 hover:underline disabled:opacity-50">
                    削除
                  </button>
                  <button onClick={save} disabled={!dirty || !!busy}
                    className="bg-blue-600 text-white text-sm px-4 py-1.5 rounded hover:bg-blue-700 disabled:opacity-40">
                    {busy === 'save' ? '保存中...' : '保存'}
                  </button>
                </div>
              </div>
              <textarea
                className="flex-1 p-4 resize-none outline-none font-mono text-sm bg-white"
                value={draft[tab]}
                maxLength={LIMITS.maxDoc}
                onChange={e => setDraft(prev => (prev ? { ...prev, [tab]: e.target.value } : prev))}
                placeholder={`${TAB_PLACEHOLDER[tab]}を入力...（「AI生成」で自動作成）`}
              />
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-gray-400 p-4 text-center">
              左から患者を選択してください
            </div>
          )}
        </div>
      </div>

      {toast && (
        <div className={`fixed bottom-4 left-1/2 -translate-x-1/2 text-white text-sm px-4 py-2 rounded shadow-lg ${toast.error ? 'bg-red-600' : 'bg-gray-900'}`}>
          {toast.text}
        </div>
      )}
    </div>
  );
}
