import {NextRequest, NextResponse} from 'next/server';
import {updateJobStatusControl} from '@/workers/queue';
import {getDocumentById} from '@/lib/db/store';

export async function POST(
  req: NextRequest,
  context: {params: Promise<{id: string}>}
) {
  const {id} = await context.params;
  const body = await req.json().catch(() => ({action: 'CANCEL'}));
  const action = (body.action || 'CANCEL') as 'PAUSE' | 'RESUME' | 'CANCEL';

  const outcome = updateJobStatusControl(id, action);
  const doc = getDocumentById(id);

  return NextResponse.json({
    success: outcome.success,
    status: outcome.newStatus,
    document: doc,
  });
}
