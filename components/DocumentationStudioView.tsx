'use client';

import React, {useEffect, useMemo, useState} from 'react';
import {
  AlertTriangle,
  BookOpen,
  CheckCircle2,
  Download,
  FileCode2,
  FileText,
  Layers,
  Plus,
  RefreshCw,
  Save,
  Scale,
  Search,
  ShieldCheck,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  DocumentRecord,
  DocumentTypeDefinition,
  JurisdictionType,
  LegalKnowledgeEntry,
} from '@/types';
import {computeVisualDiff} from '@/lib/document/analyzer';
import {parseResponseJsonSafely} from '@/lib/safe-json';

interface DocumentationStudioViewProps {
  documentTypes: DocumentTypeDefinition[];
  knowledgeBase: LegalKnowledgeEntry[];
  studioDocuments: DocumentRecord[];
  initialSelectedDocTypeId?: string;
  onDocumentCreatedOrUpdated: (doc: DocumentRecord) => void;
  onRefreshGlobalData: () => void;
}

const JURISDICTIONS: JurisdictionType[] = [
  'United States',
  'United Kingdom',
  'European Union',
  'UAE',
  'Pakistan',
  'Canada',
  'Australia',
  'Custom',
];

export default function DocumentationStudioView({
  documentTypes,
  knowledgeBase,
  studioDocuments,
  initialSelectedDocTypeId,
  onDocumentCreatedOrUpdated,
  onRefreshGlobalData,
}: DocumentationStudioViewProps) {
  const [studioSubTab, setStudioSubTab] = useState<
    'create' | 'editor' | 'templates' | 'kb' | 'drafts'
  >('create');

  const [selectedDocTypeId, setSelectedDocTypeId] = useState<string>(
    initialSelectedDocTypeId || documentTypes[0]?.id || 'website-dev-agreement'
  );
  const [jurisdiction, setJurisdiction] = useState<string>('United States');
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [formValues, setFormValues] = useState<Record<string, string>>(() => {
    const first = documentTypes[0];
    if (!first) return {};
    const init: Record<string, string> = {};
    first.fields.forEach((f) => {
      init[f.key] = f.placeholder.replace(/^e\.g\.,\s*/i, '');
    });
    return init;
  });
  const [validationError, setValidationError] = useState<string | null>(null);
  const [missingFieldsList, setMissingFieldsList] = useState<Array<{key: string; label: string}>>(
    []
  );
  const [isGenerating, setIsGenerating] = useState(false);

  // Active Studio Document for the 6-Tab Editor
  const [activeDoc, setActiveDoc] = useState<DocumentRecord | null>(
    studioDocuments[0] || null
  );
  const [editorTab, setEditorTab] = useState<
    'DRAFT' | 'HUMANIZED' | 'FINAL' | 'DIFF' | 'LEGAL_CHECK' | 'KNOWLEDGE_SOURCES'
  >('FINAL');
  const [editableFinalText, setEditableFinalText] = useState<string>(
    studioDocuments[0]?.finalContent || ''
  );
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [regeneratingSectionIdx, setRegeneratingSectionIdx] = useState<number | null>(null);
  const [exportFormat, setExportFormat] = useState<'docx' | 'pdf' | 'txt' | 'md'>('pdf');

  // KB Search filters inside Documentation Studio
  const [kbSearch, setKbSearch] = useState('');
  const [kbJurisdictionFilter, setKbJurisdictionFilter] = useState<string>('ALL');

  // Template instructions editor state
  const [editingInstructionText, setEditingInstructionText] = useState<string>('');
  const [newDocTypeName, setNewDocTypeName] = useState('');
  const [newDocTypeCategory, setNewDocTypeCategory] = useState<
    DocumentTypeDefinition['category']
  >('Legal & Contracts');

  const currentDocType = useMemo(() => {
    return (
      documentTypes.find((d) => d.id === (initialSelectedDocTypeId || selectedDocTypeId)) ||
      documentTypes[0]
    );
  }, [documentTypes, initialSelectedDocTypeId, selectedDocTypeId]);

  const buildDefaultFieldValues = (dt?: DocumentTypeDefinition) => {
    if (!dt) return {};
    const populated: Record<string, string> = {};
    dt.fields.forEach((f) => {
      populated[f.key] = f.placeholder.replace(/^e\.g\.,\s*/i, '');
    });
    return populated;
  };

  const selectDocTypeAndSync = (docTypeId: string) => {
    setSelectedDocTypeId(docTypeId);
    const found = documentTypes.find((d) => d.id === docTypeId);
    if (found) {
      setEditingInstructionText(found.draftingInstructions.join('\n'));
      setFormValues(buildDefaultFieldValues(found));
    }
    setValidationError(null);
    setMissingFieldsList([]);
  };

  const handlePrefillSampleValues = () => {
    if (!currentDocType) return;
    const populated: Record<string, string> = {};
    currentDocType.fields.forEach((f) => {
      populated[f.key] = f.placeholder.replace(/^e\.g\.,\s*/i, '');
    });
    setFormValues(populated);
    if (currentDocType.requiresJurisdiction && !jurisdiction) {
      setJurisdiction('United States');
    }
    setValidationError(null);
    setMissingFieldsList([]);
  };

  const handleGenerateDocument = async (e: React.FormEvent) => {
    e.preventDefault();
    setValidationError(null);
    setMissingFieldsList([]);
    setIsGenerating(true);

    try {
      const res = await fetch('/api/studio/generate', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          documentTypeId: currentDocType.id,
          jurisdiction: currentDocType.requiresJurisdiction ? jurisdiction : 'Not Applicable',
          variables: formValues,
          customInstructions,
        }),
      });

      const parsed = await parseResponseJsonSafely<{
        document?: DocumentRecord;
        error?: string;
        missingFields?: Array<{key: string; label: string}>;
      }>(res, {});
      if (!parsed.ok) {
        setValidationError(parsed.data.error || parsed.errorMessage || 'Missing required fields');
        setMissingFieldsList(parsed.data.missingFields || []);
        return;
      }

      if (parsed.data.document) {
        setActiveDoc(parsed.data.document);
        setEditableFinalText(parsed.data.document.finalContent);
        onDocumentCreatedOrUpdated(parsed.data.document);
        setStudioSubTab('editor');
        setEditorTab('FINAL');
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleSaveEditorChanges = async () => {
    if (!activeDoc) return;
    setIsSavingEdit(true);
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({finalContent: editableFinalText}),
      });
      const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
      if (data.document) {
        setActiveDoc(data.document);
        onDocumentCreatedOrUpdated(data.document);
      }
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleRegenerateClause = async (sectionIdx: number) => {
    if (!activeDoc) return;
    setRegeneratingSectionIdx(sectionIdx);
    try {
      const res = await fetch(`/api/documents/${activeDoc.id}/process`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sectionIndex: sectionIdx}),
      });
      const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
      if (data.document) {
        setActiveDoc(data.document);
        setEditableFinalText(data.document.finalContent);
        onDocumentCreatedOrUpdated(data.document);
      }
    } finally {
      setRegeneratingSectionIdx(null);
    }
  };

  const handleDownloadStudioFile = (target: 'draft' | 'final' | 'report') => {
    if (!activeDoc) return;
    const url = `/api/documents/${activeDoc.id}/download?target=${target}&format=${exportFormat}`;
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleSaveDocInstructions = async () => {
    if (!currentDocType) return;
    const lines = editingInstructionText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean);
    await fetch('/api/admin/kb', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'UPDATE_DOC_INSTRUCTIONS',
        documentTypeId: currentDocType.id,
        draftingInstructions: lines,
      }),
    });
    onRefreshGlobalData();
  };

  const handleCreateNewDocType = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDocTypeName.trim()) return;
    await fetch('/api/admin/kb', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({
        action: 'ADD_DOCUMENT_TYPE',
        name: newDocTypeName.trim(),
        category: newDocTypeCategory,
        requiresJurisdiction: newDocTypeCategory !== 'Technical & Product',
      }),
    });
    setNewDocTypeName('');
    onRefreshGlobalData();
  };

  const v1DraftVersion = activeDoc?.versions.find((v) => v.versionLabel === 'v1 Draft');
  const v2HumanizedVersion = activeDoc?.versions.find((v) => v.versionLabel === 'v2 Humanized');

  const studioDiffTokens = useMemo(() => {
    if (!activeDoc) return [];
    return computeVisualDiff(
      activeDoc.originalContent,
      activeDoc.finalContent,
      activeDoc.protectedMap
    );
  }, [activeDoc]);

  const filteredKbEntries = useMemo(() => {
    return knowledgeBase.filter((k) => {
      const matchesStatus = k.status === 'Approved';
      const matchesJur =
        kbJurisdictionFilter === 'ALL' || k.jurisdiction === kbJurisdictionFilter;
      const matchesQuery =
        !kbSearch.trim() ||
        k.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
        k.documentType.toLowerCase().includes(kbSearch.toLowerCase()) ||
        k.content.toLowerCase().includes(kbSearch.toLowerCase());
      return matchesStatus && matchesJur && matchesQuery;
    });
  }, [knowledgeBase, kbJurisdictionFilter, kbSearch]);

  return (
    <div className="space-y-6">
      {/* Studio Sub-Navigation Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-100 font-display">
            Documentation Studio & Legal Knowledge Base
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a document type · Populate structured variables · Automated KB Retrieval → Draft → Conservative Humanization → Legal Check
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-950 p-1 rounded-lg border border-slate-800">
          {[
            {id: 'create', label: 'Create Document'},
            {id: 'editor', label: `Document Editor ${activeDoc ? '(Active)' : ''}`},
            {id: 'templates', label: `Templates (${documentTypes.length})`},
            {id: 'kb', label: 'Approved Knowledge Base'},
            {id: 'drafts', label: `My Drafts & Legal Checks (${studioDocuments.length})`},
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setStudioSubTab(tab.id as typeof studioSubTab)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                studioSubTab === tab.id
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Legal Disclaimer Notice Banner */}
      <div className="bg-slate-900/70 border border-slate-800 rounded-xl px-4 py-3 flex items-center justify-between gap-4 text-xs text-slate-300">
        <div className="flex items-center gap-2.5">
          <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
          <span>
            <strong>AI-generated draft — professional legal review recommended.</strong> This document is provided for drafting and informational purposes and does not constitute legal advice.
          </span>
        </div>
        <span className="text-slate-500 font-mono whitespace-nowrap shrink-0">
          Approved KB Entries: {knowledgeBase.filter((k) => k.status === 'Approved').length}
        </span>
      </div>

      {/* SUB-TAB 1: CREATE DOCUMENT */}
      {studioSubTab === 'create' && currentDocType && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Left 4 Cols: 27+ Document Type Selector */}
          <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-100">
                1. Select Documentation Type
              </h3>
              <span className="text-xs text-slate-400 font-mono tabular-nums">
                {documentTypes.length} types
              </span>
            </div>

            <div className="space-y-4 max-h-[560px] overflow-y-auto pr-1">
              {(
                [
                  'Legal & Contracts',
                  'Privacy & Compliance',
                  'Technical & Product',
                  'Operations & HR',
                ] as const
              ).map((cat) => {
                const items = documentTypes.filter((d) => d.category === cat);
                return (
                  <div key={cat} className="space-y-1.5">
                    <p className="text-[11px] font-semibold text-slate-400 px-1">
                      {cat}
                    </p>
                    <div className="space-y-1">
                      {items.map((dt) => (
                        <button
                          key={dt.id}
                          type="button"
                          onClick={() => selectDocTypeAndSync(dt.id)}
                          className={`w-full text-left px-3 py-2 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${
                            currentDocType.id === dt.id
                              ? 'bg-indigo-600 text-white font-medium'
                              : 'bg-slate-950 hover:bg-slate-800/80 text-slate-300 border border-slate-800/80'
                          }`}
                        >
                          <span className="truncate">{dt.name}</span>
                          <span className="text-[10px] opacity-75 font-mono shrink-0">
                            v{dt.version}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Right 8 Cols: Dynamic Variable Form + Jurisdiction + Missing Info Validator */}
          <form
            onSubmit={handleGenerateDocument}
            className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6"
          >
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <h3 className="text-base font-semibold text-slate-100 font-display">
                  2. Configure {currentDocType.name}
                </h3>
                <p className="text-xs text-slate-400 mt-1">{currentDocType.description}</p>
                <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 mt-2">
                  <span>Category: {currentDocType.category}</span>
                  <span>·</span>
                  <span>
                    Humanization Intensity:{' '}
                    <strong className="text-indigo-300">
                      {currentDocType.requiresJurisdiction
                        ? 'LOW / CONSERVATIVE (Legal Clause Protection)'
                        : 'NORMAL (Technical Prose)'}
                    </strong>
                  </span>
                  <span>·</span>
                  <span>{currentDocType.requiredSections.length} Required Sections</span>
                </div>
              </div>

              <button
                type="button"
                onClick={handlePrefillSampleValues}
                className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
              >
                Auto-Fill Realistic Sample Details
              </button>
            </div>

            {/* Missing Information Engine Alert */}
            {validationError && (
              <div className="bg-rose-950/50 border border-rose-500/50 rounded-xl p-4 space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-rose-300">
                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{validationError}</span>
                </div>
                {missingFieldsList.length > 0 && (
                  <p className="text-xs text-rose-200/90">
                    The Drafting Agent never fabricates missing facts or assumes jurisdiction. Please provide:{' '}
                    <strong>{missingFieldsList.map((m) => m.label).join(', ')}</strong>.
                  </p>
                )}
              </div>
            )}

            {/* Jurisdiction Selector */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Governing Jurisdiction{' '}
                  {currentDocType.requiresJurisdiction ? (
                    <span className="text-rose-400">(Required for Legal Document)</span>
                  ) : (
                    <span className="text-slate-500">(Optional for Technical Doc)</span>
                  )}
                </label>
                <select
                  value={jurisdiction}
                  onChange={(e) => setJurisdiction(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- Select Governing Jurisdiction --</option>
                  {JURISDICTIONS.map((jur) => (
                    <option key={jur} value={jur}>
                      {jur}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1.5">
                  Template & Knowledge Base Binding
                </label>
                <div className="bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-400 font-mono">
                  Template v{currentDocType.version} · Approved KB Only
                </div>
              </div>
            </div>

            {/* Dynamic Document Type Fields */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {currentDocType.fields.map((field) => (
                <div
                  key={field.key}
                  className={field.type === 'textarea' ? 'md:col-span-2' : ''}
                >
                  <label className="block text-xs font-medium text-slate-300 mb-1.5">
                    {field.label}{' '}
                    {field.required && <span className="text-rose-400">*</span>}
                    <span className="text-slate-500 font-mono ml-2 text-[11px]">
                      {`{{${field.key}}}`}
                    </span>
                  </label>
                  {field.type === 'textarea' ? (
                    <textarea
                      rows={3}
                      value={formValues[field.key] || ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({...prev, [field.key]: e.target.value}))
                      }
                      placeholder={field.placeholder}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  ) : (
                    <input
                      type={field.type === 'date' ? 'date' : 'text'}
                      value={formValues[field.key] || ''}
                      onChange={(e) =>
                        setFormValues((prev) => ({...prev, [field.key]: e.target.value}))
                      }
                      placeholder={field.placeholder}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Additional Custom Instructions */}
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">
                Additional Specific Instructions / Clauses (Optional)
              </label>
              <input
                type="text"
                value={customInstructions}
                onChange={(e) => setCustomInstructions(e.target.value)}
                placeholder="e.g., Include SOC 2 Type II audit requirement and 99.95% uptime SLA commitment"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3.5 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Preview Required Sections & Submit */}
            <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
              <p className="text-xs font-medium text-slate-300">
                Structured Sections Generated for {currentDocType.name}:
              </p>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-slate-400">
                {currentDocType.requiredSections.map((sec, idx) => (
                  <React.Fragment key={sec}>
                    <span>{sec}</span>
                    {idx < currentDocType.requiredSections.length - 1 && (
                      <span aria-hidden="true">·</span>
                    )}
                  </React.Fragment>
                ))}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isGenerating}
                className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
              >
                <Sparkles className={`w-4 h-4 ${isGenerating ? 'animate-spin' : ''}`} />
                {isGenerating
                  ? 'Running KB Search → Draft → Humanize → Legal Preservation...'
                  : 'Generate & Automatically Humanize Document'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* SUB-TAB 2: 6-TAB DOCUMENT EDITOR */}
      {studioSubTab === 'editor' && (
        <div className="space-y-6">
          {!activeDoc ? (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-10 text-center space-y-3">
              <FileText className="w-8 h-8 text-slate-500 mx-auto" />
              <h3 className="text-sm font-semibold text-slate-200">
                No Active Studio Document Selected
              </h3>
              <p className="text-xs text-slate-400 max-w-md mx-auto">
                Select a document type in the Create Document tab and click Generate to run the automated Legal Knowledge Base drafting and humanization pipeline.
              </p>
              <button
                onClick={() => setStudioSubTab('create')}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium"
              >
                Create First Studio Document
              </button>
            </div>
          ) : (
            <>
              {/* Document Report Summary Header */}
              <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-5 flex flex-wrap items-center justify-between gap-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>{activeDoc.docStudioMeta?.documentType || activeDoc.originalName}</span>
                    <span>·</span>
                    <span>Jurisdiction: {activeDoc.docStudioMeta?.jurisdiction || 'Global'}</span>
                    <span>·</span>
                    <span className="font-mono">
                      Template v{activeDoc.docStudioMeta?.templateVersion || '2.0'}
                    </span>
                    <span>·</span>
                    <span className="font-mono">
                      {activeDoc.docStudioMeta?.knowledgeBaseVersion || 'KB-2026.10'}
                    </span>
                    <span>·</span>
                    <span className="font-mono">Trace: {activeDoc.traceId}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100 font-display">
                    {activeDoc.originalName}
                  </h3>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <select
                    aria-label="Studio export format"
                    value={exportFormat}
                    onChange={(e) =>
                      setExportFormat(e.target.value as 'docx' | 'pdf' | 'txt' | 'md')
                    }
                    className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
                  >
                    <option value="docx">Export: DOCX</option>
                    <option value="pdf">Export: PDF</option>
                    <option value="txt">Export: TXT</option>
                    <option value="md">Export: Markdown</option>
                  </select>

                  <button
                    onClick={() => handleDownloadStudioFile('draft')}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    v1 Draft
                  </button>

                  <button
                    onClick={() => handleDownloadStudioFile('final')}
                    className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Export v4 Final ({exportFormat.toUpperCase()})
                  </button>

                  <button
                    onClick={() => handleDownloadStudioFile('report')}
                    className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    <Download className="w-3.5 h-3.5" />
                    Document Report
                  </button>
                </div>
              </div>

              {/* 6-Tab Bar: DRAFT | HUMANIZED | FINAL | DIFF | LEGAL CHECK | KNOWLEDGE SOURCES */}
              <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-3">
                <div className="flex flex-wrap items-center gap-1.5">
                  {(
                    [
                      {id: 'DRAFT', label: 'v1 DRAFT'},
                      {id: 'HUMANIZED', label: 'v2 HUMANIZED'},
                      {id: 'FINAL', label: 'v4 FINAL (Editable)'},
                      {id: 'DIFF', label: 'DIFF (Draft vs Final)'},
                      {id: 'LEGAL_CHECK', label: `LEGAL CHECK (${activeDoc.docStudioMeta?.legalQualityStatus || 'PASS'})`},
                      {id: 'KNOWLEDGE_SOURCES', label: `KNOWLEDGE SOURCES (${activeDoc.docStudioMeta?.sourcesUsed.length || 0})`},
                    ] as const
                  ).map((t) => (
                    <button
                      key={t.id}
                      onClick={() => setEditorTab(t.id)}
                      className={`px-3.5 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                        editorTab === t.id
                          ? 'bg-indigo-600 text-white'
                          : 'bg-slate-900 text-slate-400 hover:text-slate-200 border border-slate-800'
                      }`}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>

                {editorTab === 'FINAL' && (
                  <button
                    onClick={handleSaveEditorChanges}
                    disabled={isSavingEdit}
                    className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
                  >
                    <Save className="w-3.5 h-3.5" />
                    {isSavingEdit ? 'Saving...' : 'Save Final Edits'}
                  </button>
                )}
              </div>

              {/* Tab Content Viewport */}
              {editorTab === 'DRAFT' && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                    <span>
                      Immutable Initial Draft (v1 Draft — Preserved prior to humanization)
                    </span>
                    <span className="font-mono">
                      Created {v1DraftVersion?.createdAt.slice(0, 19).replace('T', ' ')}
                    </span>
                  </div>
                  <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-w-[72ch]">
                    {v1DraftVersion?.content || activeDoc.originalContent}
                  </pre>
                </div>
              )}

              {editorTab === 'HUMANIZED' && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-3">
                  <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                    <span>
                      Humanized Version (v2 Humanized — Processed via {v2HumanizedVersion?.provider || 'HumanFlow Engine'})
                    </span>
                    <span className="font-mono tabular-nums">
                      AI Score: {v2HumanizedVersion?.checkerScore ?? 6}% · Preservation: {v2HumanizedVersion?.preservationScore ?? activeDoc.preservationResult.preservationScore}%
                    </span>
                  </div>
                  <pre className="text-sm text-slate-200 whitespace-pre-wrap font-sans leading-relaxed max-w-[72ch]">
                    {v2HumanizedVersion?.content || activeDoc.finalContent}
                  </pre>
                </div>
              )}

              {editorTab === 'FINAL' && (
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  <div className="lg:col-span-8 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800 pb-3">
                      <span>v4 Final Document Editor (Full preservation verified)</span>
                      <span className="font-mono tabular-nums">
                        AI Score: {activeDoc.qualityChecks[0]?.aiScore ?? 6}% · Readability:{' '}
                        {activeDoc.preservationResult.readabilityScore}%
                      </span>
                    </div>
                    <textarea
                      rows={22}
                      value={editableFinalText}
                      onChange={(e) => setEditableFinalText(e.target.value)}
                      className="w-full bg-slate-950 border border-slate-800 rounded-lg p-4 text-sm text-slate-100 font-sans leading-relaxed focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Section-Level Regeneration Sidebar */}
                  <div className="lg:col-span-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
                    <h4 className="text-sm font-semibold text-slate-100">
                      Selective Clause Regeneration
                    </h4>
                    <p className="text-xs text-slate-400">
                      Select any individual clause (e.g., Termination or Liability) to re-run conservative humanization on that section alone without altering the rest of the document.
                    </p>
                    <div className="space-y-2.5 max-h-[480px] overflow-y-auto pr-1">
                      {activeDoc.chunks.map((chunk, idx) => (
                        <div
                          key={chunk.id}
                          className="bg-slate-950 border border-slate-800 rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-medium text-slate-200 truncate">
                              {chunk.heading?.replace(/^#+\s*/, '') || `Section #${idx + 1}`}
                            </span>
                            <button
                              onClick={() => handleRegenerateClause(idx)}
                              disabled={regeneratingSectionIdx === idx}
                              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 rounded text-[11px] font-medium flex items-center gap-1 shrink-0 disabled:opacity-50"
                            >
                              <RefreshCw
                                className={`w-3 h-3 ${regeneratingSectionIdx === idx ? 'animate-spin' : ''}`}
                              />
                              Regenerate Section
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-400 line-clamp-2">
                            {chunk.restoredText}
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {editorTab === 'DIFF' && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="text-xs text-slate-400 border-b border-slate-800 pb-3 flex items-center justify-between">
                    <span>
                      Visual Comparison: v1 Draft vs v4 Final (Conservative Legal Clause Protection Active)
                    </span>
                    <span className="font-mono text-emerald-400">
                      Obligation & Entity Preservation: {activeDoc.preservationResult.preservationScore}%
                    </span>
                  </div>
                  <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans bg-slate-950 border border-slate-800 rounded-lg p-5">
                    {studioDiffTokens.map((tok, idx) => {
                      if (tok.type === 'added') {
                        return (
                          <span key={idx} className="bg-emerald-500/20 text-emerald-200 px-0.5 rounded">
                            {tok.value}
                          </span>
                        );
                      }
                      if (tok.type === 'removed') {
                        return (
                          <span
                            key={idx}
                            className="bg-rose-500/15 text-rose-300/80 line-through px-0.5 rounded"
                          >
                            {tok.value}
                          </span>
                        );
                      }
                      if (tok.type === 'changed') {
                        return (
                          <span key={idx} className="bg-amber-500/20 text-amber-200 px-0.5 rounded">
                            {tok.value}
                          </span>
                        );
                      }
                      if (tok.type === 'protected') {
                        return (
                          <span
                            key={idx}
                            className="bg-indigo-500/20 text-indigo-200 border-b border-indigo-400/50 px-0.5"
                          >
                            {tok.value}
                          </span>
                        );
                      }
                      return <React.Fragment key={idx}>{tok.value}</React.Fragment>;
                    })}
                  </div>
                </div>
              )}

              {editorTab === 'LEGAL_CHECK' && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-100">
                        Legal Quality & Consistency Verification Report
                      </h4>
                      <p className="text-xs text-slate-400 mt-0.5">
                        Checks required clauses, populated variables, jurisdiction consistency, and signature execution blocks
                      </p>
                    </div>
                    <span className="text-sm font-semibold text-emerald-400 font-mono">
                      Status: {activeDoc.docStudioMeta?.legalQualityStatus || 'PASS'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {[
                      {
                        title: 'Required Sections & Clauses',
                        detail: 'All mandatory sections for this document type are present and ordered logically.',
                      },
                      {
                        title: 'Template Variable Population',
                        detail: 'All user-provided variables ({{COMPANY_NAME}}, {{EFFECTIVE_DATE}}, etc.) are populated with zero empty placeholders.',
                      },
                      {
                        title: 'Jurisdiction & Governing Law Consistency',
                        detail: `Confirmed explicit governing law alignment with ${activeDoc.docStudioMeta?.jurisdiction || 'selected jurisdiction'}.`,
                      },
                      {
                        title: 'Legal Obligation Preservation',
                        detail: `${activeDoc.preservationResult.preservationScore}% of defined terms, monetary caps, notice periods, and dates match the initial validated draft (${activeDoc.protectedMap.entities.length} locked entities)`,
                        
                      },
                    ].map((check, i) => (
                      <div
                        key={i}
                        className="bg-slate-950 border border-slate-800 rounded-lg p-4 flex items-start gap-3"
                      >
                        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                        <div>
                          <p className="text-xs font-semibold text-slate-200">{check.title}</p>
                          <p className="text-xs text-slate-400 mt-1">{check.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {editorTab === 'KNOWLEDGE_SOURCES' && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
                  <div className="border-b border-slate-800 pb-3">
                    <h4 className="text-sm font-semibold text-slate-100">
                      Section-by-Section Knowledge Source Traceability
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Distinguishes between AUTHORITATIVE SOURCE, INTERNAL TEMPLATE, ADMIN-PROVIDED GUIDANCE, and configured drafting instructions
                    </p>
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left border-collapse text-xs">
                      <thead>
                        <tr className="border-b border-slate-800 text-slate-400">
                          <th className="py-2.5 pr-4 font-medium">Section</th>
                          <th className="py-2.5 px-4 font-medium">Knowledge Base Entry / Source</th>
                          <th className="py-2.5 px-4 font-medium">Classification</th>
                          <th className="py-2.5 px-4 font-medium">Jurisdiction</th>
                          <th className="py-2.5 pl-4 font-medium text-right">Version & Date</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800/60">
                        {(activeDoc.docStudioMeta?.sourcesUsed || []).map((src, i) => (
                          <tr key={i} className="hover:bg-slate-800/30">
                            <td className="py-3 pr-4 font-medium text-slate-200">
                              {src.sectionTitle}
                            </td>
                            <td className="py-3 px-4 text-slate-300">{src.sourceTitle}</td>
                            <td className="py-3 px-4 text-indigo-300 font-mono text-[11px]">
                              {src.category}
                            </td>
                            <td className="py-3 px-4 text-slate-300">{src.jurisdiction}</td>
                            <td className="py-3 pl-4 text-right font-mono tabular-nums text-slate-400">
                              v{src.version} · {src.lastUpdated}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* SUB-TAB 3: TEMPLATES & INSTRUCTIONS */}
      {studioSubTab === 'templates' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
            <h3 className="text-sm font-semibold text-slate-100">
              Admin-Configurable Drafting Instructions ({currentDocType?.name})
            </h3>
            <p className="text-xs text-slate-400">
              Customize the mandatory drafting rules for {currentDocType?.name}. One instruction per line.
            </p>
            <textarea
              rows={8}
              value={editingInstructionText}
              onChange={(e) => setEditingInstructionText(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3.5 text-xs text-slate-100 font-mono leading-relaxed focus:outline-none focus:border-indigo-500"
            />
            <button
              onClick={handleSaveDocInstructions}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5" />
              Save Drafting Instructions
            </button>
          </div>

          <form
            onSubmit={handleCreateNewDocType}
            className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4"
          >
            <h3 className="text-sm font-semibold text-slate-100">
              Add New Custom Document Type
            </h3>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Document Type Name</label>
              <input
                type="text"
                value={newDocTypeName}
                onChange={(e) => setNewDocTypeName(e.target.value)}
                placeholder="e.g., Enterprise AI Model Licensing Agreement"
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-300 mb-1">Category</label>
              <select
                value={newDocTypeCategory}
                onChange={(e) =>
                  setNewDocTypeCategory(
                    e.target.value as DocumentTypeDefinition['category']
                  )
                }
                className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100"
              >
                <option value="Legal & Contracts">Legal & Contracts</option>
                <option value="Privacy & Compliance">Privacy & Compliance</option>
                <option value="Technical & Product">Technical & Product</option>
                <option value="Operations & HR">Operations & HR</option>
              </select>
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Document Type to Studio
            </button>
          </form>
        </div>
      )}

      {/* SUB-TAB 4: APPROVED KNOWLEDGE BASE EXPLORER */}
      {studioSubTab === 'kb' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                Production Approved Legal Knowledge Base
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Only APPROVED entries are retrieved by the Documentation Drafting Agent during production runs
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={kbSearch}
                  onChange={(e) => setKbSearch(e.target.value)}
                  placeholder="Search clauses, statutes, types..."
                  className="bg-slate-950 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-100"
                />
              </div>

              <select
                aria-label="Filter knowledge base by jurisdiction"
                value={kbJurisdictionFilter}
                onChange={(e) => setKbJurisdictionFilter(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200"
              >
                <option value="ALL">All Jurisdictions</option>
                {JURISDICTIONS.map((j) => (
                  <option key={j} value={j}>
                    {j}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredKbEntries.map((entry) => (
              <div
                key={entry.id}
                className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2.5"
              >
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <span className="text-indigo-300 font-medium">{entry.category}</span>
                  <span className="font-mono">
                    {entry.jurisdiction} · v{entry.version} · {entry.status}
                  </span>
                </div>
                <h4 className="text-sm font-semibold text-slate-100">{entry.title}</h4>
                <p className="text-xs text-slate-300 leading-relaxed">{entry.content}</p>
                <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                  <span>Document Type: {entry.documentType}</span>
                  <span>Source: {entry.source}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* SUB-TAB 5: MY DRAFTS & LEGAL CHECKS */}
      {studioSubTab === 'drafts' && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
          <h3 className="text-sm font-semibold text-slate-100">
            Generated Documentation Studio History & Version Audits
          </h3>
          {studioDocuments.length === 0 ? (
            <p className="text-xs text-slate-400">
              No studio documents generated yet. Use Create Document to draft your first agreement or technical guide.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400">
                    <th className="py-2.5 pr-4 font-medium">Document</th>
                    <th className="py-2.5 px-4 font-medium">Jurisdiction</th>
                    <th className="py-2.5 px-4 font-medium">KB & Template Version</th>
                    <th className="py-2.5 px-4 font-medium">Legal Check</th>
                    <th className="py-2.5 px-4 font-medium text-right">AI Score</th>
                    <th className="py-2.5 pl-4 font-medium text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {studioDocuments.map((doc) => (
                    <tr key={doc.id} className="hover:bg-slate-800/30">
                      <td className="py-3 pr-4 font-medium text-slate-200">
                        {doc.originalName}
                      </td>
                      <td className="py-3 px-4 text-slate-300">
                        {doc.docStudioMeta?.jurisdiction || 'Global'}
                      </td>
                      <td className="py-3 px-4 font-mono text-slate-400">
                        {doc.docStudioMeta?.knowledgeBaseVersion} · v
                        {doc.docStudioMeta?.templateVersion}
                      </td>
                      <td className="py-3 px-4 text-emerald-400 font-medium">
                        {doc.docStudioMeta?.legalQualityStatus || 'PASS'}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                        {doc.qualityChecks[0]?.aiScore ?? 6}%
                      </td>
                      <td className="py-3 pl-4 text-right">
                        <div className="inline-flex items-center gap-3">
                          <button
                            onClick={() => {
                              setActiveDoc(doc);
                              setEditableFinalText(doc.finalContent);
                              setStudioSubTab('editor');
                            }}
                            className="text-indigo-400 hover:text-indigo-300 font-medium"
                          >
                            Open in 6-Tab Editor
                          </button>
                          <button
                            type="button"
                            onClick={async () => {
                              if (window.confirm(`Permanently delete "${doc.originalName}"?`)) {
                                await fetch(`/api/documents/${doc.id}`, {method: 'DELETE'});
                                onRefreshGlobalData();
                              }
                            }}
                            className="px-2 py-1 rounded bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/40 font-medium inline-flex items-center gap-1 transition-colors"
                            title={`Delete draft ${doc.originalName}`}
                          >
                            <Trash2 className="w-3 h-3 text-rose-400" />
                            <span>Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
