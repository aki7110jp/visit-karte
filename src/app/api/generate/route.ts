import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth-config';

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const formData = await req.formData();
  const audio = formData.get('audio') as File;

  if (!audio) return NextResponse.json({ error: 'No audio' }, { status: 400 });

  const apiKey = process.env.GEMINI_API_KEY!;

  const uploadRes = await fetch(
    `https://generativelanguage.googleapis.com/upload/v1beta/files?key=${apiKey}`,
    {
      method: 'POST',
      headers: {
        'X-Goog-Upload-Command': 'start, upload, finalize',
        'X-Goog-Upload-Header-Content-Type': audio.type,
        'X-Goog-Upload-Header-Content-Length': audio.size.toString(),
        'Content-Type': audio.type,
      },
      body: await audio.arrayBuffer(),
    }
  );
  const uploadData = await uploadRes.json();
  const fileUri = uploadData.file?.uri;
  if (!fileUri) return NextResponse.json({ error: 'Upload failed', detail: uploadData }, { status: 500 });

  const prompt = `あなたは在宅医療の医師アシスタントです。以下の訪問診療の音声記録から3つの文書を作成してください。以下のJSON形式で出力してください：{"karte":"カルテ（SOAP形式）","kyotaku":"居宅療養管理指導記録","mcs":"MCS多職種連携報告"}`;

  // 503の場合は3回リトライ
  for (let attempt = 0; attempt < 3; attempt++) {
    if (attempt > 0) {
      await new Promise(r => setTimeout(r, 3000 * attempt));
    }
    const genRes = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }, { fileData: { mimeType: audio.type, fileUri } }] }],
          generationConfig: { responseMimeType: 'application/json' },
        }),
      }
    );
    const genData = await genRes.json();
    console.log(`Attempt ${attempt + 1} response:`, JSON.stringify(genData).slice(0, 300));
    if (genData.error?.code === 503) continue;
    const text = genData.candidates?.[0]?.content?.parts?.[0]?.text ?? '{}';
    const parsed = JSON.parse(text);
    console.log('parsed keys:', Object.keys(parsed));
    return NextResponse.json(parsed);
  }
  return NextResponse.json({ error: 'Gemini unavailable after retries' }, { status: 503 });
}
