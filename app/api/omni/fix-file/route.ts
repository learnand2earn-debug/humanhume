import { NextRequest, NextResponse } from 'next/server';
import { OmniFileFixer } from '@/lib/omni/file-fixer';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { fileName, content, instructions } = body as {
      fileName: string;
      content: string;
      instructions?: string;
    };

    if (!fileName || !content) {
      return NextResponse.json({ error: 'fileName and content are required' }, { status: 400 });
    }

    const result = await OmniFileFixer.fixFile(fileName, content, instructions);
    return NextResponse.json({ success: true, result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
