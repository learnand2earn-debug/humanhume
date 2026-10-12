'use client';

import React, { useState } from 'react';
import {
  ShieldCheck,
  Cpu,
  BookOpen,
  Copy,
  Check,
  Columns,
  ListFilter,
  Sparkles,
} from 'lucide-react';
import { DocumentDiff } from '@/lib/types';

interface DiffViewerProps {
  diff: DocumentDiff;
  originalText: string;
  humanizedText: string;
  versionLabel?: string;
}

export default function DiffViewer({
  diff,
  originalText,
  humanizedText,
  versionLabel = 'Final Document',
}: DiffViewerProps) {
  const [viewMode, setViewMode] = useState<'side-by-side' | 'unified'>('side-by-side');
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(humanizedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-6" id="diff-viewer-component">
      {/* Metric Score Ribbon */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        {/* Preservation Score */}
        <div className="glass-card rounded-2xl p-5 border-l-4 border-l-emerald-500 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              Fact Preservation
            </span>
            <span className="text-[10px] text-emerald-400 font-mono font-bold uppercase bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
              Locked
            </span>
          </div>
          <div className="font-display font-extrabold text-3xl text-emerald-400 font-mono">
            {diff.preservationScore}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Zero citation or number alterations
          </div>
        </div>

        {/* AI Check Score */}
        <div className="glass-card rounded-2xl p-5 border-l-4 border-l-cyan-500 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              AI Detection Score
            </span>
            <span
              className={`text-[10px] font-mono font-bold uppercase px-2 py-0.5 rounded-full border ${
                diff.aiCheckScore <= 20
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border-amber-500/30'
              }`}
            >
              {diff.qualityStatus}
            </span>
          </div>
          <div className="font-display font-extrabold text-3xl text-cyan-300 font-mono">
            {diff.aiCheckScore}%
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {diff.aiCheckScore <= 20 ? 'Natural variation verified' : 'Accepted by quality threshold'}
          </div>
        </div>

        {/* Readability Score */}
        <div className="glass-card rounded-2xl p-5 border-l-4 border-l-indigo-500 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <BookOpen className="w-4 h-4 text-indigo-400" />
              Flesch Readability
            </span>
            <span className="text-[10px] text-indigo-300 font-mono font-bold uppercase bg-indigo-500/10 px-2 py-0.5 rounded-full border border-indigo-500/20">
              Optimal
            </span>
          </div>
          <div className="font-display font-extrabold text-3xl text-indigo-300 font-mono">
            {diff.readabilityScore}<span className="text-sm font-normal text-slate-500">/100</span>
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            Elevated rhythm & sentence cadence
          </div>
        </div>

        {/* Protected Entities */}
        <div className="glass-card rounded-2xl p-5 border-l-4 border-l-purple-500 shadow-lg">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-1.5">
            <span className="flex items-center gap-1.5 font-semibold text-slate-300">
              <Cpu className="w-4 h-4 text-purple-400" />
              Protected Entities
            </span>
            <span className="text-[10px] text-purple-300 font-mono font-bold uppercase bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
              Frozen
            </span>
          </div>
          <div className="font-display font-extrabold text-3xl text-purple-300 font-mono">
            {diff.protectedCount}
          </div>
          <div className="text-[11px] text-slate-400 mt-1">
            {diff.humanizedWordCount} words ({diff.addedCount} polished)
          </div>
        </div>
      </div>

      {/* Diff Controls Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 glass-card p-4 rounded-2xl border border-white/10">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold font-mono text-slate-400 uppercase tracking-wider px-2">
            Inspection Mode:
          </span>
          <button
            onClick={() => setViewMode('side-by-side')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'side-by-side'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            Side by Side
          </button>
          <button
            onClick={() => setViewMode('unified')}
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-2 transition-all ${
              viewMode === 'unified'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ListFilter className="w-3.5 h-3.5" />
            Highlighted Unified
          </button>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-3.5 text-xs text-slate-400 flex-wrap">
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            Polished Phrasing
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400" />
            Redundant Removed
          </span>
          <span className="flex items-center gap-1.5 font-medium">
            <span className="w-2.5 h-2.5 rounded-full bg-indigo-400" />
            Protected Entity
          </span>
          <button
            onClick={handleCopy}
            className="ml-2 px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 text-slate-200 text-xs font-semibold flex items-center gap-1.5 border border-white/10 transition-colors"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'Copied!' : 'Copy Text'}
          </button>
        </div>
      </div>

      {/* Main Diff Display */}
      {viewMode === 'side-by-side' ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Left Column: Original */}
          <div className="glass-panel rounded-3xl p-6 border border-white/10">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
              <span className="text-xs font-bold font-display uppercase tracking-wider text-slate-400">
                Original Upload (Permanent Untouched)
              </span>
              <span className="text-xs font-mono text-slate-500 font-semibold">
                {diff.originalWordCount} words
              </span>
            </div>
            <div className="font-sans text-sm text-slate-300 leading-relaxed max-h-[560px] overflow-y-auto whitespace-pre-wrap pr-3 selection:bg-indigo-500/30">
              {originalText}
            </div>
          </div>

          {/* Right Column: Humanized */}
          <div className="glass-panel-glow rounded-3xl p-6 border border-cyan-500/40">
            <div className="flex items-center justify-between pb-3.5 mb-4 border-b border-white/10">
              <span className="text-xs font-bold font-display uppercase tracking-wider text-cyan-300 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-cyan-400" />
                {versionLabel} (Preserved & Natural)
              </span>
              <span className="text-xs font-mono text-cyan-400 font-bold">
                {diff.humanizedWordCount} words
              </span>
            </div>
            <div className="font-sans text-sm text-slate-100 leading-relaxed max-h-[560px] overflow-y-auto whitespace-pre-wrap pr-3 selection:bg-cyan-500/30">
              {humanizedText}
            </div>
          </div>
        </div>
      ) : (
        /* Unified Highlight View */
        <div className="glass-panel rounded-3xl p-7 border border-white/10 max-h-[620px] overflow-y-auto">
          <div className="font-sans text-sm leading-relaxed whitespace-pre-wrap">
            {diff.chunks.map((chunk, idx) => {
              if (chunk.type === 'protected') {
                return (
                  <mark
                    key={idx}
                    className="bg-indigo-500/25 text-indigo-200 border border-indigo-500/40 px-1.5 py-0.5 rounded-lg font-mono text-xs mx-0.5 inline-flex items-center gap-1 shadow-sm"
                    title="Protected Content: Verbatim preserved citation/figure/formula"
                  >
                    🛡️ {chunk.text}
                  </mark>
                );
              }
              if (chunk.type === 'added') {
                return (
                  <mark
                    key={idx}
                    className="bg-emerald-500/30 text-emerald-100 px-1 py-0.5 rounded-md font-medium mx-0.5 border-b border-emerald-400/50"
                  >
                    {chunk.text}
                  </mark>
                );
              }
              if (chunk.type === 'removed') {
                return (
                  <span
                    key={idx}
                    className="bg-rose-500/20 text-rose-300 line-through decoration-rose-400/70 px-1 py-0.5 rounded mx-0.5 opacity-60"
                  >
                    {chunk.text}
                  </span>
                );
              }
              return <span key={idx} className="text-slate-200">{chunk.text}</span>;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
