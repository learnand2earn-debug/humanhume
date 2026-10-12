import { NextRequest, NextResponse } from 'next/server';
import { ChatbotAssistant } from '@/lib/chatbot/assistant';
import { repository } from '@/lib/db/repository';

export async function POST(req: NextRequest) {
  try {
    const { message, activeDocumentId } = await req.json();

    if (!message || typeof message !== 'string') {
      return NextResponse.json({ error: 'Message text is required' }, { status: 400 });
    }

    repository.addChatMessage({
      sender: 'user',
      text: message,
      systemContext: { documentId: activeDocumentId },
    });

    const reply = await ChatbotAssistant.handleMessage(message, activeDocumentId);

    repository.addChatMessage({
      sender: 'assistant',
      text: reply,
      systemContext: { documentId: activeDocumentId },
    });

    return NextResponse.json({ reply });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const messages = repository.listChatMessages(30);
    return NextResponse.json({ messages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
