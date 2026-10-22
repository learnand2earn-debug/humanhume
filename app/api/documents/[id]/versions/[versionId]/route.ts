import {NextRequest, NextResponse} from 'next/server';
import {addSystemLog, getDocumentById, saveDocumentRecord} from '@/lib/db/store';

export async function POST(
  _req: NextRequest,
  context: {params: Promise<{id: string; versionId: string}>}
) {
  try {
    const {id, versionId} = await context.params;
    const doc = getDocumentById(id);
    if (!doc) {
      return NextResponse.json({error: 'Document not found'}, {status: 404});
    }

    const targetVer = doc.versions.find((v) => v.id === versionId);
    if (!targetVer) {
      return NextResponse.json({error: 'Requested version not found'}, {status: 404});
    }

    doc.finalContent = targetVer.content;
    doc.updatedAt = new Date().toISOString();

    const existingLogs = doc.processLogs || [];
    const lastElapsed =
      existingLogs[existingLogs.length - 1]?.elapsedMs || doc.processingDurationMs;
    doc.processLogs = [
      ...existingLogs,
      {
        id: `plog-${doc.id}-revert-${Date.now()}`,
        timestamp: new Date().toISOString(),
        elapsedMs: lastElapsed + 25,
        step: 'FINALIZE',
        level: 'INFO',
        commandOrModule: 'versionTree::revertSnapshot',
        message: `Reverted active output to snapshot "${targetVer.versionLabel}" non-destructively (all versions preserved)`,
      },
    ];

    addSystemLog({
      traceId: doc.traceId,
      level: 'INFO',
      stage: 'VERSION_REVERT',
      documentId: doc.id,
      message: `Reverted active document content to "${targetVer.versionLabel}".`,
    });

    saveDocumentRecord(doc);

    return NextResponse.json({
      success: true,
      document: doc,
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: err instanceof Error ? err.message : 'Failed to revert document version',
      },
      {status: 500}
    );
  }
}
