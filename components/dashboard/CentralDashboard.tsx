'use client';

import React, { useState, useEffect } from 'react';
import { AgentHistoryItem, AgentType } from '@/lib/agents/types';
import HumanizerAgentView from './HumanizerAgentView';
import GeneratorAgentView from './GeneratorAgentView';
import BypassAgentView from './BypassAgentView';
import MediaMarketingAgentView from './MediaMarketingAgentView';
import AgentHistoryDrawer from './AgentHistoryDrawer';
import Link from 'next/link';
import {
  Sparkles,
  Shield,
  Megaphone,
  History,
  FileText,
  Activity,
  Layers,
  Award,
  Zap,
  ListTodo,
  PenTool,
  ShieldCheck,
} from 'lucide-react';

import { safeFetchJson } from '@/lib/utils/safe-json';

interface CentralDashboardProps {
  onSwitchToDocumentPipeline?: () => void;
}

export default function CentralDashboard({ onSwitchToDocumentPipeline }: CentralDashboardProps) {
  const [activeAgent, setActiveAgent] = useState<AgentType | 'pipeline'>('humanizer');
  const [historyOpen, setHistoryOpen] = useState(false);
  const [historyItems, setHistoryItems] = useState<AgentHistoryItem[]>([]);
  const [loadedInput, setLoadedInput] = useState<string>('');
  const [loadedResult, setLoadedResult] = useState<any>(null);

  const fetchHistory = async () => {
    try {
      const { ok, data } = await safeFetchJson<{ success: boolean; history: AgentHistoryItem[] }>('/api/agents/history');
      if (ok && data?.success && data?.history) {
        setHistoryItems(data.history);
      }
    } catch {
      // Ignore
    }
  };

  useEffect(() => {
    fetchHistory();
  }, []);

  const handleSelectHistoryItem = (item: AgentHistoryItem) => {
    setActiveAgent(item.agentType);
    setLoadedInput(item.inputPreview);
    setLoadedResult(item.data);
    setHistoryOpen(false);
  };

  const handleDeleteHistoryItem = async (id: string) => {
    try {
      await fetch(`/api/agents/history?id=${id}`, { method: 'DELETE' });
      fetchHistory();
    } catch {
      // Ignore
    }
  };

  const handleClearAllHistory = async () => {
    if (confirm('Clear all saved task history?')) {
      try {
        await fetch(`/api/agents/history?id=all`, { method: 'DELETE' });
        fetchHistory();
      } catch {
        // Ignore
      }
    }
  };

  const handleItemGenerated = () => {
    fetchHistory();
  };

  return (
    <div className="space-y-6">
      {/* Project Status Bar / Metadata */}
      <div className="glass-panel px-4 py-2.5 rounded-xl border border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-slate-300 font-medium">
            Multi-Agentic AI Platform:
          </span>
          <span className="text-white font-bold">
            All 4 AI Agents Online
          </span>
          <span className="text-slate-400 hidden md:inline">| Developer: Aqeel Abbas</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setHistoryOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 transition-colors"
          >
            <History className="w-3.5 h-3.5 text-cyan-400" />
            <span>Task History</span>
            {historyItems.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                {historyItems.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Intelligent Studio Spotlight Card */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-cyan-950/40 border border-purple-500/30 flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-lg shadow-purple-950/20">
        <div className="flex items-center gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-400/40 flex items-center justify-center text-purple-300 shrink-0">
            <ListTodo className="w-5 h-5 text-purple-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h4 className="text-sm font-bold text-white">Claude-Style Intelligent Checklist Studio</h4>
              <span className="px-2 py-0.5 rounded-full text-[9px] uppercase font-mono font-bold bg-purple-500/20 text-purple-300 border border-purple-500/40">New Feature</span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Multi-file intake, dynamic requirements checklists, missing-information prompts, and post-generation verification audits.
            </p>
          </div>
        </div>
        <Link
          href="/intelligent"
          className="px-4 py-2 rounded-xl bg-gradient-to-r from-purple-500 to-indigo-600 hover:from-purple-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-md shadow-purple-500/20 flex items-center gap-1.5 transition-all shrink-0 cursor-pointer"
        >
          <span>Launch Intelligent Studio</span>
          <Sparkles className="w-3.5 h-3.5" />
        </Link>
      </div>

      {/* Primary Agent Switcher Navigation */}
      <div className="glass-card p-2 rounded-2xl border border-white/10 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2">
        {/* Agent 01: AI Generator Tab */}
        <button
          onClick={() => setActiveAgent('generator')}
          className={`p-3 rounded-xl flex items-center gap-2.5 text-left transition-all duration-200 ${
            activeAgent === 'generator'
              ? 'bg-gradient-to-r from-cyan-500/20 to-blue-500/20 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
              : 'hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeAgent === 'generator'
                ? 'bg-cyan-500/30 text-cyan-300'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            <PenTool className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-cyan-400">Agent 01</div>
            <div className="text-xs font-bold text-white">AI Generator</div>
            <div className="text-[10px] text-slate-400 hidden sm:block">Articles & Essays</div>
          </div>
        </button>

        {/* Agent 02: AI Humanizer Tab */}
        <button
          onClick={() => setActiveAgent('humanizer')}
          className={`p-3 rounded-xl flex items-center gap-2.5 text-left transition-all duration-200 ${
            activeAgent === 'humanizer'
              ? 'bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 shadow-lg shadow-emerald-500/10'
              : 'hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeAgent === 'humanizer'
                ? 'bg-emerald-500/30 text-emerald-300'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-emerald-400">Agent 02</div>
            <div className="text-xs font-bold text-white">AI Humanizer</div>
            <div className="text-[10px] text-slate-400 hidden sm:block">98%+ Bypass Score</div>
          </div>
        </button>

        {/* Agent 03: AI Bypass Tab */}
        <button
          onClick={() => setActiveAgent('bypass')}
          className={`p-3 rounded-xl flex items-center gap-2.5 text-left transition-all duration-200 ${
            activeAgent === 'bypass'
              ? 'bg-gradient-to-r from-indigo-500/20 to-purple-500/20 border border-indigo-500/40 shadow-lg shadow-indigo-500/10'
              : 'hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeAgent === 'bypass'
                ? 'bg-indigo-500/30 text-indigo-300'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            <Shield className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-indigo-400">Agent 03</div>
            <div className="text-xs font-bold text-white">AI Bypass & Diff</div>
            <div className="text-[10px] text-slate-400 hidden sm:block">Side-by-Side Diff</div>
          </div>
        </button>

        {/* Agent 04: Media Marketing Tab */}
        <button
          onClick={() => setActiveAgent('marketing')}
          className={`p-3 rounded-xl flex items-center gap-2.5 text-left transition-all duration-200 ${
            activeAgent === 'marketing'
              ? 'bg-gradient-to-r from-pink-500/20 to-rose-500/20 border border-pink-500/40 shadow-lg shadow-pink-500/10'
              : 'hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeAgent === 'marketing'
                ? 'bg-pink-500/30 text-pink-300'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            <Megaphone className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-pink-400">Agent 04</div>
            <div className="text-xs font-bold text-white">Media Marketing</div>
            <div className="text-[10px] text-slate-400 hidden sm:block">Viral Posts & Cal</div>
          </div>
        </button>

        {/* Document Pipeline Tab */}
        <button
          onClick={() => {
            if (onSwitchToDocumentPipeline) {
              onSwitchToDocumentPipeline();
            } else {
              setActiveAgent('pipeline');
            }
          }}
          className={`p-3 rounded-xl flex items-center gap-2.5 text-left transition-all duration-200 ${
            activeAgent === 'pipeline'
              ? 'bg-gradient-to-r from-cyan-500/20 to-teal-500/20 border border-cyan-500/40 shadow-lg shadow-cyan-500/10'
              : 'hover:bg-white/[0.04] text-slate-400 hover:text-slate-200 border border-transparent'
          }`}
        >
          <div
            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
              activeAgent === 'pipeline'
                ? 'bg-cyan-500/30 text-cyan-300'
                : 'bg-white/5 text-slate-400'
            }`}
          >
            <FileText className="w-4 h-4" />
          </div>
          <div>
            <div className="text-[10px] font-mono uppercase font-bold text-cyan-400">Batch Hub</div>
            <div className="text-xs font-bold text-white">Doc Pipeline</div>
            <div className="text-[10px] text-slate-400 hidden sm:block">DOCX, PDF Files</div>
          </div>
        </button>
      </div>

      {/* Render Active Agent Interface */}
      <div>
        {activeAgent === 'generator' && (
          <GeneratorAgentView
            onGenerated={handleItemGenerated}
            onTransferToHumanizer={(text) => {
              setLoadedInput(text);
              setActiveAgent('humanizer');
            }}
            initialPrompt={loadedInput}
            initialResult={loadedResult}
          />
        )}

        {activeAgent === 'humanizer' && (
          <HumanizerAgentView
            onGenerated={handleItemGenerated}
            initialText={loadedInput}
            initialResult={loadedResult}
          />
        )}

        {activeAgent === 'bypass' && (
          <BypassAgentView
            onGenerated={handleItemGenerated}
            initialText={loadedInput}
            initialResult={loadedResult}
          />
        )}

        {activeAgent === 'marketing' && (
          <MediaMarketingAgentView
            onGenerated={handleItemGenerated}
            initialResult={loadedResult}
          />
        )}

        {activeAgent === 'pipeline' && onSwitchToDocumentPipeline && (
          <div className="text-center py-12 glass-card rounded-2xl border border-white/10">
            <FileText className="w-12 h-12 text-emerald-400 mx-auto mb-3" />
            <h3 className="text-lg font-bold text-white">Full File Document Pipeline</h3>
            <p className="text-xs text-slate-400 mt-1 mb-4">
              Upload documents (DOCX, PDF, TXT, MD, RTF, XLSX) for batch multi-stage processing.
            </p>
            <button
              onClick={onSwitchToDocumentPipeline}
              className="px-5 py-2.5 rounded-xl text-xs font-bold bg-emerald-500 text-black hover:bg-emerald-400 transition-colors"
            >
              Open File Upload &amp; Queue Workspace
            </button>
          </div>
        )}
      </div>

      {/* History Drawer */}
      <AgentHistoryDrawer
        isOpen={historyOpen}
        onClose={() => setHistoryOpen(false)}
        history={historyItems}
        onSelect={handleSelectHistoryItem}
        onDelete={handleDeleteHistoryItem}
        onClearAll={handleClearAllHistory}
      />
    </div>
  );
}
