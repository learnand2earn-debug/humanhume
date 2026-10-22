import {NextRequest, NextResponse} from 'next/server';
import {deleteBatchDocumentRecords, getDbState} from '@/lib/db/store';

export async function GET() {
  const state = getDbState();
  return NextResponse.json({
    documents: state.documents,
    notifications: state.notifications,
    documentTypes: state.documentTypes,
    knowledgeBase: state.knowledgeBase,
    knowledgeConflicts: state.knowledgeConflicts,
    settings: state.settings,
  });
}

export async function DELETE(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const documentIds: string[] = Array.isArray(body.documentIds)
      ? body.documentIds
      : Array.isArray(body.ids)
        ? body.ids
        : [];

    if (documentIds.length === 0) {
      return NextResponse.json(
        {error: 'No document IDs provided for deletion'},
        {status: 400}
      );
    }

    const result = deleteBatchDocumentRecords(documentIds);
    return NextResponse.json({
      success: true,
      deletedCount: result.deletedCount,
      deletedIds: result.deletedIds,
      message: `Successfully deleted ${result.deletedCount} document(s)`,
    });
  } catch (error) {
    return NextResponse.json(
      {error: error instanceof Error ? error.message : 'Failed to delete documents'},
      {status: 500}
    );
  }
}

