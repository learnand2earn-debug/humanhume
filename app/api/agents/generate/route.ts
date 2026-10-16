import { NextRequest, NextResponse } from 'next/server';
import { AgentEngine } from '@/lib/agents/engine';
import { AgentHistoryStore } from '@/lib/agents/history';
import { AgentType } from '@/lib/agents/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { agentType, input, options = {} } = body;

    if (!agentType || !['generator', 'humanizer', 'bypass', 'marketing'].includes(agentType)) {
      return NextResponse.json(
        { success: false, error: 'Invalid or missing agentType. Must be generator, humanizer, bypass, or marketing.' },
        { status: 400 }
      );
    }

    if (!input || typeof input !== 'string' || input.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Please provide non-empty input content to process.' },
        { status: 400 }
      );
    }

    // Execute through AgentEngine
    const result = await AgentEngine.process(agentType as AgentType, input, options);

    // Prepare preview descriptions for history
    let outputPreview = '';
    let title = `${agentType.toUpperCase()} Task`;

    if (agentType === 'generator') {
      outputPreview = (result as any).content || '';
      title = `${(result as any).title || options.contentType || 'Draft'} (${(result as any).wordCount || 0} words)`;
    } else if (agentType === 'humanizer') {
      outputPreview = (result as any).text || '';
      title = `Humanized (${(result as any).wordCount || 0} words)`;
    } else if (agentType === 'bypass') {
      outputPreview = (result as any).transformedText || '';
      title = `Bypass / Transform (${(result as any).transformedWordCount || 0} words)`;
    } else if (agentType === 'marketing') {
      outputPreview = (result as any).primaryText || (result as any).headline || '';
      title = `${options.platform || 'Social'} - ${options.marketingGoal || 'Marketing Copy'}`;
    }

    const historyItem = AgentHistoryStore.add(
      agentType as AgentType,
      title,
      input,
      outputPreview,
      result,
      options
    );

    return NextResponse.json({
      success: true,
      agentType,
      result,
      historyItem,
    });
  } catch (error: any) {
    console.error('Agent generation API error:', error);
    return NextResponse.json(
      { success: false, error: error.message || 'Internal server error processing agent task.' },
      { status: 500 }
    );
  }
}
