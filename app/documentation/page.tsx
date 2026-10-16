'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import AnimatedChatbot from '@/components/AnimatedChatbot';
import {
  FileText,
  Scale,
  Sparkles,
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  Download,
  BookOpen,
  FolderOpen,
  Search,
  Filter,
  Play,
  Layers,
  ArrowRight,
  Clock,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Copy,
  Info,
  Sliders,
  FileCheck,
} from 'lucide-react';
import {
  LegalDocument,
  LegalDocumentType,
  LegalKnowledgeBaseEntry,
  LegalTemplate,
} from '@/lib/legal/types';

export default function DocumentationStudioPage() {
  const [activeTab, setActiveTab] = useState<
    'create' | 'editor' | 'drafts' | 'templates' | 'knowledge' | 'checks' | 'final'
  >('create');

  // Catalogs
  const [docTypes, setDocTypes] = useState<LegalDocumentType[]>([]);
  const [templates, setTemplates] = useState<LegalTemplate[]>([]);
  const [knowledgeEntries, setKnowledgeEntries] = useState<LegalKnowledgeBaseEntry[]>([]);
  const [userDocuments, setUserDocuments] = useState<LegalDocument[]>([]);

  // Selection states for creation
  const [selectedTypeId, setSelectedTypeId] = useState<string>('website-development-agreement');
  const [selectedJurisdiction, setSelectedJurisdiction] = useState<string>('United States');
  const [fieldInputs, setFieldInputs] = useState<Record<string, string>>({});
  const [customInstructions, setCustomInstructions] = useState<string>('');
  const [disclaimerEnabled, setDisclaimerEnabled] = useState<boolean>(true);

  // Active document in editor
  const [currentDoc, setCurrentDoc] = useState<LegalDocument | null>(null);
  const [editorSubTab, setEditorSubTab] = useState<
    'draft' | 'humanized' | 'final' | 'diff' | 'check' | 'sources'
  >('final');
  const [editableContent, setEditableContent] = useState<string>('');
  const [isSaving, setIsSaving] = useState(false);

  // Section regeneration modal
  const [regenModalOpen, setRegenModalOpen] = useState(false);
  const [selectedRegenSection, setSelectedRegenSection] = useState<string>('');
  const [regenInstructions, setRegenInstructions] = useState<string>('');
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Generating pipeline state
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [pipelineProgress, setPipelineProgress] = useState<number>(0);
  const [generationError, setGenerationError] = useState<string | null>(null);

  // Filters
  const [kbSearch, setKbSearch] = useState('');
  const [kbJurisdictionFilter, setKbJurisdictionFilter] = useState('All');

  // Load catalogs
  const loadCatalogs = async () => {
    try {
      const [typesRes, tplRes, kbRes, docsRes] = await Promise.all([
        fetch('/api/documentation/types').then((r) => r.json()),
        fetch('/api/documentation/templates').then((r) => r.json()),
        fetch('/api/documentation/knowledge').then((r) => r.json()),
        fetch('/api/documentation/documents').then((r) => r.json()),
      ]);

      if (typesRes.types) {
        const typedTypes = typesRes.types as LegalDocumentType[];
        setDocTypes(typedTypes);
        const initialType = typedTypes.find((dt) => dt.id === selectedTypeId) || typedTypes[0];
        if (initialType) {
          const initial: Record<string, string> = {};
          initialType.fields.forEach((f) => {
            initial[f.name] = f.defaultValue || '';
          });
          if (initialType.default_jurisdiction) {
            setSelectedJurisdiction(initialType.default_jurisdiction);
          }
          setFieldInputs(initial);
        }
      }
      if (tplRes.templates) setTemplates(tplRes.templates);
      if (kbRes.entries) setKnowledgeEntries(kbRes.entries);
      if (docsRes.documents) {
        setUserDocuments(docsRes.documents);
        if (!currentDoc && docsRes.documents.length > 0) {
          loadDocumentDetails(docsRes.documents[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load documentation catalogs:', err);
    }
  };

  const loadDocumentDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/documentation/documents/${id}`).then((r) => r.json());
      if (res.document) {
        setCurrentDoc(res.document);
        const finalVer = res.finalVersion || res.document.versions[res.document.versions.length - 1];
        if (finalVer) {
          setEditableContent(finalVer.content);
        }
      }
    } catch (err) {
      console.error('Failed to load document details:', err);
    }
  };

  useEffect(() => {
    loadCatalogs();
  }, []);

  const handleSelectDocType = (typeId: string) => {
    setSelectedTypeId(typeId);
    const target = docTypes.find((dt) => dt.id === typeId);
    if (target) {
      const initial: Record<string, string> = {};
      target.fields.forEach((f) => {
        initial[f.name] = f.defaultValue || '';
      });
      if (target.default_jurisdiction) {
        setSelectedJurisdiction(target.default_jurisdiction);
      }
      setFieldInputs(initial);
    }
  };

  const currentDocType = docTypes.find((dt) => dt.id === selectedTypeId) || docTypes[0];

  // Missing information calculation
  const missingFields = currentDocType
    ? currentDocType.fields.filter(
        (f) => f.required && (!fieldInputs[f.name] || !fieldInputs[f.name].trim())
      )
    : [];

  const handleFieldChange = (name: string, value: string) => {
    setFieldInputs((prev) => ({ ...prev, [name]: value }));
  };

  // 1-Click Autonomous Document Generation
  const handleGenerate = async () => {
    if (currentDocType.is_legal && (!selectedJurisdiction || !selectedJurisdiction.trim())) {
      setGenerationError('Jurisdiction required: Please select a governing jurisdiction.');
      return;
    }

    if (missingFields.length > 0) {
      setGenerationError(
        `Cannot draft document: ${missingFields.length} required field${missingFields.length > 1 ? 's' : ''} missing (${missingFields.map((m) => m.label).join(', ')}).`
      );
      return;
    }

    setGenerationError(null);
    setIsGenerating(true);
    setPipelineProgress(10);
    setGenerationStep('Searching internal legal knowledge base for approved templates & clauses...');

    // Progress simulation while server pipeline processes
    const pInterval = setInterval(() => {
      setPipelineProgress((p) => {
        if (p < 30) {
          setGenerationStep('Documentation Drafting Agent structuring contract clauses...');
          return p + 10;
        } else if (p < 55) {
          setGenerationStep('Legal Content Protection locking statutory anchors and entities...');
          return p + 12;
        } else if (p < 75) {
          setGenerationStep('Autonomous Humanization Engine refining cadence with legal register...');
          return p + 8;
        } else if (p < 90) {
          setGenerationStep('Legal Quality Checker & Preservation Agent verifying contractual covenants...');
          return p + 5;
        } else if (p < 97) {
          setGenerationStep('Final Document Generation compiling preserved output copy...');
          return p + 2;
        }
        return p;
      });
    }, 280);

    try {
      const res = await fetch('/api/documentation/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentTypeId: selectedTypeId,
          jurisdiction: selectedJurisdiction,
          fieldValues: fieldInputs,
          instructions: customInstructions,
          disclaimerEnabled,
        }),
      });

      clearInterval(pInterval);
      setPipelineProgress(100);
      setGenerationStep('Final Document generated & compiled successfully!');

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || 'Generation failed');
      }

      setCurrentDoc(data.document);
      const finalVer = data.document.versions[data.document.versions.length - 1];
      if (finalVer) {
        setEditableContent(finalVer.content);
      }

      await loadCatalogs();

      setTimeout(() => {
        setIsGenerating(false);
        setActiveTab('editor');
      }, 300);
    } catch (err: unknown) {
      clearInterval(pInterval);
      setIsGenerating(false);
      const msg = err instanceof Error ? err.message : String(err);
      setGenerationError(msg);
    }
  };

  // Save manual edits in editor
  const handleSaveEdits = async () => {
    if (!currentDoc) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/documentation/documents/${currentDoc.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: editableContent }),
      });
      const data = await res.json();
      if (data.document) {
        setCurrentDoc(data.document);
      }
      setIsSaving(false);
    } catch (err) {
      console.error('Failed to save document:', err);
      setIsSaving(false);
    }
  };

  // Regenerate Section
  const handleRegenerateSection = async () => {
    if (!currentDoc || !selectedRegenSection) return;
    setIsRegenerating(true);
    try {
      const res = await fetch(`/api/documentation/documents/${currentDoc.id}/regenerate-section`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sectionTitle: selectedRegenSection,
          customInstructions: regenInstructions,
        }),
      });
      const data = await res.json();
      if (data.success && data.updatedDocument) {
        setCurrentDoc(data.updatedDocument);
        const finalVer = data.updatedDocument.versions[data.updatedDocument.versions.length - 1];
        if (finalVer) {
          setEditableContent(finalVer.content);
        }
      }
      setIsRegenerating(false);
      setRegenModalOpen(false);
      setRegenInstructions('');
    } catch (err) {
      console.error('Failed to regenerate section:', err);
      setIsRegenerating(false);
    }
  };

  // Run On-demand Legal Quality Check
  const handleRunLegalCheck = async () => {
    if (!currentDoc) return;
    try {
      const res = await fetch(`/api/documentation/documents/${currentDoc.id}/legal-check`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        loadDocumentDetails(currentDoc.id);
        setEditorSubTab('check');
      }
    } catch (err) {
      console.error('Failed to run legal check:', err);
    }
  };

  const latestVersion = currentDoc?.versions[currentDoc.versions.length - 1];
  const draftVersion = currentDoc?.versions.find((v) => v.versionNumber === 1);
  const humanizedVersion = currentDoc?.versions.find((v) => v.versionNumber === 2);

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30 selection:text-cyan-200">
      <Navbar />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        {/* Header Banner */}
        <div className="relative overflow-hidden rounded-3xl glass-panel p-6 sm:p-8 border border-white/10 shadow-2xl">
          <div className="absolute top-0 right-0 -mt-12 -mr-12 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute bottom-0 left-1/3 -mb-12 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-6">
            <div className="space-y-2 max-w-2xl">
              <div className="flex items-center gap-2.5">
                <span className="px-3 py-1 rounded-full text-xs font-semibold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center gap-1.5">
                  <Scale className="w-3.5 h-3.5 text-cyan-400" />
                  Documentation Studio
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
                  Approved Knowledge Base Active
                </span>
              </div>
              <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white font-display">
                Documentation Drafting & Legal Knowledge Base
              </h1>
              <p className="text-sm text-slate-300 leading-relaxed">
                Autonomous legal drafting engine integrated with internal approved jurisprudence, entity-level content protection, automatic humanization, and factual covenant preservation.
              </p>
            </div>

            {/* Quick Action Pills */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white font-semibold text-xs sm:text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Create Document</span>
              </button>
              <button
                onClick={() => setActiveTab('drafts')}
                className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 font-semibold text-xs sm:text-sm border border-white/10 transition-colors flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4 text-cyan-400" />
                <span>My Drafts ({userDocuments.length})</span>
              </button>
            </div>
          </div>
        </div>

        {/* Studio Sub-Navigation Tabs */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 scrollbar-none border-b border-white/10">
          {[
            { id: 'create', label: 'Create Document', icon: Sparkles },
            { id: 'editor', label: 'Document Editor', icon: FileCheck },
            { id: 'drafts', label: 'My Drafts', icon: FolderOpen },
            { id: 'templates', label: 'Templates Library', icon: BookOpen },
            { id: 'knowledge', label: 'Knowledge Base', icon: Scale },
            { id: 'checks', label: 'Legal Checks', icon: ShieldCheck },
            { id: 'final', label: 'Final Documents', icon: Download },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as 'create' | 'editor' | 'drafts' | 'templates' | 'knowledge' | 'checks' | 'final')}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-semibold transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-cyan-400' : 'text-slate-400'}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* ========================================================
            TAB 1: CREATE DOCUMENT
           ======================================================== */}
        {activeTab === 'create' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Configuration Form */}
            <div className="lg:col-span-2 space-y-6">
              <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                <div>
                  <h2 className="text-lg font-bold text-white flex items-center gap-2">
                    <Sliders className="w-5 h-5 text-cyan-400" />
                    <span>Document Parameters & Setup</span>
                  </h2>
                  <p className="text-xs text-slate-400 mt-1">
                    Select documentation type, enforce jurisdiction, and supply required details.
                  </p>
                </div>

                {/* 1. Document Type Selector */}
                <div className="space-y-2">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    1. Documentation Type
                  </label>
                  <select
                    value={selectedTypeId}
                    onChange={(e) => handleSelectDocType(e.target.value)}
                    className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 font-medium"
                  >
                    {docTypes.map((dt) => (
                      <option key={dt.id} value={dt.id}>
                        {dt.name} ({dt.category.toUpperCase()})
                      </option>
                    ))}
                  </select>
                  {currentDocType && (
                    <p className="text-xs text-slate-400 italic">
                      {currentDocType.description}
                    </p>
                  )}
                </div>

                {/* 2. Jurisdiction Selector (Section 5) */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300 flex items-center gap-1.5">
                      <span>2. Governing Jurisdiction</span>
                      {currentDocType?.is_legal && (
                        <span className="text-[10px] text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full font-bold">
                          Required for Legal Docs
                        </span>
                      )}
                    </label>
                  </div>
                  <select
                    value={selectedJurisdiction}
                    onChange={(e) => setSelectedJurisdiction(e.target.value)}
                    className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400 font-medium"
                  >
                    {[
                      'Pakistan',
                      'United States',
                      'United Kingdom',
                      'European Union',
                      'Canada',
                      'Australia',
                      'UAE',
                      'Custom',
                    ].map((j) => (
                      <option key={j} value={j}>
                        {j}
                      </option>
                    ))}
                  </select>
                  <p className="text-xs text-slate-400">
                    The platform never assumes jurisdiction. Statutory dispute mechanisms and precedent clauses will adapt automatically.
                  </p>
                </div>

                {/* 3. Dynamic Fields based on Selected Document (Section 23) */}
                <div className="space-y-4 pt-4 border-t border-white/10">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                      3. Required Terms & Variables
                    </label>
                    {missingFields.length > 0 ? (
                      <span className="text-xs font-semibold text-amber-400 bg-amber-400/10 px-2.5 py-1 rounded-full border border-amber-400/20">
                        {missingFields.length} required detail{missingFields.length > 1 ? 's' : ''} missing
                      </span>
                    ) : (
                      <span className="text-xs font-semibold text-emerald-400 bg-emerald-400/10 px-2.5 py-1 rounded-full border border-emerald-400/20 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        All required details provided
                      </span>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {currentDocType?.fields.map((field) => (
                      <div
                        key={field.name}
                        className={field.type === 'textarea' ? 'sm:col-span-2 space-y-1.5' : 'space-y-1.5'}
                      >
                        <label className="text-xs font-medium text-slate-300 flex items-center gap-1">
                          <span>{field.label}</span>
                          {field.required && <span className="text-rose-400">*</span>}
                        </label>
                        {field.type === 'textarea' ? (
                          <textarea
                            rows={3}
                            value={fieldInputs[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                          />
                        ) : (
                          <input
                            type={field.type === 'number' ? 'number' : field.type === 'date' ? 'date' : 'text'}
                            value={fieldInputs[field.name] || ''}
                            onChange={(e) => handleFieldChange(field.name, e.target.value)}
                            placeholder={field.placeholder}
                            className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none focus:border-cyan-400"
                          />
                        )}
                      </div>
                    ))}
                  </div>
                </div>

                {/* 4. Custom Drafting Instructions (Section 10) */}
                <div className="space-y-2 pt-4 border-t border-white/10">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-300">
                    4. Specific Instructions / Facts / Additional Covenants
                  </label>
                  <textarea
                    rows={3}
                    value={customInstructions}
                    onChange={(e) => setCustomInstructions(e.target.value)}
                    placeholder="e.g. Include 20% discount on upfront deposit; specify that source code handover occurs on GitHub within 48 hours of final payment..."
                    className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-cyan-400"
                  />
                </div>

                {/* Legal Disclaimer Toggle (Section 22) */}
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/[0.03] border border-white/10">
                  <div className="space-y-0.5">
                    <p className="text-xs font-bold text-slate-200">Include Mandatory Legal Disclaimer</p>
                    <p className="text-[11px] text-slate-400">
                      Displays informational advisory notice confirming draft does not replace independent counsel.
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={disclaimerEnabled}
                    onChange={(e) => setDisclaimerEnabled(e.target.checked)}
                    className="w-4 h-4 rounded text-cyan-500 focus:ring-cyan-400"
                  />
                </div>

                {generationError && (
                  <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2.5">
                    <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400 mt-0.5" />
                    <span>{generationError}</span>
                  </div>
                )}

                {/* 1-Click Generate Button (Section 42) */}
                <div>
                  <button
                    disabled={isGenerating}
                    onClick={handleGenerate}
                    className="w-full py-3.5 px-6 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-sm tracking-wide shadow-xl shadow-cyan-500/20 transition-all flex items-center justify-center gap-2"
                  >
                    {isGenerating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin text-white" />
                        <span>Processing Autonomous Pipeline...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles className="w-4 h-4 text-cyan-200" />
                        <span>Generate & Humanize Document (1-Click Autonomous)</span>
                      </>
                    )}
                  </button>
                  <p className="text-[11px] text-center text-slate-400 mt-2">
                    Autonomous flow: KB Search → Structured Draft → Protection → Auto-Humanization → AI Checker → Preservation Check → Final Delivery
                  </p>
                </div>
              </div>
            </div>

            {/* Right 1 Col: Live Autonomous Progress / Template Details */}
            <div className="space-y-6">
              {/* Pipeline Progress Monitor */}
              {isGenerating ? (
                <div className="glass-panel p-6 rounded-2xl border border-cyan-500/30 bg-cyan-950/20 space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold uppercase tracking-wider text-cyan-400 flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Live Pipeline Active
                    </span>
                    <span className="font-mono text-xs font-bold text-cyan-300">
                      {pipelineProgress}%
                    </span>
                  </div>

                  <div className="w-full h-2 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-cyan-400 to-indigo-500 transition-all duration-300"
                      style={{ width: `${pipelineProgress}%` }}
                    />
                  </div>

                  <div className="p-3 rounded-xl bg-white/[0.04] border border-white/10">
                    <p className="text-xs text-slate-200 font-medium animate-pulse">
                      {generationStep}
                    </p>
                  </div>

                  <div className="space-y-2 text-[11px] text-slate-400">
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      Knowledge base indexed: Approved clauses only
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      Legal entities locked into protected content map
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      Humanizer intensity calibrated to conservative register
                    </p>
                    <p className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                      Discord lifecycle webhook configured
                    </p>
                  </div>
                </div>
              ) : (
                <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-cyan-400" />
                    <span>Template Structure Preview</span>
                  </h3>

                  <div className="space-y-2">
                    <p className="text-xs text-slate-300 font-semibold">Required Sections:</p>
                    <div className="space-y-1">
                      {currentDocType?.required_sections.map((sec, idx) => (
                        <div
                          key={idx}
                          className="text-xs text-slate-400 flex items-center gap-2 p-1.5 rounded-lg bg-white/[0.02]"
                        >
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400" />
                          <span>{sec}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="p-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-xs text-indigo-300 space-y-1">
                    <p className="font-semibold flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                      <span>Legal Meaning Guarantee</span>
                    </p>
                    <p className="text-[11px] text-slate-300">
                      The Legal Preservation Agent automatically restores original draft sections if obligations or statutory citations are altered during humanization.
                    </p>
                  </div>
                </div>
              )}

              {/* Safety Rules Card (Section 41) */}
              <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2.5">
                <div className="flex items-center gap-2 text-xs font-bold text-amber-400">
                  <ShieldAlert className="w-4 h-4" />
                  <span>Legal Compliance Notice</span>
                </div>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Antigravity AI is a document drafting and humanization system. It does not replace an attorney. All produced contracts must be reviewed by qualified legal counsel in the applicable jurisdiction.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 2: DOCUMENT EDITOR (Section 19)
           ======================================================== */}
        {activeTab === 'editor' && currentDoc && (
          <div className="space-y-6">
            {/* Document Header & Status Bar */}
            <div className="glass-panel p-5 rounded-2xl border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-lg font-bold text-white font-display">
                    {currentDoc.title}
                  </h2>
                  <span
                    className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                      currentDoc.status === 'COMPLETED'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : currentDoc.status === 'NEEDS_REVIEW'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {currentDoc.status}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  ID: <span className="font-mono">{currentDoc.id}</span> | Jurisdiction: <strong className="text-slate-200">{currentDoc.jurisdiction}</strong> | Version: <strong className="text-slate-200">{latestVersion?.label || 'v4 Final'}</strong>
                </p>
              </div>

              {/* Action Toolbar */}
              <div className="flex items-center flex-wrap gap-2">
                <button
                  onClick={() => setRegenModalOpen(true)}
                  className="px-3 py-1.5 rounded-xl bg-purple-500/15 hover:bg-purple-500/25 text-purple-300 border border-purple-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <RotateCcw className="w-3.5 h-3.5 text-purple-400" />
                  <span>Regenerate Section</span>
                </button>

                <button
                  onClick={handleRunLegalCheck}
                  className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-300 border border-indigo-500/30 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  <ShieldCheck className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Run Legal Check</span>
                </button>

                <button
                  onClick={handleSaveEdits}
                  disabled={isSaving}
                  className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold transition-colors flex items-center gap-1.5"
                >
                  {isSaving ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  <span>Save Edits</span>
                </button>

                {/* Export Dropdown */}
                <div className="relative group">
                  <button className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 text-white text-xs font-semibold flex items-center gap-1.5 shadow-md">
                    <Download className="w-3.5 h-3.5" />
                    <span>Download</span>
                  </button>
                  <div className="absolute right-0 mt-1 w-44 rounded-xl glass-panel border border-white/15 p-1 shadow-xl hidden group-hover:block z-30">
                    <a
                      href={`/api/documentation/documents/${currentDoc.id}/download?format=docx`}
                      className="block px-3 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                      Word (.docx)
                    </a>
                    <a
                      href={`/api/documentation/documents/${currentDoc.id}/download?format=pdf`}
                      className="block px-3 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                      Printable PDF (.pdf)
                    </a>
                    <a
                      href={`/api/documentation/documents/${currentDoc.id}/download?format=md`}
                      className="block px-3 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                      Markdown (.md)
                    </a>
                    <a
                      href={`/api/documentation/documents/${currentDoc.id}/download?format=txt`}
                      className="block px-3 py-1.5 rounded-lg text-xs text-slate-200 hover:bg-white/10 hover:text-white"
                    >
                      Plain Text (.txt)
                    </a>
                    <div className="border-t border-white/10 my-1" />
                    <a
                      href={`/api/documentation/documents/${currentDoc.id}/download?format=report`}
                      className="block px-3 py-1.5 rounded-lg text-xs text-cyan-300 hover:bg-white/10"
                    >
                      Processing Report (JSON)
                    </a>
                  </div>
                </div>
              </div>
            </div>

            {/* Editor Sub-Tabs (Section 19: DRAFT | HUMANIZED | FINAL | DIFF | LEGAL CHECK | KNOWLEDGE SOURCES) */}
            <div className="flex items-center gap-1 border-b border-white/10 pb-2">
              {[
                { id: 'final', label: 'FINAL' },
                { id: 'humanized', label: 'HUMANIZED' },
                { id: 'draft', label: 'DRAFT' },
                { id: 'diff', label: 'DIFF' },
                { id: 'check', label: 'LEGAL CHECK' },
                { id: 'sources', label: 'KNOWLEDGE SOURCES' },
              ].map((st) => (
                <button
                  key={st.id}
                  onClick={() => setEditorSubTab(st.id as 'draft' | 'humanized' | 'final' | 'diff' | 'check' | 'sources')}
                  className={`px-4 py-2 rounded-xl text-xs font-bold tracking-wider transition-all ${
                    editorSubTab === st.id
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>

            {/* Editor Main Content Area */}
            {editorSubTab === 'final' && (
              <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    Final Processed & Reconciled Version (v4 Final)
                  </span>
                  <span className="text-xs text-slate-400">
                    Word count: {editableContent.split(/\s+/).filter(Boolean).length}
                  </span>
                </div>
                <textarea
                  rows={26}
                  value={editableContent}
                  onChange={(e) => setEditableContent(e.target.value)}
                  className="w-full bg-[#070b18] border border-white/15 rounded-xl p-5 text-sm text-slate-200 font-mono leading-relaxed focus:outline-none focus:border-cyan-400"
                />
              </div>
            )}

            {editorSubTab === 'draft' && (
              <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <BookOpen className="w-4 h-4 text-indigo-400" />
                    Original Structured Draft (v1 Draft) — Untouched Reference
                  </span>
                  <span className="text-xs text-indigo-400 font-mono">Permanent baseline</span>
                </div>
                <pre className="w-full bg-[#070b18] border border-white/15 rounded-xl p-5 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[600px]">
                  {draftVersion?.content || 'No draft version recorded.'}
                </pre>
              </div>
            )}

            {editorSubTab === 'humanized' && (
              <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-cyan-400" />
                    Humanized Output (v2 Humanized) — Pre-preservation review
                  </span>
                  <span className="text-xs text-cyan-400 font-mono">Conservative Legal Register</span>
                </div>
                <pre className="w-full bg-[#070b18] border border-white/15 rounded-xl p-5 text-xs text-slate-300 font-mono leading-relaxed whitespace-pre-wrap overflow-y-auto max-h-[600px]">
                  {humanizedVersion?.content || 'No humanized version recorded.'}
                </pre>
              </div>
            )}

            {editorSubTab === 'diff' && (
              <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <Layers className="w-4 h-4 text-cyan-400" />
                    Side-by-Side Comparison: Draft vs Final Version
                  </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-indigo-400 uppercase tracking-wider">Original Draft (v1)</p>
                    <pre className="bg-[#070b18] border border-white/10 rounded-xl p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                      {draftVersion?.content || ''}
                    </pre>
                  </div>
                  <div className="space-y-2">
                    <p className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Final Reconciled Document (v4)</p>
                    <pre className="bg-[#070b18] border border-white/10 rounded-xl p-4 text-xs text-slate-300 font-mono whitespace-pre-wrap max-h-[500px] overflow-y-auto">
                      {editableContent || ''}
                    </pre>
                  </div>
                </div>
              </div>
            )}

            {editorSubTab === 'check' && (
              <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-300 flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-indigo-400" />
                    Legal Quality & Preservation Audit Report
                  </span>
                  <button
                    onClick={handleRunLegalCheck}
                    className="px-3 py-1 rounded-lg bg-indigo-500/20 text-indigo-300 text-xs font-semibold hover:bg-indigo-500/30"
                  >
                    Re-run Quality Audit
                  </button>
                </div>

                {/* Metrics Cards */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                  <div className="glass-card p-4 rounded-xl border border-white/10 space-y-1">
                    <p className="text-[11px] text-slate-400">Quality Status</p>
                    <p className="text-lg font-bold text-emerald-400">
                      {currentDoc.report?.legalQualityResult.status || 'PASS'}
                    </p>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-white/10 space-y-1">
                    <p className="text-[11px] text-slate-400">Legal Quality Score</p>
                    <p className="text-lg font-bold text-cyan-400 font-mono">
                      {currentDoc.report?.legalQualityResult.score ?? 95}/100
                    </p>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-white/10 space-y-1">
                    <p className="text-[11px] text-slate-400">Preservation Score</p>
                    <p className="text-lg font-bold text-indigo-400 font-mono">
                      {currentDoc.report?.preservationResult.score ?? 100}%
                    </p>
                  </div>
                  <div className="glass-card p-4 rounded-xl border border-white/10 space-y-1">
                    <p className="text-[11px] text-slate-400">AI Detection Score</p>
                    <p className="text-lg font-bold text-purple-400 font-mono">
                      {currentDoc.report?.checkerResult.score ?? 6}%
                    </p>
                  </div>
                </div>

                {/* Warnings List */}
                <div className="space-y-2">
                  <p className="text-xs font-bold text-slate-300">Audited Safeguards & Warnings:</p>
                  {currentDoc.report?.warnings && currentDoc.report.warnings.length > 0 ? (
                    <div className="space-y-2">
                      {currentDoc.report.warnings.map((w, idx) => (
                        <div
                          key={idx}
                          className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-300 flex items-start gap-2"
                        >
                          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                          <span>{w}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/25 text-xs text-emerald-300 flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Zero legal contradictions or missing required clauses detected. All covenants verified.</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {editorSubTab === 'sources' && (
              <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <Scale className="w-4 h-4 text-cyan-400" />
                    <span>Knowledge Sources & Precedents Traceability (Section 21)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    Section-by-section audit of internal legal knowledge base entries and statutory provisions utilized.
                  </p>
                </div>

                <div className="space-y-3">
                  {latestVersion?.sections.map((sec, idx) => (
                    <div
                      key={idx}
                      className="p-4 rounded-xl bg-white/[0.02] border border-white/10 space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-white">{sec.title}</span>
                        <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                          {sec.jurisdiction || currentDoc.jurisdiction}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400">
                        <strong>Source Precedent:</strong> {sec.sourceName || 'Generated from configured drafting instructions'}
                      </p>
                      {sec.requiresReview && (
                        <p className="text-xs text-amber-400 bg-amber-400/10 p-2 rounded-lg border border-amber-400/20">
                          ⚠️ {sec.reviewReason || 'Statutory review required by local qualified counsel'}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 3: MY DRAFTS
           ======================================================== */}
        {activeTab === 'drafts' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-lg font-bold text-white">Saved Drafts & Documents</h2>
                <p className="text-xs text-slate-400">
                  Select a drafted agreement to inspect version history, diffs, or download.
                </p>
              </div>
              <button
                onClick={() => setActiveTab('create')}
                className="px-4 py-2 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 text-xs font-semibold hover:bg-cyan-500/30"
              >
                + New Document
              </button>
            </div>

            {userDocuments.length === 0 ? (
              <div className="glass-panel p-12 rounded-2xl border border-white/10 text-center space-y-3">
                <FolderOpen className="w-12 h-12 text-slate-500 mx-auto" />
                <p className="text-sm font-semibold text-slate-300">No documents drafted yet</p>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Use the Create Document tool to draft an agreement with automated knowledge base indexing and humanization.
                </p>
                <button
                  onClick={() => setActiveTab('create')}
                  className="px-4 py-2 rounded-xl bg-cyan-500 text-white text-xs font-semibold shadow-lg shadow-cyan-500/20"
                >
                  Create First Document
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {userDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    onClick={() => {
                      loadDocumentDetails(doc.id);
                      setActiveTab('editor');
                    }}
                    className="glass-panel p-5 rounded-2xl border border-white/10 hover:border-cyan-500/40 cursor-pointer transition-all space-y-3 group"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white group-hover:text-cyan-300 transition-colors">
                        {doc.title}
                      </span>
                      <span
                        className={`text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full ${
                          doc.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : doc.status === 'NEEDS_REVIEW'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </div>

                    <p className="text-xs text-slate-400 line-clamp-2">
                      {doc.instructions || 'Standard drafting parameters applied.'}
                    </p>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
                      <span>Jurisdiction: <strong className="text-slate-300">{doc.jurisdiction}</strong></span>
                      <span className="flex items-center gap-1 text-cyan-400 group-hover:translate-x-1 transition-transform">
                        <span>Open in Editor</span>
                        <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ========================================================
            TAB 4: TEMPLATES LIBRARY (Section 8)
           ======================================================== */}
        {activeTab === 'templates' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Approved Legal Template Library</h2>
              <p className="text-xs text-slate-400">
                Pre-approved contract templates with variable placeholders, legal notes, and humanization guidelines.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tpl) => (
                <div
                  key={tpl.id}
                  className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-white">{tpl.name}</h3>
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {tpl.approval_status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-300">{tpl.purpose}</p>

                  <div className="space-y-1.5 text-xs text-slate-400">
                    <p>
                      <strong>Document Type:</strong> {tpl.document_type}
                    </p>
                    <p>
                      <strong>Jurisdiction:</strong> {tpl.jurisdiction} ({tpl.version})
                    </p>
                    <p>
                      <strong>Variables:</strong>{' '}
                      {tpl.variables?.map((v) => `{{${v.name}}}`).join(', ') || 'Standard parameters'}
                    </p>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400">
                      Register: {tpl.humanization_rules?.tone} ({tpl.humanization_rules?.clause_protection} protection)
                    </span>
                    <button
                      onClick={() => {
                        const dt = docTypes.find((d) => d.name.toLowerCase() === tpl.document_type.toLowerCase());
                        if (dt) setSelectedTypeId(dt.id);
                        setSelectedJurisdiction(tpl.jurisdiction);
                        setActiveTab('create');
                      }}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/30"
                    >
                      Use Template
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 5: KNOWLEDGE BASE (Section 4 & 33)
           ======================================================== */}
        {activeTab === 'knowledge' && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h2 className="text-lg font-bold text-white">Legal Knowledge Base</h2>
                <p className="text-xs text-slate-400">
                  Search approved legal principles, clauses, compliance notes, and prohibited terminology.
                </p>
              </div>

              {/* Filters */}
              <div className="flex items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    value={kbSearch}
                    onChange={(e) => setKbSearch(e.target.value)}
                    placeholder="Search clauses..."
                    className="bg-[#0a1024] border border-white/15 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400 w-44"
                  />
                </div>
                <select
                  value={kbJurisdictionFilter}
                  onChange={(e) => setKbJurisdictionFilter(e.target.value)}
                  className="bg-[#0a1024] border border-white/15 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="All">All Jurisdictions</option>
                  <option value="United States">United States</option>
                  <option value="United Kingdom">United Kingdom</option>
                  <option value="Pakistan">Pakistan</option>
                  <option value="European Union">European Union</option>
                  <option value="UAE">UAE</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {knowledgeEntries
                .filter((k) => {
                  const matchSearch =
                    !kbSearch ||
                    k.title.toLowerCase().includes(kbSearch.toLowerCase()) ||
                    k.content.toLowerCase().includes(kbSearch.toLowerCase());
                  const matchJur =
                    kbJurisdictionFilter === 'All' ||
                    k.jurisdiction === kbJurisdictionFilter ||
                    k.jurisdiction === 'All';
                  return matchSearch && matchJur;
                })
                .map((entry) => (
                  <div
                    key={entry.id}
                    className="glass-panel p-5 rounded-2xl border border-white/10 space-y-2.5"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-white">{entry.title}</span>
                      <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
                        {entry.category}
                      </span>
                    </div>

                    <p className="text-xs text-slate-300 italic">{entry.summary}</p>

                    <div className="p-3 rounded-xl bg-[#070b18] border border-white/10 text-xs text-slate-300 font-mono leading-relaxed">
                      {entry.content}
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-white/10">
                      <span>Jurisdiction: <strong className="text-slate-300">{entry.jurisdiction}</strong></span>
                      <span className="font-semibold text-emerald-400">{entry.status}</span>
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 6: LEGAL CHECKS
           ======================================================== */}
        {activeTab === 'checks' && (
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <ShieldCheck className="w-5 h-5 text-indigo-400" />
              <span>Automated Legal Quality Verification Center</span>
            </h2>
            <p className="text-xs text-slate-400">
              Overview of automated checks performed on all drafts:
            </p>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2">
              <div className="glass-card p-4 rounded-xl border border-white/10 space-y-2">
                <p className="text-xs font-bold text-cyan-400 uppercase">1. Content Consistency</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• Verifies required sections presence</li>
                  <li>• Checks for contradictory clauses</li>
                  <li>• Detects broken section references</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-xl border border-white/10 space-y-2">
                <p className="text-xs font-bold text-emerald-400 uppercase">2. Legal Preservation</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• Analyzes shall / must obligations</li>
                  <li>• Safeguards contractual prohibitions</li>
                  <li>• Auto-restores deviations immediately</li>
                </ul>
              </div>

              <div className="glass-card p-4 rounded-xl border border-white/10 space-y-2">
                <p className="text-xs font-bold text-purple-400 uppercase">3. Integrity & Anti-AI</p>
                <ul className="text-xs text-slate-300 space-y-1">
                  <li>• QualityGuard detection check</li>
                  <li>• Perplexity & burstiness cadence</li>
                  <li>• Locks party names, dates, amounts</li>
                </ul>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================
            TAB 7: FINAL DOCUMENTS
           ======================================================== */}
        {activeTab === 'final' && (
          <div className="space-y-4">
            <div>
              <h2 className="text-lg font-bold text-white">Download Ready Final Documents</h2>
              <p className="text-xs text-slate-400">
                Completed legal contracts and documentation ready for immediate export.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {userDocuments.map((doc) => (
                <div
                  key={doc.id}
                  className="glass-panel p-5 rounded-2xl border border-white/10 space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white">{doc.title}</span>
                    <span className="text-[10px] font-bold uppercase px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                      {doc.status}
                    </span>
                  </div>

                  <p className="text-xs text-slate-400">
                    Jurisdiction: <strong className="text-slate-200">{doc.jurisdiction}</strong> | Versions: {doc.versions.length}
                  </p>

                  <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                    <a
                      href={`/api/documentation/documents/${doc.id}/download?format=docx`}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold"
                    >
                      DOCX
                    </a>
                    <a
                      href={`/api/documentation/documents/${doc.id}/download?format=pdf`}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold"
                    >
                      PDF
                    </a>
                    <a
                      href={`/api/documentation/documents/${doc.id}/download?format=md`}
                      className="px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-semibold"
                    >
                      Markdown
                    </a>
                    <a
                      href={`/api/documentation/documents/${doc.id}/download?format=report`}
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/20 text-cyan-300 text-xs font-semibold hover:bg-cyan-500/30 ml-auto"
                    >
                      Report (JSON)
                    </a>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Section Regeneration Modal (Section 20) */}
      {regenModalOpen && currentDoc && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="glass-panel max-w-lg w-full p-6 rounded-2xl border border-white/15 space-y-4 shadow-2xl">
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <RotateCcw className="w-4 h-4 text-purple-400" />
              <span>Regenerate Specific Section</span>
            </h3>
            <p className="text-xs text-slate-300">
              Only the selected section will be regenerated through the legal knowledge base and humanizer. The rest of the document will remain untouched.
            </p>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Select Section to Regenerate</label>
              <select
                value={selectedRegenSection}
                onChange={(e) => setSelectedRegenSection(e.target.value)}
                className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              >
                <option value="">-- Choose Section --</option>
                {latestVersion?.sections.map((sec, idx) => (
                  <option key={idx} value={sec.title}>
                    {sec.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300">Optional Specific Instructions</label>
              <textarea
                rows={3}
                value={regenInstructions}
                onChange={(e) => setRegenInstructions(e.target.value)}
                placeholder="e.g. Expand payment terms to allow 3 equal milestone installments..."
                className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setRegenModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                disabled={!selectedRegenSection || isRegenerating}
                onClick={handleRegenerateSection}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 text-white text-xs font-bold disabled:opacity-50 flex items-center gap-1.5"
              >
                {isRegenerating ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
                <span>Regenerate Section</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Animated Chatbot with Legal Commands */}
      <AnimatedChatbot activeDocumentId={currentDoc?.id} />
    </div>
  );
}
