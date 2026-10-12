import { NextRequest, NextResponse } from 'next/server';
import { OmniFileGenerator, FileGenPayload } from '@/lib/omni/file-generator';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const fileId = searchParams.get('fileId');

    if (!fileId) {
      return NextResponse.json({ error: 'fileId parameter required' }, { status: 400 });
    }

    const cached = OmniFileGenerator.getCachedFile(fileId);
    if (!cached) {
      return NextResponse.json({ error: 'File expired or not found' }, { status: 404 });
    }

    // Convert node Buffer to Uint8Array for NextResponse body
    const uint8 = new Uint8Array(cached.buffer);

    return new NextResponse(uint8, {
      status: 200,
      headers: {
        'Content-Type': cached.mimeType,
        'Content-Disposition': `attachment; filename="${cached.fileName}"`,
        'Content-Length': cached.buffer.length.toString(),
        'Cache-Control': 'no-cache',
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body: FileGenPayload = await req.json();

    if (!body.fileName || !body.fileType || !body.content) {
      return NextResponse.json({ error: 'fileName, fileType, and content are required' }, { status: 400 });
    }

    const result = await OmniFileGenerator.generateFile(body);
    return NextResponse.json({ success: true, file: result });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
