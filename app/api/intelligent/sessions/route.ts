import { NextRequest, NextResponse } from 'next/server';
import { WorkflowEngine } from '@/lib/intelligent/workflow-engine';
import { IntelligentSessionRepository } from '@/lib/intelligent/repository';

export async function GET() {
  try {
    const sessions = IntelligentSessionRepository.listSessions();
    return NextResponse.json({ success: true, sessions });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const prompt = (formData.get('prompt') as string) || '';
    const rawFiles: Array<{ name: string; buffer: Buffer }> = [];

    // Extract all uploaded files
    const fileEntries = formData.getAll('files') as File[];
    for (const file of fileEntries) {
      if (file && file.size > 0) {
        const ab = await file.arrayBuffer();
        rawFiles.push({
          name: file.name,
          buffer: Buffer.from(ab),
        });
      }
    }

    if (rawFiles.length === 0 && !prompt.trim()) {
      return NextResponse.json(
        { success: false, error: 'Please provide at least one file or a detailed user request.' },
        { status: 400 }
      );
    }

    const session = await WorkflowEngine.startSession(prompt, rawFiles);
    return NextResponse.json({ success: true, session });
  } catch (err: any) {
    console.error('Session creation error:', err);
    return NextResponse.json({ success: false, error: err.message || 'Failed to initialize session' }, { status: 500 });
  }
}
