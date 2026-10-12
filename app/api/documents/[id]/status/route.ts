import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = repository.getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    const job = repository.getJob(id);

    return NextResponse.json({
      id: doc.id,
      status: doc.status,
      currentStep: job?.currentStep || doc.status,
      progressPercent: job?.progressPercent || (doc.status === 'COMPLETED' ? 100 : 0),
      retryCount: doc.retryCount,
      errorMessage: doc.errorMessage,
      preservationScore: doc.preservationScore,
      aiCheckScore: doc.aiCheckScore,
      readabilityScore: doc.readabilityScore,
      steps: job?.steps || [],
      updatedAt: doc.updatedAt,
      completedAt: doc.completedAt,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
