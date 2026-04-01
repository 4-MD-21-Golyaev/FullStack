import { type NextRequest, NextResponse } from 'next/server';

const yandexApiKey = process.env.YANDEX_SUGGEST_API_KEY;

export async function GET(req: NextRequest) {
  const text = req.nextUrl.searchParams.get('text') ?? '';
  if (!text.trim()) {
    return NextResponse.json({ results: [] });
  }
  if (!yandexApiKey) {
    return NextResponse.json(
      { error: 'YANDEX_SUGGEST_API_KEY is not configured' },
      { status: 500 },
    );
  }
  const url = new URL('https://suggest-maps.yandex.ru/v1/suggest');
  url.searchParams.set('apikey', yandexApiKey);
  url.searchParams.set('text', text);
  url.searchParams.set('lang', 'ru_RU');
  url.searchParams.set('results', '5');

  const res = await fetch(url.toString());
  const data = await res.json();
  return NextResponse.json(data);
}
