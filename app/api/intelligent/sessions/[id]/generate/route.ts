import { NextRequest, NextResponse } from 'next/server';
import { WorkflowEngine } from '@/lib/intelligent/workflow-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const { revisionNotes } = body;

    const session = await WorkflowEngine.generateOutput(id, revisionNotes);
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error('Generation error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
