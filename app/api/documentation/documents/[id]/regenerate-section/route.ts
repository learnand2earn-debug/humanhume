import { NextRequest, NextResponse } from 'next/server';
import { DocumentationPipelineOrchestrator } from '@/lib/legal/pipeline';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();

    if (!body.sectionTitle) {
      return NextResponse.json(
        { success: false, error: 'sectionTitle is required' },
        { status: 400 }
      );
    }

    const result = await DocumentationPipelineOrchestrator.regenerateSection(
      id,
      body.sectionTitle,
      body.customInstructions
    );

    return NextResponse.json({
      success: true,
      message: `Section "${body.sectionTitle}" regenerated and updated successfully.`,
      updatedDocument: result.updatedDocument,
      updatedSection: result.updatedSection,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 400 });
  }
}
