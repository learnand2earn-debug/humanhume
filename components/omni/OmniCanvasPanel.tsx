'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Maximize2,
  Minimize2,
  RotateCcw,
  Download,
  Copy,
  Check,
  Code,
  Eye,
  GitCompare,
  ExternalLink,
  Sparkles,
  FileText,
} from 'lucide-react';
import { OmniArtifact } from '@/lib/omni/types';

interface OmniCanvasPanelProps {
  artifact: OmniArtifact | null;
  onClose: () => void;
}

export default function OmniCanvasPanel({ artifact, onClose }: OmniCanvasPanelProps) {
  const [activeTab, setActiveTab] = useState<'preview' | 'code' | 'diff'>('preview');
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    if (artifact) {
      if (artifact.type === 'diff') {
        setActiveTab('diff');
      } else if (artifact.type === 'html_preview' || artifact.type === 'image' || artifact.content.includes('<html') || artifact.content.includes('<div')) {
        setActiveTab('preview');
      } else {
        setActiveTab('code');
      }
    }
  }, [artifact]);

  if (!artifact) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = () => {
    const ext = artifact.language || (artifact.type === 'code' ? 'ts' : 'html');
    const blob = new Blob([artifact.content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = artifact.title.includes('.') ? artifact.title : `${artifact.title.replace(/\s+/g, '_')}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Build safe HTML for live iframe execution
  const getPreviewHtml = () => {
    if (artifact.type === 'image') {
      return `<!DOCTYPE html>
<html>
<body style="margin:0;background:#060913;display:flex;align-items:center;justify-content:center;height:100vh;">
  <img src="${artifact.content}" style="max-width:95%;max-height:95%;border-radius:16px;box-shadow:0 25px 50px -12px rgba(0,0,0,0.5);" />
</body>
</html>`;
    }

    if (artifact.content.includes('<!DOCTYPE html>') || artifact.content.includes('<html')) {
      return artifact.content;
    }

    // Wrap React/HTML snippet with Tailwind CDN and font
    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <script src="https://cdn.tailwindcss.com"></script>
  <link href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
  <style>
    body { font-family: 'Plus Jakarta Sans', sans-serif; background: #080d1e; color: #f1f5f9; padding: 24px; }
  </style>
</head>
<body>
  <div id="root">
    ${artifact.content}
  </div>
</body>
</html>`;
  };

  return (
    <div
      className={`fixed top-0 right-0 h-full bg-[#070b19] border-l border-slate-800 shadow-2xl z-40 flex flex-col transition-all duration-300 ${
        isFullScreen ? 'w-full' : 'w-full md:w-[50vw] lg:w-[45vw] xl:w-[42vw]'
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-800 bg-[#0a0f24]">
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="p-2 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 shrink-0">
            <Sparkles className="w-4 h-4" />
          </div>
          <div className="truncate">
            <h3 className="text-sm font-semibold text-white truncate">{artifact.title}</h3>
            <p className="text-[11px] text-slate-400 capitalize">{artifact.type} Canvas</p>
          </div>
        </div>

        {/* Tab Switcher & Actions */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-[#101732] p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('preview')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'preview'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Eye className="w-3.5 h-3.5" /> Preview
            </button>
            <button
              onClick={() => setActiveTab('code')}
              className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                activeTab === 'code'
                  ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Code className="w-3.5 h-3.5" /> Code
            </button>
            {Boolean(artifact.meta?.originalContent) && (
              <button
                onClick={() => setActiveTab('diff')}
                className={`px-3 py-1.5 rounded-lg font-medium flex items-center gap-1.5 transition-all ${
                  activeTab === 'diff'
                    ? 'bg-cyan-500/20 text-cyan-300 font-semibold shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <GitCompare className="w-3.5 h-3.5" /> Diff
              </button>
            )}
          </div>

          <button
            onClick={() => setRefreshKey((k) => k + 1)}
            title="Refresh preview"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <RotateCcw className="w-4 h-4" />
          </button>

          <button
            onClick={handleCopy}
            title="Copy code"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>

          <button
            onClick={handleDownload}
            title="Download file"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsFullScreen(!isFullScreen)}
            title={isFullScreen ? 'Exit fullscreen' : 'Fullscreen'}
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors hidden sm:block"
          >
            {isFullScreen ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>

          <button
            onClick={onClose}
            title="Close Canvas"
            className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Main Canvas Body */}
      <div className="flex-1 overflow-hidden relative bg-[#060914]">
        {/* TAB 1: LIVE INTERACTIVE PREVIEW */}
        {activeTab === 'preview' && (
          <div className="w-full h-full p-2 sm:p-4">
            <div className="w-full h-full bg-[#0c1226] border border-slate-800/80 rounded-2xl overflow-hidden shadow-inner">
              <iframe
                key={refreshKey}
                ref={iframeRef}
                srcDoc={getPreviewHtml()}
                title="Live Artifact Preview"
                sandbox="allow-scripts allow-modals"
                className="w-full h-full border-0 bg-transparent"
              />
            </div>
          </div>
        )}

        {/* TAB 2: CODE VIEWER */}
        {activeTab === 'code' && (
          <div className="w-full h-full overflow-auto p-4 font-mono text-xs text-slate-200">
            <div className="bg-[#0b1024] border border-slate-800 rounded-2xl p-4 shadow-xl">
              <div className="flex justify-between items-center pb-3 mb-3 border-b border-slate-800 text-[11px] text-slate-400">
                <span>{artifact.language || 'typescript'}</span>
                <span>{artifact.content.split('\n').length} lines</span>
              </div>
              <pre className="overflow-x-auto leading-relaxed">
                <code>{artifact.content}</code>
              </pre>
            </div>
          </div>
        )}

        {/* TAB 3: SIDE-BY-SIDE / INLINE DIFF */}
        {activeTab === 'diff' && (
          <div className="w-full h-full overflow-auto p-4 font-mono text-xs">
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Original */}
                <div className="bg-red-950/20 border border-red-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-red-500/20 text-red-300 font-semibold text-xs">
                    <span>Original (Before Fix)</span>
                    <span className="text-[10px] bg-red-500/20 px-2 py-0.5 rounded">Unresolved</span>
                  </div>
                  <pre className="overflow-x-auto text-slate-300 leading-relaxed max-h-[70vh]">
                    <code>{String(artifact.meta?.originalContent || '')}</code>
                  </pre>
                </div>

                {/* Fixed */}
                <div className="bg-emerald-950/20 border border-emerald-500/30 rounded-2xl p-4">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-emerald-500/20 text-emerald-300 font-semibold text-xs">
                    <span>Fixed & Repaired (After)</span>
                    <span className="text-[10px] bg-emerald-500/20 px-2 py-0.5 rounded">All Fixed</span>
                  </div>
                  <pre className="overflow-x-auto text-slate-200 leading-relaxed max-h-[70vh]">
                    <code>{String(artifact.meta?.fixedContent || artifact.content)}</code>
                  </pre>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
