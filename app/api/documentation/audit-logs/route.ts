import { NextRequest, NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = Number(searchParams.get('limit')) || 100;
    const documentId = searchParams.get('documentId') || undefined;
    const user = searchParams.get('user') || undefined;

    const logs = legalRepository.listAuditLogs(limit, { documentId, user });
    return NextResponse.json({ success: true, count: logs.length, logs });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
