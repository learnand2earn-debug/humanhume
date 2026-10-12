'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  User,
  Copy,
  Check,
  Download,
  Eye,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  FileText,
  FileSpreadsheet,
  Code,
  Image as ImageIcon,
  ExternalLink,
  ShieldCheck,
  Bug,
  CheckCircle2,
  ThumbsUp,
  ThumbsDown,
  RotateCcw,
} from 'lucide-react';
import { OmniMessage, OmniArtifact } from '@/lib/omni/types';

interface OmniMessageItemProps {
  message: OmniMessage;
  onOpenArtifact: (artifact: OmniArtifact) => void;
  onRegenerate?: () => void;
}

export default function OmniMessageItem({
  message,
  onOpenArtifact,
  onRegenerate,
}: OmniMessageItemProps) {
  const [copied, setCopied] = useState(false);
  const [isThoughtOpen, setIsThoughtOpen] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [feedback, setFeedback] = useState<'liked' | 'disliked' | null>(null);

  const isUser = message.role === 'user';

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Text to Speech playback
  const handleToggleSpeak = () => {
    if (typeof window === 'undefined' || !('speechSynthesis' in window)) return;

    if (isSpeaking) {
      window.speechSynthesis.cancel();
      setIsSpeaking(false);
    } else {
      window.speechSynthesis.cancel();
      // Strip markdown symbols for clean audio
      const cleanText = message.content.replace(/[*_#`[\]()]/g, '');
      const utterance = new SpeechSynthesisUtterance(cleanText);
      utterance.onend = () => setIsSpeaking(false);
      utterance.onerror = () => setIsSpeaking(false);
      window.speechSynthesis.speak(utterance);
      setIsSpeaking(true);
    }
  };

  // Helper to render code blocks with copy & canvas buttons
  const renderFormattedContent = (content: string) => {
    const parts = content.split(/(```[\s\S]*?```)/g);

    return parts.map((part, index) => {
      if (part.startsWith('```') && part.endsWith('```')) {
        const lines = part.slice(3, -3).trim().split('\n');
        const lang = lines[0].trim() || 'text';
        const code = lines.slice(lang ? 1 : 0).join('\n');

        return (
          <div
            key={index}
            className="my-4 rounded-2xl bg-[#090d1f] border border-slate-800 overflow-hidden shadow-xl"
          >
            <div className="flex items-center justify-between px-4 py-2.5 bg-[#0f152e] border-b border-slate-800 text-xs font-mono text-slate-400">
              <span className="uppercase font-semibold text-cyan-400">{lang}</span>
              <div className="flex items-center gap-2">
                <button
                  onClick={() =>
                    onOpenArtifact({
                      id: `code_${Date.now()}_${index}`,
                      title: `Snippet (${lang})`,
                      type: 'code',
                      language: lang,
                      content: code,
                    })
                  }
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  <Eye className="w-3.5 h-3.5" /> Open in Canvas
                </button>
                <button
                  onClick={() => handleCopy(code)}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  Copy
                </button>
              </div>
            </div>
            <pre className="p-4 overflow-x-auto font-mono text-xs text-slate-200 leading-relaxed">
              <code>{code}</code>
            </pre>
          </div>
        );
      }

      // Format markdown headers, bullets, bold
      const formattedLines = part.split('\n').map((line, lIdx) => {
        if (line.startsWith('### ')) {
          return (
            <h4 key={lIdx} className="text-base font-bold text-white mt-4 mb-2">
              {line.replace(/^###\s+/, '')}
            </h4>
          );
        }
        if (line.startsWith('## ')) {
          return (
            <h3 key={lIdx} className="text-lg font-bold text-cyan-200 mt-5 mb-2">
              {line.replace(/^##\s+/, '')}
            </h3>
          );
        }
        if (line.startsWith('# ')) {
          return (
            <h2 key={lIdx} className="text-xl font-extrabold text-white mt-6 mb-3">
              {line.replace(/^#\s+/, '')}
            </h2>
          );
        }
        if (line.startsWith('• ') || line.startsWith('- ')) {
          return (
            <li key={lIdx} className="ml-4 list-disc text-slate-300 my-1 leading-relaxed">
              <span dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line.replace(/^[•-]\s+/, '')) }} />
            </li>
          );
        }
        if (line.trim().length === 0) {
          return <div key={lIdx} className="h-2" />;
        }
        return (
          <p
            key={lIdx}
            className="text-slate-300 leading-relaxed my-1.5"
            dangerouslySetInnerHTML={{ __html: formatInlineMarkdown(line) }}
          />
        );
      });

      return <div key={index}>{formattedLines}</div>;
    });
  };

  const formatInlineMarkdown = (text: string) => {
    return text
      .replace(/\*\*(.*?)\*\*/g, '<strong class="font-bold text-white">$1</strong>')
      .replace(/\*(.*?)\*/g, '<em class="italic text-slate-200">$1</em>')
      .replace(/`([^`]+)`/g, '<code class="bg-[#101730] text-cyan-300 px-1.5 py-0.5 rounded font-mono text-xs">$1</code>');
  };

  return (
    <div className={`py-6 px-4 sm:px-6 transition-colors ${isUser ? 'bg-transparent' : 'bg-[#090d1f]/60 border-y border-white/[0.04]'}`}>
      <div className="max-w-4xl mx-auto flex gap-4 sm:gap-6">
        {/* Avatar */}
        <div className="shrink-0">
          {isUser ? (
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-600 to-blue-600 p-[1.5px] shadow-lg shadow-cyan-600/20">
              <div className="w-full h-full bg-[#0d142b] rounded-[14px] flex items-center justify-center text-cyan-300 font-semibold text-xs">
                <User className="w-4 h-4" />
              </div>
            </div>
          ) : (
            <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 p-[1.5px] shadow-lg shadow-indigo-500/25">
              <div className="w-full h-full bg-[#080d1e] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
          )}
        </div>

        {/* Message Content Container */}
        <div className="flex-1 space-y-4 overflow-hidden">
          {/* Header line for Assistant */}
          {!isUser && (
            <div className="flex items-center gap-2.5">
              <span className="font-semibold text-sm text-white">OmniFlow</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20 font-bold tracking-wider">
                {message.model || 'GPT-4o'}
              </span>
              <span className="text-[11px] text-slate-500 font-mono">
                {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
              </span>
            </div>
          )}

          {/* User Attachments */}
          {isUser && message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-2">
              {message.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#111833] border border-slate-700 text-xs text-slate-200"
                >
                  <FileText className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="font-medium truncate max-w-[200px]">{att.name}</span>
                  <span className="text-[10px] text-slate-400 font-mono">({(att.size / 1024).toFixed(1)} KB)</span>
                </div>
              ))}
            </div>
          )}

          {/* Assistant: Collapsible Thought Process (Reasoning block) */}
          {!isUser && message.thought && (
            <div className="rounded-2xl border border-slate-800/80 bg-[#0c1228] overflow-hidden">
              <button
                onClick={() => setIsThoughtOpen(!isThoughtOpen)}
                className="w-full px-4 py-2.5 flex items-center justify-between text-xs text-slate-400 hover:text-slate-200 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-indigo-400 animate-pulse" />
                  <span className="font-medium font-mono text-indigo-300">
                    Thought for {message.thought.durationSeconds ?? 2}s: {message.thought.title}
                  </span>
                </div>
                {isThoughtOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {isThoughtOpen && (
                <div className="px-4 pb-3.5 pt-1 border-t border-slate-800/60 text-xs font-mono text-slate-400 space-y-1.5 bg-[#090e21]">
                  {message.thought.steps.map((step, sIdx) => (
                    <div key={sIdx} className="flex items-start gap-2">
                      <span className="text-cyan-500 font-bold shrink-0">→</span>
                      <span>{step}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Formatted Text Content */}
          <div className="prose prose-invert max-w-none text-sm leading-relaxed">
            {renderFormattedContent(message.content)}
          </div>

          {/* GENERATED IMAGES (Pics Banan) */}
          {message.generatedImages && message.generatedImages.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3">
              {message.generatedImages.map((img) => (
                <div
                  key={img.id}
                  className="group relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl hover:border-cyan-500/50 transition-all duration-300"
                >
                  <div className="relative aspect-square sm:aspect-video w-full overflow-hidden bg-[#050814]">
                    <img
                      src={img.imageUrl}
                      alt={img.prompt}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <div className="flex gap-2 w-full">
                        <a
                          href={img.imageUrl}
                          download={`omniflow_${img.id}.png`}
                          target="_blank"
                          rel="noreferrer"
                          className="flex-1 py-2 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-black font-semibold text-xs flex items-center justify-center gap-1.5 shadow-lg transition-colors"
                        >
                          <Download className="w-3.5 h-3.5" /> Download
                        </a>
                        <button
                          onClick={() =>
                            onOpenArtifact({
                              id: img.id,
                              title: `Artwork: ${img.prompt.slice(0, 30)}...`,
                              type: 'image',
                              content: img.imageUrl,
                            })
                          }
                          className="px-3 py-2 rounded-xl bg-slate-900/90 hover:bg-slate-800 text-white text-xs flex items-center justify-center transition-colors"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  </div>
                  <div className="p-3 bg-[#0a0f24] border-t border-slate-800 flex items-center justify-between text-xs">
                    <div className="truncate max-w-[220px]">
                      <span className="text-slate-200 font-medium truncate block">{img.prompt}</span>
                      <span className="text-[10px] text-amber-300 font-mono flex items-center gap-1 mt-0.5">
                        <Sparkles className="w-3 h-3 text-amber-400" />
                        {img.modelName || 'FLUX.1 Pro'}
                      </span>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      <span className="px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 text-[10px] font-mono border border-cyan-500/20">
                        {img.style}
                      </span>
                      {img.quality && (
                        <span className="px-1.5 py-0.5 rounded-full bg-purple-500/10 text-purple-300 text-[10px] font-mono border border-purple-500/20 uppercase">
                          {img.quality}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* GENERATED FILES (Files Bana) */}
          {message.generatedFiles && message.generatedFiles.length > 0 && (
            <div className="space-y-3 pt-2">
              {message.generatedFiles.map((file) => (
                <div
                  key={file.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-2xl bg-gradient-to-r from-[#0c132c] to-[#0f1738] border border-cyan-500/30 shadow-xl"
                >
                  <div className="flex items-center gap-3.5">
                    <div className="w-11 h-11 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shrink-0">
                      {file.fileType === 'xlsx' ? (
                        <FileSpreadsheet className="w-5 h-5 text-emerald-400" />
                      ) : file.fileType === 'py' || file.fileType === 'tsx' ? (
                        <Code className="w-5 h-5 text-indigo-400" />
                      ) : (
                        <FileText className="w-5 h-5 text-cyan-400" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="text-sm font-semibold text-white tracking-tight">{file.fileName}</h4>
                        <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 font-bold">
                          {file.fileType}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 font-mono mt-0.5">
                        {(file.sizeBytes / 1024).toFixed(1)} KB • Native binary verified
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={file.downloadUrl}
                      download={file.fileName}
                      className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all"
                    >
                      <Download className="w-3.5 h-3.5" /> Download Now
                    </a>
                    {message.artifact && (
                      <button
                        onClick={() => onOpenArtifact(message.artifact!)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
                        title="Inspect in Canvas"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* FILE FIX & DIFF REPORT (Thek Kerna) */}
          {message.fileFixResult && (
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/20 to-slate-900 border border-emerald-500/40 space-y-3">
              <div className="flex items-center justify-between pb-3 border-b border-emerald-500/20">
                <div className="flex items-center gap-2 text-emerald-400 text-sm font-semibold">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span>Repaired: {message.fileFixResult.fixedFileName}</span>
                </div>
                <div className="flex items-center gap-2">
                  <a
                    href={message.fileFixResult.downloadUrl}
                    download={message.fileFixResult.fixedFileName}
                    className="px-3.5 py-1.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Download className="w-3.5 h-3.5" /> Download Fixed File
                  </a>
                  {message.artifact && (
                    <button
                      onClick={() => onOpenArtifact(message.artifact!)}
                      className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-200 flex items-center gap-1 transition-colors"
                    >
                      <Eye className="w-3.5 h-3.5" /> Inspect Diff
                    </button>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {message.fileFixResult.detectedIssues.map((iss, iIdx) => (
                  <div key={iIdx} className="p-2.5 rounded-xl bg-[#0b1024] border border-slate-800">
                    <p className="font-semibold text-amber-300">
                      Issue #{iIdx + 1}: {iss.description}
                    </p>
                    <p className="text-slate-400 text-[11px] mt-1">Fix: {iss.fixApplied}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Web Search Citations */}
          {message.citations && message.citations.length > 0 && (
            <div className="pt-2">
              <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Sources & References:</p>
              <div className="flex flex-wrap gap-2">
                {message.citations.map((cite, cIdx) => (
                  <a
                    key={cIdx}
                    href={cite.url}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-800 hover:border-cyan-500/40 text-xs text-slate-300 hover:text-cyan-300 transition-colors"
                  >
                    <ExternalLink className="w-3 h-3 text-cyan-400" />
                    <span>{cite.title}</span>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Bottom Action Bar for Assistant */}
          {!isUser && (
            <div className="flex items-center gap-1 pt-2 text-slate-400">
              <button
                onClick={() => handleCopy(message.content)}
                title="Copy response"
                className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs flex items-center gap-1"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={handleToggleSpeak}
                title={isSpeaking ? 'Stop speech' : 'Read aloud'}
                className={`p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs ${
                  isSpeaking ? 'text-cyan-400' : ''
                }`}
              >
                {isSpeaking ? <VolumeX className="w-3.5 h-3.5 text-cyan-400 animate-pulse" /> : <Volume2 className="w-3.5 h-3.5" />}
              </button>

              <button
                onClick={() => setFeedback(feedback === 'liked' ? null : 'liked')}
                title="Good response"
                className={`p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs ${
                  feedback === 'liked' ? 'text-emerald-400' : ''
                }`}
              >
                <ThumbsUp className="w-3.5 h-3.5" />
              </button>

              <button
                onClick={() => setFeedback(feedback === 'disliked' ? null : 'disliked')}
                title="Bad response"
                className={`p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs ${
                  feedback === 'disliked' ? 'text-red-400' : ''
                }`}
              >
                <ThumbsDown className="w-3.5 h-3.5" />
              </button>

              {onRegenerate && (
                <button
                  onClick={onRegenerate}
                  title="Regenerate response"
                  className="p-1.5 hover:text-white hover:bg-slate-800 rounded-lg transition-colors text-xs ml-auto flex items-center gap-1"
                >
                  <RotateCcw className="w-3.5 h-3.5" /> Regenerate
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
