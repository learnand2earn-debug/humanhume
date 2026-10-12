import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { LegalRepository } from '@/lib/legal/repository';
import { LegalDocument, LegalDocumentVersion } from '@/lib/legal/types';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const { title, text, documentType, jurisdiction } = body;

    if (!text || !text.trim()) {
      return NextResponse.json(
        { success: false, error: 'Text content is required' },
        { status: 400 }
      );
    }

    const docId = `legaldoc_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const now = new Date().toISOString();
    const repo = new LegalRepository();

    const initialVersion: LegalDocumentVersion = {
      id: `ver_${Date.now()}_1`,
      documentId: docId,
      versionNumber: 1,
      label: 'v1 Draft',
      content: text,
      createdAt: now,
      sections: [
        {
          id: `sec_${Date.now()}_1`,
          sectionNumber: 1,
          title: 'Document Content',
          content: text,
          isLegalClause: false,
        },
      ],
    };

    const newDoc: LegalDocument = {
      id: docId,
      title: title || 'Imported Agreement / Document',
      document_type: documentType || 'website-development-agreement',
      jurisdiction: jurisdiction || 'United States',
      status: 'COMPLETED',
      input_parameters: {},
      instructions: 'Imported from HumanFlow AI Platform',
      template_version: '1.0',
      knowledge_base_version: '1.0',
      disclaimer_enabled: true,
      disclaimer_text: 'Draft created via HumanFlow AI platform bridge.',
      current_attempt: 1,
      max_attempts: 3,
      versions: [initialVersion],
      created_at: now,
      updated_at: now,
    };

    repo.saveDocument(newDoc);

    return NextResponse.json({
      success: true,
      document: newDoc,
      documentId: newDoc.id,
    });
  } catch (err: any) {
    console.error('Failed to bridge to documentation studio:', err);
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
