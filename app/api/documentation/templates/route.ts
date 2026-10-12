import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { legalRepository } from '@/lib/legal/repository';
import { KnowledgeStatus, LegalTemplate } from '@/lib/legal/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const documentType = searchParams.get('documentType') || undefined;
    const jurisdiction = searchParams.get('jurisdiction') || undefined;
    const status = (searchParams.get('status') as KnowledgeStatus) || undefined;

    const templates = legalRepository.listTemplates({
      documentType,
      jurisdiction,
      status,
    });

    return NextResponse.json({ success: true, count: templates.length, templates });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.name || !body.document_type) {
      return NextResponse.json(
        { success: false, error: 'Template name and document_type are required' },
        { status: 400 }
      );
    }

    const tpl: LegalTemplate = {
      id: body.id || `tpl_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
      name: body.name,
      document_type: body.document_type,
      jurisdiction: body.jurisdiction || 'United States',
      purpose: body.purpose || '',
      required_sections: Array.isArray(body.required_sections) ? body.required_sections : [],
      optional_sections: Array.isArray(body.optional_sections) ? body.optional_sections : [],
      required_clauses: Array.isArray(body.required_clauses) ? body.required_clauses : [],
      optional_clauses: Array.isArray(body.optional_clauses) ? body.optional_clauses : [],
      variables: Array.isArray(body.variables) ? body.variables : [],
      legal_notes: body.legal_notes || '',
      humanization_rules: body.humanization_rules || {
        clause_protection: 'HIGH',
        tone: 'legal',
        intensity: 'CONSERVATIVE',
      },
      version: body.version || 'v1.0',
      approval_status: body.approval_status || 'Approved',
      template_content: body.template_content || '',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    legalRepository.saveTemplate(tpl);
    legalRepository.addAuditLog({
      user: 'admin',
      action: 'SAVE_TEMPLATE',
      metadata: { id: tpl.id, name: tpl.name, status: tpl.approval_status },
    });

    return NextResponse.json({ success: true, template: tpl });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    if (!id) {
      return NextResponse.json({ success: false, error: 'ID is required' }, { status: 400 });
    }

    const success = legalRepository.deleteTemplate(id);
    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
