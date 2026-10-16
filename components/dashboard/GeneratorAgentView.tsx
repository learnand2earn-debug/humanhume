'use client';

import React, { useState } from 'react';
import {
  GeneratorContentType,
  GeneratorLength,
  GeneratorOptions,
  GeneratorResult,
  GeneratorTone,
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
  Send,
  Mail,
  GraduationCap,
  PenTool,
  Clock,
  CheckCircle2,
  ListOrdered,
  Layers,
} from 'lucide-react';

interface GeneratorAgentViewProps {
  onGenerated?: (result: GeneratorResult) => void;
  onTransferToHumanizer?: (text: string) => void;
  initialPrompt?: string;
  initialResult?: GeneratorResult | null;
}

const PRESET_TOPICS = [
  {
    label: 'AI in Healthcare',
    prompt: 'The transformative role of artificial intelligence in early clinical diagnosis and precision medicine',
    type: 'article' as GeneratorContentType,
  },
  {
    label: 'SaaS Growth Playbook',
    prompt: 'Sustainable SaaS retention strategies: Moving beyond acquisition to high-velocity net revenue expansion',
    type: 'blog_post' as GeneratorContentType,
  },
  {
    label: 'Climate Policy Report',
    prompt: 'Strategic assessment of next-generation renewable grid architectures and decarbonization milestones',
    type: 'report' as GeneratorContentType,
  },
  {
    label: 'Modern Education Essay',
    prompt: 'Critical analysis of experiential learning versus standardized evaluation in modern university curricula',
    type: 'essay' as GeneratorContentType,
  },
  {
    label: 'Executive Proposal Email',
    prompt: 'Strategic partnership proposal for integrating autonomous workflow automation across enterprise operations',
    type: 'email' as GeneratorContentType,
  },
];

const CONTENT_TYPES: { id: GeneratorContentType; label: string; icon: React.ElementType }[] = [
  { id: 'article', label: 'Article', icon: FileText },
  { id: 'essay', label: 'Essay', icon: BookOpen },
  { id: 'blog_post', label: 'Blog Post', icon: Sparkles },
  { id: 'academic_paper', label: 'Academic Paper', icon: GraduationCap },
  { id: 'report', label: 'Executive Report', icon: BarChart3 },
  { id: 'email', label: 'Email Pitch', icon: Mail },
  { id: 'story', label: 'Creative Story', icon: PenTool },
  { id: 'speech', label: 'Keynote Speech', icon: Zap },
];

