import { NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';

export async function GET() {
  try {
    const entries = legalRepository.listKnowledgeBase();
    return new NextResponse(JSON.stringify(entries, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': `attachment; filename="legal_knowledge_base_export_${new Date().toISOString().slice(0, 10)}.json"`,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
