import { NextRequest, NextResponse } from 'next/server';
import { CheckerProvider } from '@/lib/checker/provider';

export async function POST(_req: NextRequest) {
  try {
    const result = await CheckerProvider.testConnection();
    return NextResponse.json(result);
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, message }, { status: 500 });
  }
}
