import {NextRequest, NextResponse} from 'next/server';
import {testHumanizerConnection} from '@/lib/humanizer/client';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await testHumanizerConnection(
    body.apiUrl,
    body.apiKey && !body.apiKey.includes('***') ? body.apiKey : undefined
  );
  return NextResponse.json(result);
}
