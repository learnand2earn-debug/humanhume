'use client';

import React, {useCallback, useEffect, useRef, useState} from 'react';
import {
  AlertCircle,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Download,
  FileText,
  Image as ImageIcon,
  Loader2,
  RefreshCw,
  Shield,
  Sparkles,
  Upload,
  X,
  Zap,
} from 'lucide-react';

// ─── Types ─────────────────────────────────────────────────────────────────

interface PageResult {
  pageNumber: number;
  pageIndex?: number;
  status: 'PENDING' | 'EXTRACTED' | 'HUMANIZED' | 'FAILED' | 'SKIPPED';
  imageCount: number;
  errorReason?: string;
  retryCount: number;
  durationMs: number;
}

interface PdfJob {
  jobId: string;
  traceId: string;
  originalFileName: string;
  status: 'PENDING' | 'EXTRACTING' | 'HUMANIZING' | 'REBUILDING' | 'VALIDATING' | 'COMPLETED' | 'FAILED';
  totalPages: number;
  processedPages: number;
  failedPages: number[];
  progressPercent: number;
  errorMessage?: string;
  startedAt?: string;
  completedAt?: string;
  downloadUrl?: string;
  pageResults: PageResult[];
}

// ─── Status helpers ─────────────────────────────────────────────────────────

const STATUS_LABELS: Record<PdfJob['status'], string> = {
  PENDING: 'Queued',
  EXTRACTING: 'Extracting Text & Images',
  HUMANIZING: 'Humanizing Pages',
  REBUILDING: 'Rebuilding PDF',
  VALIDATING: 'Validating Output',
  COMPLETED: 'Completed',
  FAILED: 'Failed',
};

const PAGE_STATUS_COLOR: Record<PageResult['status'], string> = {
  PENDING: 'bg-slate-400',
  EXTRACTED: 'bg-blue-400',
  HUMANIZED: 'bg-emerald-500',
  FAILED: 'bg-red-500',
  SKIPPED: 'bg-slate-500',
};

// ─── Component ──────────────────────────────────────────────────────────────

