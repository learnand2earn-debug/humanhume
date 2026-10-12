import { NextRequest, NextResponse } from 'next/server';
import { repository } from '@/lib/db/repository';
import { storageManager } from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const doc = repository.getDocument(id);
    if (!doc) {
      return NextResponse.json({ error: 'Document not found' }, { status: 400 });
    }
    const job = repository.getJob(id);
    const versions = repository.listVersions(id);
    const checks = repository.listQualityChecks(id);

    return NextResponse.json({
      document: doc,
      job,
      versions,
      checks,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await storageManager.deleteDocumentFiles(id);
    const deleted = repository.deleteDocument(id);
    return NextResponse.json({ success: deleted });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
