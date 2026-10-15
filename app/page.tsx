'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import Navbar from '@/components/Navbar';
import FileUploadZone from '@/components/FileUploadZone';
import ProcessingTimeline from '@/components/ProcessingTimeline';
import DiffViewer from '@/components/DiffViewer';
import VersionHistory from '@/components/VersionHistory';
import AnimatedChatbot from '@/components/AnimatedChatbot';
import CentralDashboard from '@/components/dashboard/CentralDashboard';
import UniversalFileStudio from '@/components/dashboard/UniversalFileStudio';

import { DocumentDiff, DocumentRecord, DocumentVersion, JobStatus } from '@/lib/types';
import {
  Sparkles,
  ShieldCheck,
  Zap,
  Download,
  Loader2,
  FileText,
  RotateCcw,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Trash2,
  RefreshCw,
  Bot,
  ListTodo,
  Layers,
  ChevronRight,
  ExternalLink,
  Search,
  Sliders,
  Send,
  Cpu,
  CheckSquare,
  FileSpreadsheet,
} from 'lucide-react';

export default function HomePage() {
  const router = useRouter();

  // Active Studio Tab: 'pipeline' | 'workspace' | 'specialists' | 'file_forge' | 'intelligent' | 'legal'
  const [activeStudio, setActiveStudio] = useState<
    'pipeline' | 'workspace' | 'specialists' | 'file_forge' | 'intelligent' | 'legal'
  >('pipeline');

  // Document pipeline states
  const [activeDocument, setActiveDocument] = useState<DocumentRecord | null>(null);
  const [pipelineFinished, setPipelineFinished] = useState(false);
  const [diffData, setDiffData] = useState<{
    diff: DocumentDiff | null;
    originalText: string;
    humanizedText: string;
    versionLabel: string;
  } | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [recentDocuments, setRecentDocuments] = useState<DocumentRecord[]>([]);

  // Platform-wide overview & vault states
  const [platformStats, setPlatformStats] = useState<{
    totalDocuments: number;
    processingDocuments: number;
    completedDocuments: number;
    totalConversations: number;
    totalIntelligentSessions: number;
    totalLegalDocuments: number;
  }>({
    totalDocuments: 0,
    processingDocuments: 0,
    completedDocuments: 0,
    totalConversations: 0,
    totalIntelligentSessions: 0,
    totalLegalDocuments: 0,
  });
  const [recentConversations, setRecentConversations] = useState<any[]>([]);
  const [vaultFilter, setVaultFilter] = useState<'all' | 'pipeline' | 'workspace' | 'intelligent' | 'legal'>('all');
  const [vaultSearch, setVaultSearch] = useState('');
  const [quickPrompt, setQuickPrompt] = useState('');
  const [bridgingStatus, setBridgingStatus] = useState<string | null>(null);
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadFinal = async (
    e: React.MouseEvent,
    docId: string,
    originalName: string
  ) => {
    e.preventDefault();
    if (isDownloading) return;
    setIsDownloading(true);

    try {
      const downloadUrl = `/api/documents/${docId}/download?type=final`;
      const res = await fetch(downloadUrl);

      if (!res.ok) {
        let errMsg = `Server returned status ${res.status}`;
        try {
          const contentType = res.headers.get('content-type') || '';
          if (contentType.includes('application/json')) {
            const errJson = await res.json();
            errMsg = errJson.error || errMsg;
          } else {
            const rawText = await res.text();
            if (rawText.toLowerCase().includes('upstream error')) {
              errMsg = 'Server is currently warming up or reconnecting. Please retry in a few moments.';
            } else if (rawText) {
              errMsg = rawText.slice(0, 200);
            }
          }
        } catch {
          // fallback
        }
        alert(errMsg);
        return;
      }

      const blob = await res.blob();
      const blobUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = blobUrl;

      const contentDisposition = res.headers.get('content-disposition') || '';
      let fileName = `HumanFlow_Final_${originalName}`;
      const match = contentDisposition.match(/filename="?([^";]+)"?/);
      if (match && match[1]) {
        fileName = match[1].trim();
      }

      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(blobUrl);
    } catch (err: any) {
      alert(`Download could not complete: ${err.message || 'Network error'}`);
    } finally {
      setIsDownloading(false);
    }
  };

  const handleSelectRecent = async (doc: DocumentRecord) => {
    setActiveDocument(doc);
    setActiveStudio('pipeline');
    if (doc.status === 'COMPLETED' || doc.status === 'NEEDS_REVIEW') {
      setPipelineFinished(true);
      try {
        const [diffRes, verRes] = await Promise.all([
          fetch(`/api/documents/${doc.id}/diff`).then(async (r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`/api/documents/${doc.id}/versions`).then(async (r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (diffRes) setDiffData(diffRes);
        if (verRes?.versions) setVersions(verRes.versions);
      } catch (err) {
        console.error('Failed to load document details:', err);
      }
    } else if (doc.status === 'FAILED') {
      setPipelineFinished(true);
      setDiffData(null);
      setVersions([]);
    } else {
      setPipelineFinished(false);
      setDiffData(null);
    }
  };

  // Check URL query on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const viewParam = params.get('view');
      if (viewParam === 'pipeline' || viewParam === 'workspace' || viewParam === 'specialists' || viewParam === 'file_forge' || viewParam === 'intelligent' || viewParam === 'legal') {
        setActiveStudio(viewParam);
      }
      const docIdParam = params.get('docId');
      if (docIdParam) {
        fetch(`/api/documents/${docIdParam}`)
          .then(async (r) => (r.ok ? r.json() : null))
          .then((data) => {
            if (data?.document) {
              handleSelectRecent(data.document);
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const loadPlatformData = () => {
    fetch('/api/system/overview')
      .then(async (r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (!data) return;
        if (data.stats) {
          setPlatformStats(data.stats);
        }
        if (data.recentPipelineDocs) {
          setRecentDocuments(data.recentPipelineDocs);
        }
        if (data.recentConversations) {
          setRecentConversations(data.recentConversations);
        }
      })
      .catch(() => {});
  };

  useEffect(() => {
    loadPlatformData();
    const interval = setInterval(loadPlatformData, 7000);
    return () => clearInterval(interval);
  }, []);

  const handleUploadSuccess = (doc: DocumentRecord) => {
    setActiveDocument(doc);
    setPipelineFinished(false);
    setDiffData(null);
    setVersions([]);
    loadPlatformData();
  };

  const handlePipelineFinished = async (status: JobStatus) => {
    loadPlatformData();
    if (activeDocument) {
      try {
        const docRes = await fetch(`/api/documents/${activeDocument.id}`).then(async (r) => (r.ok ? r.json() : null)).catch(() => null);
        if (docRes?.document) {
          setActiveDocument(docRes.document);
        }
      } catch (err) {
        console.error('Failed to reload document details:', err);
      }
    }

    setPipelineFinished(true);

    if (activeDocument && status !== 'FAILED') {
      try {
        const [diffRes, verRes] = await Promise.all([
          fetch(`/api/documents/${activeDocument.id}/diff`).then(async (r) => (r.ok ? r.json() : null)).catch(() => null),
          fetch(`/api/documents/${activeDocument.id}/versions`).then(async (r) => (r.ok ? r.json() : null)).catch(() => null),
        ]);
        if (diffRes) setDiffData(diffRes);
        if (verRes?.versions) setVersions(verRes.versions);
      } catch (err) {
        console.error('Failed to load final diff data:', err);
      }
    }
  };

  const handleResetToUpload = () => {
    setActiveDocument(null);
    setPipelineFinished(false);
    setDiffData(null);
    setVersions([]);
  };

  const handleDeleteDocument = async (e: React.MouseEvent, docId: string) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to permanently delete this document record?')) return;
    try {
      const res = await fetch(`/api/documents/${docId}`, { method: 'DELETE' });
      if (res.ok) {
        if (activeDocument?.id === docId) {
          handleResetToUpload();
        }
        loadPlatformData();
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
    }
  };

  const handleRetryDocument = async (docId: string) => {
    try {
      const res = await fetch(`/api/documents/${docId}/retry`, { method: 'POST' });
      if (res.ok) {
        const docRes = await fetch(`/api/documents/${docId}`).then((r) => r.json());
        if (docRes.document) {
          setActiveDocument(docRes.document);
        }
        setPipelineFinished(false);
        loadPlatformData();
      }
    } catch (err) {
      console.error('Failed to retry document:', err);
    }
  };

  // Cross-Module Bridge Handlers
  const handleBridgeToWorkspace = async (doc: DocumentRecord) => {
    setBridgingStatus(`Loading ${doc.originalName} into AI Workspace...`);
    try {
      const res = await fetch('/api/workspace/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          documentId: doc.id,
          originalName: doc.originalName,
        }),
      });
      const data = await res.json();
      if (data.success && data.conversationId) {
        router.push(`/workspace?id=${data.conversationId}`);
      } else {
        alert(data.error || 'Failed to initialize workspace task');
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setBridgingStatus(null);
    }
  };

  const handleBridgeToLegal = async (doc: DocumentRecord) => {
    setBridgingStatus(`Exporting ${doc.originalName} to Legal Studio...`);
    try {
      const textToExport = diffData?.humanizedText || diffData?.originalText || '';
      const res = await fetch('/api/documentation/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: doc.originalName.replace(/\.[^/.]+$/, ''),
          text: textToExport || `Document Content: ${doc.originalName}`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        router.push('/documentation');
      } else {
        alert(data.error || 'Failed to export to legal studio');
      }
    } catch (err: any) {
      alert(`Network error: ${err.message}`);
    } finally {
      setBridgingStatus(null);
    }
  };

  const handleLaunchQuickTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickPrompt.trim()) return;
    setBridgingStatus('Initializing Autonomous AI Task...');
    try {
      const res = await fetch('/api/workspace/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: quickPrompt.slice(0, 45).trim() }),
      });
      const data = await res.json();
      if (data.success && data.conversation) {
        // Send initial user message
        await fetch(`/api/workspace/conversations/${data.conversation.id}/messages`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ prompt: quickPrompt }),
        });
        router.push(`/workspace?id=${data.conversation.id}`);
      }
    } catch (err: any) {
      alert(`Failed: ${err.message}`);
    } finally {
      setBridgingStatus(null);
    }
  };

  // Filter vault items
  const filteredPipelineDocs = recentDocuments.filter((d) =>
    d.originalName.toLowerCase().includes(vaultSearch.toLowerCase())
  );
  const filteredConversations = recentConversations.filter((c) =>
    c.title.toLowerCase().includes(vaultSearch.toLowerCase())
  );



  return (
    <div className="relative min-h-screen flex flex-col bg-[#050814] text-slate-100 selection:bg-cyan-500/30 selection:text-cyan-200">
      {/* Ambient background glow orbs */}
      <div className="absolute top-16 left-1/2 -translate-x-1/2 w-[900px] h-[380px] bg-gradient-to-tr from-indigo-600/15 via-cyan-500/12 to-purple-600/15 rounded-full blur-[120px] pointer-events-none ambient-orb" />
      <div className="absolute top-[40%] right-0 w-[550px] h-[420px] bg-cyan-600/10 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 left-0 w-[650px] h-[420px] bg-purple-600/10 rounded-full blur-[140px] pointer-events-none" />

      <Navbar />

      <main className="relative z-10 flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 w-full space-y-8 sm:space-y-10">
        {/* PLATFORM EXECUTIVE COMMAND HEADER & METRIC STRIP */}
        <section className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 pb-2 border-b border-white/[0.08]">
            <div className="space-y-1.5">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/25 text-cyan-300 text-[11px] font-mono font-semibold tracking-wide shadow-sm shadow-cyan-500/10">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>HUMANFLOW ENTERPRISE OS • UNIFIED SUITE</span>
              </div>
              <h1 className="font-display text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight text-white leading-tight">
                Unified AI Document & <span className="shimmer-text">Autonomous Agent</span> Platform
              </h1>
              <p className="text-slate-400 text-xs sm:text-sm max-w-2xl leading-relaxed">
                One cohesive enterprise system uniting fact-preserving document transformation, interactive multi-modal agent workflows, and compliant legal drafting.
              </p>
            </div>

            {/* Quick Actions & Status Pill */}
            <div className="flex items-center gap-3">
              <button
                onClick={() => {
                  setActiveStudio('pipeline');
                  handleResetToUpload();
                }}
                className="px-4 py-2.5 rounded-2xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:scale-105 text-white font-semibold text-xs shadow-lg shadow-cyan-500/25 flex items-center gap-2 transition-all cursor-pointer"
              >
                <Sparkles className="w-4 h-4 text-cyan-200" />
                <span>Upload New Document</span>
              </button>

              {bridgingStatus && (
                <div className="px-4 py-2 rounded-xl bg-cyan-500/15 border border-cyan-500/30 text-cyan-200 text-xs font-mono flex items-center gap-2 animate-pulse">
                  <RefreshCw className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                  <span>{bridgingStatus}</span>
                </div>
              )}
            </div>
          </div>

          {/* 4 LIVE KPI TELEMETRY CARDS */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            {/* Card 1: Documents Processed */}
            <div
              onClick={() => setActiveStudio('pipeline')}
              className="glass-card p-4 rounded-2xl border border-white/[0.08] hover:border-cyan-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Document Pipeline</span>
                <Sparkles className="w-4 h-4 text-cyan-400 group-hover:rotate-12 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  {platformStats.totalDocuments}
                </span>
                <span className="text-[11px] font-mono text-emerald-400">
                  {platformStats.completedDocuments} verified
                </span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Autonomous fact preservation</p>
            </div>

            {/* Card 2: AI Workspace Tasks */}
            <div
              onClick={() => setActiveStudio('workspace')}
              className="glass-card p-4 rounded-2xl border border-white/[0.08] hover:border-purple-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">AI Workspace</span>
                <Bot className="w-4 h-4 text-purple-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  {platformStats.totalConversations}
                </span>
                <span className="text-[11px] font-mono text-purple-400">Active tasks</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Interactive task planner & chat</p>
            </div>

            {/* Card 3: Fact Guard Lock */}
            <div className="glass-card p-4 rounded-2xl border border-white/[0.08] hover:border-emerald-500/40 transition-all">
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Fact Guard Integrity</span>
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-display font-extrabold text-emerald-300">
                  100%
                </span>
                <span className="text-[11px] font-mono text-emerald-400 font-bold uppercase">Locked</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Citations, data & tables frozen</p>
            </div>

            {/* Card 4: Legal & Verification Registry */}
            <div
              onClick={() => setActiveStudio('legal')}
              className="glass-card p-4 rounded-2xl border border-white/[0.08] hover:border-blue-500/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
                <span className="font-medium">Legal Templates</span>
                <FileText className="w-4 h-4 text-blue-400 group-hover:scale-110 transition-transform" />
              </div>
              <div className="flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-display font-extrabold text-white">
                  {platformStats.totalLegalDocuments}
                </span>
                <span className="text-[11px] font-mono text-blue-400 font-semibold">Available</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1">Contracts & regulatory drafts</p>
            </div>
          </div>
        </section>

        {/* INTERACTIVE WORKFLOW PIPELINE ARCHITECTURE MAP */}
        <section className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 space-y-3">
          <div className="flex items-center justify-between text-xs pb-2 border-b border-white/[0.08]">
            <div className="flex items-center gap-2 font-bold text-slate-300">
              <Layers className="w-4 h-4 text-cyan-400" />
              <span>Unified System Lifecycle: How Your Data Flows Through HumanFlow OS</span>
            </div>
            <span className="text-[10px] font-mono text-slate-400">Zero-Friction Cross-Module Pipeline</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-5 gap-2 text-xs">
            <div
              onClick={() => setActiveStudio('pipeline')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activeStudio === 'pipeline'
                  ? 'bg-cyan-500/20 border-cyan-400/50 shadow-md shadow-cyan-500/20'
                  : 'bg-white/[0.02] border-white/5 hover:border-cyan-500/30 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-cyan-400 font-bold mb-1">
                <span>01. INTAKE</span>
                <Sparkles className="w-3 h-3" />
              </div>
              <div className="font-bold text-white text-xs">Drop & Extract</div>
              <p className="text-[10px] text-slate-400 mt-1">DOMMatrix PDF, DOCX, TXT, Excel</p>
            </div>

            <div
              onClick={() => setActiveStudio('workspace')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activeStudio === 'workspace'
                  ? 'bg-purple-500/20 border-purple-400/50 shadow-md shadow-purple-500/20'
                  : 'bg-white/[0.02] border-white/5 hover:border-purple-500/30 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-purple-400 font-bold mb-1">
                <span>02. PLAN & CHAT</span>
                <Bot className="w-3 h-3" />
              </div>
              <div className="font-bold text-white text-xs">Autonomous Agent</div>
              <p className="text-[10px] text-slate-400 mt-1">Task plans, checklists, questions</p>
            </div>

            <div
              onClick={() => setActiveStudio('pipeline')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activeStudio === 'pipeline'
                  ? 'bg-emerald-500/20 border-emerald-400/50 shadow-md shadow-emerald-500/20'
                  : 'bg-white/[0.02] border-white/5 hover:border-emerald-500/30 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-emerald-400 font-bold mb-1">
                <span>03. HUMANIZE</span>
                <ShieldCheck className="w-3 h-3" />
              </div>
              <div className="font-bold text-white text-xs">Fact Guard Engine</div>
              <p className="text-[10px] text-slate-400 mt-1">6 agents freeze citations verbatim</p>
            </div>

            <div
              onClick={() => setActiveStudio('intelligent')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activeStudio === 'intelligent'
                  ? 'bg-pink-500/20 border-pink-400/50 shadow-md shadow-pink-500/20'
                  : 'bg-white/[0.02] border-white/5 hover:border-pink-500/30 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-pink-400 font-bold mb-1">
                <span>04. VERIFY</span>
                <ListTodo className="w-3 h-3" />
              </div>
              <div className="font-bold text-white text-xs">Intelligent Audit</div>
              <p className="text-[10px] text-slate-400 mt-1">Quality scorecard & gap audit</p>
            </div>

            <div
              onClick={() => setActiveStudio('legal')}
              className={`p-3 rounded-xl border cursor-pointer transition-all ${
                activeStudio === 'legal'
                  ? 'bg-blue-500/20 border-blue-400/50 shadow-md shadow-blue-500/20'
                  : 'bg-white/[0.02] border-white/5 hover:border-blue-500/30 hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between font-mono text-[10px] text-blue-400 font-bold mb-1">
                <span>05. DELIVER</span>
                <FileText className="w-3 h-3" />
              </div>
              <div className="font-bold text-white text-xs">Legal & Enterprise</div>
              <p className="text-[10px] text-slate-400 mt-1">Templates, contracts & DOCX</p>
            </div>
          </div>
        </section>

        {/* UNIFIED MODULAR STUDIO SWITCHER TABS */}
        <section className="space-y-6">
          <div className="flex items-center justify-center">
            <div className="glass-panel p-1.5 rounded-2xl border border-white/10 flex flex-wrap items-center justify-center gap-1.5 shadow-2xl max-w-full">
              <button
                onClick={() => setActiveStudio('pipeline')}
                id="tab-pipeline"
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                  activeStudio === 'pipeline'
                    ? 'bg-gradient-to-r from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/25 border border-cyan-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Sparkles className="w-4 h-4 text-cyan-300" />
                <span>Document Pipeline & Humanizer</span>
              </button>

              <button
                onClick={() => setActiveStudio('workspace')}
                id="tab-workspace"
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                  activeStudio === 'workspace'
                    ? 'bg-gradient-to-r from-purple-500 to-pink-600 text-white shadow-lg shadow-purple-500/25 border border-purple-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Bot className="w-4 h-4 text-purple-300" />
                <span>AI Workspace Agent</span>
              </button>

              <button
                onClick={() => setActiveStudio('specialists')}
                id="tab-specialists"
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                  activeStudio === 'specialists'
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-lg shadow-emerald-500/25 border border-emerald-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Zap className="w-4 h-4 text-emerald-300" />
                <span>Specialist Agent Trio</span>
              </button>

              <button
                onClick={() => setActiveStudio('file_forge')}
                id="tab-file-forge"
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                  activeStudio === 'file_forge'
                    ? 'bg-gradient-to-r from-violet-600 via-indigo-600 to-cyan-500 text-white shadow-lg shadow-indigo-500/25 border border-indigo-400/40 ring-1 ring-cyan-400/50'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <Layers className="w-4 h-4 text-cyan-300 animate-pulse" />
                <span className="flex items-center gap-1.5">
                  Universal File Forge
                  <span className="px-1.5 py-0.5 text-[10px] bg-cyan-500/20 text-cyan-300 rounded font-semibold border border-cyan-500/30">Any Format</span>
                </span>
              </button>

              <button
                onClick={() => setActiveStudio('intelligent')}
                id="tab-intelligent"
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                  activeStudio === 'intelligent'
                    ? 'bg-gradient-to-r from-pink-500 to-rose-600 text-white shadow-lg shadow-pink-500/25 border border-pink-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <ListTodo className="w-4 h-4 text-pink-300" />
                <span>Intelligent Verification</span>
              </button>

              <button
                onClick={() => setActiveStudio('legal')}
                id="tab-legal"
                className={`px-4 sm:px-5 py-2.5 rounded-xl text-xs sm:text-sm font-bold flex items-center gap-2 transition-all duration-200 ${
                  activeStudio === 'legal'
                    ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25 border border-blue-400/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
                }`}
              >
                <FileText className="w-4 h-4 text-blue-300" />
                <span>Legal & Documentation</span>
              </button>
            </div>
          </div>

          {/* STUDIO VIEW CONTAINER */}
          <div className="transition-all duration-300">
            {/* 1. DOCUMENT PIPELINE STUDIO */}
            {activeStudio === 'pipeline' && (
              <div className="space-y-8">
                {!activeDocument ? (
                  /* Upload Zone */
                  <div className="max-w-4xl mx-auto space-y-6">
                    <FileUploadZone onUploadSuccess={handleUploadSuccess} />
                  </div>
                ) : !pipelineFinished ? (
                  /* Active Live Processing Pipeline */
                  <div className="max-w-4xl mx-auto space-y-4">
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span className="flex items-center gap-2">
                        <FileText className="w-4 h-4 text-cyan-400" />
                        Active File: <strong className="text-white font-display text-sm">{activeDocument.originalName}</strong>
                      </span>
                      <button
                        onClick={handleResetToUpload}
                        className="text-slate-400 hover:text-white flex items-center gap-1 underline underline-offset-4"
                      >
                        Upload a different document
                      </button>
                    </div>

                    <ProcessingTimeline
                      documentId={activeDocument.id}
                      onFinished={handlePipelineFinished}
                    />
                  </div>
                ) : activeDocument.status === 'FAILED' ? (
                  /* Failed Document Diagnostics Stage */
                  <div className="space-y-8 animate-in fade-in duration-300">
                    <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 border-l-4 border-l-rose-500 shadow-xl shadow-rose-950/40">
                      <div className="space-y-1.5 max-w-2xl">
                        <div className="flex items-center gap-2.5">
                          <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0" />
                          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                            Document Processing Halted: {activeDocument.originalName}
                          </h2>
                        </div>
                        <p className="text-xs text-rose-200/90 font-mono mt-1">
                          {activeDocument.errorMessage || 'Text extraction or pipeline parsing encountered an error.'}
                        </p>
                      </div>

                      <div className="flex items-center gap-3">
                        <button
                          onClick={handleResetToUpload}
                          className="px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-colors"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Upload New File
                        </button>
                        <button
                          onClick={() => handleRetryDocument(activeDocument.id)}
                          className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 text-xs font-semibold border border-amber-500/30 flex items-center gap-1.5 transition-colors"
                        >
                          <RefreshCw className="w-3.5 h-3.5" />
                          Retry Processing
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  /* Completed Pipeline Results with Cross-Module Unified Actions */
                  <div className="space-y-8 animate-in fade-in duration-300">
                    {/* Top Result Banner */}
                    <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-5 border-l-4 border-l-emerald-400">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <CheckCircle2 className="w-6 h-6 text-emerald-400" />
                          <h2 className="font-display text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                            Document Successfully Humanized & Fact-Preserved
                          </h2>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">
                          File: <strong className="text-white font-mono">{activeDocument.originalName}</strong> •
                          All citations, numbers, and headings frozen verbatim.
                        </p>
                      </div>

                      {/* Unified Cross-System Actions */}
                      <div className="flex flex-wrap items-center gap-2.5">
                        <button
                          onClick={() => handleBridgeToWorkspace(activeDocument)}
                          className="px-4 py-2.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-200 border border-purple-500/40 text-xs font-bold flex items-center gap-2 transition-all shadow-md shadow-purple-500/10"
                          title="Open this document with the Autonomous AI Agent in Workspace"
                        >
                          <Bot className="w-4 h-4 text-purple-400" />
                          <span>Chat in Workspace</span>
                        </button>

                        <button
                          onClick={() => handleBridgeToLegal(activeDocument)}
                          className="px-4 py-2.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-200 border border-blue-500/40 text-xs font-bold flex items-center gap-2 transition-all"
                          title="Draft or audit as formal legal agreement in Documentation Studio"
                        >
                          <FileText className="w-4 h-4 text-blue-400" />
                          <span>Legal Studio</span>
                        </button>

                        <a
                          href={`/api/documents/${activeDocument.id}/download?type=final`}
                          id="btn-hero-download-final"
                          download={`HumanFlow_Final_${activeDocument.originalName}`}
                          onClick={(e) => handleDownloadFinal(e, activeDocument.id, activeDocument.originalName)}
                          className="glow-btn px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xl cursor-pointer"
                        >
                          {isDownloading ? (
                            <Loader2 className="w-4 h-4 animate-spin text-cyan-300" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                          <span>{isDownloading ? 'Downloading...' : 'Download Final'}</span>
                        </a>

                        <button
                          onClick={handleResetToUpload}
                          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/10 transition-colors"
                          title="Upload new file"
                        >
                          <RotateCcw className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Side-by-Side Diff Engine View */}
                    {diffData?.diff && (
                      <DiffViewer
                        diff={diffData.diff}
                        originalText={diffData.originalText}
                        humanizedText={diffData.humanizedText}
                        versionLabel={diffData.versionLabel}
                      />
                    )}

                    {/* Version History */}
                    {versions.length > 0 && (
                      <VersionHistory
                        documentId={activeDocument.id}
                        versions={versions}
                        onSelectVersion={async (verId) => {
                          const diffRes = await fetch(
                            `/api/documents/${activeDocument.id}/diff?versionId=${verId}`
                          );
                          const diffJson = await diffRes.json();
                          setDiffData(diffJson);
                        }}
                      />
                    )}
                  </div>
                )}
              </div>
            )}

            {/* 2. AI WORKSPACE AGENT HUB */}
            {activeStudio === 'workspace' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                {/* Workspace Launcher Banner */}
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-purple-500/30 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-purple-500 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-500/25">
                        <Bot className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-extrabold text-white">
                          Universal Autonomous Agent
                        </h2>
                        <p className="text-xs text-slate-400">
                          Claude 3.5 & GPT-4o powered autonomous task execution, dynamic checklists & deliverables
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/workspace"
                      className="glow-btn px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2"
                    >
                      <span>Open Full Studio</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  {/* Fast Prompt Launcher */}
                  <form onSubmit={handleLaunchQuickTask} className="relative">
                    <input
                      type="text"
                      value={quickPrompt}
                      onChange={(e) => setQuickPrompt(e.target.value)}
                      placeholder="e.g. Audit my agreement, formulate an action plan, and verify all citations..."
                      className="w-full bg-[#080d1e] border border-white/10 rounded-2xl px-4 py-3.5 pr-28 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400 transition-colors"
                    />
                    <button
                      type="submit"
                      disabled={!quickPrompt.trim()}
                      className="absolute right-2 top-2 bottom-2 px-4 rounded-xl bg-purple-500 hover:bg-purple-600 disabled:opacity-40 text-white text-xs font-bold flex items-center gap-1.5 transition-all"
                    >
                      <span>Start Task</span>
                      <Send className="w-3.5 h-3.5" />
                    </button>
                  </form>

                  {/* Recent Conversations List */}
                  {recentConversations.length > 0 && (
                    <div className="space-y-2 pt-2">
                      <div className="text-[11px] font-mono uppercase text-slate-400 font-bold">
                        Active Workspace Tasks
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                        {recentConversations.slice(0, 4).map((c) => (
                          <Link
                            key={c.id}
                            href={`/workspace?id=${c.id}`}
                            className="p-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.07] border border-white/5 hover:border-purple-500/30 transition-all flex items-center justify-between group"
                          >
                            <div className="truncate mr-2">
                              <div className="font-semibold text-xs text-white group-hover:text-purple-300 truncate">
                                {c.title}
                              </div>
                              <div className="text-[10px] text-slate-400">
                                {c.messages?.length || 0} messages • {new Date(c.updatedAt).toLocaleDateString()}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 shrink-0" />
                          </Link>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* 3. SPECIALIST AGENT TRIO HUB */}
            {activeStudio === 'specialists' && (
              <CentralDashboard onSwitchToDocumentPipeline={() => setActiveStudio('pipeline')} />
            )}

            {/* UNIVERSAL FILE FORGE (ANY FILE GENERATION ENGINE) */}
            {activeStudio === 'file_forge' && (
              <UniversalFileStudio />
            )}

            {/* 4. INTELLIGENT VERIFICATION HUB */}
            {activeStudio === 'intelligent' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-pink-500/30 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-pink-500 to-rose-500 flex items-center justify-center text-white shadow-lg shadow-pink-500/25">
                        <ListTodo className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-extrabold text-white">
                          Intelligent Multimodal Intake & Verification
                        </h2>
                        <p className="text-xs text-slate-400">
                          6-stage structured intake, dynamic checklist enforcement, and independent verification scorecards
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/intelligent"
                      className="glow-btn px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2"
                    >
                      <span>Open Intelligent Studio</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-pink-500/20 text-pink-300 flex items-center justify-center">
                        <CheckSquare className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-xs text-white">Dynamic Checklists</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Evaluates required scope items, flags gaps, and tracks step completion in real time.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-purple-500/20 text-purple-300 flex items-center justify-center">
                        <Sparkles className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-xs text-white">Targeted Questions</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Formulates focused clarification pills or executes protocol with available data.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-300 flex items-center justify-center">
                        <ShieldCheck className="w-4 h-4" />
                      </div>
                      <h4 className="font-bold text-xs text-white">Verification Scorecards</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Independent quality audit score, entity validation, and pass/fail certificates.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* 5. LEGAL & DOCUMENTATION STUDIO HUB */}
            {activeStudio === 'legal' && (
              <div className="space-y-6 max-w-4xl mx-auto">
                <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-blue-500/30 shadow-2xl space-y-6">
                  <div className="flex items-center justify-between flex-wrap gap-4">
                    <div className="flex items-center gap-3">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-500 to-indigo-500 flex items-center justify-center text-white shadow-lg shadow-blue-500/25">
                        <FileText className="w-6 h-6" />
                      </div>
                      <div>
                        <h2 className="text-xl font-display font-extrabold text-white">
                          Legal & Enterprise Documentation Studio
                        </h2>
                        <p className="text-xs text-slate-400">
                          Pre-built contract templates, regulatory compliance knowledge base, and multi-format compilation
                        </p>
                      </div>
                    </div>

                    <Link
                      href="/documentation"
                      className="glow-btn px-5 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2"
                    >
                      <span>Open Documentation Studio</span>
                      <ArrowRight className="w-4 h-4" />
                    </Link>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                      <div className="text-xs font-bold text-blue-300 font-mono">AGREEMENTS</div>
                      <h4 className="font-bold text-xs text-white">Pre-Built Templates</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Software development agreements, NDAs, MSA contracts, and consulting agreements.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                      <div className="text-xs font-bold text-indigo-300 font-mono">REGULATORY</div>
                      <h4 className="font-bold text-xs text-white">Knowledge Base</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Jurisdiction-specific rules, liability clauses, indemnification, and IP assignment.
                      </p>
                    </div>

                    <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/5 space-y-2">
                      <div className="text-xs font-bold text-cyan-300 font-mono">COMPLIANCE</div>
                      <h4 className="font-bold text-xs text-white">Audit & Export</h4>
                      <p className="text-[11px] text-slate-400 leading-relaxed">
                        Automated compliance checks, citation sources, and native Word / PDF generation.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </section>

        {/* UNIVERSAL PLATFORM VAULT & ASSET REPOSITORY */}
        <section className="glass-panel rounded-3xl p-6 sm:p-8 space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-white/10">
            <div className="space-y-1">
              <div className="flex items-center gap-2.5">
                <Clock className="w-5 h-5 text-cyan-400" />
                <h3 className="font-display text-lg font-bold text-white tracking-tight">
                  Universal Project & Document Vault
                </h3>
              </div>
              <p className="text-xs text-slate-400">
                Centralized registry of all documents, agent conversations, and generated assets across the platform
              </p>
            </div>

            {/* Search & Filter Controls */}
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
                <input
                  type="text"
                  placeholder="Filter vault..."
                  value={vaultSearch}
                  onChange={(e) => setVaultSearch(e.target.value)}
                  className="bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
                />
              </div>

              <div className="flex items-center bg-white/5 p-1 rounded-xl border border-white/10 text-xs">
                <button
                  onClick={() => setVaultFilter('all')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    vaultFilter === 'all' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({filteredPipelineDocs.length + filteredConversations.length})
                </button>
                <button
                  onClick={() => setVaultFilter('pipeline')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    vaultFilter === 'pipeline' ? 'bg-cyan-500/20 text-cyan-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pipeline ({filteredPipelineDocs.length})
                </button>
                <button
                  onClick={() => setVaultFilter('workspace')}
                  className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors ${
                    vaultFilter === 'workspace' ? 'bg-purple-500/20 text-purple-300' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Workspace ({filteredConversations.length})
                </button>
              </div>
            </div>
          </div>

          {/* Vault Items Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Pipeline Document Cards */}
            {(vaultFilter === 'all' || vaultFilter === 'pipeline') &&
              filteredPipelineDocs.map((doc) => {
                const isCurrent = activeDocument?.id === doc.id;
                return (
                  <div
                    key={doc.id}
                    onClick={() => handleSelectRecent(doc)}
                    className={`p-5 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between group ${
                      isCurrent
                        ? 'bg-cyan-950/40 border-cyan-400/60 shadow-xl shadow-cyan-500/15 scale-[1.01]'
                        : 'bg-slate-900/50 border-white/[0.07] hover:border-cyan-500/30 hover:bg-slate-900/80 hover:-translate-y-0.5'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono text-[10px] uppercase font-bold text-cyan-300 px-2.5 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30">
                            {doc.fileType}
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                            Pipeline
                          </span>
                        </div>

                        <div className="flex items-center gap-1.5">
                          <span
                            className={`text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full border ${
                              doc.status === 'COMPLETED'
                                ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                                : doc.status === 'FAILED'
                                ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                                : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                            }`}
                          >
                            {doc.status}
                          </span>
                          <button
                            onClick={(e) => handleDeleteDocument(e, doc.id)}
                            title="Delete document record"
                            className="p-1 rounded-md text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <h4
                        className="font-display font-semibold text-base text-white truncate max-w-full group-hover:text-cyan-200 transition-colors"
                        title={doc.originalName}
                      >
                        {doc.originalName}
                      </h4>
                      <p className="text-[11px] text-slate-400 mt-1">
                        {(doc.fileSize / 1024).toFixed(1)} KB • {new Date(doc.createdAt).toLocaleDateString()}
                      </p>
                    </div>

                    <div className="mt-5 pt-3.5 border-t border-white/[0.07] flex items-center justify-between text-xs">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBridgeToWorkspace(doc);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-purple-500/15 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Open in AI Workspace"
                        >
                          <Bot className="w-3 h-3" />
                          <span>Chat</span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleBridgeToLegal(doc);
                          }}
                          className="px-2.5 py-1 rounded-lg bg-blue-500/15 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors"
                          title="Import into Legal Studio"
                        >
                          <FileText className="w-3 h-3" />
                          <span>Legal</span>
                        </button>
                      </div>

                      <span className="text-cyan-400 text-xs flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
                        Inspect Diff <ArrowRight className="w-3.5 h-3.5" />
                      </span>
                    </div>
                  </div>
                );
              })}

            {/* Workspace Conversation Cards */}
            {(vaultFilter === 'all' || vaultFilter === 'workspace') &&
              filteredConversations.map((c) => (
                <Link
                  key={c.id}
                  href={`/workspace?id=${c.id}`}
                  className="p-5 rounded-2xl border bg-slate-900/50 border-white/[0.07] hover:border-purple-500/40 hover:bg-slate-900/80 hover:-translate-y-0.5 transition-all flex flex-col justify-between group"
                >
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center gap-1.5">
                        <span className="font-mono text-[10px] uppercase font-bold text-purple-300 px-2.5 py-0.5 rounded-full bg-purple-500/15 border border-purple-500/30">
                          TASK
                        </span>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 text-slate-300">
                          Workspace
                        </span>
                      </div>
                      <span className="text-[10px] font-mono uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        ACTIVE
                      </span>
                    </div>

                    <h4
                      className="font-display font-semibold text-base text-white truncate max-w-full group-hover:text-purple-200 transition-colors"
                      title={c.title}
                    >
                      {c.title}
                    </h4>
                    <p className="text-[11px] text-slate-400 mt-1">
                      {c.messages?.length || 0} messages • Updated {new Date(c.updatedAt).toLocaleDateString()}
                    </p>
                  </div>

                  <div className="mt-5 pt-3.5 border-t border-white/[0.07] flex items-center justify-between text-xs">
                    <span className="text-[11px] font-mono text-slate-400">
                      Autonomous Plan Ready
                    </span>
                    <span className="text-purple-400 text-xs flex items-center gap-1 font-semibold group-hover:translate-x-0.5 transition-transform">
                      Resume Task <ArrowRight className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </Link>
              ))}
          </div>
        </section>
      </main>

      {/* Floating Animated Chatbot */}
      <AnimatedChatbot activeDocumentId={activeDocument?.id} />

      {/* Footer */}
      <footer className="glass-panel border-t border-white/5 py-7 mt-16 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="font-display font-semibold text-slate-300 text-sm">
              HumanFlow <span className="text-cyan-400 font-mono font-bold">Enterprise OS</span>
            </span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-400 text-xs">
              Unified Autonomous Document Engine & Agent Platform
            </span>
          </div>
          <span className="font-mono text-[11px] text-slate-400">
            Fact Preservation Locked • Zero-Overwrite Isolated Storage • Real-Time Quality Control
          </span>
        </div>
      </footer>
    </div>
  );
}
