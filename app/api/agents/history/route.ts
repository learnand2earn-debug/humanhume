import { NextRequest, NextResponse } from 'next/server';
import { AgentHistoryStore } from '@/lib/agents/history';
import { AgentType } from '@/lib/agents/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const agentType = searchParams.get('agentType') as AgentType | null;

    const history = AgentHistoryStore.getAll(agentType || undefined);
    return NextResponse.json({
      success: true,
      history,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to retrieve agent history' },
      { status: 500 }
    );
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Missing history id parameter' },
        { status: 400 }
      );
    }

    if (id === 'all') {
      AgentHistoryStore.clear();
      return NextResponse.json({ success: true, message: 'History cleared successfully' });
    }

    const removed = AgentHistoryStore.delete(id);
    return NextResponse.json({
      success: true,
      removed,
    });
  } catch (error: any) {
    return NextResponse.json(
      { success: false, error: error.message || 'Failed to delete history item' },
      { status: 500 }
    );
  }
}
