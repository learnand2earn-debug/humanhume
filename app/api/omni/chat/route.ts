import { NextRequest, NextResponse } from 'next/server';
import { OmniEngine } from '@/lib/omni/engine';
import { OmniRepository } from '@/lib/omni/repository';
import { OmniMessage, OmniModelId, OmniToolMode, OmniAttachment } from '@/lib/omni/types';
import crypto from 'crypto';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      conversationId: rawConvId,
      prompt,
      model = 'gpt-4o',
      toolMode = 'auto',
      attachments = [],
    } = body as {
      conversationId?: string;
      prompt: string;
      model?: OmniModelId;
      toolMode?: OmniToolMode;
      attachments?: OmniAttachment[];
    };

    if (!prompt && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Prompt or attachment is required' }, { status: 400 });
    }

    let conv = rawConvId ? OmniRepository.getConversation(rawConvId) : undefined;
    if (!conv) {
      conv = OmniRepository.createConversation('New Chat', model);
    }

    // 1. Record user message
    const userMessage: OmniMessage = {
      id: `msg_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
      role: 'user',
      content: prompt || 'Attached file for inspection',
      timestamp: new Date().toISOString(),
      model,
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    conv = OmniRepository.addMessage(conv.id, userMessage);

    // 2. Process through OmniEngine
    const assistantMessage = await OmniEngine.processMessage({
      conversationId: conv.id,
      prompt: prompt || 'Please analyze and fix this attached file',
      model,
      toolMode,
      attachments,
    });

    // 3. Record assistant message
    conv = OmniRepository.addMessage(conv.id, assistantMessage);

    return NextResponse.json({
      success: true,
      conversation: conv,
      message: assistantMessage,
    });
  } catch (err: unknown) {
    console.error('Omni Chat API Error:', err);
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      const conv = OmniRepository.getConversation(id);
      if (!conv) {
        return NextResponse.json({ error: 'Conversation not found' }, { status: 404 });
      }
      return NextResponse.json({ conversation: conv });
    }

    const conversations = OmniRepository.listConversations();
    return NextResponse.json({ conversations });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (id) {
      OmniRepository.deleteConversation(id);
      return NextResponse.json({ success: true, message: 'Deleted' });
    }

    OmniRepository.clearAll();
    return NextResponse.json({ success: true, message: 'Cleared all' });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
