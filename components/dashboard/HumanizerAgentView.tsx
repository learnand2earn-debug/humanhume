'use client';

import React, { useState } from 'react';
import {
  HumanizerOptions,
  HumanizerResult,
  HumanizerTone,
  HumanizerIntensity,
  VocabularyStyle,
} from '@/lib/agents/types';
import { downloadFile } from '@/lib/agents/download';
import { safeFetchJson } from '@/lib/utils/safe-json';
import {
  Sparkles,
  Copy,
  Check,
  Download,
  Trash2,
  FileText,
  RotateCcw,
  Zap,
  Sliders,
  ShieldCheck,
  BarChart3,
  BookOpen,
  ArrowRight,
  Split,
} from 'lucide-react';

interface HumanizerAgentViewProps {
  onGenerated?: (result: HumanizerResult) => void;
  initialText?: string;
  initialResult?: HumanizerResult | null;
}

const SAMPLE_AI_TEXT = `In today's fast-paced digital landscape, artificial intelligence plays a crucial role in modern workflows. Furthermore, it is important to note that machine learning algorithms utilize sophisticated neural networks to process information. In conclusion, the seamless integration of technology serves as a testament to ongoing innovation and underscores the significance of digital transformation across industries.`;

export default function HumanizerAgentView({
  onGenerated,
  initialText = '',
  initialResult = null,
}: HumanizerAgentViewProps) {
  const [inputText, setInputText] = useState(initialText);
  const [result, setResult] = useState<HumanizerResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [viewMode, setViewMode] = useState<'output' | 'compare'>('output');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Settings
  const [tone, setTone] = useState<HumanizerTone>('conversational');
  const [intensity, setIntensity] = useState<HumanizerIntensity>('balanced');
  const [vocabulary, setVocabulary] = useState<VocabularyStyle>('rich');
  const [preserveCitations, setPreserveCitations] = useState(true);

  // Quick Generator State
  const [showQuickGen, setShowQuickGen] = useState(false);
  const [quickGenTopic, setQuickGenTopic] = useState('');
  const [isQuickGenerating, setIsQuickGenerating] = useState(false);

  const handleQuickGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickGenTopic.trim()) return;
    setIsQuickGenerating(true);
    try {
      const { ok, data } = await safeFetchJson<{ success: boolean; result: any }>('/api/agents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'generator',
          input: quickGenTopic,
          options: { contentType: 'article', length: 'medium', tone: 'informative', autoHumanize: false },
        }),
      });
      if (ok && data?.success && data.result?.content) {
        setInputText(data.result.content);
        setShowQuickGen(false);
        setQuickGenTopic('');
      }
    } catch {
      // Ignore
    } finally {
      setIsQuickGenerating(false);
    }
  };

  // Stats
  const wordCount = inputText.trim() ? inputText.trim().split(/\s+/).length : 0;
  const charCount = inputText.length;

  const handleHumanize = async () => {
    if (!inputText.trim()) return;

    setLoading(true);
    try {
      const options: HumanizerOptions = {
        tone,
        intensity,
        vocabulary,
        preserveCitations,
      };

      const { ok, data, error } = await safeFetchJson<{
        success: boolean;
        result: HumanizerResult;
        error?: string;
      }>('/api/agents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'humanizer',
          input: inputText,
          options,
        }),
      });

      if (ok && data?.success && data?.result) {
        setResult(data.result);
        if (onGenerated) onGenerated(data.result);
      } else {
        alert(data?.error || error || 'Failed to humanize text. Please try again.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Network request failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!result?.text) return;
    navigator.clipboard.writeText(result.text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (format: 'docx' | 'pdf' | 'txt' | 'md') => {
    if (!result?.text) return;
    setDownloadingFormat(format);
    await downloadFile(result.text, format, `humanized_${Date.now()}`);
    setDownloadingFormat(null);
  };

  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) setInputText(text);
    } catch {
      // Ignore clipboard read permission failure
    }
  };

  return (
    <div className="space-y-6">
      {/* Agent Banner */}
      <div className="glass-card p-5 sm:p-6 rounded-2xl border border-cyan-500/20 relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                AGENT 01
              </span>
              <h2 className="text-xl sm:text-2xl font-bold font-display text-white">
                AI Humanizer Agent
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl">
              Rewrites machine-generated text into authentic, natural human writing. Restructures
              sentence cadence, optimizes vocabulary variance, and eliminates synthetic AI patterns.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="glass-panel px-3.5 py-2 rounded-xl border border-white/10 text-center">
              <div className="text-[10px] text-slate-400 font-semibold uppercase">Target Human Score</div>
              <div className="text-lg font-bold font-mono text-cyan-400">98%+</div>
            </div>
          </div>
        </div>
      </div>

      {/* Control Configuration Bar */}
      <div className="glass-card p-4 rounded-xl border border-white/10 space-y-3">
        <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-1.5">
          <Sliders className="w-3.5 h-3.5 text-cyan-400" />
          <span>Processing Controls</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Tone Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Writing Tone
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  'conversational',
                  'professional',
                  'academic',
                  'casual',
                  'narrative',
                  'creative',
                ] as HumanizerTone[]
              ).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => setTone(t)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium capitalize transition-all ${
                    tone === t
                      ? 'bg-cyan-500/25 text-cyan-200 border border-cyan-500/50 shadow-sm shadow-cyan-500/20'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Intensity Selector */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Humanization Intensity
            </label>
            <div className="grid grid-cols-3 gap-1.5">
              {(
                [
                  { id: 'light', label: 'Light Polish' },
                  { id: 'balanced', label: 'Balanced' },
                  { id: 'aggressive', label: 'Ultra High' },
                ] as const
              ).map((lvl) => (
                <button
                  key={lvl.id}
                  type="button"
                  onClick={() => setIntensity(lvl.id)}
                  className={`px-2 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    intensity === lvl.id
                      ? 'bg-indigo-500/25 text-indigo-200 border border-indigo-500/50 shadow-sm shadow-indigo-500/20'
                      : 'bg-white/[0.03] text-slate-400 hover:text-white border border-white/5'
                  }`}
                >
                  {lvl.label}
                </button>
              ))}
            </div>
          </div>

          {/* Vocabulary Style & Guardrails */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              Lexical Variance & Guardrails
            </label>
            <div className="flex flex-col gap-2">
              <select
                value={vocabulary}
                onChange={(e) => setVocabulary(e.target.value as VocabularyStyle)}
                className="w-full bg-[#0a0f24] text-xs text-white border border-white/10 rounded-lg px-3 py-1.5 focus:border-cyan-500 focus:outline-none"
              >
                <option value="rich">Rich Lexical Diversity (High burstiness)</option>
                <option value="standard">Natural Standard Vocabulary</option>
                <option value="lexical_diversity">Dynamic Native Phrasing</option>
              </select>

              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={preserveCitations}
                  onChange={(e) => setPreserveCitations(e.target.checked)}
                  className="rounded border-white/20 text-cyan-500 focus:ring-0 bg-transparent"
                />
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Preserve Citations, Headings & Technical Terms</span>
              </label>
            </div>
          </div>
        </div>
      </div>

      {/* Main Dual-Pane Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Pane: Input Textarea */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-sm text-white">AI-Generated Source Text</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setShowQuickGen(!showQuickGen)}
                  className="px-2.5 py-1 rounded-lg text-xs font-semibold text-emerald-300 hover:bg-emerald-500/20 border border-emerald-500/40 flex items-center gap-1 transition-all"
                >
                  <Sparkles className="w-3 h-3 text-emerald-400" />
                  <span>AI Generator</span>
                </button>
                <button
                  type="button"
                  onClick={() => setInputText(SAMPLE_AI_TEXT)}
                  className="px-2.5 py-1 rounded-lg text-xs font-medium text-cyan-300 hover:bg-cyan-500/10 border border-cyan-500/20 transition-colors"
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

            {showQuickGen && (
              <form onSubmit={handleQuickGenerate} className="mb-3 p-3 rounded-xl bg-emerald-950/30 border border-emerald-500/30 space-y-2">
                <div className="text-[11px] font-bold text-emerald-300 flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5" />
                    Instant AI Draft Generator
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowQuickGen(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={quickGenTopic}
                    onChange={(e) => setQuickGenTopic(e.target.value)}
                    placeholder="Enter topic: e.g. Impact of AI on modern journalism..."
                    className="flex-1 bg-[#050b18] border border-white/10 rounded-lg px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-400"
                  />
                  <button
                    type="submit"
                    disabled={isQuickGenerating || !quickGenTopic.trim()}
                    className="px-3 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-black font-bold text-xs flex items-center gap-1 transition-all"
                  >
                    {isQuickGenerating ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </form>
            )}

            <textarea
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Paste or type AI-generated text here to transform into natural human writing..."
              rows={12}
              className="w-full bg-[#070b18] border border-white/10 rounded-xl p-4 text-sm text-slate-200 placeholder-slate-500 focus:border-cyan-500 focus:outline-none focus:ring-1 focus:ring-cyan-500 transition-all font-sans leading-relaxed resize-none"
            />
          </div>

          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <div className="flex items-center gap-3 text-xs font-mono text-slate-400">
              <span>{wordCount} words</span>
              <span>•</span>
              <span>{charCount} characters</span>
            </div>

            <button
              onClick={handleHumanize}
              disabled={loading || !inputText.trim()}
              className={`px-5 py-2.5 rounded-xl text-sm font-bold flex items-center gap-2 shadow-lg transition-all duration-300 ${
                loading || !inputText.trim()
                  ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                  : 'bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white shadow-cyan-500/25 hover:scale-[1.02]'
              }`}
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                  <span>Humanizing Text...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200 animate-pulse" />
                  <span>Humanize Content</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Pane: Transformed Output & Scores */}
        <div className="glass-card p-5 rounded-2xl border border-white/10 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span className="font-semibold text-sm text-white">Humanized Output</span>
              </div>

              {result && (
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setViewMode(viewMode === 'output' ? 'compare' : 'output')}
                    className={`px-2.5 py-1 rounded-lg text-xs font-medium flex items-center gap-1 border transition-all ${
                      viewMode === 'compare'
                        ? 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40'
                        : 'text-slate-300 hover:text-white border-white/10'
                    }`}
                  >
                    <Split className="w-3 h-3" />
                    <span>{viewMode === 'compare' ? 'Standard' : 'Compare'}</span>
                  </button>

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

            {/* Metrics Ribbon if result exists */}
            {result ? (
              <div className="mb-4 grid grid-cols-4 gap-2">
                <div className="bg-[#0b1228] p-2.5 rounded-xl border border-emerald-500/20 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Human Score</div>
                  <div className="text-base font-bold font-mono text-emerald-400">
                    {result.humanScore}%
                  </div>
                </div>
                <div className="bg-[#0b1228] p-2.5 rounded-xl border border-cyan-500/20 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Perplexity</div>
                  <div className="text-base font-bold font-mono text-cyan-300">
                    {result.perplexity}
                  </div>
                </div>
                <div className="bg-[#0b1228] p-2.5 rounded-xl border border-indigo-500/20 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Burstiness</div>
                  <div className="text-base font-bold font-mono text-indigo-300">
                    {result.burstiness}
                  </div>
                </div>
                <div className="bg-[#0b1228] p-2.5 rounded-xl border border-purple-500/20 text-center">
                  <div className="text-[10px] uppercase font-semibold text-slate-400">Reading Ease</div>
                  <div className="text-base font-bold font-mono text-purple-300">
                    {result.readingEase}
                  </div>
                </div>
              </div>
            ) : null}

            {/* Main Output Content Container */}
            {viewMode === 'compare' && result ? (
              <div className="grid grid-cols-2 gap-3 h-[288px] overflow-y-auto p-3 bg-[#070b18] border border-white/10 rounded-xl text-xs font-sans leading-relaxed">
                <div className="border-r border-white/10 pr-2">
                  <div className="text-[10px] font-bold uppercase text-slate-400 mb-1">Original Text:</div>
                  <div className="text-slate-400">{result.originalText}</div>
                </div>
                <div className="pl-1">
                  <div className="text-[10px] font-bold uppercase text-emerald-400 mb-1">Humanized Text:</div>
                  <div className="text-slate-100">{result.text}</div>
                </div>
              </div>
            ) : (
              <textarea
                value={result?.text || ''}
                readOnly={!result}
                onChange={(e) => {
                  if (result) {
                    setResult({ ...result, text: e.target.value });
                  }
                }}
                placeholder="The humanized output will appear here with dynamic burstiness, adjusted tone, and human cadence..."
                rows={result ? 9 : 12}
                className="w-full bg-[#070b18] border border-white/10 rounded-xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:border-emerald-500 focus:outline-none font-sans leading-relaxed resize-none"
              />
            )}

            {/* Improvements Tags */}
            {result?.improvementsApplied && (
              <div className="mt-3 flex flex-wrap gap-1.5">
                {result.improvementsApplied.map((imp, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[11px] px-2.5 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/20"
                  >
                    <Check className="w-2.5 h-2.5" />
                    <span>{imp}</span>
                  </span>
                ))}
              </div>
            )}
          </div>

          {/* Download & Export Toolbar */}
          <div className="mt-4 pt-3 border-t border-white/[0.06] flex items-center justify-between">
            <div className="text-xs font-mono text-slate-400">
              {result ? `${result.wordCount} human words • ${result.processingTimeMs}ms` : 'Ready'}
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
