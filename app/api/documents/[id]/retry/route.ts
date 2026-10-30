import {NextRequest, NextResponse} from 'next/server';
import {getDocumentById, saveDocumentRecord} from '@/lib/db/store';
import {readBinaryFromPrivateStorage, storagePathFor} from '@/lib/storage';
import {executeAutonomousDocumentPipeline} from '@/lib/queue/pipeline';

/** Re-processing always starts from the untouched upload, never from a previous output. */
function originalBytes(doc: {id: string; originalName: string; nativeArtifact?: {originalFilePath: string}}): Buffer | undefined {
  const path = doc.nativeArtifact?.originalFilePath || storagePathFor('original', doc.id, doc.originalName).virtualPath;
  const bytes = readBinaryFromPrivateStorage(path);
  return bytes && bytes.length > 0 ? bytes : undefined;
}

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
    rawBuffer: originalBytes(doc),
    existingDocId: doc.id,
  });

  return NextResponse.json({success: true, document: retried});
}
