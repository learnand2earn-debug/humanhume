import { NextRequest, NextResponse } from 'next/server';
import { ConversationRepository } from '@/lib/agent/repository';

export async function GET() {
  try {
    const conversations = ConversationRepository.listConversations();
    return NextResponse.json({ success: true, conversations });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const title = body.title || 'New Conversation';
    const conv = ConversationRepository.createConversation(title);
    return NextResponse.json({ success: true, conversation: conv });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
