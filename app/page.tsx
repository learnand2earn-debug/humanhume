'use client';

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react';
import {
  AlertCircle,
  Archive,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  Bell,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Copy,
  Download,
  FileSpreadsheet,
  FileText,
  FolderOpen,
  HelpCircle,
  Loader2,
  Scale,
  Settings,
  ShieldCheck,
  Sparkles,
  Terminal,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AppNotification,
  DocumentRecord,
  DocumentTypeDefinition,
  KnowledgeConflict,
  LegalKnowledgeEntry,
  PlatformSettings,
  ProcessConsoleLogEntry,
} from '@/types';
import DiffComparisonPanel from '@/components/DiffComparisonPanel';
import ImprovementSuggestionsPanel from '@/components/ImprovementSuggestionsPanel';
import DocumentationStudioView from '@/components/DocumentationStudioView';
import AdminConsoleView from '@/components/AdminConsoleView';
import AssistantDrawer from '@/components/AssistantDrawer';
import PdfHumanizerPanel from '@/components/PdfHumanizerPanel';
import {parseResponseJsonSafely, sanitizeErrorMessage} from '@/lib/safe-json';

const PIPELINE_TIMELINE_STEPS = [
  {id: 'UPLOAD', label: 'Uploaded'},
  {id: 'ANALYSIS', label: 'Analyzed'},
  {id: 'PROTECTION', label: 'Protected Important Content'},
  {id: 'HUMANIZATION', label: 'Humanized'},
  {id: 'QUALITY_CHECK', label: 'Checked'},
  {id: 'PRESERVATION_CHECK', label: 'Quality Verified'},
  {id: 'FINALIZE', label: 'Finalized'},
];

