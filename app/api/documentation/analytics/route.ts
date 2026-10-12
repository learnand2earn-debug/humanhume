import { NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';

export async function GET() {
  try {
    const analytics = legalRepository.getAnalytics();
    return NextResponse.json({ success: true, analytics });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
