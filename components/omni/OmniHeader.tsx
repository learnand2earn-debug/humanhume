'use client';

import React, { useState } from 'react';
import {
  Sparkles,
  ChevronDown,
  Layers,
  Trash2,
  Share2,
  Sliders,
  Download,
  Check,
  Bot,
  Brain,
  Wrench,
  Image as ImageIcon,
} from 'lucide-react';
import { OmniModelId, OmniArtifact } from '@/lib/omni/types';

interface OmniHeaderProps {
  currentModel: OmniModelId;
  onModelChange: (model: OmniModelId) => void;
  activeArtifact: OmniArtifact | null;
  onToggleCanvas: () => void;
  isCanvasOpen: boolean;
  onClearChat: () => void;
  onOpenSettings: () => void;
  onExportChat: (format: 'markdown' | 'json') => void;
  onSwitchToPipeline?: () => void;
  onOpenImageStudio?: () => void;
}

const MODELS: Array<{ id: OmniModelId; name: string; tag: string; iconColor: string }> = [
  { id: 'gpt-4o', name: 'GPT-4o', tag: 'Omni Intelligence', iconColor: 'text-cyan-400' },
  { id: 'claude-3-5-sonnet', name: 'Claude 3.5 Sonnet', tag: 'Artifacts & Code Expert', iconColor: 'text-indigo-400' },
  { id: 'o3-mini', name: 'o3-mini', tag: 'Deep Logical Reasoning', iconColor: 'text-purple-400' },
  { id: 'dalle-3', name: 'DALL·E 3 Studio', tag: 'AI Image Generator', iconColor: 'text-pink-400' },
  { id: 'claude-code-fixer', name: 'Claude Code & Fixer', tag: 'Automated File Bug Fix', iconColor: 'text-emerald-400' },
];

export default function OmniHeader({
  currentModel,
  onModelChange,
  activeArtifact,
  onToggleCanvas,
  isCanvasOpen,
  onClearChat,
  onOpenSettings,
  onExportChat,
  onSwitchToPipeline,
  onOpenImageStudio,
}: OmniHeaderProps) {
  const [isModelDropdownOpen, setIsModelDropdownOpen] = useState(false);
  const [isExportOpen, setIsExportOpen] = useState(false);

  const selectedModel = MODELS.find((m) => m.id === currentModel) || MODELS[0];

  return (
    <header className="sticky top-0 z-30 h-16 bg-[#070b1a]/85 backdrop-blur-xl border-b border-white/[0.06] flex items-center justify-between px-4 sm:px-6">
      {/* Model Selector */}
      <div className="relative">
        <button
          onClick={() => setIsModelDropdownOpen(!isModelDropdownOpen)}
          className="flex items-center gap-2.5 px-3 py-1.5 rounded-2xl bg-[#0e142c] hover:bg-[#131b3b] border border-slate-800 text-sm font-semibold text-white transition-all shadow-sm group"
        >
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
          <span className="tracking-tight">{selectedModel.name}</span>
          <span className="text-[11px] text-slate-400 hidden sm:inline font-mono font-normal">
            ({selectedModel.tag})
          </span>
          <ChevronDown className="w-4 h-4 text-slate-400 group-hover:text-white transition-transform" />
        </button>

        {isModelDropdownOpen && (
          <div className="absolute top-full left-0 mt-2 w-72 rounded-2xl bg-[#0c1228] border border-slate-800 shadow-2xl p-2 z-50 animate-fadeIn">
            <div className="px-3 py-1.5 text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono">
              Select AI Architecture
            </div>
            {MODELS.map((model) => (
              <button
                key={model.id}
                onClick={() => {
                  onModelChange(model.id);
                  setIsModelDropdownOpen(false);
                }}
                className={`w-full text-left px-3 py-2.5 rounded-xl text-xs flex items-center justify-between transition-colors ${
                  currentModel === model.id
                    ? 'bg-cyan-500/15 text-cyan-200 font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <div>
                  <div className="font-medium text-white">{model.name}</div>
                  <div className="text-[11px] text-slate-400">{model.tag}</div>
                </div>
                {currentModel === model.id && <Check className="w-4 h-4 text-cyan-400" />}
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2">
        {/* Top-Tier Image Studio Button */}
        {onOpenImageStudio && (
          <button
            onClick={onOpenImageStudio}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-amber-500/15 via-purple-500/15 to-cyan-500/15 hover:from-amber-500/25 hover:to-cyan-500/25 border border-amber-500/30 text-amber-200 text-xs font-semibold shadow-sm transition-all"
            title="Launch Ultra AI Image Studio (Flux.1, Midjourney v6, DALL-E 3 HD)"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">Image Studio</span>
          </button>
        )}

        {/* Artifacts Canvas Button */}
        {activeArtifact && (
          <button
            onClick={onToggleCanvas}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
              isCanvasOpen
                ? 'bg-cyan-500 text-black shadow-lg shadow-cyan-500/25'
                : 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/25'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Canvas</span>
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
          </button>
        )}

        {/* Export / Share Dropdown */}
        <div className="relative">
          <button
            onClick={() => setIsExportOpen(!isExportOpen)}
            title="Export conversation"
            className="p-2 rounded-xl bg-[#0e142c] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <Share2 className="w-4 h-4" />
          </button>

          {isExportOpen && (
            <div className="absolute right-0 top-full mt-2 w-48 rounded-2xl bg-[#0c1228] border border-slate-800 shadow-2xl p-1.5 z-50 text-xs">
              <button
                onClick={() => {
                  onExportChat('markdown');
                  setIsExportOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-cyan-400" /> Export as Markdown
              </button>
              <button
                onClick={() => {
                  onExportChat('json');
                  setIsExportOpen(false);
                }}
                className="w-full text-left px-3 py-2 rounded-xl text-slate-300 hover:text-white hover:bg-slate-800 transition-colors flex items-center gap-2"
              >
                <Download className="w-3.5 h-3.5 text-indigo-400" /> Export as JSON
              </button>
            </div>
          )}
        </div>

        {/* Clear Chat */}
        <button
          onClick={() => {
            if (confirm('Clear messages in this conversation?')) {
              onClearChat();
            }
          }}
          title="Clear messages"
          className="p-2 rounded-xl bg-[#0e142c] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>

        {/* Settings */}
        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-2 rounded-xl bg-[#0e142c] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
        >
          <Sliders className="w-4 h-4" />
        </button>

        {onSwitchToPipeline && (
          <button
            onClick={onSwitchToPipeline}
            className="hidden md:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0e142c] hover:bg-slate-800 text-slate-300 hover:text-cyan-300 border border-slate-800 text-xs font-semibold transition-colors"
            title="Switch to Document Humanizer Pipeline"
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>Document Pipeline</span>
          </button>
        )}
      </div>
    </header>
  );
}
