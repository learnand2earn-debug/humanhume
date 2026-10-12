import { NextRequest, NextResponse } from 'next/server';
import { DocumentGenerator } from '@/lib/document/generator';
import { SupportedFileType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { text, format = 'txt', fileName = 'export' } = body;

    if (!text || typeof text !== 'string') {
      return NextResponse.json({ error: 'Text content is required' }, { status: 400 });
    }

    const validFormats: SupportedFileType[] = ['docx', 'pdf', 'txt', 'md'];
    const targetFormat = validFormats.includes(format as SupportedFileType)
      ? (format as SupportedFileType)
      : 'txt';

    const cleanTitle = fileName.replace(/[^a-zA-Z0-9_-]/g, '_');
    const buffer = await DocumentGenerator.generate(text, targetFormat, cleanTitle);

    const mimeMap: Record<SupportedFileType, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
      txt: 'text/plain; charset=utf-8',
      md: 'text/markdown; charset=utf-8',
      rtf: 'application/rtf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const ext = targetFormat;
    const downloadName = `${cleanTitle}.${ext}`;

    return new NextResponse(buffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': mimeMap[targetFormat] || 'application/octet-stream',
        'Content-Disposition': `attachment; filename="${downloadName}"`,
        'Content-Length': buffer.length.toString(),
      },
    });
  } catch (error: any) {
    console.error('Export download error:', error);
    return NextResponse.json(
      { error: error.message || 'Failed to export document' },
      { status: 500 }
    );
  }
}
