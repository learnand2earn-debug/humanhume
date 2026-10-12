import { NextRequest, NextResponse } from 'next/server';
import { DocumentationPipelineOrchestrator } from '@/lib/legal/pipeline';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.documentTypeId) {
      return NextResponse.json(
        { success: false, error: 'documentTypeId is required' },
        { status: 400 }
      );
    }

    const doc = await DocumentationPipelineOrchestrator.run({
      documentTypeId: body.documentTypeId,
      jurisdiction: body.jurisdiction,
      fieldValues: body.fieldValues || {},
      instructions: body.instructions || '',
      disclaimerEnabled: body.disclaimerEnabled,
      userId: body.userId || 'current_user',
    });

    return NextResponse.json({
      success: true,
      document: doc,
      report: doc.report,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
