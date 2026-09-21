'use client';
import { useState, useEffect, useRef } from 'react';
import { useSession, signOut } from 'next-auth/react';

type Visit = {
  id: string;
  visit_date: string;
  patient_name: string;
  karte: string;
  kyotaku: string;
  mcs: string;
};

export default function Home() {
  const { data: session } = useSession();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [selected, setSelected] = useState<Visit | null>(null);
  const [tab, setTab] = useState<'karte' | 'kyotaku' | 'mcs'>('karte');
  const [newDate, setNewDate] = useState('');
  const [newName, setNewName] = useState('');
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch('/api/visits').then(r => r.json()).then(data => { if (Array.isArray(data)) setVisits(data); });
  }, []);

  async function addVisit() {
    if (!newDate || !newName) return;
    const res = await fetch('/api/visits', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visit_date: newDate, patient_name: newName }),
    });
    const v = await res.json();
    setVisits(prev => [v, ...prev]);
    setSelected(v);
    setNewDate('');
    setNewName('');
  }

  async function save(field: 'karte' | 'kyotaku' | 'mcs', value: string) {
    if (!selected) return;
    await fetch(`/api/visits/${selected.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ [field]: value }),
    });
    setVisits(prev => prev.map(v => v.id === selected.id ? { ...v, [field]: value } : v));
    setSelected(prev => prev ? { ...prev, [field]: value } : null);
  }

  async function generate() {
    if (!selected || !fileRef.current?.files?.[0]) return;
    setGenerating(true);
    const formData = new FormData();
    formData.append('audio', fileRef.current.files[0]);
    formData.append('visitId', selected.id);
    const res = await fetch('/api/generate', { method: 'POST', body: formData });
    const data = await res.json();
    if (data.karte) await save('karte', data.karte);
    if (data.kyotaku) await save('kyotaku', data.kyotaku);
    if (data.mcs) await save('mcs', data.mcs);
    setGenerating(false);
  }

  return (
    <div className="flex h-screen bg-gray-100">
      {/* 左ペイン：一覧 */}
      <div className="w-64 bg-white border-r flex flex-col">
        <div className="p-4 border-b">
          <h1 className="font-bold text-lg">訪問カルテ</h1>
          <p className="text-xs text-gray-500">{session?.user?.email}</p>
          <button onClick={() => signOut()} className="text-xs text-red-500 mt-1">ログアウト</button>
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
            <div key={v.id} onClick={() => setSelected(v)}
              className={`p-3 cursor-pointer border-b hover:bg-blue-50 ${selected?.id === v.id ? 'bg-blue-100' : ''}`}>
              <div className="text-sm font-medium">{v.patient_name}</div>
              <div className="text-xs text-gray-500">{v.visit_date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 右ペイン */}
      <div className="flex-1 flex flex-col">
        {selected ? (
          <>
            <div className="bg-white border-b p-4 flex items-center gap-4">
              <div>
                <h2 className="font-bold text-lg">{selected.patient_name}</h2>
                <p className="text-sm text-gray-500">{selected.visit_date}</p>
              </div>
              <div className="ml-auto flex items-center gap-2">
                <input type="file" ref={fileRef} accept="audio/*" className="text-sm" />
                <button onClick={generate} disabled={generating}
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50">
                  {generating ? '生成中...' : 'AI生成'}
                </button>
              </div>
            </div>
            <div className="flex border-b bg-white">
              {(['karte', 'kyotaku', 'mcs'] as const).map(t => (
                <button key={t} onClick={() => setTab(t)}
                  className={`px-6 py-3 text-sm font-medium ${tab === t ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'}`}>
                  {t === 'karte' ? 'カルテ' : t === 'kyotaku' ? '居宅' : 'MCS'}
                </button>
              ))}
            </div>
            <textarea
              className="flex-1 p-4 resize-none outline-none font-mono text-sm"
              value={selected[tab]}
              onChange={e => setSelected(prev => prev ? { ...prev, [tab]: e.target.value } : null)}
              onBlur={e => save(tab, e.target.value)}
              placeholder={`${tab === 'karte' ? 'カルテ' : tab === 'kyotaku' ? '居宅療養管理指導' : 'MCS報告'}を入力...`}
            />
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-gray-400">
            左から患者を選択してください
          </div>
        )}
      </div>
    </div>
  );
}
