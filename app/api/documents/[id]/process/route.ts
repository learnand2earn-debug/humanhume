import {NextRequest, NextResponse} from 'next/server';
import {getDocumentById} from '@/lib/db/store';
import {
  executeAutonomousDocumentPipeline,
  regenerateSingleDocumentSection,
} from '@/lib/queue/pipeline';

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
    existingDocId: doc.id,
  });

  return NextResponse.json({success: true, document: reprocessed});
}