export default function PdfHumanizerPanel() {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [job, setJob] = useState<PdfJob | null>(null);
  const [intensity, setIntensity] = useState<'LOW' | 'NORMAL'>('NORMAL');
  const [showPageDetails, setShowPageDetails] = useState(false);
  const [uploadedFile, setUploadedFile] = useState<{name: string; sizeMb: string} | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);

  // ── Polling ────────────────────────────────────────────────────────────
  const stopPolling = useCallback(() => {
    if (pollIntervalRef.current) {
      clearInterval(pollIntervalRef.current);
      pollIntervalRef.current = null;
    }
  }, []);

  const pollJobStatus = useCallback(
    async (jobId: string) => {
      try {
        const res = await fetch(`/api/documents/pdf-humanize/${jobId}`, {
          cache: 'no-store',
        });
        if (!res.ok) {
          stopPolling();
          return;
        }
        const data: PdfJob = await res.json();
        setJob(data);

        if (data.status === 'COMPLETED' || data.status === 'FAILED') {
          stopPolling();
        }
      } catch {
        // Network blip — keep polling
      }
    },
    [stopPolling]
  );

  const startPolling = useCallback(
    (jobId: string) => {
      stopPolling();
      pollJobStatus(jobId);
      pollIntervalRef.current = setInterval(() => pollJobStatus(jobId), 2500);
    },
    [pollJobStatus, stopPolling]
  );

  useEffect(() => () => stopPolling(), [stopPolling]);

  // ── Upload & Submit ────────────────────────────────────────────────────
  const uploadPdf = useCallback(
    async (file: File) => {
      setUploadError(null);
      setJob(null);

      // Client-side validation
      const ext = file.name.split('.').pop()?.toLowerCase();
      if (ext !== 'pdf') {
        setUploadError(
          `Only PDF files are accepted by the PDF Humanizer. Received: .${ext || 'unknown'}.\nFor DOCX, TXT, MD, RTF, and XLSX use the standard Upload tab above.`
        );
        return;
      }
      if (file.size > 50 * 1024 * 1024) {
        setUploadError('PDF exceeds the 50 MB limit. Please split large documents first.');
        return;
      }
      if (file.size < 50) {
        setUploadError('This file appears to be empty or corrupted.');
        return;
      }

      setUploadedFile({
        name: file.name,
        sizeMb: (file.size / (1024 * 1024)).toFixed(2),
      });
      setIsUploading(true);

      try {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('intensity', intensity);
        // Use sync mode for files < 800KB for instant results
        if (file.size < 800 * 1024) {
          formData.append('sync', 'true');
        }

        const res = await fetch('/api/documents/pdf-humanize', {
          method: 'POST',
          body: formData,
        });

        const data = await res.json();

        if (!res.ok) {
          setUploadError(data.error || 'Upload failed. Please try again.');
          setIsUploading(false);
          return;
        }

        setJob(data);
        setIsUploading(false);

        // If sync and completed, no polling needed
        if (data.status !== 'COMPLETED' && data.status !== 'FAILED') {
          startPolling(data.jobId);
        }
      } catch (err) {
        setUploadError(
          err instanceof Error ? err.message : 'Network error during upload. Please try again.'
        );
        setIsUploading(false);
      }
    },
    [intensity, startPolling]
  );

  // ── Drag & Drop ────────────────────────────────────────────────────────
  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadPdf(file);
    },
    [uploadPdf]
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (!dropZoneRef.current?.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleFileInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadPdf(file);
      e.target.value = '';
    },
    [uploadPdf]
  );

  // ── Download ───────────────────────────────────────────────────────────
  const triggerDownload = useCallback(() => {
    if (!job?.downloadUrl && !job?.jobId) return;
    const url = job.downloadUrl || `/api/documents/pdf-humanize/${job.jobId}/download`;
    const a = document.createElement('a');
    a.href = url;
    a.download = `Humanized_${job.originalFileName || 'document.pdf'}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [job]);

  // ── Reset ──────────────────────────────────────────────────────────────
  const reset = useCallback(() => {
    stopPolling();
    setJob(null);
    setUploadError(null);
    setUploadedFile(null);
    setIsUploading(false);
    setShowPageDetails(false);
  }, [stopPolling]);

  // ─── Derived state ────────────────────────────────────────────────────
  const isActive = isUploading || (job && !['COMPLETED', 'FAILED'].includes(job.status));
  const isCompleted = job?.status === 'COMPLETED';
  const isFailed = job?.status === 'FAILED';
  const totalImages = job?.pageResults.reduce((sum, p) => sum + (p.imageCount || 0), 0) ?? 0;
  const failedPageNums = job?.failedPages ?? [];

  // ─── Progress bar color ───────────────────────────────────────────────
  const progressColor = isFailed
    ? 'bg-red-500'
    : isCompleted
    ? 'bg-emerald-500'
    : 'bg-violet-500';

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
            <Sparkles size={20} className="text-violet-400" />
            PDF Document Humanizer
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Upload any PDF — text humanized across every page while all images, figures, and
            layouts are fully preserved.
          </p>
        </div>

        {/* Intensity selector */}
        {!isActive && !isCompleted && (
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-xs text-slate-400 font-medium">Intensity:</span>
            {(['NORMAL', 'LOW'] as const).map((lvl) => (
              <button
                key={lvl}
                onClick={() => setIntensity(lvl)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                  intensity === lvl
                    ? 'bg-violet-600 text-white shadow-lg shadow-violet-900/40'
                    : 'bg-slate-700/60 text-slate-400 hover:bg-slate-700'
                }`}
              >
                {lvl === 'NORMAL' ? '⚡ Normal' : '🔒 Conservative'}
              </button>
            ))}
          </div>
        )}

        {/* Reset button */}
        {(job || uploadError) && !isActive && (
          <button
            onClick={reset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-700/70 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-all"
          >
            <RefreshCw size={13} />
            New PDF
          </button>
        )}
      </div>

      {/* ── Drop Zone ─────────────────────────────────────────────────── */}
      {!job && !isUploading && (
        <div
          ref={dropZoneRef}
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onClick={() => fileInputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-4 border-2 border-dashed rounded-2xl p-10 cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-violet-500 bg-violet-950/30 scale-[1.01]'
              : 'border-slate-600 bg-slate-800/30 hover:border-violet-500/60 hover:bg-violet-950/10'
          }`}
        >
          <div
            className={`w-16 h-16 rounded-2xl flex items-center justify-center transition-all ${
              isDragging ? 'bg-violet-600/30 scale-110' : 'bg-slate-700/60'
            }`}
          >
            <Upload
              size={28}
              className={isDragging ? 'text-violet-400' : 'text-slate-400'}
            />
          </div>

          <div className="text-center">
            <p className="font-semibold text-slate-200 text-base">
              {isDragging ? 'Drop your PDF here' : 'Drag & Drop PDF here'}
            </p>
            <p className="text-slate-400 text-sm mt-1">
              or{' '}
              <span className="text-violet-400 font-medium underline-offset-2 hover:underline">
                click to browse
              </span>
            </p>
            <p className="text-slate-500 text-xs mt-2">
              PDF only · Max 50 MB · Images fully preserved
            </p>
          </div>

          {/* Feature badges */}
          <div className="flex flex-wrap justify-center gap-2 mt-1">
            {[
              {icon: <Shield size={11} />, label: 'Images Preserved'},
              {icon: <Sparkles size={11} />, label: 'Every Page Humanized'},
              {icon: <Zap size={11} />, label: 'Protected Entities Locked'},
            ].map((badge) => (
              <span
                key={badge.label}
                className="flex items-center gap-1 px-2 py-0.5 bg-slate-700/70 rounded-full text-slate-400 text-xs"
              >
                {badge.icon}
                {badge.label}
              </span>
            ))}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept=".pdf,application/pdf"
            className="hidden"
            onChange={handleFileInputChange}
            id="pdf-humanizer-file-input"
          />
        </div>
      )}

      {/* ── Upload Error ───────────────────────────────────────────────── */}
      {uploadError && (
        <div className="flex items-start gap-3 p-4 bg-red-950/40 border border-red-800/60 rounded-xl">
          <AlertCircle size={18} className="text-red-400 shrink-0 mt-0.5" />
          <div className="flex-1">
            <p className="text-sm font-semibold text-red-300">Upload Error</p>
            <p className="text-sm text-red-400/90 whitespace-pre-wrap mt-0.5">{uploadError}</p>
          </div>
          <button
            onClick={() => setUploadError(null)}
            className="text-red-500 hover:text-red-300 shrink-0"
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* ── Uploading / Processing indicator ─────────────────────────── */}
      {isUploading && (
        <div className="flex flex-col gap-3 p-5 bg-slate-800/50 border border-slate-700/60 rounded-2xl">
          <div className="flex items-center gap-3">
            <Loader2 size={18} className="text-violet-400 animate-spin" />
            <span className="text-sm font-medium text-slate-200">
              Uploading{uploadedFile ? ` "${uploadedFile.name}"` : ' PDF'}
              {uploadedFile && (
                <span className="text-slate-400 font-normal ml-1">
                  ({uploadedFile.sizeMb} MB)
                </span>
              )}
            </span>
          </div>
          <div className="h-1.5 bg-slate-700 rounded-full overflow-hidden">
            <div className="h-full bg-violet-500 rounded-full animate-pulse w-2/5" />
          </div>
        </div>
      )}

      {/* ── Job Status Panel ───────────────────────────────────────────── */}
      {job && (
        <div className="flex flex-col gap-4 p-5 bg-slate-800/50 border border-slate-700/60 rounded-2xl">
          {/* Header row */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2.5 min-w-0">
              <div
                className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${
                  isCompleted
                    ? 'bg-emerald-500/20'
                    : isFailed
                    ? 'bg-red-500/20'
                    : 'bg-violet-500/20'
                }`}
              >
                {isCompleted ? (
                  <CheckCircle2 size={18} className="text-emerald-400" />
                ) : isFailed ? (
                  <AlertCircle size={18} className="text-red-400" />
                ) : (
                  <Loader2 size={18} className="text-violet-400 animate-spin" />
                )}
              </div>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-100 truncate max-w-xs">
                  {job.originalFileName}
                </p>
                <p
                  className={`text-xs mt-0.5 ${
                    isCompleted
                      ? 'text-emerald-400'
                      : isFailed
                      ? 'text-red-400'
                      : 'text-violet-400'
                  }`}
                >
                  {STATUS_LABELS[job.status]}
                </p>
              </div>
            </div>

            {/* Download button */}
            {isCompleted && (
              <button
                onClick={triggerDownload}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold shadow-lg shadow-emerald-900/40 transition-all hover:scale-[1.02] active:scale-[0.98]"
              >
                <Download size={15} />
                Download Humanized PDF
              </button>
            )}
          </div>

          {/* Progress bar */}
          <div className="flex flex-col gap-1.5">
            <div className="flex justify-between items-center">
              <span className="text-xs text-slate-400">
                {job.processedPages} / {job.totalPages || '?'} pages
                {failedPageNums.length > 0 && (
                  <span className="text-red-400 ml-2">
                    · {failedPageNums.length} page(s) failed
                  </span>
                )}
              </span>
              <span
                className={`text-xs font-bold ${
                  isCompleted ? 'text-emerald-400' : isFailed ? 'text-red-400' : 'text-violet-400'
                }`}
              >
                {job.progressPercent}%
              </span>
            </div>
            <div className="h-2 bg-slate-700 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full transition-all duration-700 ease-out ${progressColor}`}
                style={{width: `${Math.max(4, job.progressPercent)}%`}}
              />
            </div>
          </div>

          {/* Stats row */}
          {job.totalPages > 0 && (
            <div className="grid grid-cols-3 gap-3">
              {[
                {
                  label: 'Total Pages',
                  value: job.totalPages,
                  icon: <FileText size={13} className="text-blue-400" />,
                  color: 'text-blue-300',
                },
                {
                  label: 'Images Preserved',
                  value: totalImages,
                  icon: <ImageIcon size={13} className="text-violet-400" />,
                  color: 'text-violet-300',
                },
                {
                  label: 'Failed Pages',
                  value: failedPageNums.length,
                  icon: <AlertCircle size={13} className="text-red-400" />,
                  color: failedPageNums.length > 0 ? 'text-red-300' : 'text-slate-500',
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="flex flex-col gap-1 p-3 bg-slate-900/50 rounded-xl border border-slate-700/40"
                >
                  <div className="flex items-center gap-1.5">
                    {stat.icon}
                    <span className="text-xs text-slate-500">{stat.label}</span>
                  </div>
                  <span className={`text-lg font-bold ${stat.color}`}>{stat.value}</span>
                </div>
              ))}
            </div>
          )}

          {/* Trace ID & timing */}
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-xs text-slate-500">
              <Shield size={11} />
              Trace: {job.traceId}
            </span>
            {job.completedAt && (
              <span className="flex items-center gap-1.5 text-xs text-slate-500">
                <Clock size={11} />
                {new Date(job.completedAt).toLocaleTimeString()}
              </span>
            )}
          </div>

          {/* Error message */}
          {isFailed && job.errorMessage && (
            <div className="p-3 bg-red-950/40 border border-red-800/40 rounded-xl">
              <p className="text-sm font-medium text-red-300">Processing Failed</p>
              <p className="text-xs text-red-400/90 mt-1 whitespace-pre-wrap">
                {job.errorMessage}
              </p>
              {job.errorMessage.includes('scanned') ||
              job.errorMessage.includes('image-only') ? (
                <p className="text-xs text-amber-400/80 mt-2">
                  💡 This PDF appears to contain scanned images of text rather than selectable
                  text. OCR (Optical Character Recognition) is required to extract and humanize
                  scanned documents.
                </p>
              ) : null}
            </div>
          )}

          {/* Page-by-page breakdown toggle */}
          {job.pageResults.length > 0 && (
            <div>
              <button
                onClick={() => setShowPageDetails((v) => !v)}
                className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                {showPageDetails ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                {showPageDetails ? 'Hide' : 'Show'} page-by-page breakdown
              </button>

              {showPageDetails && (
                <div className="mt-3 flex flex-col gap-1.5 max-h-72 overflow-y-auto pr-1">
                  {job.pageResults.map((page) => (
                    <div
                      key={page.pageNumber}
                      className="flex items-center gap-3 px-3 py-2 bg-slate-900/40 rounded-lg border border-slate-700/30"
                    >
                      <div
                        className={`w-2 h-2 rounded-full shrink-0 ${PAGE_STATUS_COLOR[page.status]}`}
                      />
                      <span className="text-xs text-slate-400 w-16 shrink-0">
                        Page {page.pageNumber}
                      </span>
                      <span
                        className={`text-xs font-medium flex-1 ${
                          page.status === 'HUMANIZED'
                            ? 'text-emerald-400'
                            : page.status === 'FAILED'
                            ? 'text-red-400'
                            : page.status === 'SKIPPED'
                            ? 'text-slate-500'
                            : 'text-blue-400'
                        }`}
                      >
                        {page.status === 'SKIPPED' ? 'No text (image-only page)' : page.status}
                        {page.errorReason && (
                          <span className="text-red-400/70 ml-1">— {page.errorReason}</span>
                        )}
                      </span>
                      {page.imageCount > 0 && (
                        <span className="flex items-center gap-1 text-xs text-violet-400 shrink-0">
                          <ImageIcon size={10} />
                          {page.imageCount}
                        </span>
                      )}
                      {page.retryCount > 0 && (
                        <span className="text-xs text-amber-400 shrink-0">
                          {page.retryCount} retr{page.retryCount === 1 ? 'y' : 'ies'}
                        </span>
                      )}
                      <span className="text-xs text-slate-600 shrink-0">{page.durationMs}ms</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Page grid mini-map */}
          {job.totalPages > 0 && job.pageResults.length > 0 && (
            <div>
              <p className="text-xs text-slate-500 mb-2">Page map:</p>
              <div className="flex flex-wrap gap-1">
                {Array.from({length: job.totalPages}, (_, i) => {
                  const pageResult = job.pageResults.find(
                    (r) => r.pageNumber === i + 1 || r.pageIndex === i
                  );
                  const status = pageResult?.status || 'PENDING';
                  return (
                    <div
                      key={i}
                      title={`Page ${i + 1}: ${status}`}
                      className={`w-4 h-4 rounded-sm transition-all ${PAGE_STATUS_COLOR[status]} ${
                        status === 'PENDING' ? 'opacity-30' : 'opacity-80'
                      }`}
                    />
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Completion summary ─────────────────────────────────────────── */}
      {isCompleted && (
        <div className="p-4 bg-emerald-950/30 border border-emerald-800/40 rounded-xl flex items-start gap-3">
          <CheckCircle2 size={18} className="text-emerald-400 shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-emerald-300">
              PDF Humanized & Ready to Download
            </p>
            <p className="text-xs text-emerald-400/80 mt-0.5">
              {job.processedPages} page{job.processedPages !== 1 ? 's' : ''} humanized ·{' '}
              {totalImages} image{totalImages !== 1 ? 's' : ''} preserved ·{' '}
              {failedPageNums.length > 0
                ? `${failedPageNums.length} page(s) kept original (no text found)`
                : '100% pages processed'}
            </p>
            {failedPageNums.length > 0 && (
              <p className="text-xs text-amber-400/80 mt-1">
                Pages {failedPageNums.join(', ')} contained no selectable text and were preserved
                in their original form.
              </p>
            )}
          </div>
        </div>
      )}

      {/* ── Instructions (shown before upload) ───────────────────────── */}
      {!job && !isUploading && !uploadError && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {[
            {
              step: '1',
              title: 'Upload PDF',
              desc: 'Drag & drop or browse for your PDF. Multi-page, complex layouts supported.',
              icon: <Upload size={16} className="text-violet-400" />,
            },
            {
              step: '2',
              title: 'Auto-Humanize',
              desc: 'Every page is processed through the HumanFlow engine. Images stay untouched.',
              icon: <Sparkles size={16} className="text-violet-400" />,
            },
            {
              step: '3',
              title: 'Download',
              desc: 'Get your humanized PDF with all figures, captions, and formatting preserved.',
              icon: <Download size={16} className="text-violet-400" />,
            },
          ].map((item) => (
            <div
              key={item.step}
              className="flex flex-col gap-2 p-4 bg-slate-800/40 rounded-xl border border-slate-700/40"
            >
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-violet-800/60 flex items-center justify-center text-xs font-bold text-violet-300">
                  {item.step}
                </span>
                {item.icon}
                <span className="text-sm font-semibold text-slate-200">{item.title}</span>
              </div>
              <p className="text-xs text-slate-500">{item.desc}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
