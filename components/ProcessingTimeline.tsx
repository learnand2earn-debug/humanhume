'use client';

import React, { useEffect, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Loader2,
  FileCheck,
  ShieldCheck,
  Cpu,
  Search,
  Wrench,
  Sparkles,
  Zap,
  AlertTriangle,
  Download,
} from 'lucide-react';
import { JobStatus, StepLog } from '@/lib/types';

interface ProcessingTimelineProps {
  documentId: string;
  onFinished?: (status: JobStatus) => void;
}

interface StatusPayload {
  id: string;
  status: JobStatus;
  currentStep: JobStatus;
  progressPercent: number;
  retryCount: number;
  errorMessage?: string;
  preservationScore?: number;
  aiCheckScore?: number;
  steps: StepLog[];
  updatedAt?: string;
}

const PIPELINE_STEPS: Array<{
  key: JobStatus;
  label: string;
  description: string;
  icon: any;
}> = [
  {
    key: 'EXTRACTING',
    label: 'Text Extraction & Parsing',
    description: 'Validating working file copy and extracting text structure',
    icon: FileCheck,
  },
  {
    key: 'ANALYZING',
    label: 'Document Intelligence',
    description: 'Analyzing headings, sentence cadence, and synthetic markers',
    icon: Search,
  },
  {
    key: 'PROTECTING',
    label: 'Content Fact Protection',
    description: 'Freezing citations, tables, numbers, formulas, and headings',
    icon: ShieldCheck,
  },
  {
    key: 'HUMANIZING',
    label: 'Humanization Engine',
    description: 'Applying natural phrasing, burstiness, and sentence variation',
    icon: Cpu,
  },
  {
    key: 'CHECKING',
    label: 'Quality & AI Check',
    description: 'Testing against AI detection heuristics and quality standards',
    icon: Sparkles,
  },
  {
    key: 'FIXING',
    label: 'Auto-Fix Remediation',
    description: 'Restoring any altered entities and refining flagged segments',
    icon: Wrench,
  },
  {
    key: 'FINALIZING',
    label: 'Final Document Generation',
    description: 'Preserving document formatting and compiling final copy',
    icon: CheckCircle2,
  },
];

