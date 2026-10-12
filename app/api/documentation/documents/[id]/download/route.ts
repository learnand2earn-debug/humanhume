import { NextRequest, NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';
import { DocumentGenerator } from '@/lib/document/generator';
import { SupportedFileType } from '@/lib/types';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const format = (searchParams.get('format') || 'md').toLowerCase() as SupportedFileType | 'report';
    const target = (searchParams.get('target') || 'final').toLowerCase(); // 'draft' | 'final'

    const doc = legalRepository.getDocument(id);
    if (!doc) {
      return NextResponse.json({ success: false, error: 'Document not found' }, { status: 404 });
    }

    if (format === 'report') {
      const reportJson = JSON.stringify(doc.report || { documentId: id, status: doc.status }, null, 2);
      return new NextResponse(reportJson, {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': `attachment; filename="${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_Report.json"`,
        },
      });
    }

    // Determine target version
    let selectedVersion = doc.versions[doc.versions.length - 1];
    if (target === 'draft') {
      selectedVersion = doc.versions.find((v) => v.versionNumber === 1) || selectedVersion;
    }

    if (!selectedVersion) {
      return NextResponse.json({ success: false, error: 'No content found for document' }, { status: 404 });
    }

    const text = selectedVersion.content;
    const safeTitle = `${doc.title.replace(/[^a-zA-Z0-9_-]/g, '_')}_${target.toUpperCase()}`;

    const buffer = await DocumentGenerator.generate(text, format, safeTitle);

    const mimeTypes: Record<string, string> = {
      docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      pdf: 'application/pdf',
      txt: 'text/plain; charset=utf-8',
      md: 'text/markdown; charset=utf-8',
      rtf: 'application/rtf',
      xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    };

    const contentType = mimeTypes[format] || 'text/plain';

    return new NextResponse(new Uint8Array(buffer), {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${safeTitle}.${format}"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
