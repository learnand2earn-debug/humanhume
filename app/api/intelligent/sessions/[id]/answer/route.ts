import { NextRequest, NextResponse } from 'next/server';
import { WorkflowEngine } from '@/lib/intelligent/workflow-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { answers } = body;

    if (!answers || typeof answers !== 'object') {
      return NextResponse.json({ success: false, error: 'Valid answers object is required' }, { status: 400 });
    }

    const session = await WorkflowEngine.submitAnswers(id, answers);
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error('Answer submission error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
