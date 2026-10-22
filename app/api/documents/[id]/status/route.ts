import {NextRequest, NextResponse} from 'next/server';
import {getDocumentById} from '@/lib/db/store';

export async function GET(
  _req: NextRequest,
  context: {params: Promise<{id: string}>}
) {
  const {id} = await context.params;
  const doc = getDocumentById(id);
  if (!doc) {
    return NextResponse.json({error: 'Document not found'}, {status: 404});
  }
  return NextResponse.json({
    id: doc.id,
    traceId: doc.traceId,
    status: doc.status,
    progressPercent: doc.progressPercent,
    currentStepLabel: doc.currentStepLabel,
    steps: doc.steps,
    retryCount: doc.retryCount,
  });
}
