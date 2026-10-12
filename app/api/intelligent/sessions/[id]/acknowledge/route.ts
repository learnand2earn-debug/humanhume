import { NextRequest, NextResponse } from 'next/server';
import { WorkflowEngine } from '@/lib/intelligent/workflow-engine';

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { itemIds } = body;

    if (!Array.isArray(itemIds)) {
      return NextResponse.json({ success: false, error: 'itemIds array is required' }, { status: 400 });
    }

    const session = await WorkflowEngine.acknowledgeGaps(id, itemIds);
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error('Gap acknowledge error:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
