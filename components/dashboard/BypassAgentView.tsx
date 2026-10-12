'use client';

import React, { useState } from 'react';
import {
  BypassOptions,
  BypassResult,
  BypassTransformationStyle,
  ParaphrasingDepth,
  BypassTone,
  BypassDiffChunk,
} from '@/lib/agents/types';
import { downloadFile } from '@/lib/agents/download';
import {
  Shield,
  Copy,
  Check,
  Download,
  Trash2,
  FileText,
  Sliders,
  ShieldCheck,
  Split,
  Eye,
  Info,
  Layers,
  ArrowRight,
  TrendingDown,
  Sparkles,
} from 'lucide-react';

interface BypassAgentViewProps {
  onGenerated?: (result: BypassResult) => void;
  initialText?: string;
  initialResult?: BypassResult | null;
}

const SAMPLE_BYPASS_TEXT = `Traditional search engines index documents based on keyword frequencies. Because the volume of unstructured enterprise data has grown exponentially, legacy retrieval algorithms fail to identify semantic intent. Consequently, organizations must deploy dense neural embeddings in order to facilitate contextual vector search and improve analytical decision-making.`;

export default function BypassAgentView({
  onGenerated,
  initialText = '',
  initialResult = null,
}: BypassAgentViewProps) {
  const [inputText, setInputText] = useState(initialText);
  const [result, setResult] = useState<BypassResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewTab, setViewTab] = useState<'diff' | 'clean'>('diff');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Settings
  const [transformationStyle, setTransformationStyle] =
    useState<BypassTransformationStyle>('deep_restructure');
  const [paraphrasingDepth, setParaphrasingDepth] = useState<ParaphrasingDepth>('dynamic');
  const [tone, setTone] = useState<BypassTone>('formal');
  const [protectFactualEntities, setProtectFactualEntities] = useState(true);

  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;

  const handleTransform = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const options: BypassOptions = {
        transformationStyle,
        paraphrasingDepth,
        tone,
        protectFactualEntities,
      };

      const res = await fetch('/api/agents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'bypass',
          input: inputText,
          options,
        }),
      });

      const data = await res.json();
      if (data.success && data.result) {
        setResult(data.result);
        if (onGenerated) onGenerated(data.result);
      } else {
        alert(data.error || 'Failed to transform content');
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Network request failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.transformedText) return;
    navigator.clipboard.writeText(result.transformedText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (format: 'docx' | 'pdf' | 'txt' | 'md') => {
    if (!result?.transformedText) return;
    setDownloadingFormat(format);
    await downloadFile(result.transformedText, format, `bypass_transform_${Date.now()}`);
    setDownloadingFormat(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputText(text);
    } catch {
      // Ignore
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent Banner */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-indigo-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                AGENT 02
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                AI Bypass / Content Transformation Agent
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Provides advanced text transformation, syntactic clause variation, and writing-style adaptation.
              Includes high-precision side-by-side input/output delta comparison to verify structural uniqueness.
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <div className="glass-panel px-3.5 py-2 rounded-xl border border-emerald-500/20 text-center">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">AI Detectability</div>
              <div className="text-lg font-bold font-mono text-emerald-400">&lt; 3% Low</div>
            </div>
          </div>
        </div>

        {/* Ethical compliance disclaimer note */}
        <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center gap-2 text-xs text-slate-400">
          <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
          <span>
            Dedicated to legitimate readability improvement, professional stylistic re-engineering,
            and factual content transformation.
          </span>
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="glass-card p-4 rounded-xl border border-white/10 space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-indigo-400" />
          <span>Transformation Parameters</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Transformation Style */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Transformation Architecture
            </label>
            <div className="flex flex-col gap-1.5">
              <select
                value={transformationStyle}
                onChange={(e) =>
                  setTransformationStyle(e.target.value as BypassTransformationStyle)
                }
                className="w-full bg-[#0a0f24] text-xs text-white border border-white/10 rounded-lg px-3 py-2 focus:border-indigo-500 focus:outline-none"
              >
                <option value="deep_restructure">Deep Structural Clause Inversion</option>
                <option value="academic_rigor">Academic Rigor & Terminology Focus</option>
                <option value="executive_brief">Executive Briefing & High Precision</option>
                <option value="narrative">Engaging Narrative Prose</option>
                <option value="anti_repetition">Anti-Repetition & Flow Balancing</option>
              </select>
            </div>
          </div>

          {/* Paraphrasing Depth */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Paraphrasing Depth
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'mild', label: 'Mild' },
                  { id: 'dynamic', label: 'Dynamic' },
                  { id: 'radical', label: 'Radical Rewrite' },
                ] as const
              ).map((d) => (
                <button
                  key={d.id}
                  type="button"
                  onClick={() => setParaphrasingDepth(d.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    paraphrasingDepth === d.id
                      ? 'bg-indigo-500/30 text-indigo-200 border border-indigo-500/50 shadow-sm shadow-indigo-500/20'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Tone & Fact Preservation */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Tone & Entity Integrity
            </label>
            <div className="flex flex-col gap-2">
              <select
                value={tone}
                onChange={(e) => setTone(e.target.value as BypassTone)}
                className="w-full bg-[#0a0f24] text-xs text-white border border-white/10 rounded-lg px-3 py-1.5 focus:border-indigo-500 focus:outline-none"
              >
                <option value="formal">Authoritative Formal</option>
                <option value="semi_formal">Professional Semi-Formal</option>
                <option value="persuasive">Persuasive & Compelling</option>
                <option value="objective">Strictly Objective</option>
              </select>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={protectFactualEntities}
                  onChange={(e) => setProtectFactualEntities(e.target.checked)}
                  className="rounded border-white/20 text-indigo-500 focus:ring-0 bg-transparent"
                />
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Protect Numbers, Dates, Equations & Citations</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Pane: Input */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-sm text-white">Original Document / Text</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setInputText(SAMPLE_BYPASS_TEXT)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-indigo-300 hover:bg-indigo-500/10 border border-indigo-500/20 transition-colors"
                >
                  Load Sample
                </button>
                <button
                  type="button"
                  onClick={handlePaste}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-slate-300 hover:bg-white/10 border border-white/10 transition-colors"
                >
                  Paste
                </button>
                {inputText && (
                  <button
                    type="button"
                    onClick={() => setInputText('')}
                    className="p-1 rounded-lg text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                    title="Clear"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste content here to apply advanced bypass restructuring and side-by-side comparison..."
              rows={12}
              className="w-full bg-[#070b18] border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all font-sans leading-relaxed resize-none"
            />
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <div className="text-xs font-mono text-slate-400">{wordCount} original words</div>

            <button
              onClick={handleTransform}
              disabled={loading || !inputText.trim()}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all duration-300 ${
                loading || !inputText.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-indigo-600 via-purple-600 to-cyan-500 hover:from-indigo-500 hover:to-cyan-400 text-white shadow-indigo-500/25 hover:scale-[1.02]'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Transforming & Inverting Clauses...</span>
                </>
              ) : (
                <>
                  <Shield className="w-4 h-4 text-indigo-200" />
                  <span>Execute Bypass & Transform</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Pane: Transformed Content & Side-by-Side Diff */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-400" />
                <span className="font-semibold text-sm text-white">Transformed Results</span>
              </div>

              {result && (
                <div className="flex items-center gap-1.5">
                  <div className="flex bg-[#070b18] p-0.5 rounded-lg border border-white/10">
                    <button
                      type="button"
                      onClick={() => setViewTab('diff')}
                      className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                        viewTab === 'diff'
                          ? 'bg-indigo-500/30 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Split className="w-3 h-3" />
                      <span>Diff View</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setViewTab('clean')}
                      className={`px-2 py-1 rounded-md text-xs font-semibold flex items-center gap-1 transition-all ${
                        viewTab === 'clean'
                          ? 'bg-indigo-500/30 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Eye className="w-3 h-3" />
                      <span>Clean Text</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={handleCopy}
                    className="px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 bg-white/10 hover:bg-white/15 text-white border border-white/10 transition-colors"
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
                </div>
              )}
            </div>

            {/* Metrics Ribbon */}
            {result ? (
              <div className="mb-4 grid grid-cols-3 gap-2">
                <div className="bg-[#0b1228] p-2.5 rounded-xl border border-indigo-500/20 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Similarity Index
                  </div>
                  <div className="text-base font-bold font-mono text-indigo-300">
                    {result.similarityScore}%
                  </div>
                </div>
                <div className="bg-[#0b1228] p-2.5 rounded-xl border border-purple-500/20 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Rewrite Intensity
                  </div>
                  <div className="text-base font-bold font-mono text-purple-300">
                    {result.rewriteIntensity}%
                  </div>
                </div>
                <div className="bg-[#0b1228] p-2.5 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">
                    Detection Risk
                  </div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {result.aiDetectionLikelihood}% Minimal
                  </div>
                </div>
              </div>
            ) : null}

            {/* Side-by-Side Diff Display or Clean Text */}
            {result ? (
              viewTab === 'diff' ? (
                <div className="h-[280px] overflow-y-auto p-4 bg-[#070b18] border border-white/10 rounded-xl text-xs font-sans leading-relaxed">
                  <div className="mb-2 flex items-center gap-3 text-[11px] pb-2 border-b border-white/[0.08]">
                    <span className="flex items-center gap-1 text-emerald-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/30 border border-emerald-400" />
                      Added Phrasing
                    </span>
                    <span className="flex items-center gap-1 text-rose-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-rose-500/30 border border-rose-400" />
                      Removed Clichés
                    </span>
                    <span className="flex items-center gap-1 text-slate-400">
                      <span className="w-2.5 h-2.5 rounded-full bg-slate-700" />
                      Unchanged Content
                    </span>
                  </div>

                  <div className="leading-7 font-sans">
                    {result.diffChunks.map((chunk, i) => {
                      if (chunk.type === 'added') {
                        return (
                          <span
                            key={i}
                            className="bg-emerald-500/20 text-emerald-200 border-b border-emerald-400/50 px-1 py-0.5 rounded mx-0.5"
                          >
                            {chunk.value}
                          </span>
                        );
                      }
                      if (chunk.type === 'removed') {
                        return (
                          <span
                            key={i}
                            className="bg-rose-500/20 text-rose-300 line-through px-1 py-0.5 rounded mx-0.5 opacity-70"
                          >
                            {chunk.value}
                          </span>
                        );
                      }
                      return <span key={i} className="text-slate-300">{chunk.value}</span>;
                    })}
                  </div>
                </div>
              ) : (
                <textarea
                  value={result.transformedText}
                  onChange={(e) =>
                    setResult({ ...result, transformedText: e.target.value })
                  }
                  rows={10}
                  className="w-full bg-[#070b18] border border-white/10 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none font-sans leading-relaxed resize-none"
                />
              )
            ) : (
              <div className="h-[280px] bg-[#070b18] border border-white/10 rounded-xl p-8 flex flex-col items-center justify-center text-center text-slate-500">
                <Split className="w-10 h-10 text-slate-600 mb-3" />
                <p className="text-sm font-medium text-slate-400">Side-by-side diff comparison will appear here</p>
                <p className="text-xs text-slate-500 max-w-sm mt-1">
                  Click &apos;Execute Bypass &amp; Transform&apos; to process your text with syntactic inversion and view token changes.
                </p>
              </div>
            )}

            {/* Highlights badges */}
            {result?.transformationHighlights && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.transformationHighlights.map((hl, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20"
                  >
                    <Check className="w-2.5 h-2.5 text-indigo-400" />
                    <span>{hl}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Download & Export Toolbar */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <div className="text-xs font-mono text-slate-400">
              {result ? `${result.transformedWordCount} transformed words • ${result.processingTimeMs}ms` : 'Ready'}
            </div>

            {result && (
              <div className="flex items-center gap-1.5">
                <span className="text-xs text-slate-400 font-medium mr-1">Download:</span>
                {(['docx', 'pdf', 'txt', 'md'] as const).map((fmt) => (
                  <button
                    key={fmt}
                    onClick={() => handleDownload(fmt)}
                    disabled={downloadingFormat === fmt}
                    className="px-2 py-1 rounded-lg text-xs font-semibold uppercase bg-white/5 hover:bg-white/15 text-slate-300 hover:text-white border border-white/10 transition-colors"
                  >
                    {downloadingFormat === fmt ? '...' : `.${fmt}`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