export default function GeneratorAgentView({
  onGenerated,
  onTransferToHumanizer,
  initialPrompt = '',
  initialResult = null,
}: GeneratorAgentViewProps) {
  const [prompt, setPrompt] = useState(initialPrompt);
  const [result, setResult] = useState<GeneratorResult | null>(initialResult);
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'content' | 'humanized' | 'outline'>('content');
  const [downloadingFormat, setDownloadingFormat] = useState<string | null>(null);

  // Settings
  const [contentType, setContentType] = useState<GeneratorContentType>('article');
  const [length, setLength] = useState<GeneratorLength>('medium');
  const [tone, setTone] = useState<GeneratorTone>('informative');
  const [targetAudience, setTargetAudience] = useState('');
  const [autoHumanize, setAutoHumanize] = useState(true);

  const handleGenerate = async () => {
    if (!prompt.trim()) return;

    setLoading(true);
    try {
      const options: GeneratorOptions = {
        contentType,
        length,
        tone,
        targetAudience: targetAudience.trim() || undefined,
        autoHumanize,
      };

      const { ok, data, error } = await safeFetchJson<{
        success: boolean;
        result: GeneratorResult;
        error?: string;
      }>('/api/agents/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          agentType: 'generator',
          input: prompt,
          options,
        }),
      });

      if (ok && data?.success && data?.result) {
        setResult(data.result);
        if (data.result.humanizedContent && autoHumanize) {
          setActiveTab('content');
        }
        if (onGenerated) onGenerated(data.result);
      } else {
        alert(data?.error || error || 'Failed to generate content. Please try again.');
      }
    } catch (err: any) {
      alert(`Error: ${err.message || 'Network request failed'}`);
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = (textToCopy?: string) => {
    const text = textToCopy || (activeTab === 'humanized' && result?.humanizedContent ? result.humanizedContent : result?.content);
    if (!text) return;
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = async (format: 'txt' | 'md' | 'docx' | 'pdf') => {
    const text = activeTab === 'humanized' && result?.humanizedContent ? result.humanizedContent : result?.content;
    if (!text) return;
    setDownloadingFormat(format);
    try {
      const fileName = (result?.title || 'Generated_Content')
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '_')
        .slice(0, 40);
      await downloadFile(text, format, fileName);
    } finally {
      setDownloadingFormat(null);
    }
  };

  const handleTransfer = () => {
    const textToTransfer = activeTab === 'humanized' && result?.humanizedContent
      ? result.humanizedContent
      : result?.content;
    if (!textToTransfer) return;
    if (onTransferToHumanizer) {
      onTransferToHumanizer(textToTransfer);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner: Generator + Humanizer Synergy */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/40 via-blue-950/30 to-purple-950/40 border border-cyan-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg shadow-cyan-950/20">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shrink-0">
            <Sparkles className="w-5 h-5 text-cyan-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Autonomous AI Content Generator</h4>
              <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                With 1-Click Humanizer Bridge
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Draft comprehensive essays, articles, and briefs, then immediately pass to the Humanizer to bypass AI detectors.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5" />
            98%+ Bypass Ready
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Control Panel & Prompt Input (5 cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
            {/* Topic / Prompt */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <PenTool className="w-3.5 h-3.5 text-cyan-400" />
                  Topic, Prompt, or Subject
                </label>
                {prompt && (
                  <button
                    onClick={() => setPrompt('')}
                    className="text-[11px] text-slate-400 hover:text-red-400 flex items-center gap-1 transition-colors"
                  >
                    <Trash2 className="w-3 h-3" /> Clear
                  </button>
                )}
              </div>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="e.g. Write a comprehensive critical analysis of artificial intelligence in modern cybersecurity, highlighting zero-trust architectures..."
                className="w-full h-32 bg-[#080d1e] border border-white/10 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
              />
            </div>

            {/* Quick Presets */}
            <div>
              <div className="text-[11px] font-mono uppercase text-slate-400 font-bold mb-1.5">
                Quick Inspiration Presets
              </div>
              <div className="flex flex-wrap gap-1.5">
                {PRESET_TOPICS.map((p, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => {
                      setPrompt(p.prompt);
                      setContentType(p.type);
                    }}
                    className="px-2.5 py-1 rounded-lg text-[11px] bg-white/[0.04] hover:bg-cyan-500/20 text-slate-300 hover:text-cyan-300 border border-white/5 hover:border-cyan-500/40 transition-all text-left"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Content Type Selector */}
            <div>
              <label className="text-xs font-bold text-slate-200 block mb-2">Content Type</label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {CONTENT_TYPES.map((ct) => {
                  const Icon = ct.icon;
                  const isSelected = contentType === ct.id;
                  return (
                    <button
                      key={ct.id}
                      type="button"
                      onClick={() => setContentType(ct.id)}
                      className={`p-2 rounded-xl text-left border transition-all flex items-center gap-1.5 text-xs ${
                        isSelected
                          ? 'bg-cyan-500/20 border-cyan-400/50 text-white shadow-sm shadow-cyan-500/20 font-semibold'
                          : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-slate-200 hover:bg-white/[0.05]'
                      }`}
                    >
                      <Icon className={`w-3.5 h-3.5 ${isSelected ? 'text-cyan-300' : 'text-slate-500'}`} />
                      <span className="truncate">{ct.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Length & Tone Selectors */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Target Length</label>
                <select
                  value={length}
                  onChange={(e) => setLength(e.target.value as GeneratorLength)}
                  className="w-full bg-[#080d1e] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="short">Short (~350 words)</option>
                  <option value="medium">Medium (~650 words)</option>
                  <option value="long">Long (~1,200 words)</option>
                  <option value="comprehensive">Comprehensive (~1,800w)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] font-bold text-slate-300 block mb-1">Stylistic Tone</label>
                <select
                  value={tone}
                  onChange={(e) => setTone(e.target.value as GeneratorTone)}
                  className="w-full bg-[#080d1e] border border-white/10 rounded-xl px-2.5 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="informative">Informative & Clear</option>
                  <option value="academic">Academic & Rigorous</option>
                  <option value="persuasive">Persuasive & Compelling</option>
                  <option value="executive">Executive & Strategic</option>
                  <option value="creative">Creative & Narrative</option>
                  <option value="casual">Casual & Conversational</option>
                </select>
              </div>
            </div>

            {/* Target Audience */}
            <div>
              <label className="text-[11px] font-bold text-slate-300 block mb-1">
                Target Audience <span className="text-slate-500 font-normal">(Optional)</span>
              </label>
              <input
                type="text"
                value={targetAudience}
                onChange={(e) => setTargetAudience(e.target.value)}
                placeholder="e.g. University professors, executive buyers, tech founders..."
                className="w-full bg-[#080d1e] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            {/* Auto Humanize Switch */}
            <div className="p-3 rounded-xl bg-white/[0.03] border border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <div>
                  <div className="text-xs font-bold text-white">Auto-Humanize Draft</div>
                  <div className="text-[10px] text-slate-400">Generates 98% undetectable bypass draft alongside output</div>
                </div>
              </div>
              <input
                type="checkbox"
                checked={autoHumanize}
                onChange={(e) => setAutoHumanize(e.target.checked)}
                className="w-4 h-4 accent-cyan-500 cursor-pointer"
              />
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={loading || !prompt.trim()}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-500 via-blue-600 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 disabled:opacity-50 text-white font-bold text-xs shadow-lg shadow-cyan-500/25 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {loading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Generating High-Depth Content...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Generate Content Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Right Output & Humanizer Bridge Area (7 cols) */}
        <div className="lg:col-span-7 space-y-4">
          {result ? (
            <div className="glass-panel p-5 rounded-2xl border border-white/10 space-y-4">
              {/* Header with Title & Telemetry */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/10 gap-2">
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-white flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                    <span>{result.title}</span>
                  </h3>
                  <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-400 font-mono">
                    <span>{result.wordCount} words</span>
                    <span>•</span>
                    <span>{result.charCount} characters</span>
                    <span>•</span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3 text-cyan-400" />
                      {result.readingTimeMinutes} min read
                    </span>
                    {result.humanScore && (
                      <>
                        <span>•</span>
                        <span className="text-emerald-400 font-bold flex items-center gap-1">
                          <ShieldCheck className="w-3 h-3" />
                          {result.humanScore}% Human Score
                        </span>
                      </>
                    )}
                  </div>
                </div>

                {/* Tab Switcher if autoHumanize */}
                {result.humanizedContent && (
                  <div className="flex items-center bg-[#080d1e] p-1 rounded-xl border border-white/10 shrink-0">
                    <button
                      onClick={() => setActiveTab('content')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                        activeTab === 'content'
                          ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      AI Draft
                    </button>
                    <button
                      onClick={() => setActiveTab('humanized')}
                      className={`px-2.5 py-1 rounded-lg text-xs font-semibold flex items-center gap-1 transition-all ${
                        activeTab === 'humanized'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <ShieldCheck className="w-3 h-3 text-emerald-400" />
                      Humanized
                    </button>
                    {result.outline && result.outline.length > 0 && (
                      <button
                        onClick={() => setActiveTab('outline')}
                        className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                          activeTab === 'outline'
                            ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                            : 'text-slate-400 hover:text-white'
                        }`}
                      >
                        Outline
                      </button>
                    )}
                  </div>
                )}
              </div>

              {/* Main Text Content Box */}
              <div className="relative">
                {activeTab === 'outline' && result.outline ? (
                  <div className="space-y-3 bg-[#080d1e] p-4 rounded-xl border border-white/5 min-h-[300px]">
                    <div className="text-xs font-bold text-white uppercase font-mono tracking-wider flex items-center gap-1.5">
                      <ListOrdered className="w-4 h-4 text-purple-400" />
                      Structured Document Blueprint
                    </div>
                    <ul className="space-y-2">
                      {result.outline.map((item, i) => (
                        <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                          <span className="text-purple-400 font-mono font-bold">{i + 1}.</span>
                          <span>{item}</span>
                        </li>
                      ))}
                    </ul>

                    {result.keyTakeaways && result.keyTakeaways.length > 0 && (
                      <div className="pt-3 border-t border-white/10 space-y-2">
                        <div className="text-xs font-bold text-cyan-300 uppercase font-mono tracking-wider">
                          Key Strategic Takeaways
                        </div>
                        <ul className="space-y-1.5">
                          {result.keyTakeaways.map((takeaway, i) => (
                            <li key={i} className="text-xs text-slate-300 flex items-start gap-2">
                              <span className="text-cyan-400">•</span>
                              <span>{takeaway}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-[#080d1e] p-4 rounded-xl border border-white/5 min-h-[300px] max-h-[500px] overflow-y-auto text-xs text-slate-200 leading-relaxed whitespace-pre-wrap font-sans selection:bg-cyan-500/30">
                    {activeTab === 'humanized' && result.humanizedContent ? (
                      <div>
                        <div className="mb-3 px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-[11px] flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4" />
                          <span>
                            <strong>AI Detector Bypass Active:</strong> Robotic cliches stripped, dynamic cadence added, citations 100% frozen.
                          </span>
                        </div>
                        {result.humanizedContent}
                      </div>
                    ) : (
                      result.content
                    )}
                  </div>
                )}
              </div>

              {/* Action Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleCopy()}
                    className="px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied to Clipboard' : 'Copy Text'}</span>
                  </button>

                  {/* Export Options */}
                  <div className="flex items-center gap-1">
                    {(['txt', 'docx', 'pdf'] as const).map((fmt) => (
                      <button
                        key={fmt}
                        onClick={() => handleDownload(fmt)}
                        disabled={downloadingFormat !== null}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/10 text-slate-400 hover:text-white border border-white/5 text-[11px] uppercase font-mono transition-colors"
                      >
                        {downloadingFormat === fmt ? '...' : fmt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* THE 1-CLICK HUMANIZER BRIDGE BUTTON */}
                <button
                  onClick={handleTransfer}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-white font-bold text-xs shadow-lg shadow-emerald-500/25 flex items-center gap-2 transition-all cursor-pointer"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Transfer to AI Humanizer Studio</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-8 rounded-2xl border border-white/10 flex flex-col items-center justify-center text-center space-y-4 min-h-[420px]">
              <div className="w-16 h-16 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
                <Sparkles className="w-8 h-8" />
              </div>
              <div className="max-w-md space-y-1.5">
                <h4 className="text-sm font-bold text-white">Generate Any Content in Seconds</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Enter a topic or select a preset on the left. The generator produces structured, high-fidelity content ready for immediate humanization and detector bypass.
                </p>
              </div>
              <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-cyan-400" /> Multi-Format Output
                </span>
                <span>•</span>
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" /> 1-Click Humanizer Transfer
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
