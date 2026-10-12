import { NextRequest, NextResponse } from 'next/server';
import { legalRepository } from '@/lib/legal/repository';
import { LegalDocumentType } from '@/lib/legal/types';

export async function GET() {
  try {
    const types = legalRepository.listDocumentTypes();
    return NextResponse.json({ success: true, types });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name || !body.category) {
      return NextResponse.json(
        { success: false, error: 'Document type name and category are required' },
        { status: 400 }
      );
    }

    const id = body.id || body.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newType: LegalDocumentType = {
      id,
      name: body.name,
      category: body.category,
      is_legal: body.is_legal !== false,
      description: body.description || '',
      default_jurisdiction: body.default_jurisdiction || 'United States',
      default_instructions: Array.isArray(body.default_instructions) ? body.default_instructions : [],
      required_sections: Array.isArray(body.required_sections) ? body.required_sections : [],
      fields: Array.isArray(body.fields) ? body.fields : [],
    };

    legalRepository.saveDocumentType(newType);
    legalRepository.addAuditLog({
      user: 'admin',
      action: 'CREATE_DOCUMENT_TYPE',
      metadata: { id: newType.id, name: newType.name },
    });

    return NextResponse.json({ success: true, type: newType });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
