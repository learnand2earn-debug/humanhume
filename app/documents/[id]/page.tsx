'use client';

import React, { useEffect, useState, use } from 'react';
import Navbar from '@/components/Navbar';
import ProcessingTimeline from '@/components/ProcessingTimeline';
import DiffViewer from '@/components/DiffViewer';
import VersionHistory from '@/components/VersionHistory';
import AnimatedChatbot from '@/components/AnimatedChatbot';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  ArrowLeft,
  CheckCircle2,
  Download,
  FileText,
  Loader2,
  RotateCcw,
  AlertTriangle,
  Trash2,
  RefreshCw,
} from 'lucide-react';
import { DocumentDiff, DocumentRecord, DocumentVersion } from '@/lib/types';

export default function DocumentDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const router = useRouter();

  const [document, setDocument] = useState<DocumentRecord | null>(null);
  const [diffData, setDiffData] = useState<{
    diff: DocumentDiff | null;
    originalText: string;
    humanizedText: string;
    versionLabel: string;
  } | null>(null);
  const [versions, setVersions] = useState<DocumentVersion[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRetrying, setIsRetrying] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const loadData = async () => {
    try {
      const [docRes, diffRes, verRes] = await Promise.all([
        fetch(`/api/documents/${id}`).then((r) => r.json()),
        fetch(`/api/documents/${id}/diff`).then((r) => r.json()),
        fetch(`/api/documents/${id}/versions`).then((r) => r.json()),
      ]);

      setDocument(docRes.document);
      setDiffData(diffRes);
      setVersions(verRes.versions || []);
    } catch (err) {
      console.error('Failed to load document details:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [id]);

  const handleRetry = async () => {
    try {
      setIsRetrying(true);
      const res = await fetch(`/api/documents/${id}/retry`, { method: 'POST' });
      if (res.ok) {
        await loadData();
      }
    } catch (err) {
      console.error('Failed to retry document:', err);
    } finally {
      setIsRetrying(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Are you sure you want to permanently delete "${document?.originalName}"?`)) {
      return;
    }
    try {
      setIsDeleting(true);
      const res = await fetch(`/api/documents/${id}`, { method: 'DELETE' });
      if (res.ok) {
        router.push('/');
      }
    } catch (err) {
      console.error('Failed to delete document:', err);
      setIsDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex items-center justify-center gap-3">
          <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
          <span className="text-slate-400 text-sm">Loading document record...</span>
        </div>
      </div>
    );
  }

  if (!document) {
    return (
      <div className="min-h-screen bg-slate-950 text-white flex flex-col">
        <Navbar />
        <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
          <FileText className="w-12 h-12 text-slate-600 mb-3" />
          <h2 className="text-xl font-bold text-white">Document Not Found</h2>
          <p className="text-slate-400 text-sm mt-1 mb-6">
            The requested document ID was not found in storage.
          </p>
          <Link
            href="/"
            className="px-4 py-2 rounded-xl bg-indigo-600 text-white text-xs font-semibold"
          >
            Return to Upload
          </Link>
        </div>
      </div>
    );
  }

  const isCompleted = document.status === 'COMPLETED' || document.status === 'NEEDS_REVIEW';
  const isFailed = document.status === 'FAILED';

  return (
    <div className="min-h-screen flex flex-col bg-slate-950 text-slate-100">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full space-y-6">
        {/* Back navigation */}
        <div className="flex items-center justify-between">
          <Link
            href="/"
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Upload & Queue
          </Link>

          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-500 font-mono">Trace ID:</span>
            <span className="text-xs text-cyan-400 font-mono font-semibold bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-500/20">
              {document.traceId}
            </span>
          </div>
        </div>

        {/* Top Header Card */}
        <div className="glass-panel rounded-2xl p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="px-2 py-0.5 rounded font-mono text-[10px] uppercase font-bold text-cyan-400 bg-cyan-500/10 border border-cyan-500/20">
                {document.fileType}
              </span>
              <h1 className="text-xl font-bold text-white tracking-tight truncate max-w-lg">
                {document.originalName}
              </h1>
              <span
                className={`px-2 py-0.5 rounded text-[10px] font-mono uppercase font-bold ${
                  isCompleted
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                    : isFailed
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    : 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                }`}
              >
                {document.status}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Uploaded: {new Date(document.createdAt).toLocaleString()} • Size:{' '}
              {(document.fileSize / 1024).toFixed(1)} KB ({document.fileSize} bytes)
            </p>
          </div>

          <div className="flex items-center gap-3">
            {isCompleted && (
              <a
                href={`/api/documents/${document.id}/download?type=final`}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white text-xs font-bold shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
              >
                <Download className="w-4 h-4" />
                Download Final Document
              </a>
            )}

            {isFailed && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={handleRetry}
                  disabled={isRetrying}
                  className="px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRetrying ? 'animate-spin' : ''}`} />
                  Retry Processing
                </button>
                <button
                  onClick={handleDelete}
                  disabled={isDeleting}
                  className="px-3.5 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 text-xs font-semibold border border-rose-500/30 flex items-center gap-1.5 transition-colors disabled:opacity-50"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete Record
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Failed Document View */}
        {isFailed ? (
          <div className="space-y-6">
            <div className="glass-panel-glow rounded-3xl p-6 sm:p-8 border-l-4 border-l-rose-500 space-y-4">
              <div className="flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h2 className="font-display text-xl font-bold text-white tracking-tight">
                    Document Processing Halted
                  </h2>
                  <p className="text-xs text-rose-300 font-mono mt-1">
                    {document.errorMessage || 'Text extraction or pipeline parsing failed.'}
                  </p>
                </div>
              </div>

              {document.fileSize === 0 && (
                <div className="p-4 rounded-xl bg-slate-950/80 border border-white/10 text-xs text-slate-300 space-y-2">
                  <div className="font-semibold text-amber-300">
                    Why did this fail?
                  </div>
                  <p className="leading-relaxed">
                    This file was saved with a file size of <strong>0.0 KB (0 bytes)</strong>.
                    Because the file contains no readable textual content or sentences, HumanFlow AI’s text extraction engine cannot detect entities, protect citations, or generate humanized phrasing.
                  </p>
                </div>
              )}
            </div>

            <ProcessingTimeline documentId={document.id} />
          </div>
        ) : !isCompleted ? (
          <ProcessingTimeline documentId={document.id} onFinished={loadData} />
        ) : (
          <div className="space-y-6">
            {diffData?.diff && (
              <DiffViewer
                diff={diffData.diff}
                originalText={diffData.originalText}
                humanizedText={diffData.humanizedText}
                versionLabel={diffData.versionLabel}
              />
            )}

            {versions.length > 0 && (
              <VersionHistory
                documentId={document.id}
                versions={versions}
                onSelectVersion={async (verId) => {
                  const diffRes = await fetch(
                    `/api/documents/${document.id}/diff?versionId=${verId}`
                  );
                  const diffJson = await diffRes.json();
                  setDiffData(diffJson);
                }}
              />
            )}
          </div>
        )}
      </main>

      <AnimatedChatbot activeDocumentId={document.id} />
    </div>
  );
}
