import { NextRequest, NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jurisdiction = searchParams.get('jurisdiction') || undefined;
    const documentType = searchParams.get('documentType') || undefined;

    const conflicts = legalRepository.detectConflicts(jurisdiction, documentType);
    return NextResponse.json({ success: true, count: conflicts.length, conflicts });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.conflictId || !body.resolutionNotes) {
      return NextResponse.json(
        { success: false, error: 'conflictId and resolutionNotes are required' },
        { status: 400 }
      );
    }

    const success = legalRepository.resolveConflict(body.conflictId, body.resolutionNotes);
    if (success) {
      legalRepository.addAuditLog({
        user: 'admin',
        action: 'RESOLVE_KNOWLEDGE_CONFLICT',
        metadata: { conflictId: body.conflictId, resolutionNotes: body.resolutionNotes },
      });
    }

    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
