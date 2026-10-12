import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { JobQueue } from '@/lib/queue/queue';

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = repository.getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 404 });
    }

    JobQueue.cancel(id);
    return NextResponse.json({ success: true, message: 'Processing cancelled.' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