export default function ProcessingTimeline({
  documentId,
  onFinished,
}: ProcessingTimelineProps) {
  const [data, setData] = useState<StatusPayload | null>(null);

  useEffect(() => {
    let isMounted = true;
    let timer: NodeJS.Timeout;

    const fetchStatus = async () => {
      try {
        const res = await fetch(`/api/documents/${documentId}/status`);
        if (!res.ok) {
          if (isMounted) {
            timer = setTimeout(fetchStatus, 1200);
          }
          return;
        }

        const rawText = await res.text();
        if (!rawText || rawText.includes('upstream error')) {
          if (isMounted) {
            timer = setTimeout(fetchStatus, 1200);
          }
          return;
        }

        let json: StatusPayload;
        try {
          json = JSON.parse(rawText);
        } catch {
          if (isMounted) {
            timer = setTimeout(fetchStatus, 1200);
          }
          return;
        }

        if (isMounted) {
          setData(json);

          if (
            json.status === 'COMPLETED' ||
            json.status === 'NEEDS_REVIEW' ||
            json.status === 'FAILED'
          ) {
            if (onFinished) {
              onFinished(json.status);
            }
            return;
          }

          timer = setTimeout(fetchStatus, 800);
        }
      } catch {
        if (isMounted) {
          timer = setTimeout(fetchStatus, 1500);
        }
      }
    };

    fetchStatus();

    return () => {
      isMounted = false;
      if (timer) clearTimeout(timer);
    };
  }, [documentId, onFinished]);

  if (!data) {
    return (
      <div className="glass-panel-glow rounded-3xl p-10 flex items-center justify-center gap-3.5">
        <Loader2 className="w-6 h-6 animate-spin text-cyan-400" />
        <span className="text-slate-300 text-sm font-semibold font-display">
          Connecting to autonomous processing engine...
        </span>
      </div>
    );
  }

  const getStepStatus = (stepKey: JobStatus) => {
    const stepOrder: JobStatus[] = [
      'QUEUED',
      'EXTRACTING',
      'ANALYZING',
      'PROTECTING',
      'HUMANIZING',
      'CHECKING',
      'FIXING',
      'FINALIZING',
      'COMPLETED',
    ];

    if (data.status === 'COMPLETED') return 'completed';

    const currentIndex = stepOrder.indexOf(data.currentStep);
    const stepIndex = stepOrder.indexOf(stepKey);

    if (data.status === 'FAILED') {
      if (stepIndex < currentIndex) return 'completed';
      if (stepIndex === currentIndex) return 'failed';
      return 'pending';
    }

    if (stepIndex < currentIndex) return 'completed';
    if (stepIndex === currentIndex) return 'running';
    return 'pending';
  };

  return (
    <div className="glass-panel-glow rounded-3xl p-6 sm:p-9" id="processing-timeline-panel">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 border-b border-white/10 gap-4">
        <div>
          <div className="flex items-center gap-2.5 mb-1.5">
            <span
              className={`w-2.5 h-2.5 rounded-full ${
                data.status === 'FAILED' ? 'bg-rose-500' : 'bg-cyan-400 animate-ping'
              }`}
            />
            <h3 className="font-display text-xl font-bold text-white tracking-tight">
              Autonomous Processing Pipeline
            </h3>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold border ${
                data.status === 'FAILED'
                  ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                  : 'bg-cyan-500/15 text-cyan-300 border-cyan-500/30'
              }`}
            >
              {data.status}
            </span>
          </div>
          <p className="text-xs text-slate-400">
            Document ID: <span className="font-mono text-cyan-300 font-semibold">{data.id}</span>
            {data.retryCount > 0 && (
              <span className="ml-3 text-amber-300 font-mono font-semibold">
                ⚡ Auto-Correction Cycle: {data.retryCount}
              </span>
            )}
          </p>
        </div>

        {/* Progress Percentage */}
        <div className="flex items-center gap-4">
          <div className="text-right">
            <div
              className={`font-display font-extrabold text-3xl font-mono ${
                data.status === 'FAILED' ? 'text-rose-400' : 'text-cyan-400'
              }`}
            >
              {data.progressPercent}%
            </div>
            <div className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold">
              Pipeline {data.status === 'FAILED' ? 'Status' : 'Completion'}
            </div>
          </div>
        </div>
      </div>

      {/* Progress Bar with Glow */}
      <div className="w-full h-3 bg-slate-950/80 rounded-full my-7 overflow-hidden border border-white/10 p-[1.5px] shadow-inner">
        <div
          className={`h-full transition-all duration-500 rounded-full shadow-lg ${
            data.status === 'FAILED'
              ? 'bg-gradient-to-r from-rose-600 to-amber-600 shadow-rose-500/30'
              : 'bg-gradient-to-r from-indigo-500 via-cyan-400 to-emerald-400 shadow-cyan-500/40'
          }`}
          style={{ width: `${Math.max(6, data.progressPercent)}%` }}
        />
      </div>

      {/* Failure Alert Box */}
      {data.status === 'FAILED' && (
        <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-500/30 flex items-start gap-3.5 text-sm text-rose-200 mb-6 shadow-lg shadow-rose-950/50">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-semibold text-rose-300 flex items-center gap-2">
              <span>Pipeline Halted</span>
              <span className="text-[11px] font-mono text-rose-400/80">({data.currentStep})</span>
            </div>
            <p className="text-xs text-rose-200/90 leading-relaxed font-mono">
              {data.errorMessage || 'Text extraction or processing encountered a fatal error.'}
            </p>
          </div>
        </div>
      )}

      {/* Instant Download Completion Banner */}
      {data.status === 'COMPLETED' && (
        <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-950/60 via-teal-950/40 to-slate-900/80 border border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 shadow-xl shadow-emerald-950/50 animate-in fade-in zoom-in-95 duration-300">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-md shadow-emerald-500/20">
              <CheckCircle2 className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-display font-bold text-white text-base">Pipeline Completed Successfully</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                  Ready
                </span>
              </div>
              <p className="text-xs text-slate-300 mt-0.5">
                All factual anchors frozen &amp; AI score reduced. Output document compiled.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto">
            <a
              href={`/api/documents/${data.id}/download?type=final`}
              download
              id="timeline-download-final-btn"
              className="w-full sm:w-auto px-5 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/25 transition-all hover:scale-102 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download Final Document</span>
            </a>
            <a
              href={`/api/documents/${data.id}/download?type=original`}
              download
              title="Download original document"
              className="px-3.5 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold border border-white/10 flex items-center justify-center transition-colors"
            >
              Original
            </a>
          </div>
        </div>
      )}

      {/* Steps Timeline Grid */}
      <div className="space-y-3">
        {PIPELINE_STEPS.map((step) => {
          const status = getStepStatus(step.key);
          const Icon = step.icon;

          return (
            <div
              key={step.key}
              id={`pipeline-step-${step.key.toLowerCase()}`}
              className={`p-4 rounded-2xl transition-all duration-300 border flex items-center justify-between ${
                status === 'running'
                  ? 'bg-cyan-950/30 border-cyan-400/50 shadow-xl shadow-cyan-500/15 scale-[1.01]'
                  : status === 'completed'
                  ? 'bg-slate-900/50 border-white/[0.08] text-slate-200'
                  : status === 'failed'
                  ? 'bg-rose-950/30 border-rose-500/40 shadow-xl shadow-rose-500/10'
                  : 'bg-slate-950/30 border-transparent text-slate-600'
              }`}
            >
              <div className="flex items-center gap-4">
                <div
                  className={`w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
                    status === 'completed'
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                      : status === 'running'
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400 animate-pulse shadow-md shadow-cyan-500/30'
                      : status === 'failed'
                      ? 'bg-rose-500/20 text-rose-400 border border-rose-500/40 shadow-sm shadow-rose-500/20'
                      : 'bg-slate-800/40 text-slate-600 border border-white/5'
                  }`}
                >
                  {status === 'running' ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : status === 'completed' ? (
                    <CheckCircle2 className="w-5 h-5" />
                  ) : status === 'failed' ? (
                    <AlertTriangle className="w-5 h-5 text-rose-400" />
                  ) : (
                    <Icon className="w-5 h-5" />
                  )}
                </div>

                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-sm font-semibold tracking-tight ${
                        status === 'running'
                          ? 'text-cyan-300 font-display text-base'
                          : status === 'completed'
                          ? 'text-white'
                          : status === 'failed'
                          ? 'text-rose-200'
                          : 'text-slate-500'
                      }`}
                    >
                      {step.label}
                    </span>
                    {status === 'running' && (
                      <span className="text-[10px] font-mono uppercase bg-cyan-400/20 text-cyan-300 px-2 py-0.5 rounded-full font-bold border border-cyan-400/30 animate-pulse">
                        In Progress
                      </span>
                    )}
                    {status === 'failed' && (
                      <span className="text-[10px] font-mono uppercase bg-rose-400/20 text-rose-300 px-2 py-0.5 rounded-full font-bold border border-rose-400/30">
                        Failed
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">{step.description}</p>
                </div>
              </div>

              {/* Status Badge */}
              <div className="text-right">
                {status === 'completed' && (
                  <span className="text-xs text-emerald-400 font-mono font-semibold flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Verified
                  </span>
                )}
                {status === 'running' && (
                  <span className="text-xs text-cyan-400 font-mono font-bold animate-pulse">
                    Processing...
                  </span>
                )}
                {status === 'failed' && (
                  <span className="text-xs text-rose-400 font-mono font-semibold flex items-center gap-1.5 bg-rose-500/10 px-2.5 py-1 rounded-lg border border-rose-500/20">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Failed
                  </span>
                )}
                {status === 'pending' && (
                  <span className="text-xs text-slate-600 font-mono">Queued</span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Live Log Detail Ticker */}
      {data.steps && data.steps.length > 0 && (
        <div className="mt-7 pt-5 border-t border-white/10">
          <div className="text-[11px] font-mono text-slate-400 mb-2.5 flex items-center justify-between">
            <span className="flex items-center gap-2 font-semibold">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Real-Time Pipeline Telemetry Stream
            </span>
            <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
          </div>
          <div className="bg-slate-950/90 rounded-2xl p-4 font-mono text-xs text-slate-300 border border-white/10 space-y-1.5 max-h-36 overflow-y-auto">
            {data.steps.slice(-4).map((s, i) => (
              <div key={i} className="flex items-start gap-2.5">
                <span className="text-cyan-400 font-bold">[{s.step}]</span>
                <span className="text-slate-300">{s.details || 'Processing step verified.'}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
