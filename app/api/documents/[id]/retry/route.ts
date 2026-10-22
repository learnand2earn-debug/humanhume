import {NextRequest, NextResponse} from 'next/server';
import {getDocumentById, saveDocumentRecord} from '@/lib/db/store';
import {executeAutonomousDocumentPipeline} from '@/lib/queue/pipeline';

export async function POST(
  req: NextRequest,
  context: {params: Promise<{id: string}>}
) {
  const {id} = await context.params;
  const doc = getDocumentById(id);
  if (!doc) {
    return NextResponse.json({error: 'Document not found'}, {status: 404});
  }

  const body = await req.json().catch(() => ({}));

  // Allow Admin/User to restore a specific version by versionId
  if (body.restoreVersionId) {
    const targetVer = doc.versions.find((v) => v.id === body.restoreVersionId);
    if (targetVer) {
      doc.finalContent = targetVer.content;
      doc.updatedAt = new Date().toISOString();
      saveDocumentRecord(doc);
      return NextResponse.json({success: true, document: doc});
    }
  }

  // Allow Admin to delete a specific non-original processed version
  if (body.deleteVersionId) {
    doc.versions = doc.versions.filter(
      (v) => v.id !== body.deleteVersionId || v.versionNumber === 0
    );
    saveDocumentRecord(doc);
    return NextResponse.json({success: true, document: doc});
  }

  const retried = await executeAutonomousDocumentPipeline({
    fileName: doc.originalName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    rawContent: doc.originalContent,
    existingDocId: doc.id,
  });

  return NextResponse.json({success: true, document: retried});
}
