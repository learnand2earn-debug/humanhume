import { NextRequest, NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status') || undefined;
    const documentType = searchParams.get('documentType') || undefined;

    const documents = legalRepository.listDocuments({ status, documentType });
    return NextResponse.json({ success: true, count: documents.length, documents });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
