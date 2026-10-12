'use client';

import React from 'react';
import {
  Download,
  Sparkles,
  History,
  Clock,
} from 'lucide-react';
import { DocumentVersion } from '@/lib/types';

interface VersionHistoryProps {
  documentId: string;
  versions: DocumentVersion[];
  selectedVersionId?: string;
  onSelectVersion?: (versionId: string) => void;
}

export default function VersionHistory({
  documentId,
  versions,
  selectedVersionId,
  onSelectVersion,
}: VersionHistoryProps) {
  return (
    <div className="glass-panel rounded-3xl p-6 sm:p-8" id="version-history-panel">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-5 mb-5 border-b border-white/10 gap-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
            <History className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-display font-bold text-lg text-white tracking-tight">
              Document Version Lineage
            </h4>
            <p className="text-xs text-slate-400">Complete audit trail of all processing attempts & intermediate states</p>
          </div>
        </div>

        {/* Global Download Buttons */}
        <div className="flex items-center gap-2.5 flex-wrap">
          <a
            href={`/api/documents/${documentId}/download?type=original`}
            id="btn-download-original"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Download className="w-3.5 h-3.5" />
            Original
          </a>

          <a
            href={`/api/documents/${documentId}/download?type=best`}
            id="btn-download-best"
            className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5 transition-colors shadow-sm"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Best Version
          </a>

          <a
            href={`/api/documents/${documentId}/download?type=final`}
            id="btn-download-final"
            className="glow-btn px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-lg flex items-center gap-2 transition-all font-display"
          >
            <Download className="w-4 h-4" />
            Final Document
          </a>
        </div>
      </div>

      {/* Version list cards */}
      <div className="space-y-3">
        {versions.map((ver) => {
          const isSelected = selectedVersionId === ver.id;
          return (
            <div
              key={ver.id}
              onClick={() => onSelectVersion && onSelectVersion(ver.id)}
              className={`p-4 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 ${
                isSelected
                  ? 'bg-cyan-950/40 border-cyan-400/60 shadow-lg shadow-cyan-500/10 scale-[1.005]'
                  : 'bg-slate-900/50 border-white/[0.07] hover:border-white/20 hover:bg-slate-900/80'
              }`}
            >
              <div className="flex items-center gap-3.5">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-bold text-xs ${
                    ver.isFinal
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm shadow-cyan-500/20'
                      : ver.isBest
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/20'
                      : 'bg-slate-800 text-slate-400 border border-white/5'
                  }`}
                >
                  v{ver.versionNumber}
                </div>

                <div>
                  <div className="flex items-center gap-2.5">
                    <span className="font-display text-sm font-semibold text-white">{ver.label}</span>
                    {ver.isFinal && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold">
                        Final Delivery
                      </span>
                    )}
                    {ver.isBest && !ver.isFinal && (
                      <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 font-bold">
                        Highest Score
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                    <span className="flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3 text-slate-500" />
                      {new Date(ver.createdAt).toLocaleTimeString()}
                    </span>
                    <span>•</span>
                    <span className="truncate max-w-xs">Provider: {ver.provider}</span>
                  </div>
                </div>
              </div>

              {/* Metrics Pill & Download */}
              <div className="flex items-center gap-3 self-end sm:self-center">
                <div className="text-right">
                  <div className="text-xs font-mono font-semibold text-slate-200">
                    AI Score: <span className="text-cyan-400 font-bold">{ver.checkerScore}%</span>
                  </div>
                  <div className="text-[11px] text-slate-400">
                    Preservation: <span className="text-emerald-400 font-bold">{ver.preservationScore}%</span>
                  </div>
                </div>

                <a
                  href={`/api/documents/${documentId}/download?type=version&versionId=${ver.id}`}
                  onClick={(e) => e.stopPropagation()}
                  className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
                  title="Download this specific version"
                >
                  <Download className="w-4 h-4" />
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
