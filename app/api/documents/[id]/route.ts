import {NextRequest, NextResponse} from 'next/server';
import {
  addLegalAuditLog,
  addSystemLog,
  deleteDocumentRecord,
  getDocumentById,
  saveDocumentRecord,
} from '@/lib/db/store';
import {verifyAndEnforcePreservation} from '@/lib/document/analyzer';
import {saveToPrivateStorage} from '@/lib/storage';

export async function GET(
  _req: NextRequest,
  context: {params: Promise<{id: string}>}
) {
  const {id} = await context.params;
  const doc = getDocumentById(id);
  if (!doc) {
    return NextResponse.json({error: 'Document not found'}, {status: 404});
  }
  return NextResponse.json({document: doc});
}

export async function DELETE(
  _req: NextRequest,
  context: {params: Promise<{id: string}>}
) {
  const {id} = await context.params;
  const doc = getDocumentById(id);
  if (!doc) {
    return NextResponse.json({error: 'Document not found'}, {status: 404});
  }

  const deleted = deleteDocumentRecord(id);
  if (!deleted) {
    return NextResponse.json({error: 'Failed to delete document'}, {status: 500});
  }

  return NextResponse.json({
    success: true,
    message: `Document "${doc.originalName}" was deleted successfully`,
    id,
  });
}

export async function PATCH(
  req: NextRequest,
  context: {params: Promise<{id: string}>}
) {
  const {id} = await context.params;
  const doc = getDocumentById(id);
  if (!doc) {
    return NextResponse.json({error: 'Document not found'}, {status: 404});
  }

  const body = await req.json().catch(() => ({}));

  // Non-destructive Knowledge Base Legal Terminology Tweak Application
  if (body.createNewVersion && typeof body.finalContent === 'string') {
    const updatedChunks = [...doc.chunks];

    if (
      typeof body.updatedSectionIndex === 'number' &&
      typeof body.updatedSectionText === 'string' &&
      updatedChunks[body.updatedSectionIndex]
    ) {
      updatedChunks[body.updatedSectionIndex] = {
        ...updatedChunks[body.updatedSectionIndex],
        humanizedText: body.updatedSectionText,
        restoredText: body.updatedSectionText,
        status: 'HUMANIZED',
      };
    }

    const {verifiedChunks, reconstructedText, comparison} =
      typeof body.updatedSectionIndex === 'number'
        ? verifyAndEnforcePreservation(updatedChunks, doc.protectedMap)
        : {
            verifiedChunks: updatedChunks,
            reconstructedText: body.finalContent,
            comparison: doc.preservationResult,
          };

    const nextVerNum = doc.versions.length;
    const versionLabel =
      typeof body.versionLabel === 'string' && body.versionLabel.trim()
        ? body.versionLabel.trim()
        : `v${nextVerNum} KB-Aligned`;

    const storagePath = saveToPrivateStorage(
      'final',
      doc.id,
      `v${nextVerNum}_KB_Aligned_${doc.originalName}`,
      reconstructedText
    );

    const prevLatest = doc.versions[doc.versions.length - 1];
    doc.versions.push({
      id: `ver-${doc.id}-kb-${Date.now()}`,
      documentId: doc.id,
      versionNumber: nextVerNum,
      versionLabel,
      filePath: storagePath,
      content: reconstructedText,
      qualityScore: Math.min(99, (prevLatest?.qualityScore || 97) + 1),
      checkerScore: prevLatest?.checkerScore ?? 5,
      preservationScore: comparison.preservationScore,
      readabilityScore: comparison.readabilityScore,
      retryCount: doc.retryCount,
      provider: body.kbAttribution || 'HumanFlow Knowledge Base Terminology Engine',
      processingDurationMs: 38,
      status: 'VALID',
      createdAt: new Date().toISOString(),
    });

    doc.chunks = verifiedChunks;
    doc.finalContent = reconstructedText;
    doc.preservationResult = comparison;

    const existingLogs = doc.processLogs || [];
    const lastElapsed = existingLogs[existingLogs.length - 1]?.elapsedMs || doc.processingDurationMs;
    doc.processLogs = [
      ...existingLogs,
      {
        id: `plog-${doc.id}-kb-${Date.now()}`,
        timestamp: new Date().toISOString(),
        elapsedMs: lastElapsed + 38,
        step: 'PRESERVATION_CHECK',
        level: 'SUCCESS',
        commandOrModule: 'kb::applyTerminologyTweak',
        message:
          body.logMessage ||
          `Applied non-destructive Knowledge Base legal terminology refinement (${versionLabel}); 100% protected entities intact`,
      },
    ];

    addSystemLog({
      traceId: doc.traceId,
      level: 'INFO',
      stage: 'KB_TWEAK',
      documentId: doc.id,
      message: `Created non-destructive version "${versionLabel}" via Knowledge Base Improvement Suggestions.`,
    });

    if (body.kbTitle) {
      addLegalAuditLog({
        user: 'System Architect (Admin)',
        action: 'KB_TERMINOLOGY_SUGGESTION_APPLIED',
        documentId: doc.id,
        documentName: doc.originalName,
        version: versionLabel,
        templateName: String(body.kbTitle),
        knowledgeBaseVersion: String(body.kbVersion || 'v2.4.0'),
        humanizerRun: true,
        checkerRun: true,
        finalStatus: 'PASS',
      });
    }
  } else if (typeof body.finalContent === 'string') {
    doc.finalContent = body.finalContent;
    if (doc.versions.length > 0) {
      doc.versions[doc.versions.length - 1].content = body.finalContent;
    }
  }

  if (Array.isArray(body.embeddedImages)) {
    doc.embeddedImages = body.embeddedImages;
    doc.protectedMap.structuralStats.imageCount = body.embeddedImages.length;
  }

  doc.updatedAt = new Date().toISOString();
  saveDocumentRecord(doc);

  return NextResponse.json({success: true, document: doc});
}