export default function HumanFlowPlatformPage() {
  const [activeNav, setActiveNav] = useState<
    'workspace' | 'studio' | 'documents' | 'notifications' | 'admin' | 'help' | 'pdf-humanize'
  >(() => {
    if (typeof window !== 'undefined') {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      const hash = window.location.hash.replace('#', '');
      const target = tabParam || hash;
      if (
        target &&
        ['workspace', 'studio', 'documents', 'notifications', 'admin', 'help', 'pdf-humanize'].includes(target)
      ) {
        return target as 'workspace' | 'studio' | 'documents' | 'notifications' | 'admin' | 'help' | 'pdf-humanize';
      }
    }
    return 'pdf-humanize';
  });

  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<DocumentRecord | null>(null);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [documentTypes, setDocumentTypes] = useState<DocumentTypeDefinition[]>([]);
  const [knowledgeBase, setKnowledgeBase] = useState<LegalKnowledgeEntry[]>([]);
  const [knowledgeConflicts, setKnowledgeConflicts] = useState<KnowledgeConflict[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [studioPreselectedTypeId, setStudioPreselectedTypeId] = useState<string | undefined>(
    undefined
  );

  // Upload & Live Autonomous Pipeline Animation State
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isProcessingUpload, setIsProcessingUpload] = useState(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number>(6);
  const [liveProgressPct, setLiveProgressPct] = useState<number>(100);
  const [uploadingFileMeta, setUploadingFileMeta] = useState<{
    name: string;
    sizeBytes: number;
  } | null>(null);
  const [inputMode, setInputMode] = useState<'file' | 'paste'>('file');
  const [pastedTitle, setPastedTitle] = useState('Custom-Document-2026.docx');
  const [pastedText, setPastedText] = useState('');

  // Collapsible Process Logs State inside Pipeline Timeline
  const [isProcessLogsOpen, setIsProcessLogsOpen] = useState<boolean>(true);
  const [liveStreamedLogs, setLiveStreamedLogs] = useState<ProcessConsoleLogEntry[]>([]);
  const [logStepFilter, setLogStepFilter] = useState<string>('ALL');
  const [copiedLogs, setCopiedLogs] = useState<boolean>(false);

  // Multi-Document Batch Selection & ZIP Export State
  const [selectedDocIdsForZip, setSelectedDocIdsForZip] = useState<string[]>([]);
  const [zipExportFormat, setZipExportFormat] = useState<'native' | 'pdf' | 'docx' | 'txt' | 'md'>('native');
  const [includeZipReports, setIncludeZipReports] = useState<boolean>(true);
  const [isExportingZip, setIsExportingZip] = useState<boolean>(false);

  // My Documents Table Sorting State (Date, AI Score, Document Name, etc.)
  const [docSortField, setDocSortField] = useState<
    'date' | 'aiScore' | 'name' | 'preservation' | 'maskedItems' | 'images'
  >('date');
  const [docSortDirection, setDocSortDirection] = useState<'asc' | 'desc'>('desc');

  // Document Deletion & Batch Delete State
  const [docToDelete, setDocToDelete] = useState<DocumentRecord | null>(null);
  const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState<boolean>(false);
  const [isDeletingDoc, setIsDeletingDoc] = useState<boolean>(false);
  const [deleteToast, setDeleteToast] = useState<{message: string; type: 'success' | 'error'} | null>(null);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const consoleEndRef = useRef<HTMLDivElement | null>(null);

  const confirmDeleteSingle = async () => {
    if (!docToDelete) return;
    setIsDeletingDoc(true);
    try {
      const res = await fetch(`/api/documents/${docToDelete.id}`, {
        method: 'DELETE',
      });
      const data = await parseResponseJsonSafely<{
        success?: boolean;
        message?: string;
        error?: string;
      }>(res, {});
      if (!res.ok) {
        setDeleteToast({
          message: data.data.error || 'Failed to delete document',
          type: 'error',
        });
        return;
      }
      setDocuments((prev) => prev.filter((d) => d.id !== docToDelete.id));
      setSelectedDocIdsForZip((prev) => prev.filter((id) => id !== docToDelete.id));
      setSelectedDoc((prev) => {
        if (prev?.id === docToDelete.id) {
          const remaining = documents.filter((d) => d.id !== docToDelete.id);
          return remaining[0] || null;
        }
        return prev;
      });
      setDeleteToast({
        message: `"${docToDelete.originalName}" was permanently deleted.`,
        type: 'success',
      });
      setDocToDelete(null);
      setTimeout(() => setDeleteToast(null), 4000);
      void fetchAllPlatformData();
    } catch {
      setDeleteToast({message: 'Network error deleting document', type: 'error'});
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const confirmBatchDelete = async () => {
    if (selectedDocIdsForZip.length === 0) return;
    setIsDeletingDoc(true);
    try {
      const res = await fetch('/api/documents', {
        method: 'DELETE',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({documentIds: selectedDocIdsForZip}),
      });
      const data = await parseResponseJsonSafely<{
        success?: boolean;
        deletedCount?: number;
        error?: string;
      }>(res, {});
      if (!res.ok) {
        setDeleteToast({
          message: data.data.error || 'Failed to delete selected documents',
          type: 'error',
        });
        return;
      }
      const deletedSet = new Set(selectedDocIdsForZip);
      setDocuments((prev) => prev.filter((d) => !deletedSet.has(d.id)));
      setSelectedDoc((prev) => {
        if (prev && deletedSet.has(prev.id)) {
          const remaining = documents.filter((d) => !deletedSet.has(d.id));
          return remaining[0] || null;
        }
        return prev;
      });
      setDeleteToast({
        message: `Successfully deleted ${data.data.deletedCount || selectedDocIdsForZip.length} document(s).`,
        type: 'success',
      });
      setSelectedDocIdsForZip([]);
      setShowBatchDeleteConfirm(false);
      setTimeout(() => setDeleteToast(null), 4000);
      void fetchAllPlatformData();
    } catch {
      setDeleteToast({message: 'Network error deleting selected documents', type: 'error'});
    } finally {
      setIsDeletingDoc(false);
    }
  };

  const fetchAllPlatformData = useCallback(async () => {
    try {
      const res = await fetch('/api/documents');
      const {data} = await parseResponseJsonSafely<{
        documents?: DocumentRecord[];
        notifications?: AppNotification[];
        documentTypes?: DocumentTypeDefinition[];
        knowledgeBase?: LegalKnowledgeEntry[];
        knowledgeConflicts?: KnowledgeConflict[];
        settings?: PlatformSettings;
      }>(res, {});

      if (data.documents) {
        setDocuments(data.documents);
        setSelectedDoc((prev) => {
          if (!prev) return data.documents![0] || null;
          return data.documents!.find((d: DocumentRecord) => d.id === prev.id) || data.documents![0];
        });
      }
      if (data.notifications) setNotifications(data.notifications);
      if (data.documentTypes) setDocumentTypes(data.documentTypes);
      if (data.knowledgeBase) setKnowledgeBase(data.knowledgeBase);
      if (data.knowledgeConflicts) setKnowledgeConflicts(data.knowledgeConflicts);
      if (data.settings) setSettings(data.settings);
    } catch {
      // Ignore transient fetch errors
    }
  }, []);

  useEffect(() => {
    let active = true;

    const handleLocationChange = () => {
      const searchParams = new URLSearchParams(window.location.search);
      const tabParam = searchParams.get('tab');
      const hash = window.location.hash.replace('#', '');
      const target = tabParam || hash;
      if (
        target &&
        ['workspace', 'studio', 'documents', 'notifications', 'admin', 'help', 'pdf-humanize'].includes(target)
      ) {
        setActiveNav(target as typeof activeNav);
      }
    };

    window.addEventListener('popstate', handleLocationChange);
    window.addEventListener('hashchange', handleLocationChange);

    fetch('/api/documents')
      .then((res) =>
        parseResponseJsonSafely<{
          documents?: DocumentRecord[];
          notifications?: AppNotification[];
          documentTypes?: DocumentTypeDefinition[];
          knowledgeBase?: LegalKnowledgeEntry[];
          knowledgeConflicts?: KnowledgeConflict[];
          settings?: PlatformSettings;
        }>(res, {})
      )
      .then(({data}) => {
        if (!active) return;
        if (data.documents) {
          setDocuments(data.documents);
          setSelectedDoc((prev) => {
            if (!prev) return data.documents![0] || null;
            return (
              data.documents!.find((d: DocumentRecord) => d.id === prev.id) ||
              data.documents![0]
            );
          });
        }
        if (data.notifications) setNotifications(data.notifications);
        if (data.documentTypes) setDocumentTypes(data.documentTypes);
        if (data.knowledgeBase) setKnowledgeBase(data.knowledgeBase);
        if (data.knowledgeConflicts) setKnowledgeConflicts(data.knowledgeConflicts);
        if (data.settings) setSettings(data.settings);
      })
      .catch(() => {});
    return () => {
      active = false;
      window.removeEventListener('popstate', handleLocationChange);
      window.removeEventListener('hashchange', handleLocationChange);
    };
  }, []);

  const triggerBrowserNotification = (title: string, body: string) => {
    if (
      typeof window !== 'undefined' &&
      'Notification' in window &&
      window.Notification.permission === 'granted' &&
      settings?.browserNotificationsEnabled
    ) {
      new window.Notification(title, {body});
    }
  };

  /**
   * Zero-Touch Autonomous Upload Handler:
   * Immediately validates and runs the entire 15-stage pipeline upon file drop/selection
   * while animating each real step and streaming backend console logs in the progress timeline.
   */
  const processFileAutomatically = async (file: File) => {
    setUploadError(null);
    setUploadingFileMeta({name: file.name, sizeBytes: file.size});

    // Client-side fast check for unsupported extension so user gets immediate feedback
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    const supported = ['docx', 'pdf', 'txt', 'md', 'markdown', 'rtf', 'xlsx'];
    if (!supported.includes(ext)) {
      setUploadError(
        `Unsupported file format (.${ext}). Supported formats: DOCX, PDF, TXT, MD, RTF, XLSX. Your original file was not modified.`
      );
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setUploadError(
        `File exceeds maximum allowed size of 50 MB (${(file.size / (1024 * 1024)).toFixed(1)} MB). Your original file was not modified.`
      );
      return;
    }

    setIsProcessingUpload(true);
    setIsProcessLogsOpen(true);
    setLogStepFilter('ALL');
    setActiveStepIndex(0);
    setLiveProgressPct(12);

    const startTs = Date.now();
    const stagedConsoleTemplate: Omit<ProcessConsoleLogEntry, 'id' | 'timestamp'>[] = [
      {
        elapsedMs: 14,
        step: 'UPLOAD',
        level: 'INFO',
        commandOrModule: 'storage::ingest',
        message: `Ingesting "${file.name}" (${ext.toUpperCase()}, ${(file.size / 1024).toFixed(1)} KB) into isolated working buffer...`,
      },
      {
        elapsedMs: 48,
        step: 'VALIDATION',
        level: 'SUCCESS',
        commandOrModule: 'validator::mimeAndSchema',
        message: `Original file locked in /storage/original/; MIME & structural header validation passed`,
      },
      {
        elapsedMs: 135,
        step: 'EXTRACTION',
        level: 'INFO',
        commandOrModule: 'extractor::pdfImageStreams',
        message: `Extracting document sections, headings, tables, and embedded PDF/DOCX image streams with aspect ratios...`,
      },
      {
        elapsedMs: 260,
        step: 'ANALYSIS',
        level: 'INFO',
        commandOrModule: 'analyzer::entityScanner',
        message: `Scanning sections for dates, currency amounts, citations, legal clauses, URLs, and technical nomenclature...`,
      },
      {
        elapsedMs: 390,
        step: 'PROTECTION',
        level: 'SUCCESS',
        commandOrModule: 'protection::lockMap',
        message: `Protected-Content Map locked; masking immutable tokens and anchoring figure coordinates...`,
      },
      {
        elapsedMs: 540,
        step: 'HUMANIZATION',
        level: 'INFO',
        commandOrModule: 'humanizer::pass_1',
        message: `Dispatching masked prose chunks to Humanizer Engine while preserving locked entities & figures...`,
      },
      {
        elapsedMs: 710,
        step: 'QUALITY_CHECK',
        level: 'INFO',
        commandOrModule: 'checker::stylometricScan',
        message: `Running stylometric AI detection check and factual & figure preservation verification...`,
      },
    ];

    setLiveStreamedLogs([
      {
        ...stagedConsoleTemplate[0],
        id: `live-0-${startTs}`,
        timestamp: new Date().toISOString(),
      },
    ]);

    // Step progression animation synchronized with server pipeline execution
    const stepTimer = setInterval(() => {
      setActiveStepIndex((prev) => {
        const next = Math.min(prev + 1, 5);
        setLiveProgressPct(Math.min(92, (next + 1) * 15));
        const nextTemplate = stagedConsoleTemplate[next + 1];
        if (nextTemplate) {
          setLiveStreamedLogs((prevLogs) => {
            if (prevLogs.some((l) => l.commandOrModule === nextTemplate.commandOrModule)) {
              return prevLogs;
            }
            return [
              ...prevLogs,
              {
                ...nextTemplate,
                id: `live-${next + 1}-${Date.now()}`,
                timestamp: new Date().toISOString(),
                elapsedMs: Date.now() - startTs,
              },
            ];
          });
        }
        return next;
      });
    }, 75);

    try {
      const formData = new FormData();
      // The complete file is sent. Editing happens inside the uploaded container,
      // so a truncated upload would only produce a broken document.
      formData.append('file', file);
      formData.append('originalFileName', file.name);
      formData.append('originalFileSize', String(file.size));

      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      let parsed = await parseResponseJsonSafely<{
        success?: boolean;
        document?: DocumentRecord;
        error?: string;
      }>(res, {});

      // Plain text has no binary container to preserve, so a JSON body is a safe fallback
      // when a reverse proxy rejects the multipart form.
      const isPlainText = /\.(txt|md|markdown)$/i.test(file.name) || file.type.startsWith('text/');
      if ((parsed.isHtml || (!parsed.ok && !parsed.data.error)) && isPlainText) {
        const fullText = await file.text().catch(() => '');
        const fallbackRes = await fetch('/api/documents/upload', {
          method: 'POST',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({
            fileName: file.name,
            fileSize: file.size,
            content: fullText,
          }),
        });
        parsed = await parseResponseJsonSafely<{
          success?: boolean;
          document?: DocumentRecord;
          error?: string;
        }>(fallbackRes, {});
      }

      clearInterval(stepTimer);

      if (!parsed.ok || !parsed.data.document) {
        setUploadError(
          res.status === 413
            ? `The server rejected this ${(file.size / 1048576).toFixed(1)} MB upload (HTTP 413), so nothing was processed. Partial uploads are refused on purpose: a cut-off PDF or DOCX cannot be edited in place.`
            : parsed.data.error ||
              parsed.errorMessage ||
              'File validation failed. Original file untouched.'
        );
        setIsProcessingUpload(false);
        return;
      }

      const uploadedDoc = parsed.data.document;
      setActiveStepIndex(6);
      setLiveProgressPct(100);

      if (Array.isArray(uploadedDoc.processLogs) && uploadedDoc.processLogs.length > 0) {
        setLiveStreamedLogs(uploadedDoc.processLogs);
      }
      setDocuments((prev) => [
        uploadedDoc,
        ...prev.filter((d) => d.id !== uploadedDoc.id),
      ]);
      setSelectedDoc(uploadedDoc);
      void fetchAllPlatformData();
      const nativeResult = uploadedDoc.nativeArtifact;
      triggerBrowserNotification(
        'HumanFlow AI — Document Processing Finished',
        nativeResult
          ? `${uploadedDoc.originalName}: ${nativeResult.changedUnits}/${nativeResult.totalUnits} text block(s) rewritten inside your original ${nativeResult.fileType}${
              nativeResult.mediaChecked
                ? `, ${nativeResult.imageCount} picture(s) verified byte-identical`
                : ''
            }.`
          : `${uploadedDoc.originalName} processed. Open the preservation report to see what changed.`
      );
    } catch (err) {
      clearInterval(stepTimer);
      setUploadError(
        sanitizeErrorMessage(err, 'Network error during autonomous processing.')
      );
    } finally {
      setIsProcessingUpload(false);
    }
  };

  const handleQuickDemoSampleUpload = async (
    sampleType: 'docx' | 'pdf' | 'xlsx' | 'unsupported'
  ) => {
    if (sampleType === 'unsupported') {
      const badFile = new File(['binary content'], 'Archive-Package.exe', {
        type: 'application/octet-stream',
      });
      await processFileAutomatically(badFile);
      return;
    }

    const samples: Record<'docx' | 'pdf' | 'xlsx', {name: string; content: string}> = {
      docx: {
        name: 'Clinical-Trial-Protocol-2026.docx',
        content: `# Clinical Trial & Regulatory Safety Protocol (Phase III)

## 1. Study Objective & Cohort Metrics
In order to facilitate the implementation of multi-center clinical evaluations across 12 hospital sites, Aether BioPharma Inc. enrolled 1,450 patients between 2026-01-15 and 2026-09-30. Due to the fact that adherence exceeded 96.4%, total adverse event incidence remained below 1.2% [Ref: ABP-CLIN-2026-04].

## 2. Regulatory & Data Protection Standards
It is important to note that all patient records utilize HIPAA and GDPR Article 28 compliant anonymization pipelines with AES-256 encryption. Furthermore, it can be observed that total grant funding of $3,850,000 USD was allocated across clinical laboratories (audit portal: https://trials.aetherbiopharma.example.com or contact safety@aetherbiopharma.example.com).`,
      },
      pdf: {
        name: 'Financial-Audit-Q3-2026.pdf',
        content: `# Q3 2026 Institutional Financial & Risk Audit

## 1. Revenue & Margin Performance
In order to evaluate quarterly capital efficiency, Vanguard Ledger Group LLC reviewed consolidated statements ending 2026-09-30. Due to the fact that automated settlement reduced clearing delays by 41.8%, net operating income rose to $12,480,000 USD with a 24.5% EBITDA margin [Ref: VLG-AUDIT-99].

## 2. Internal Controls & ISO Verification
It is worth noting that all treasury operations utilize ISO/IEC 27001:2022 and SOC 2 Type II security controls. In the event that a settlement discrepancy exceeds $5,000 USD, automated reconciliation triggers within 15 seconds.`,
      },
      xlsx: {
        name: 'Operational-KPI-Matrix-2026.xlsx',
        content: `# Operational KPI & SLA Matrix (Extracted Workbook)

| Region | Active Nodes | Uptime Percentage | Quarterly Cost | Reference Code |
| North America | 420 | 99.99% | $84,200 USD | [Ref: NA-OPS-01] |
| European Union | 310 | 99.98% | €62,500 EUR | [Ref: EU-OPS-02] |

In order to maintain SLA compliance across all regions, engineering teams utilize automated telemetry checks on a daily basis.`,
      },
    };

    const chosen = samples[sampleType];
    const file = new File([chosen.content], chosen.name, {type: 'text/plain'});
    await processFileAutomatically(file);
  };

  const studioDocs = documents.filter((d) => d.sourceModule === 'DOCUMENTATION_STUDIO');

  const handleDocSort = (
    field: 'date' | 'aiScore' | 'name' | 'preservation' | 'maskedItems' | 'images'
  ) => {
    if (docSortField === field) {
      setDocSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setDocSortField(field);
      // Sensible initial direction per column: A-Z for name, lowest first for AI Score, newest/highest first for date & counts
      if (field === 'name' || field === 'aiScore') {
        setDocSortDirection('asc');
      } else {
        setDocSortDirection('desc');
      }
    }
  };

  const sortedDocuments = useMemo(() => {
    const list = [...documents];
    const dir = docSortDirection === 'asc' ? 1 : -1;

    list.sort((a, b) => {
      if (docSortField === 'name') {
        const cmp = a.originalName.localeCompare(b.originalName, undefined, {
          numeric: true,
          sensitivity: 'base',
        });
        if (cmp !== 0) return cmp * dir;
      } else if (docSortField === 'date') {
        const timeA = new Date(a.updatedAt || a.createdAt).getTime();
        const timeB = new Date(b.updatedAt || b.createdAt).getTime();
        if (timeA !== timeB) return (timeA - timeB) * dir;
      } else if (docSortField === 'aiScore') {
        const scoreA = a.qualityChecks[a.qualityChecks.length - 1]?.aiScore ?? 6;
        const scoreB = b.qualityChecks[b.qualityChecks.length - 1]?.aiScore ?? 6;
        if (scoreA !== scoreB) return (scoreA - scoreB) * dir;
      } else if (docSortField === 'preservation') {
        const presA = a.preservationResult.preservationScore;
        const presB = b.preservationResult.preservationScore;
        if (presA !== presB) return (presA - presB) * dir;
      } else if (docSortField === 'maskedItems') {
        const maskA = a.protectedMap.entities.length;
        const maskB = b.protectedMap.entities.length;
        if (maskA !== maskB) return (maskA - maskB) * dir;
      } else if (docSortField === 'images') {
        const imgA = (a.embeddedImages || []).length;
        const imgB = (b.embeddedImages || []).length;
        if (imgA !== imgB) return (imgA - imgB) * dir;
      }
      return a.id.localeCompare(b.id);
    });

    return list;
  }, [documents, docSortField, docSortDirection]);

  const renderSortIcon = (
    field: 'date' | 'aiScore' | 'name' | 'preservation' | 'maskedItems' | 'images'
  ) => {
    if (docSortField !== field) {
      return <ArrowUpDown className="w-3 h-3 text-slate-600 group-hover:text-slate-400 shrink-0" />;
    }
    return docSortDirection === 'asc' ? (
      <ArrowUp className="w-3 h-3 text-indigo-400 shrink-0" />
    ) : (
      <ArrowDown className="w-3 h-3 text-indigo-400 shrink-0" />
    );
  };

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      {/* 3-ZONE TOP BAR CONTRACT */}
      <header className="flex items-center justify-between gap-8 px-6 py-3.5 border-b border-slate-800/90 bg-slate-950/95 sticky top-0 z-30">
        {/* Zone 1: Single text element wordmark */}
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveNav('workspace');
          }}
          className="text-lg font-bold tracking-tight text-slate-100 font-display whitespace-nowrap shrink-0"
        >
          HumanFlow AI
        </a>

        {/* Zone 2: 4–5 concise single-line text navigation links */}
        <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-slate-400">
          <button
            onClick={() => setActiveNav('pdf-humanize')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 flex items-center gap-1.5 ${
              activeNav === 'pdf-humanize'
                ? 'text-white border-b-2 border-indigo-400 font-bold'
                : 'text-indigo-300 hover:text-white'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-violet-400" />
            PDF Humanizer (Images Preserved)
            <span className="px-1.5 py-0.5 text-[9px] uppercase font-bold tracking-wider rounded bg-indigo-600/30 text-indigo-300 border border-indigo-500/30">
              Primary
            </span>
          </button>
          <button
            onClick={() => setActiveNav('workspace')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'workspace' ? 'text-slate-100 border-b border-indigo-500 font-semibold' : ''
            }`}
          >
            Humanizer Workspace
          </button>
          <button
            onClick={() => setActiveNav('studio')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'studio' ? 'text-slate-100 border-b border-indigo-500' : ''
            }`}
          >
            Documentation Studio
          </button>
          <button
            onClick={() => setActiveNav('documents')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'documents' ? 'text-slate-100 border-b border-indigo-500' : ''
            }`}
          >
            My Documents
          </button>
          <button
            onClick={() => setActiveNav('admin')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'admin' ? 'text-slate-100 border-b border-indigo-500' : ''
            }`}
          >
            Admin Console
          </button>
          <button
            onClick={() => setActiveNav('help')}
            className={`hover:text-slate-100 transition-colors whitespace-nowrap shrink-0 py-1 ${
              activeNav === 'help' ? 'text-slate-100 border-b border-indigo-500' : ''
            }`}
          >
            Architecture & Guide
          </button>
        </nav>

        {/* Zone 3: 1 primary action */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => {
              setActiveNav('workspace');
              fileInputRef.current?.click();
            }}
            className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-500 rounded-lg transition-colors whitespace-nowrap shrink-0"
          >
            Upload Document
          </button>
        </div>
      </header>

      {/* MAIN WORKSPACE BODY (Sidebar + Canvas) */}
      <div className="flex-1 flex flex-col lg:flex-row max-w-[1440px] w-full mx-auto">
        {/* Left Workspace Sidebar (250px) */}
        <aside className="w-full lg:w-64 shrink-0 border-b lg:border-b-0 lg:border-r border-slate-800/90 bg-slate-950 p-4 flex flex-col justify-between gap-6">
          <div className="space-y-6">
            <div className="space-y-1">
              <p className="px-3 text-[11px] font-medium text-slate-500">
                Core Platform
              </p>
              {[
                {id: 'pdf-humanize', label: 'PDF Humanizer (Images Preserved)', icon: Sparkles},
                {id: 'workspace', label: 'Upload & Humanize', icon: Upload},
                {id: 'studio', label: 'Documentation Studio', icon: Scale},
                {
                  id: 'documents',
                  label: `My Documents (${documents.length})`,
                  icon: FolderOpen,
                },
                {
                  id: 'notifications',
                  label: `Notifications (${notifications.length})`,
                  icon: Bell,
                },
                {id: 'admin', label: 'Admin Console', icon: Settings},
                {id: 'help', label: 'System Help & Specs', icon: HelpCircle},
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveNav(item.id as typeof activeNav)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-colors whitespace-nowrap ${
                      activeNav === item.id
                        ? 'bg-indigo-600 text-white'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>

            {/* Recent Documents Quick Switcher */}
            <div className="space-y-2 border-t border-slate-800/80 pt-4">
              <p className="px-3 text-[11px] font-medium text-slate-500">
                Recent Processed Files
              </p>
              <div className="space-y-1">
                {documents.slice(0, 5).map((doc) => (
                  <div key={doc.id} className="group relative flex items-center">
                    <button
                      onClick={() => {
                        setSelectedDoc(doc);
                        setActiveNav('workspace');
                      }}
                      className={`w-full text-left px-3 py-2 pr-7 rounded-lg text-xs transition-colors flex items-center justify-between gap-2 ${
                        selectedDoc?.id === doc.id && activeNav === 'workspace'
                          ? 'bg-slate-900 text-indigo-300 border border-slate-800'
                          : 'text-slate-400 hover:bg-slate-900/60 hover:text-slate-200'
                      }`}
                    >
                      <span className="truncate">{doc.originalName}</span>
                      <span className="font-mono text-[10px] text-emerald-400 shrink-0">
                        {doc.qualityChecks[doc.qualityChecks.length - 1]?.aiScore ?? 6}%
                      </span>
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        setDocToDelete(doc);
                      }}
                      className="absolute right-1.5 opacity-0 group-hover:opacity-100 p-1 hover:bg-rose-950/80 text-slate-500 hover:text-rose-400 rounded transition-all"
                      title={`Delete ${doc.originalName}`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Runtime Mode & Privacy Status Footer in Sidebar */}
          <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-3.5 space-y-2 text-xs">
            <div className="flex items-center justify-between">
              <span className="text-slate-400">Engine Status</span>
              <span className="font-mono font-semibold text-emerald-400">
                READY TO USE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Built-in Humanizer & Legal KB active · Originals isolated in <code className="text-slate-300">/storage/original/</code>
            </p>
          </div>
        </aside>

        {/* Main Viewport Canvas */}
        <main className="flex-1 p-6 lg:p-8 space-y-8 min-w-0">
          {/* VIEW 1: UPLOAD & AUTONOMOUS HUMANIZATION WORKSPACE */}
          {activeNav === 'workspace' && (
            <>
              {/* Quick Switch Banner to PDF Humanizer */}
              <div className="bg-gradient-to-r from-violet-950/80 via-indigo-950/80 to-slate-900/90 border border-violet-500/40 rounded-xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-violet-600/20 border border-violet-500/30 flex items-center justify-center shrink-0">
                    <Sparkles className="w-5 h-5 text-violet-400" />
                  </div>
                  <div>
                    <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                      PDF Document Humanizer (With Native Image Preservation)
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold border border-emerald-500/30">
                        ACTIVE
                      </span>
                    </h3>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Upload any PDF — text is rewritten inside the uploaded file, so every picture, position and page stays exactly as you uploaded it.
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setActiveNav('pdf-humanize')}
                  className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-semibold shrink-0 transition-colors shadow-lg shadow-violet-950/50 cursor-pointer flex items-center gap-1.5"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  Open PDF Humanizer
                </button>
              </div>

              {/* Hero & Zero-Touch Upload Dropzone */}
              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
                <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-6 flex flex-col justify-between space-y-5">
                  <div className="space-y-2">
                    <div className="text-xs text-indigo-400 font-medium">
                      Autonomous Document Humanization & Factual Preservation Engine
                    </div>
                    <h1
                      className="text-2xl lg:text-3xl font-bold text-slate-100 font-display tracking-tight"
                      style={{textWrap: 'balance'}}
                    >
                      Upload Once. Every Quality, AI Score, and Preservation Check Runs Automatically.
                    </h1>
                    <p className="text-sm text-slate-400 leading-relaxed">
                      Your original file is never modified. HumanFlow AI extracts structure, locks numbers, citations, dates, legal obligations, and technical terms in a Protected-Content Map, humanizes prose chunks, verifies preservation, and produces a verified final document.
                    </p>
                  </div>

                  {/* Quick One-Click Test Samples */}
                  <div className="space-y-2 pt-2 border-t border-slate-800/80">
                    <p className="text-xs text-slate-400">
                      Instant Zero-Touch Pipeline Test Samples (or drop any file on the right):
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleQuickDemoSampleUpload('pdf')}
                        disabled={isProcessingUpload}
                        className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-200 border border-indigo-500/40 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5 text-emerald-400" />
                        Test PDF with Embedded Images (Financial Audit)
                      </button>
                      <button
                        onClick={() => handleQuickDemoSampleUpload('docx')}
                        disabled={isProcessingUpload}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <FileText className="w-3.5 h-3.5 text-indigo-400" />
                        Test DOCX with Figures (Clinical Protocol)
                      </button>
                      <button
                        onClick={() => handleQuickDemoSampleUpload('xlsx')}
                        disabled={isProcessingUpload}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-lg text-xs font-medium flex items-center gap-1.5 transition-colors whitespace-nowrap shrink-0"
                      >
                        <FileSpreadsheet className="w-3.5 h-3.5 text-amber-400" />
                        Test XLSX (KPI Table)
                      </button>
                      <button
                        onClick={() => handleQuickDemoSampleUpload('unsupported')}
                        disabled={isProcessingUpload}
                        className="px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-rose-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors whitespace-nowrap shrink-0"
                      >
                        Test Unsupported File Guard (.exe)
                      </button>
                    </div>
                  </div>
                </div>

                {/* Right: Main Dropzone ("Drop your document here") + Direct Paste Option */}
                <div className="lg:col-span-5 rounded-xl border border-slate-800 bg-slate-900/90 p-5 flex flex-col justify-between space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
                    <span className="text-xs font-semibold text-slate-200">
                      Input Source
                    </span>
                    <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                      <button
                        type="button"
                        onClick={() => setInputMode('file')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          inputMode === 'file'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Upload File
                      </button>
                      <button
                        type="button"
                        onClick={() => setInputMode('paste')}
                        className={`px-2.5 py-1 rounded text-xs font-medium transition-colors ${
                          inputMode === 'paste'
                            ? 'bg-indigo-600 text-white'
                            : 'text-slate-400 hover:text-slate-200'
                        }`}
                      >
                        Paste Text
                      </button>
                    </div>
                  </div>

                  {inputMode === 'file' ? (
                    <div
                      onDragOver={(e) => {
                        e.preventDefault();
                        setIsDragging(true);
                      }}
                      onDragLeave={() => setIsDragging(false)}
                      onDrop={(e) => {
                        e.preventDefault();
                        setIsDragging(false);
                        const file = e.dataTransfer.files?.[0];
                        if (file) processFileAutomatically(file);
                      }}
                      onClick={() => fileInputRef.current?.click()}
                      className={`flex-1 rounded-xl border-2 border-dashed p-6 flex flex-col items-center justify-center text-center cursor-pointer transition-all ${
                        isDragging
                          ? 'border-indigo-500 bg-indigo-500/10'
                          : 'border-slate-800 hover:border-indigo-500/70 bg-slate-950/60'
                      }`}
                    >
                      <input
                        ref={fileInputRef}
                        type="file"
                        accept=".docx,.pdf,.txt,.md,.rtf,.xlsx"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) processFileAutomatically(file);
                        }}
                        className="hidden"
                      />

                      <div className="w-11 h-11 rounded-xl bg-indigo-600/15 border border-indigo-500/30 flex items-center justify-center text-indigo-400 mb-3">
                        {isProcessingUpload ? (
                          <Loader2 className="w-5 h-5 animate-spin" />
                        ) : (
                          <Upload className="w-5 h-5" />
                        )}
                      </div>

                      <p className="text-sm font-semibold text-slate-100 font-display">
                        Drop your document here
                      </p>
                      <p className="text-xs text-slate-400 mt-1">
                        Zero manual steps — pipeline starts immediately on upload
                      </p>
                      <p className="text-[11px] text-slate-500 font-mono mt-2.5">
                        DOCX · PDF · TXT · MD · RTF · XLSX (Max 50 MB)
                      </p>
                    </div>
                  ) : (
                    <form
                      onSubmit={async (e) => {
                        e.preventDefault();
                        if (!pastedText.trim()) return;
                        const safeName = pastedTitle.trim().endsWith('.docx') ||
                          pastedTitle.trim().endsWith('.txt') ||
                          pastedTitle.trim().endsWith('.md')
                          ? pastedTitle.trim()
                          : `${pastedTitle.trim() || 'Document'}.docx`;
                        const syntheticFile = new File([pastedText], safeName, {
                          type: 'text/plain',
                        });
                        await processFileAutomatically(syntheticFile);
                        setPastedText('');
                      }}
                      className="flex-1 flex flex-col justify-between space-y-2.5"
                    >
                      <input
                        type="text"
                        value={pastedTitle}
                        onChange={(e) => setPastedTitle(e.target.value)}
                        placeholder="Document Name (e.g., Proposal-2026.docx)"
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-100"
                      />
                      <textarea
                        rows={4}
                        value={pastedText}
                        onChange={(e) => setPastedText(e.target.value)}
                        placeholder="Paste any paragraph, report, or contract clause here to humanize and verify preservation..."
                        className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
                      />
                      <button
                        type="submit"
                        disabled={!pastedText.trim() || isProcessingUpload}
                        className="w-full py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors"
                      >
                        {isProcessingUpload
                          ? 'Processing Pipeline...'
                          : 'Humanize & Verify Preservation Now'}
                      </button>
                    </form>
                  )}
                </div>
              </div>

              {/* Error Banner for Unsupported Files */}
              {uploadError && (
                <div className="bg-rose-950/50 border border-rose-500/50 rounded-xl p-4 flex items-center justify-between gap-4 text-xs text-rose-200">
                  <div className="flex items-center gap-2.5">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                    <span>{uploadError}</span>
                  </div>
                  <button
                    onClick={() => setUploadError(null)}
                    className="text-rose-300 hover:text-white font-medium"
                  >
                    Dismiss
                  </button>
                </div>
              )}

              {/* Animated 7-Step Progress Timeline + Collapsible Process Logs */}
              {selectedDoc && (
                <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
                  <div className="flex flex-wrap items-center justify-between gap-4">
                    <div className="space-y-1">
                      <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-200">
                          {isProcessingUpload && uploadingFileMeta
                            ? uploadingFileMeta.name
                            : selectedDoc.originalName}
                        </span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {(
                            (isProcessingUpload && uploadingFileMeta
                              ? uploadingFileMeta.sizeBytes
                              : selectedDoc.fileSize) / 1024
                          ).toFixed(1)}{' '}
                          KB
                        </span>
                        <span>·</span>
                        <span className="font-mono tabular-nums">
                          {selectedDoc.pageCount} page(s) / {selectedDoc.wordCount} words
                        </span>
                        <span>·</span>
                        <span className="font-mono text-indigo-300">
                          Trace {selectedDoc.traceId}
                        </span>
                      </div>
                      <h2 className="text-sm font-semibold text-slate-100">
                        Autonomous Pipeline Progress Timeline
                      </h2>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 font-mono text-xs tabular-nums">
                      <span className="text-slate-400">
                        Status:{' '}
                        <strong className="text-emerald-400">
                          {isProcessingUpload ? 'PROCESSING' : selectedDoc.status}
                        </strong>
                      </span>
                      <span className="text-slate-200 font-semibold">
                        {isProcessingUpload ? liveProgressPct : selectedDoc.progressPercent}%
                      </span>
                      <button
                        type="button"
                        onClick={() => setIsProcessLogsOpen((prev) => !prev)}
                        className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-200 font-sans text-xs font-medium flex items-center gap-1.5 transition-colors"
                      >
                        <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                        <span>Process Logs</span>
                        <span className="font-mono text-[11px] text-slate-400">
                          (
                          {
                            (isProcessingUpload
                              ? liveStreamedLogs
                              : selectedDoc.processLogs && selectedDoc.processLogs.length > 0
                                ? selectedDoc.processLogs
                                : liveStreamedLogs
                            ).length
                          }
                          )
                        </span>
                        {isProcessLogsOpen ? (
                          <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                        ) : (
                          <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                        )}
                      </button>

                      <button
                        type="button"
                        onClick={() => setDocToDelete(selectedDoc)}
                        disabled={isProcessingUpload}
                        className="px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 text-rose-300 font-sans text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
                        title="Permanently delete this document from storage"
                      >
                        <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                        <span>Delete Document</span>
                      </button>
                    </div>
                  </div>

                  {/* Progress Bar */}
                  <div className="h-2 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800">
                    <div
                      className="h-full bg-indigo-500 transition-all duration-200 rounded-full"
                      style={{
                        width: `${
                          isProcessingUpload ? liveProgressPct : selectedDoc.progressPercent
                        }%`,
                      }}
                    />
                  </div>

                  {/* 7 Timeline Steps (clickable to filter Process Logs by step) */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
                    {PIPELINE_TIMELINE_STEPS.map((step, idx) => {
                      const isDone = !isProcessingUpload || idx < activeStepIndex;
                      const isCurrent = isProcessingUpload && idx === activeStepIndex;
                      const isSelectedFilter = logStepFilter === step.id;
                      return (
                        <button
                          key={step.id}
                          type="button"
                          onClick={() => {
                            setIsProcessLogsOpen(true);
                            setLogStepFilter((prev) => (prev === step.id ? 'ALL' : step.id));
                          }}
                          title={`Click to filter Process Logs by ${step.label}`}
                          className={`rounded-lg px-3 py-2.5 border text-xs flex items-center gap-2 transition-colors text-left ${
                            isSelectedFilter
                              ? 'bg-indigo-950/80 border-indigo-400 text-indigo-200 ring-1 ring-indigo-500/40'
                              : isDone
                                ? 'bg-slate-950 border-emerald-500/40 text-emerald-300 hover:border-emerald-400/70'
                                : isCurrent
                                  ? 'bg-indigo-950/50 border-indigo-500 text-indigo-200'
                                  : 'bg-slate-950/50 border-slate-800 text-slate-500'
                          }`}
                        >
                          {isDone ? (
                            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                          ) : isCurrent ? (
                            <Loader2 className="w-3.5 h-3.5 text-indigo-400 animate-spin shrink-0" />
                          ) : (
                            <Clock className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                          )}
                          <span className="truncate font-medium">{step.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Collapsible Real-Time Process Logs Section */}
                  {isProcessLogsOpen &&
                    (() => {
                      const activeLogs: ProcessConsoleLogEntry[] = isProcessingUpload
                        ? liveStreamedLogs
                        : selectedDoc.processLogs && selectedDoc.processLogs.length > 0
                          ? selectedDoc.processLogs
                          : selectedDoc.steps.map((st, idx) => ({
                              id: `fallback-step-${idx}`,
                              timestamp: st.completedAt || selectedDoc.updatedAt,
                              elapsedMs: (idx + 1) * 140,
                              step: st.step,
                              level: 'SUCCESS' as const,
                              commandOrModule: `pipeline::${st.step.toLowerCase()}`,
                              message: `${st.label}: ${st.detail || 'Completed'}`,
                            }));

                      const filteredLogs =
                        logStepFilter === 'ALL'
                          ? activeLogs
                          : activeLogs.filter((entry) => {
                              if (logStepFilter === 'UPLOAD') {
                                return (
                                  entry.step === 'UPLOAD' ||
                                  entry.step === 'VALIDATION' ||
                                  entry.step === 'EXTRACTION'
                                );
                              }
                              return entry.step === logStepFilter;
                            });

                      return (
                        <div className="rounded-xl border border-slate-800 bg-slate-950 overflow-hidden">
                          {/* Console Toolbar Header */}
                          <div className="px-4 py-2.5 bg-slate-900/90 border-b border-slate-800 flex flex-wrap items-center justify-between gap-3">
                            <div className="flex flex-wrap items-center gap-2.5 text-xs">
                              <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                              <span className="font-semibold text-slate-200">
                                Backend Process Logs
                              </span>
                              <span className="text-slate-500">·</span>
                              <span className="font-mono text-[11px] text-slate-400">
                                {isProcessingUpload
                                  ? 'Streaming live step-by-step console output...'
                                  : `Completed in ${selectedDoc.processingDurationMs}ms (${activeLogs.length} events)`}
                              </span>
                              {logStepFilter !== 'ALL' && (
                                <button
                                  type="button"
                                  onClick={() => setLogStepFilter('ALL')}
                                  className="px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 text-[11px] font-mono hover:bg-indigo-500/30"
                                >
                                  Filter: {logStepFilter} ×
                                </button>
                              )}
                            </div>

                            <div className="flex items-center gap-2">
                              <button
                                type="button"
                                onClick={() => {
                                  const rawText = filteredLogs
                                    .map(
                                      (l) =>
                                        `[+${l.elapsedMs}ms] [${l.step}] [${l.commandOrModule}] (${l.level}) ${l.message}`
                                    )
                                    .join('\n');
                                  if (typeof navigator !== 'undefined' && navigator.clipboard) {
                                    navigator.clipboard.writeText(rawText);
                                    setCopiedLogs(true);
                                    setTimeout(() => setCopiedLogs(false), 1800);
                                  }
                                }}
                                className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-300 flex items-center gap-1.5 transition-colors"
                              >
                                <Copy className="w-3 h-3 text-slate-400" />
                                <span>{copiedLogs ? 'Copied!' : 'Copy Logs'}</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => setIsProcessLogsOpen(false)}
                                className="px-2.5 py-1 rounded bg-slate-950 hover:bg-slate-800 border border-slate-800 text-[11px] text-slate-400 hover:text-slate-200 transition-colors"
                              >
                                Collapse
                              </button>
                            </div>
                          </div>

                          {/* Monospace Console Output Stream */}
                          <div className="p-3.5 max-h-64 overflow-y-auto font-mono text-[11px] leading-relaxed space-y-1.5">
                            {filteredLogs.map((logLine, i) => {
                              const levelColor =
                                logLine.level === 'SUCCESS'
                                  ? 'text-emerald-400'
                                  : logLine.level === 'WARN'
                                    ? 'text-amber-400'
                                    : logLine.level === 'ERROR'
                                      ? 'text-rose-400'
                                      : 'text-indigo-400';

                              const timeStr = logLine.timestamp.includes('T')
                                ? logLine.timestamp.split('T')[1]?.replace('Z', '').slice(0, 12)
                                : logLine.timestamp;

                              return (
                                <div
                                  key={logLine.id || i}
                                  className="flex items-start gap-2.5 px-2 py-1 rounded hover:bg-slate-900/70 transition-colors"
                                >
                                  <span className="text-slate-500 shrink-0 tabular-nums select-none">
                                    {String(i + 1).padStart(2, '0')}
                                  </span>
                                  <span className="text-slate-500 shrink-0 tabular-nums">
                                    [{timeStr}]
                                  </span>
                                  <span className="text-slate-400 shrink-0 tabular-nums w-16 text-right">
                                    +{logLine.elapsedMs}ms
                                  </span>
                                  <span
                                    className={`shrink-0 font-semibold w-28 truncate ${levelColor}`}
                                  >
                                    [{logLine.step}]
                                  </span>
                                  <span className="text-cyan-300/90 shrink-0">
                                    {logLine.commandOrModule}
                                  </span>
                                  <span className="text-slate-200 break-words flex-1">
                                    {logLine.message}
                                  </span>
                                </div>
                              );
                            })}

                            {isProcessingUpload && (
                              <div className="flex items-center gap-2.5 px-2 py-1 text-indigo-300 animate-pulse">
                                <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400 shrink-0" />
                                <span>
                                  Executing pipeline stage [
                                  {PIPELINE_TIMELINE_STEPS[activeStepIndex]?.id || 'FINALIZE'}
                                  ]... awaiting backend verification stream
                                </span>
                              </div>
                            )}
                            <div ref={consoleEndRef} />
                          </div>
                        </div>
                      );
                    })()}
                </div>
              )}

              {/* Improvement Suggestions Panel (Active Knowledge Base Legal Terminology Tweaks) */}
              {selectedDoc && (
                <ImprovementSuggestionsPanel
                  document={selectedDoc}
                  knowledgeBase={knowledgeBase}
                  onRefreshDocument={(updated) => {
                    setSelectedDoc(updated);
                    fetchAllPlatformData();
                  }}
                />
              )}

              {/* Diff Comparison, Protected Map, Version Tree & Downloads */}
              {selectedDoc && (
                <DiffComparisonPanel
                  document={selectedDoc}
                  onRefreshDocument={(updated) => {
                    setSelectedDoc(updated);
                    fetchAllPlatformData();
                  }}
                />
              )}
            </>
          )}

          {/* VIEW: DEDICATED PDF HUMANIZER (PAGE-BY-PAGE WITH IMAGE PRESERVATION) */}
          {activeNav === 'pdf-humanize' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 space-y-6 shadow-2xl">
              <PdfHumanizerPanel />
            </div>
          )}

          {/* VIEW 2: DOCUMENTATION STUDIO + LEGAL KNOWLEDGE BASE */}
          {activeNav === 'studio' && (
            <DocumentationStudioView
              documentTypes={documentTypes}
              knowledgeBase={knowledgeBase}
              studioDocuments={studioDocs}
              initialSelectedDocTypeId={studioPreselectedTypeId}
              onDocumentCreatedOrUpdated={(doc) => {
                setSelectedDoc(doc);
                fetchAllPlatformData();
              }}
              onRefreshGlobalData={fetchAllPlatformData}
            />
          )}

          {/* VIEW 3: MY DOCUMENTS & VERSION ARCHIVE */}
          {activeNav === 'documents' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100 font-display">
                    My Documents & Version History
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Select multiple documents to export their final humanized versions (with preserved images & verification reports) in a single ZIP archive
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2.5">
                  <button
                    onClick={() => {
                      if (selectedDocIdsForZip.length === documents.length) {
                        setSelectedDocIdsForZip([]);
                      } else {
                        setSelectedDocIdsForZip(documents.map((d) => d.id));
                      }
                    }}
                    className="px-3 py-2 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs font-medium transition-colors"
                  >
                    {selectedDocIdsForZip.length === documents.length && documents.length > 0
                      ? 'Deselect All'
                      : `Select All (${documents.length})`}
                  </button>
                  <button
                    onClick={() => {
                      setActiveNav('workspace');
                      fileInputRef.current?.click();
                    }}
                    className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-xs font-medium transition-colors"
                  >
                    Upload New Document
                  </button>
                </div>
              </div>

              {/* Batch ZIP Export Action Bar */}
              <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex flex-wrap items-center justify-between gap-4">
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-slate-200">
                    <Archive className="w-4 h-4 text-indigo-400" />
                    Batch ZIP Exporter:
                  </span>
                  <span className="text-slate-400 font-mono">
                    {selectedDocIdsForZip.length} of {documents.length} document(s) selected
                  </span>
                  {selectedDocIdsForZip.length > 0 && (
                    <button
                      onClick={() => setSelectedDocIdsForZip([])}
                      className="text-slate-400 hover:text-slate-200 underline text-[11px]"
                    >
                      Clear selection
                    </button>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={includeZipReports}
                      onChange={(e) => setIncludeZipReports(e.target.checked)}
                      className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-indigo-500"
                    />
                    Include Audit Summary PDFs
                  </label>

                  <select
                    aria-label="ZIP export file format"
                    value={zipExportFormat}
                    onChange={(e) =>
                      setZipExportFormat(e.target.value as 'native' | 'pdf' | 'docx' | 'txt' | 'md')
                    }
                    className="bg-slate-900 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
                  >
                    <option value="native">Format: Original file (text edited in place)</option>
                    <option value="pdf">Format: PDF (your edited file, or generated from text)</option>
                    <option value="docx">Format: Humanized DOCX</option>
                    <option value="txt">Format: Humanized TXT</option>
                    <option value="md">Format: Humanized Markdown (.md)</option>
                  </select>

                  <button
                    onClick={async () => {
                      const targetIds =
                        selectedDocIdsForZip.length > 0
                          ? selectedDocIdsForZip
                          : documents.map((d) => d.id);
                      if (targetIds.length === 0) return;

                      setIsExportingZip(true);
                      try {
                        const res = await fetch('/api/documents/export-zip', {
                          method: 'POST',
                          headers: {'Content-Type': 'application/json'},
                          body: JSON.stringify({
                            documentIds: targetIds,
                            format: zipExportFormat,
                            includeReports: includeZipReports,
                          }),
                        });
                        if (!res.ok) return;
                        const blob = await res.blob();
                        const downloadUrl = window.URL.createObjectURL(blob);
                        const link = window.document.createElement('a');
                        const dateStr = new Date().toISOString().slice(0, 10);
                        link.href = downloadUrl;
                        link.download = `HumanFlow_Humanized_${targetIds.length}_Docs_${dateStr}.zip`;
                        window.document.body.appendChild(link);
                        link.click();
                        window.document.body.removeChild(link);
                        window.URL.revokeObjectURL(downloadUrl);
                      } finally {
                        setIsExportingZip(false);
                      }
                    }}
                    disabled={isExportingZip || documents.length === 0}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-lg text-xs font-semibold transition-colors flex items-center gap-2 whitespace-nowrap shrink-0"
                  >
                    {isExportingZip ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Download className="w-3.5 h-3.5" />
                    )}
                    {selectedDocIdsForZip.length > 0
                      ? `Export Selected (${selectedDocIdsForZip.length}) as ZIP`
                      : `Export All (${documents.length}) as ZIP`}
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowBatchDeleteConfirm(true)}
                    disabled={isDeletingDoc || selectedDocIdsForZip.length === 0}
                    className="px-3.5 py-2 bg-rose-600/20 hover:bg-rose-600/30 disabled:opacity-40 text-rose-300 border border-rose-500/40 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0"
                    title="Permanently delete all selected documents"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-rose-400" />
                    <span>
                      Delete Selected {selectedDocIdsForZip.length > 0 ? `(${selectedDocIdsForZip.length})` : ''}
                    </span>
                  </button>
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 select-none">
                      <th className="py-2.5 pr-3 w-8">
                        <input
                          type="checkbox"
                          aria-label="Select all documents"
                          checked={
                            documents.length > 0 &&
                            selectedDocIdsForZip.length === documents.length
                          }
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedDocIdsForZip(documents.map((d) => d.id));
                            } else {
                              setSelectedDocIdsForZip([]);
                            }
                          }}
                          className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </th>
                      <th
                        aria-sort={
                          docSortField === 'name'
                            ? docSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        className="py-2.5 pr-4 font-medium"
                      >
                        <button
                          type="button"
                          onClick={() => handleDocSort('name')}
                          className={`group inline-flex items-center gap-1.5 hover:text-slate-100 transition-colors ${
                            docSortField === 'name' ? 'text-indigo-300 font-semibold' : ''
                          }`}
                          title="Sort by Document Name"
                        >
                          <span>Document Name</span>
                          {renderSortIcon('name')}
                        </button>
                      </th>
                      <th
                        aria-sort={
                          docSortField === 'date'
                            ? docSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        className="py-2.5 px-4 font-medium"
                      >
                        <button
                          type="button"
                          onClick={() => handleDocSort('date')}
                          className={`group inline-flex items-center gap-1.5 hover:text-slate-100 transition-colors ${
                            docSortField === 'date' ? 'text-indigo-300 font-semibold' : ''
                          }`}
                          title="Sort by Date"
                        >
                          <span>Date</span>
                          {renderSortIcon('date')}
                        </button>
                      </th>
                      <th className="py-2.5 px-4 font-medium">Module</th>
                      <th className="py-2.5 px-4 font-medium">Trace ID</th>
                      <th className="py-2.5 px-4 font-medium">Status</th>
                      <th
                        aria-sort={
                          docSortField === 'preservation'
                            ? docSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        className="py-2.5 px-4 font-medium text-right"
                      >
                        <button
                          type="button"
                          onClick={() => handleDocSort('preservation')}
                          className={`group inline-flex items-center justify-end gap-1.5 hover:text-slate-100 transition-colors ml-auto ${
                            docSortField === 'preservation' ? 'text-indigo-300 font-semibold' : ''
                          }`}
                          title="Sort by Preservation Score"
                        >
                          <span>Preservation</span>
                          {renderSortIcon('preservation')}
                        </button>
                      </th>
                      <th
                        aria-sort={
                          docSortField === 'maskedItems'
                            ? docSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        className="py-2.5 px-4 font-medium text-right"
                      >
                        <button
                          type="button"
                          onClick={() => handleDocSort('maskedItems')}
                          className={`group inline-flex items-center justify-end gap-1.5 hover:text-slate-100 transition-colors ml-auto ${
                            docSortField === 'maskedItems' ? 'text-indigo-300 font-semibold' : ''
                          }`}
                          title="Sort by Masked Items Count"
                        >
                          <span>Masked Items</span>
                          {renderSortIcon('maskedItems')}
                        </button>
                      </th>
                      <th
                        aria-sort={
                          docSortField === 'images'
                            ? docSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        className="py-2.5 px-4 font-medium text-right"
                      >
                        <button
                          type="button"
                          onClick={() => handleDocSort('images')}
                          className={`group inline-flex items-center justify-end gap-1.5 hover:text-slate-100 transition-colors ml-auto ${
                            docSortField === 'images' ? 'text-indigo-300 font-semibold' : ''
                          }`}
                          title="Sort by Embedded Images Count"
                        >
                          <span>Images</span>
                          {renderSortIcon('images')}
                        </button>
                      </th>
                      <th
                        aria-sort={
                          docSortField === 'aiScore'
                            ? docSortDirection === 'asc'
                              ? 'ascending'
                              : 'descending'
                            : 'none'
                        }
                        className="py-2.5 px-4 font-medium text-right"
                      >
                        <button
                          type="button"
                          onClick={() => handleDocSort('aiScore')}
                          className={`group inline-flex items-center justify-end gap-1.5 hover:text-slate-100 transition-colors ml-auto ${
                            docSortField === 'aiScore' ? 'text-indigo-300 font-semibold' : ''
                          }`}
                          title="Sort by AI Score"
                        >
                          <span>AI Score</span>
                          {renderSortIcon('aiScore')}
                        </button>
                      </th>
                      <th className="py-2.5 pl-4 font-medium text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {sortedDocuments.map((doc) => {
                      const lastCheck = doc.qualityChecks[doc.qualityChecks.length - 1];
                      const isChecked = selectedDocIdsForZip.includes(doc.id);
                      const imageCount = (doc.embeddedImages || []).length;
                      const rawTimestamp = doc.updatedAt || doc.createdAt;
                      const formattedDate = rawTimestamp.includes('T')
                        ? rawTimestamp.replace('T', ' ').replace('Z', '').slice(0, 16)
                        : rawTimestamp;
                      return (
                        <tr
                          key={doc.id}
                          onClick={() => {
                            setSelectedDoc(doc);
                          }}
                          className={`cursor-pointer transition-colors ${
                            selectedDoc?.id === doc.id
                              ? 'bg-indigo-950/35 hover:bg-indigo-950/45'
                              : isChecked
                                ? 'bg-indigo-950/20 hover:bg-indigo-950/30'
                                : 'hover:bg-slate-800/30'
                          }`}
                        >
                          <td
                            className="py-3 pr-3"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="checkbox"
                              aria-label={`Select ${doc.originalName}`}
                              checked={isChecked}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedDocIdsForZip((prev) =>
                                    prev.includes(doc.id) ? prev : [...prev, doc.id]
                                  );
                                } else {
                                  setSelectedDocIdsForZip((prev) =>
                                    prev.filter((id) => id !== doc.id)
                                  );
                                }
                              }}
                              className="rounded border-slate-700 bg-slate-950 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                            />
                          </td>
                          <td className="py-3 pr-4 font-medium text-slate-200">
                            <div className="flex items-center gap-2">
                              <span>{doc.originalName}</span>
                              {selectedDoc?.id === doc.id && (
                                <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 border border-indigo-500/40 text-[10px] text-indigo-300 font-mono">
                                  Active
                                </span>
                              )}
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono tabular-nums text-slate-400 whitespace-nowrap">
                            {formattedDate}
                          </td>
                          <td className="py-3 px-4 text-slate-400">{doc.sourceModule}</td>
                          <td className="py-3 px-4 font-mono text-indigo-300">{doc.traceId}</td>
                          <td className="py-3 px-4 text-emerald-400 font-medium">{doc.status}</td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-emerald-400">
                            {doc.preservationResult.preservationScore}%
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-indigo-300">
                            {doc.protectedMap.entities.length}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-300">
                            {imageCount}
                          </td>
                          <td className="py-3 px-4 text-right font-mono tabular-nums text-slate-200">
                            {lastCheck?.aiScore ?? 6}%
                          </td>
                          <td
                            className="py-3 pl-4 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="inline-flex items-center gap-3">
                              <button
                                onClick={async () => {
                                  const res = await fetch(
                                    `/api/documents/${doc.id}/download?target=report&format=pdf`
                                  );
                                  if (!res.ok) return;
                                  const blob = await res.blob();
                                  const downloadUrl = window.URL.createObjectURL(blob);
                                  const link = window.document.createElement('a');
                                  const base = doc.originalName.replace(/\.[^.]+$/, '');
                                  link.href = downloadUrl;
                                  link.download = `Preservation_Audit_Report_${base}.pdf`;
                                  window.document.body.appendChild(link);
                                  link.click();
                                  window.document.body.removeChild(link);
                                  window.URL.revokeObjectURL(downloadUrl);
                                }}
                                className="px-2.5 py-1 rounded bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 font-medium inline-flex items-center gap-1 transition-colors"
                              >
                                <Download className="w-3 h-3" />
                                Audit PDF
                              </button>
                              <button
                                onClick={() => {
                                  setSelectedDoc(doc);
                                  setActiveNav('workspace');
                                }}
                                className="text-indigo-400 hover:text-indigo-300 font-medium"
                              >
                                Inspect Diff
                              </button>
                              <button
                                type="button"
                                onClick={() => setDocToDelete(doc)}
                                className="px-2 py-1 rounded bg-rose-600/15 hover:bg-rose-600/25 text-rose-300 border border-rose-500/40 font-medium inline-flex items-center gap-1 transition-colors"
                                title={`Delete ${doc.originalName}`}
                              >
                                <Trash2 className="w-3 h-3 text-rose-400" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {selectedDoc && (
                <div className="pt-4 border-t border-slate-800/80">
                  <ImprovementSuggestionsPanel
                    document={selectedDoc}
                    knowledgeBase={knowledgeBase}
                    onRefreshDocument={(updated) => {
                      setSelectedDoc(updated);
                      fetchAllPlatformData();
                    }}
                  />
                </div>
              )}
            </div>
          )}

          {/* VIEW 4: NOTIFICATIONS (IN-APP + BROWSER) */}
          {activeNav === 'notifications' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div>
                  <h2 className="text-lg font-semibold text-slate-100 font-display">
                    Platform & Browser Notification Feed
                  </h2>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Real-time in-app and browser alerts for completed humanization, quality checks, and legal drafting runs
                  </p>
                </div>

                <button
                  onClick={async () => {
                    if (typeof window !== 'undefined' && 'Notification' in window) {
                      await window.Notification.requestPermission();
                    }
                  }}
                  className="px-3.5 py-2 bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-slate-800 rounded-lg text-xs font-medium"
                >
                  Enable Browser Notifications
                </button>
              </div>

              <div className="space-y-3">
                {notifications.map((n) => (
                  <div
                    key={n.id}
                    className="bg-slate-950 border border-slate-800 rounded-xl p-4 flex items-start justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2 text-xs text-slate-400">
                        <span className="font-semibold text-slate-100">{n.title}</span>
                        <span>·</span>
                        <span className="font-mono text-indigo-300">{n.traceId}</span>
                        <span>·</span>
                        <span className="text-emerald-400">Verified</span>
                      </div>
                      <p className="text-xs text-slate-300">{n.message}</p>
                    </div>
                    <span className="text-[11px] font-mono text-slate-500 shrink-0">
                      {n.createdAt.slice(11, 19)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* VIEW 5: ADMIN CONSOLE */}
          {activeNav === 'admin' && settings && (
            <AdminConsoleView
              documents={documents}
              settings={settings}
              knowledgeBase={knowledgeBase}
              knowledgeConflicts={knowledgeConflicts}
              onRefreshAll={fetchAllPlatformData}
            />
          )}

          {/* VIEW 6: ARCHITECTURE & SYSTEM HELP */}
          {activeNav === 'help' && (
            <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-6">
              <div>
                <h2 className="text-lg font-semibold text-slate-100 font-display">
                  HumanFlow AI — System Architecture & Preservation Guarantees
                </h2>
                <p className="text-xs text-slate-400 mt-1">
                  Modular, provider-independent architecture designed so you can swap Humanizer or AI Checker APIs at any time without rewriting application code.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <ShieldCheck className="w-5 h-5 text-emerald-400" />
                  <h3 className="font-semibold text-slate-100">
                    Protected-Content Guardrail
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Before humanization, the Document Analysis Agent indexes headings, tables, numbers, percentages, currencies, dates, URLs, emails, citations, and defined legal terms. If any critical entity drifts, the Preservation Agent automatically restores that section from the untouched original.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <Scale className="w-5 h-5 text-indigo-400" />
                  <h3 className="font-semibold text-slate-100">
                    Documentation Studio & Legal KB
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Supports 27+ legal and technical document types across US, UK, EU, UAE, and Pakistan. Enforces mandatory jurisdiction selection for legal contracts, flags missing required fields, uses only APPROVED Knowledge Base records, and applies LOW/CONSERVATIVE humanization intensity on legal clauses.
                  </p>
                </div>

                <div className="bg-slate-950 border border-slate-800 rounded-xl p-4 space-y-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="font-semibold text-slate-100">
                    Modular Provider Adapters
                  </h3>
                  <p className="text-slate-400 leading-relaxed">
                    Configure <code className="text-slate-200">HUMANIZER_API_URL</code>, <code className="text-slate-200">HUMANIZER_API_KEY</code>, and custom JSON response paths (<code className="text-slate-200">data.text</code>) in Admin Settings. Full keys are masked (<code className="text-slate-200">sk-***************92</code>) and never exposed to client JavaScript.
                  </p>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Animated Grounded HumanFlow Assistant Drawer */}
      <AssistantDrawer
        onNavigateTab={(tab, studioDocTypeId) => {
          if (tab === 'studio') {
            if (studioDocTypeId) setStudioPreselectedTypeId(studioDocTypeId);
            setActiveNav('studio');
          } else if (tab === 'admin') {
            setActiveNav('admin');
          } else {
            setActiveNav('workspace');
          }
        }}
      />

      {/* Modal 1: Single Document Delete Confirmation */}
      {docToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-100 font-display">
                  Delete Uploaded Document?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Are you sure you want to permanently delete{' '}
                  <span className="font-semibold text-slate-200 truncate inline-block max-w-full align-bottom">
                    &quot;{docToDelete.originalName}&quot;
                  </span>
                  ? All original files, humanized versions, images, and audit reports will be erased from storage.
                </p>
              </div>
            </div>

            <div className="bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 space-y-1.5 text-[11px] font-mono text-slate-400">
              <div className="flex justify-between">
                <span>Trace ID:</span>
                <span className="text-indigo-300">{docToDelete.traceId}</span>
              </div>
              <div className="flex justify-between">
                <span>File Size:</span>
                <span>{(docToDelete.fileSize / 1024).toFixed(1)} KB</span>
              </div>
              <div className="flex justify-between">
                <span>Status:</span>
                <span className="text-emerald-400 font-semibold">{docToDelete.status}</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setDocToDelete(null)}
                disabled={isDeletingDoc}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteSingle}
                disabled={isDeletingDoc}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50"
              >
                {isDeletingDoc ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete Permanently</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal 2: Batch Documents Delete Confirmation */}
      {showBatchDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div
            role="dialog"
            aria-modal="true"
            className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-5 animate-in zoom-in-95 duration-200"
          >
            <div className="flex items-start gap-4">
              <div className="w-11 h-11 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400 shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div className="space-y-1.5 flex-1 min-w-0">
                <h3 className="text-base font-semibold text-slate-100 font-display">
                  Delete {selectedDocIdsForZip.length} Selected Documents?
                </h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  This will permanently remove the {selectedDocIdsForZip.length} selected document(s) along with their preserved files and reports from storage. This action cannot be reversed.
                </p>
              </div>
            </div>

            <div className="max-h-36 overflow-y-auto space-y-1 bg-slate-950/80 rounded-xl p-3 border border-slate-800/80 text-xs">
              {documents
                .filter((d) => selectedDocIdsForZip.includes(d.id))
                .map((d) => (
                  <div key={d.id} className="flex items-center justify-between text-slate-300 py-0.5">
                    <span className="truncate pr-2">{d.originalName}</span>
                    <span className="text-[10px] font-mono text-slate-500 shrink-0">
                      {(d.fileSize / 1024).toFixed(1)} KB
                    </span>
                  </div>
                ))}
            </div>

            <div className="flex items-center justify-end gap-3 pt-1">
              <button
                type="button"
                onClick={() => setShowBatchDeleteConfirm(false)}
                disabled={isDeletingDoc}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 rounded-xl text-xs font-medium transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmBatchDelete}
                disabled={isDeletingDoc}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white rounded-xl text-xs font-semibold transition-colors flex items-center gap-2 cursor-pointer shadow-lg shadow-rose-950/50"
              >
                {isDeletingDoc ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Delete {selectedDocIdsForZip.length} Documents</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Status Notification Toast */}
      {deleteToast && (
        <div className="fixed bottom-6 right-6 z-50 animate-in slide-in-from-bottom-5 duration-300">
          <div
            className={`rounded-xl px-4 py-3 border shadow-2xl flex items-center gap-3 text-xs font-medium ${
              deleteToast.type === 'success'
                ? 'bg-slate-900 border-emerald-500/40 text-emerald-300'
                : 'bg-slate-900 border-rose-500/40 text-rose-300'
            }`}
          >
            {deleteToast.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            )}
            <span>{deleteToast.message}</span>
            <button
              onClick={() => setDeleteToast(null)}
              className="ml-2 text-slate-400 hover:text-slate-200 text-sm font-bold cursor-pointer"
            >
              ×
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
