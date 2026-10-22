import {NextResponse} from 'next/server';
import {getDbState} from '@/lib/db/store';

export async function GET() {
  const state = getDbState();
  return NextResponse.json({
    logs: state.logs,
    legalAuditLogs: state.legalAuditLogs,
  });
}
