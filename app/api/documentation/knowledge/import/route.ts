import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import { KnowledgeIngestionEngine } from '@/lib/legal/ingestion';
import { SupportedFileType } from '@/lib/types';

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ success: false, error: 'No file uploaded' }, { status: 400 });
    }

    const ext = path.extname(file.name).toLowerCase().replace('.', '') as SupportedFileType;
    const allowed = ['pdf', 'docx', 'txt', 'md'];
    if (!allowed.includes(ext)) {
      return NextResponse.json(
        { success: false, error: `Unsupported file type: .${ext}. Allowed formats: PDF, DOCX, TXT, MD.` },
        { status: 400 }
      );
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const result = await KnowledgeIngestionEngine.ingestDocument(buffer, file.name, ext);

    return NextResponse.json({
      success: true,
      message: 'Document ingested successfully into Draft state. Admin review & approval required before production use.',
      source: result.source,
      draftKnowledgeEntry: result.draftKnowledgeEntry,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
