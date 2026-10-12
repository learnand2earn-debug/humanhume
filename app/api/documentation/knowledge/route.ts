import { NextRequest, NextResponse } from 'next/server';
import crypto from 'crypto';
import { legalRepository } from '@/lib/legal/repository';
import { KnowledgeCategory, KnowledgeStatus, LegalKnowledgeBaseEntry } from '@/lib/legal/types';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const jurisdiction = searchParams.get('jurisdiction') || undefined;
    const documentType = searchParams.get('documentType') || undefined;
    const category = (searchParams.get('category') as KnowledgeCategory) || undefined;
    const status = (searchParams.get('status') as KnowledgeStatus) || undefined;
    const search = searchParams.get('search') || undefined;

    const entries = legalRepository.listKnowledgeBase({
      jurisdiction,
      documentType,
      category,
      status,
      search,
    });

    return NextResponse.json({ success: true, count: entries.length, entries });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();

    if (!body.title || !body.content || !body.document_type) {
      return NextResponse.json(
        { success: false, error: 'Title, content, and document_type are required' },
        { status: 400 }
      );
    }

    const settings = legalRepository.getSettings();
    // Default status: if requiredAdminApproval is true, start as 'Draft' or 'Under Review' unless admin creates
    const initialStatus: KnowledgeStatus = body.status || (settings.requiredAdminApproval ? 'Draft' : 'Approved');

    const entry: LegalKnowledgeBaseEntry = {
      id: body.id || `kb_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
      title: body.title,
      category: body.category || 'clause',
      jurisdiction: body.jurisdiction || 'United States',
      document_type: body.document_type,
      content: body.content,
      summary: body.summary || body.title,
      source: body.source || 'ADMIN_GUIDANCE',
      source_url: body.source_url || '',
      effective_date: body.effective_date || new Date().toISOString().slice(0, 10),
      review_date: body.review_date,
      version: body.version || 'v1.0',
      status: initialStatus,
      tags: Array.isArray(body.tags) ? body.tags : [],
      approved_by: initialStatus === 'Approved' ? 'Admin' : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    legalRepository.saveKnowledgeBaseEntry(entry);
    legalRepository.addAuditLog({
      user: 'admin',
      action: 'CREATE_KNOWLEDGE_ENTRY',
      metadata: { id: entry.id, title: entry.title, status: entry.status },
    });

    return NextResponse.json({ success: true, entry });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.id) {
      return NextResponse.json({ success: false, error: 'Entry ID is required' }, { status: 400 });
    }

    const existing = legalRepository.getKnowledgeBaseEntry(body.id);
    if (!existing) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }

    // Check if approving
    if (body.action === 'approve') {
      const approved = legalRepository.approveKnowledgeBaseEntry(body.id, body.approvedBy || 'Admin');
      legalRepository.addAuditLog({
        user: body.approvedBy || 'Admin',
        action: 'APPROVE_KNOWLEDGE_ENTRY',
        metadata: { id: body.id, title: existing.title },
      });
      return NextResponse.json({ success: true, entry: approved });
    }

    const updated: LegalKnowledgeBaseEntry = {
      ...existing,
      ...body,
      updated_at: new Date().toISOString(),
    };

    legalRepository.saveKnowledgeBaseEntry(updated);
    legalRepository.addAuditLog({
      user: 'admin',
      action: 'UPDATE_KNOWLEDGE_ENTRY',
      metadata: { id: updated.id, title: updated.title, status: updated.status },
    });

    return NextResponse.json({ success: true, entry: updated });
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

    const success = legalRepository.deleteKnowledgeBaseEntry(id);
    if (success) {
      legalRepository.addAuditLog({
        user: 'admin',
        action: 'DELETE_KNOWLEDGE_ENTRY',
        metadata: { id },
      });
    }

    return NextResponse.json({ success });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ success: false, error: message }, { status: 500 });
  }
}
