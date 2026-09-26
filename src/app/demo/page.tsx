'use client';
import { useState, useRef } from 'react';
import { DEMO_VISITS, genericSample, type DemoVisit } from './sample-data';

// 認証不要のデモ画面。
// データはブラウザ内だけで保持し、DB・Gemini API には一切接続しない。
// 「AI生成」は架空のサンプル文書を表示する（音声ファイルは送信されない）。

type Tab = 'karte' | 'kyotaku' | 'mcs';
const TAB_LABEL: Record<Tab, string> = { karte: 'カルテ', kyotaku: '居宅', mcs: 'MCS' };
const TAB_PLACEHOLDER: Record<Tab, string> = {
  karte: 'カルテ',
  kyotaku: '居宅療養管理指導',
  mcs: 'MCS報告',
};

export default function DemoPage() {
  const [visits, setVisits] = useState<DemoVisit[]>(DEMO_VISITS);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [tab, setTab] = useState<Tab>('karte');
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [generating, setGenerating] = useState(false);
  const [fileName, setFileName] = useState('');
  const fileRef = useRef<HTMLInputElement>(null);

  const selected = visits.find(v => v.id === selectedId) ?? null;

  function update(id: string, patch: Partial<DemoVisit>) {
    setVisits(prev => prev.map(v => (v.id === id ? { ...v, ...patch } : v)));
  }

  function addVisit() {
    if (!newDate || !newName) return;
    const v: DemoVisit = {
      id: `demo-${Date.now()}`,
      visit_date: newDate,
      patient_name: newName,
      karte: '',
      kyotaku: '',
      mcs: '',
      sample: genericSample(newName),
    };
    setVisits(prev => [v, ...prev]);
    setSelectedId(v.id);
    setNewDate('');
    setNewName('');
  }

  async function generate() {
    if (!selected) return;
    setGenerating(true);
    // 実際のアプリでは音声を Gemini API に送って解析する。デモでは待ち時間だけ再現する。
    await new Promise(r => setTimeout(r, 2000));
    const { karte, kyotaku, mcs } = selected.sample;
    update(selected.id, { karte, kyotaku, mcs });
    setGenerating(false);
  }

  function reset() {
    setVisits(DEMO_VISITS);
    setSelectedId(null);
  }

  return (
    <div className="flex flex-col h-screen bg-gray-100">
      <div className="bg-amber-100 border-b border-amber-300 text-amber-900 text-xs md:text-sm px-4 py-2">
        <strong>デモ版</strong>：表示されている患者・記録はすべて架空です。入力内容はこのブラウザ内だけで保持され、サーバーには保存されません。
        「AI生成」はサンプル文書を表示します（音声は送信されません）。
        <button onClick={reset} className="ml-2 underline">初期状態に戻す</button>
      </div>

      <div className="flex flex-1 min-h-0 flex-col md:flex-row">
        {/* 左ペイン：一覧 */}
        <div className="md:w-64 bg-white border-b md:border-b-0 md:border-r flex flex-col max-h-[40vh] md:max-h-none">
          <div className="p-4 border-b">
            <h1 className="font-bold text-lg">訪問カルテ</h1>
            <p className="text-xs text-gray-500">デモユーザー（ログイン不要）</p>
          </div>
          <div className="p-3 border-b space-y-2">
            <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm" />
            <input type="text" placeholder="患者名" value={newName} onChange={e => setNewName(e.target.value)}
              className="w-full border rounded px-2 py-1 text-sm" />
            <button onClick={addVisit} className="w-full bg-blue-600 text-white rounded py-1 text-sm hover:bg-blue-700">
              追加
            </button>
          </div>
          <div className="overflow-y-auto flex-1">
            {visits.map(v => (
              <div key={v.id} onClick={() => setSelectedId(v.id)}
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
          {selected ? (
            <>
              <div className="bg-white border-b p-4 flex flex-wrap items-center gap-4">
                <div>
                  <h2 className="font-bold text-lg">{selected.patient_name}</h2>
                  <p className="text-sm text-gray-500">{selected.visit_date}</p>
                </div>
                <div className="md:ml-auto flex flex-wrap items-center gap-2">
                  <input type="file" ref={fileRef} accept="audio/*" className="text-sm max-w-56"
                    onChange={e => setFileName(e.target.files?.[0]?.name ?? '')} />
                  <button onClick={generate} disabled={generating}
                    className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
                    {generating ? '生成中...' : 'AI生成'}
                  </button>
                </div>
                {!fileName && (
                  <p className="w-full text-xs text-gray-400">
                    デモでは音声ファイルを選ばなくても「AI生成」を押せます。
                  </p>
                )}
              </div>
              <div className="flex border-b bg-white">
                {(['karte', 'kyotaku', 'mcs'] as const).map(t => (
                  <button key={t} onClick={() => setTab(t)}
                    className={`px-6 py-3 text-sm font-medium ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
                    {TAB_LABEL[t]}
                  </button>
                ))}
              </div>
              <textarea
                className="flex-1 p-4 resize-none outline-none font-mono text-sm"
                value={selected[tab]}
                onChange={e => update(selected.id, { [tab]: e.target.value })}
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
    </div>
  );
}
