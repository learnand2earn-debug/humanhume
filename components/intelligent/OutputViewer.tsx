'use client';

import React, { useState } from 'react';
import {
  Download,
  Copy,
  Check,
  RefreshCw,
  FileText,
  FileCode,
  Sparkles,
  GitCommit,
  CheckCircle2,
  ExternalLink,
} from 'lucide-react';
import { OutputVersion } from '@/lib/intelligent/types';

interface OutputViewerProps {
  versions: OutputVersion[];
  currentVersionIndex: number;
  onSelectVersion: (index: number) => void;
  onRefineOutput: (revisionNotes: string) => void;
  sessionId: string;
  isLoading: boolean;
}

export default function OutputViewer({
  versions,
  currentVersionIndex,
  onSelectVersion,
  onRefineOutput,
  sessionId,
  isLoading,
}: OutputViewerProps) {
  const [copied, setCopied] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState('');
  const [exportFormat, setExportFormat] = useState<'md' | 'docx' | 'pdf' | 'html' | 'txt' | 'json'>('docx');

  const currentVersion = versions[currentVersionIndex] || versions[versions.length - 1];

  const handleCopy = () => {
    if (currentVersion?.content) {
      navigator.clipboard.writeText(currentVersion.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleExportDownload = () => {
    if (!currentVersion) return;
    const url = `/api/intelligent/sessions/${sessionId}/export?format=${exportFormat}&version=${currentVersion.versionNumber}`;
    window.open(url, '_blank');
  };

  const handleRefineSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!revisionNotes.trim()) return;
    onRefineOutput(revisionNotes);
    setRevisionNotes('');
  };

  if (!currentVersion) {
    return (
      <div className="w-full bg-[#0a1024]/90 border border-white/10 rounded-2xl p-8 backdrop-blur-xl text-center">
        <Sparkles className="w-8 h-8 text-cyan-400 mx-auto mb-2 opacity-50" />
        <h4 className="text-sm font-semibold text-slate-300">Deliverable Not Generated Yet</h4>
        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
          Answer the targeted clarifications or proceed with acknowledged gaps to synthesize your verified deliverable.
        </p>
      </div>
    );
  }

  return (
    <div className="w-full bg-[#0a1024]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl flex flex-col h-full">
      {/* Top Bar: Version Tabs & Action Buttons */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              {currentVersion.title}
            </h3>
            <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 font-bold">
              Pass Rate: {currentVersion.passRate}%
            </span>
          </div>

          {/* Version Pills */}
          <div className="flex items-center gap-1.5 mt-2">
            <span className="text-xs text-slate-400 mr-1 font-medium">Versions:</span>
            {versions.map((ver, idx) => (
              <button
                key={ver.versionNumber}
                type="button"
                onClick={() => onSelectVersion(idx)}
                className={`px-2.5 py-1 rounded-lg text-xs font-mono font-semibold transition-all ${
                  idx === currentVersionIndex
                    ? 'bg-cyan-500/20 text-cyan-200 border border-cyan-400 shadow-sm shadow-cyan-500/10'
                    : 'text-slate-400 hover:text-white bg-white/[0.04]'
                }`}
              >
                v{ver.versionNumber}
              </button>
            ))}
          </div>
        </div>

        {/* Export & Copy Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/15 text-white border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>

          <select
            value={exportFormat}
            onChange={(e) => setExportFormat(e.target.value as any)}
            className="bg-[#070b18] border border-white/15 rounded-xl px-2.5 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-cyan-400"
          >
            <option value="docx">Word (.docx)</option>
            <option value="pdf">PDF Document (.pdf)</option>
            <option value="md">Markdown (.md)</option>
            <option value="html">HTML Webpage (.html)</option>
            <option value="txt">Plain Text (.txt)</option>
            <option value="json">JSON Metadata (.json)</option>
          </select>

          <button
            type="button"
            onClick={handleExportDownload}
            className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-md shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download</span>
          </button>
        </div>
      </div>

      {/* Changelog Banner if v2+ */}
      {currentVersion.changelog && currentVersion.changelog.length > 0 && (
        <div className="mb-4 p-3 rounded-xl bg-cyan-950/20 border border-cyan-500/20 text-xs">
          <div className="flex items-center gap-1.5 text-cyan-300 font-semibold mb-1">
            <GitCommit className="w-3.5 h-3.5" />
            <span>Changelog for Version v{currentVersion.versionNumber}</span>
          </div>
          <ul className="list-disc list-inside space-y-0.5 text-slate-300/90 text-[11px] pl-1">
            {currentVersion.changelog.map((c, i) => (
              <li key={i}>{c}</li>
            ))}
          </ul>
        </div>
      )}

      {/* Output Content Area */}
      <div className="flex-1 bg-[#070b18] border border-white/10 rounded-xl p-4 overflow-y-auto max-h-[500px] text-xs font-mono leading-relaxed text-slate-200 whitespace-pre-wrap selection:bg-cyan-500/30">
        {currentVersion.content}
      </div>

      {/* Iterative Revision Form (STAGE K: Repeat & Refine) */}
      <form onSubmit={handleRefineSubmit} className="mt-4 pt-3 border-t border-white/[0.08]">
        <label className="block text-xs font-semibold text-slate-300 mb-1 flex items-center justify-between">
          <span className="flex items-center gap-1.5">
            <RefreshCw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Iterative Refinement & Post-Verification Revisions:</span>
          </span>
          <span className="text-[11px] text-slate-500 font-normal">
            Creates a new version with updated checklist verification
          </span>
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            value={revisionNotes}
            onChange={(e) => setRevisionNotes(e.target.value)}
            placeholder="e.g. 'Add a specific AWS Cloud Architect certification and expand executive summary metrics.'"
            className="flex-1 bg-[#070b18] border border-white/15 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
          <button
            type="submit"
            disabled={isLoading || !revisionNotes.trim()}
            className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white font-semibold text-xs border border-white/10 disabled:opacity-50 transition-all flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Iterate & Re-verify</span>
          </button>
        </div>
      </form>
    </div>
  );
}
