'use client';

import React from 'react';
import {
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Trophy,
  ArrowRight,
  Sparkles,
  Info,
} from 'lucide-react';
import { VerificationReport } from '@/lib/intelligent/types';

interface VerificationReportCardProps {
  report: VerificationReport;
  onProceedToDelivery?: () => void;
}

export default function VerificationReportCard({
  report,
  onProceedToDelivery,
}: VerificationReportCardProps) {
  const isPassed = report.passed;

  return (
    <div
      className={`w-full rounded-2xl p-5 border backdrop-blur-xl shadow-xl transition-all ${
        isPassed
          ? 'bg-gradient-to-br from-emerald-950/20 via-[#0a1024]/90 to-[#0a1024]/90 border-emerald-500/30'
          : 'bg-gradient-to-br from-amber-950/20 via-[#0a1024]/90 to-[#0a1024]/90 border-amber-500/30'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4 pb-4 border-b border-white/[0.08]">
        <div className="flex items-center gap-3">
          <div
            className={`w-11 h-11 rounded-2xl flex items-center justify-center border shadow-lg ${
              isPassed
                ? 'bg-emerald-500/20 border-emerald-400/50 text-emerald-300 shadow-emerald-500/20'
                : 'bg-amber-500/20 border-amber-400/50 text-amber-300 shadow-amber-500/20'
            }`}
          >
            {isPassed ? (
              <Trophy className="w-5 h-5 text-emerald-300 animate-bounce" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-amber-300" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-white tracking-tight">
                Post-Generation Verification Audit
              </h3>
              <span
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold border ${
                  isPassed
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                    : 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                }`}
              >
                {isPassed ? 'Audit Passed' : 'Gaps Flagged'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Audited against all dynamic requirements and original source documents.
            </p>
          </div>
        </div>

        {/* Quality Score Meter */}
        <div className="flex items-center gap-3">
          <div className="text-right">
            <div className="text-[10px] uppercase font-mono text-slate-400">Quality Score</div>
            <div
              className={`text-2xl font-mono font-bold ${
                isPassed ? 'text-emerald-400' : 'text-amber-400'
              }`}
            >
              {report.qualityScore}
              <span className="text-xs text-slate-500">/100</span>
            </div>
          </div>
          <div className="w-12 h-12 rounded-full border-4 flex items-center justify-center font-mono text-xs font-bold shrink-0 border-emerald-500/20 bg-emerald-500/10 text-emerald-300">
            {report.qualityScore}%
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 mb-4">
        <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-center">
          <div className="text-[10px] uppercase font-mono text-slate-400">Total Criteria</div>
          <div className="text-sm font-mono font-bold text-white mt-0.5">{report.totalItems}</div>
        </div>
        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-center">
          <div className="text-[10px] uppercase font-mono text-emerald-400">Completed</div>
          <div className="text-sm font-mono font-bold text-emerald-300 mt-0.5">
            {report.completedItems}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20 text-center">
          <div className="text-[10px] uppercase font-mono text-rose-400">Missing</div>
          <div className="text-sm font-mono font-bold text-rose-300 mt-0.5">
            {report.missingItems}
          </div>
        </div>
        <div className="p-2.5 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-center">
          <div className="text-[10px] uppercase font-mono text-cyan-400">Ack Gaps</div>
          <div className="text-sm font-mono font-bold text-cyan-300 mt-0.5">
            {report.acknowledgedGapsCount}
          </div>
        </div>
      </div>

      {/* Summary Narrative */}
      <div className="p-3 rounded-xl bg-white/[0.02] border border-white/10 text-xs text-slate-300 leading-relaxed mb-4">
        <div className="flex items-center gap-1.5 font-semibold text-white mb-1">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Audit Findings Summary:</span>
        </div>
        <p>{report.deliverableAuditSummary}</p>
      </div>

      {/* Issues List if any */}
      {report.issues && report.issues.length > 0 && (
        <div className="space-y-2 mb-4">
          <div className="text-xs font-semibold text-slate-300 px-1">
            Flagged Items Requiring Attention ({report.issues.length}):
          </div>
          {report.issues.map((issue) => (
            <div
              key={issue.id}
              className={`p-3 rounded-xl border text-xs flex items-start gap-2.5 ${
                issue.severity === 'critical'
                  ? 'bg-rose-950/20 border-rose-500/30 text-rose-200'
                  : 'bg-amber-950/20 border-amber-500/30 text-amber-200'
              }`}
            >
              <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
              <div>
                <div className="font-semibold">{issue.description}</div>
                <div className="text-[11px] opacity-80 mt-0.5">
                  Recommendation: {issue.recommendation}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Recommendations */}
      {report.recommendations && report.recommendations.length > 0 && (
        <div className="p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs text-cyan-200 space-y-1">
          <div className="font-semibold text-cyan-300 flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next-Step Guidance:</span>
          </div>
          {report.recommendations.map((rec, i) => (
            <div key={i} className="pl-4 text-[11px] text-cyan-100/90">
              • {rec}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
