import {NextRequest, NextResponse} from 'next/server';
import {
  addCustomDocumentType,
  addLegalAuditLog,
  getDbState,
  resolveKnowledgeConflict,
  upsertKnowledgeEntry,
} from '@/lib/db/store';
import {
  DocumentTypeDefinition,
  JurisdictionType,
  KnowledgeApprovalStatus,
  KnowledgeSourceCategory,
  LegalKnowledgeEntry,
} from '@/types';

export async function GET() {
  const state = getDbState();
  return NextResponse.json({
    knowledgeBase: state.knowledgeBase,
    conflicts: state.knowledgeConflicts,
    documentTypes: state.documentTypes,
    auditLogs: state.legalAuditLogs,
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as
    | 'UPSERT_ENTRY'
    | 'IMPORT_DOCUMENT'
    | 'UPDATE_STATUS'
    | 'DELETE_ENTRY'
    | 'RESOLVE_CONFLICT'
    | 'ADD_DOCUMENT_TYPE'
    | 'UPDATE_DOC_INSTRUCTIONS';

  const state = getDbState();

  if (action === 'RESOLVE_CONFLICT') {
    resolveKnowledgeConflict(body.conflictId, body.winningEntryId);
    addLegalAuditLog({
      user: 'Administrator',
      action: `RESOLVED_KNOWLEDGE_CONFLICT (${body.conflictId})`,
      documentId: body.winningEntryId,
      documentName: 'Knowledge Base Conflict Resolution',
      version: 'v1.0',
      templateName: 'KB Governance',
      knowledgeBaseVersion: 'KB-2026.10',
      humanizerRun: false,
      checkerRun: false,
      finalStatus: 'APPROVED',
    });
    return NextResponse.json({
      success: true,
      knowledgeBase: state.knowledgeBase,
      conflicts: state.knowledgeConflicts,
    });
  }

  if (action === 'UPDATE_STATUS') {
    const target = state.knowledgeBase.find((k) => k.id === body.id);
    if (target) {
      target.status = body.status as KnowledgeApprovalStatus;
      target.updatedAt = new Date().toISOString();
      upsertKnowledgeEntry(target);
      addLegalAuditLog({
        user: 'Administrator',
        action: `KB_STATUS_${body.status.toUpperCase()}`,
        documentId: target.id,
        documentName: target.title,
        version: target.version,
        templateName: target.documentType,
        knowledgeBaseVersion: `KB-${target.version}`,
        humanizerRun: false,
        checkerRun: false,
        finalStatus: target.status,
      });
    }
    return NextResponse.json({
      success: true,
      knowledgeBase: state.knowledgeBase,
      conflicts: state.knowledgeConflicts,
    });
  }

  if (action === 'DELETE_ENTRY') {
    const idx = state.knowledgeBase.findIndex((k) => k.id === body.id);
    if (idx >= 0) {
      state.knowledgeBase.splice(idx, 1);
    }
    return NextResponse.json({
      success: true,
      knowledgeBase: state.knowledgeBase,
    });
  }

  if (action === 'IMPORT_DOCUMENT') {
    // Pipeline: Upload -> Extract -> Admin Review -> Draft Knowledge Entry (Never auto-approved for production without Admin Approval)
    const rawText = (body.content || '') as string;
    const fileName = (body.fileName || 'Imported-Legal-Source.docx') as string;
    const jurisdiction = (body.jurisdiction || 'United States') as JurisdictionType;
    const documentType = (body.documentType || 'Service Agreement') as string;

    const newEntry: LegalKnowledgeEntry = {
      id: `kb-import-${Date.now()}`,
      title: body.title || fileName.replace(/\.[^.]+$/, '').replace(/[-_]/g, ' '),
      category: (body.category || 'ADMIN-PROVIDED GUIDANCE') as KnowledgeSourceCategory,
      jurisdiction,
      documentType,
      content:
        rawText.trim() ||
        `Extracted legal clauses and definitions from ${fileName} for ${documentType} (${jurisdiction}).`,
      summary:
        body.summary ||
        `Ingested from ${fileName}. Pending Administrator review and approval before production drafting use.`,
      approvedWording: ['Standard obligations verified from uploaded reference document.'],
      prohibitedWording: [],
      requiredClauses: ['Scope', 'Obligations', 'Governing Law'],
      optionalClauses: [],
      source: `Uploaded File: ${fileName}`,
      effectiveDate: new Date().toISOString().slice(0, 10),
      reviewDate: new Date().toISOString().slice(0, 10),
      version: body.version || '1.0.0',
      // Enforces rule: Uploaded legal material must NOT automatically become trusted production knowledge
      status: 'Under Review',
      tags: [jurisdiction, documentType, 'Imported'],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    upsertKnowledgeEntry(newEntry);
    addLegalAuditLog({
      user: 'Administrator',
      action: 'KB_INGESTED_FOR_REVIEW',
      documentId: newEntry.id,
      documentName: newEntry.title,
      version: newEntry.version,
      templateName: newEntry.documentType,
      knowledgeBaseVersion: `KB-${newEntry.version}`,
      humanizerRun: false,
      checkerRun: false,
      finalStatus: 'Under Review',
    });

    return NextResponse.json({
      success: true,
      entry: newEntry,
      knowledgeBase: state.knowledgeBase,
      conflicts: state.knowledgeConflicts,
    });
  }

  if (action === 'ADD_DOCUMENT_TYPE') {
    const name = (body.name || 'Custom Legal Agreement').trim();
    const id = name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
    const newDocType: DocumentTypeDefinition = {
      id,
      name,
      category: body.category || 'Legal & Contracts',
      requiresJurisdiction: body.requiresJurisdiction ?? true,
      description: body.description || `Custom ${name} template configured by Administrator.`,
      draftingInstructions: Array.isArray(body.draftingInstructions)
        ? body.draftingInstructions
        : ['Include core scope, obligations, and governing law.'],
      requiredSections: [
        '1. Introduction & Parties',
        '2. Definitions & Scope',
        '3. Core Obligations',
        '4. Financial & Compliance Terms',
        '5. Term & Termination',
        '6. Governing Law & Signatures',
      ],
      optionalSections: ['Appendix'],
      fields: [
        {key: 'COMPANY_NAME', label: 'Organization Name', placeholder: 'e.g., Acme Corp.', required: true, type: 'text'},
        {key: 'CLIENT_NAME', label: 'Counterparty Name', placeholder: 'e.g., Global Client LLC', required: true, type: 'text'},
        {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
        {key: 'SERVICE_DESCRIPTION', label: 'Scope & Instructions', placeholder: 'Describe key terms and scope.', required: true, type: 'textarea'},
      ],
      defaultIntensity: body.requiresJurisdiction ? 'LOW' : 'NORMAL',
      version: '1.0.0',
    };
    addCustomDocumentType(newDocType);
    return NextResponse.json({
      success: true,
      documentTypes: state.documentTypes,
    });
  }

  if (action === 'UPDATE_DOC_INSTRUCTIONS') {
    const dt = state.documentTypes.find((d) => d.id === body.documentTypeId);
    if (dt && Array.isArray(body.draftingInstructions)) {
      dt.draftingInstructions = body.draftingInstructions;
    }
    return NextResponse.json({
      success: true,
      documentTypes: state.documentTypes,
    });
  }

  // Default: UPSERT_ENTRY
  const entry: LegalKnowledgeEntry = {
    id: body.id || `kb-${Date.now()}`,
    title: body.title || 'Untitled Knowledge Base Entry',
    category: (body.category || 'INTERNAL TEMPLATE') as KnowledgeSourceCategory,
    jurisdiction: (body.jurisdiction || 'United States') as JurisdictionType,
    documentType: body.documentType || 'Website Development Agreement',
    content: body.content || '',
    summary: body.summary || '',
    approvedWording: body.approvedWording || [],
    prohibitedWording: body.prohibitedWording || [],
    requiredClauses: body.requiredClauses || ['Scope', 'Governing Law'],
    optionalClauses: body.optionalClauses || [],
    source: body.source || 'Admin Knowledge Entry',
    sourceUrl: body.sourceUrl || '',
    effectiveDate: body.effectiveDate || new Date().toISOString().slice(0, 10),
    reviewDate: body.reviewDate || new Date().toISOString().slice(0, 10),
    version: body.version || '1.0.0',
    status: (body.status || 'Draft') as KnowledgeApprovalStatus,
    tags: body.tags || [body.jurisdiction || 'United States'],
    createdAt: body.createdAt || new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  upsertKnowledgeEntry(entry);

  return NextResponse.json({
    success: true,
    entry,
    knowledgeBase: state.knowledgeBase,
    conflicts: state.knowledgeConflicts,
  });
}
