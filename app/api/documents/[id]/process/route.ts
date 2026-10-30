import {NextRequest, NextResponse} from 'next/server';
import {getDocumentById} from '@/lib/db/store';
import {readBinaryFromPrivateStorage, storagePathFor} from '@/lib/storage';
import {
  executeAutonomousDocumentPipeline,
  regenerateSingleDocumentSection,
} from '@/lib/queue/pipeline';

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

  // If sectionIndex is provided, regenerate only that single section
  if (typeof body.sectionIndex === 'number') {
    const updated = await regenerateSingleDocumentSection({
      documentId: id,
      sectionIndex: body.sectionIndex,
      customInstruction: body.customInstruction,
    });
    return NextResponse.json({success: true, document: updated});
  }

  const reprocessed = await executeAutonomousDocumentPipeline({
    fileName: doc.originalName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    rawContent: doc.originalContent,
    rawBuffer: originalBytes(doc),
    existingDocId: doc.id,
  });

  return NextResponse.json({success: true, document: reprocessed});
}
