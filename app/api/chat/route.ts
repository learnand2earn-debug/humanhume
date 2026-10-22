import {NextRequest, NextResponse} from 'next/server';
import {generateGroundedAssistantResponse} from '@/lib/chatbot/assistant';

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({message: ''}));
  const response = generateGroundedAssistantResponse(body.message || '');
  return NextResponse.json(response);
}
