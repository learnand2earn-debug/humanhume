import {NextRequest, NextResponse} from 'next/server';
import {testCheckerConnection} from '@/lib/checker/checker';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const result = await testCheckerConnection(
    body.apiUrl,
    body.apiKey && !body.apiKey.includes('***') ? body.apiKey : undefined
  );
  return NextResponse.json(result);
}
