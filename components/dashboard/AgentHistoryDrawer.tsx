'use client';

import React from 'react';
import { AgentHistoryItem, AgentType } from '@/lib/agents/types';
import {
  X,
  Trash2,
  Copy,
  Clock,
  Sparkles,
  Shield,
  Megaphone,
  ArrowRight,
  Check,
} from 'lucide-react';

interface AgentHistoryDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  history: AgentHistoryItem[];
  onSelect: (item: AgentHistoryItem) => void;
  onDelete: (id: string) => void;
  onClearAll: () => void;
}

export default function AgentHistoryDrawer({
  isOpen,
  onClose,
  history,
  onSelect,
  onDelete,
  onClearAll,
}: AgentHistoryDrawerProps) {
  const [filter, setFilter] = React.useState<AgentType | 'all'>('all');
  const [copiedId, setCopiedId] = React.useState<string | null>(null);

  if (!isOpen) return null;

  const filteredItems = history.filter((item) => {
    if (filter === 'all') return true;
    return item.agentType === filter;
  });

  const getAgentBadge = (type: AgentType) => {
    switch (type) {
      case 'generator':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-cyan-500/15 text-cyan-300 border border-cyan-500/30">
            <Sparkles className="w-2.5 h-2.5 text-cyan-400" /> Generator
          </span>
        );
      case 'humanizer':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/15 text-emerald-300 border border-emerald-500/30">
            <Sparkles className="w-2.5 h-2.5 text-emerald-400" /> Humanizer
          </span>
        );
      case 'bypass':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-500/15 text-indigo-300 border border-indigo-500/30">
            <Shield className="w-2.5 h-2.5 text-indigo-400" /> Bypass Transform
          </span>
        );
      case 'marketing':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-pink-500/15 text-pink-300 border border-pink-500/30">
            <Megaphone className="w-2.5 h-2.5 text-pink-400" /> Marketing
          </span>
        );
    }
  };

  const handleCopy = (item: AgentHistoryItem) => {
    let text = '';
    if (item.agentType === 'generator') {
      text = (item.data as any).content || (item.data as any).humanizedContent || '';
    } else if (item.agentType === 'humanizer') {
      text = (item.data as any).text || '';
    } else if (item.agentType === 'bypass') {
      text = (item.data as any).transformedText || '';
    } else if (item.agentType === 'marketing') {
      text = (item.data as any).primaryText || '';
    }
    if (text) {
      navigator.clipboard.writeText(text);
      setCopiedId(item.id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-black/60 backdrop-blur-sm transition-opacity">
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md bg-[#090d1a] border-l border-white/10 shadow-2xl flex flex-col">
          {/* Header */}
          <div className="p-5 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
            <div className="flex items-center gap-2.5">
              <Clock className="w-5 h-5 text-cyan-400" />
              <div>
                <h3 className="font-display font-bold text-white text-base">Generation History</h3>
                <p className="text-xs text-slate-400">{history.length} saved tasks in record</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Filter Pills */}
          <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between gap-2 overflow-x-auto">
            <div className="flex items-center gap-1.5 text-xs">
              {(['all', 'generator', 'humanizer', 'bypass', 'marketing'] as const).map((t) => (
                <button
                  key={t}
                  onClick={() => setFilter(t)}
                  className={`px-2.5 py-1 rounded-lg font-medium capitalize transition-all ${
                    filter === t
                      ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40'
                      : 'text-slate-400 hover:text-white hover:bg-white/5'
                  }`}
                >
                  {t}
                </button>
              ))}
            </div>

            {history.length > 0 && (
              <button
                onClick={onClearAll}
                className="text-xs text-rose-400 hover:text-rose-300 flex items-center gap-1 transition-colors whitespace-nowrap"
              >
                <Trash2 className="w-3.5 h-3.5" /> Clear
              </button>
            )}
          </div>

          {/* Items List */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {filteredItems.length === 0 ? (
              <div className="text-center py-16 px-4">
                <Clock className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-sm font-medium text-slate-400">No generation history yet</p>
                <p className="text-xs text-slate-500 mt-1">
                  Generated tasks from any of the three agents will automatically appear here.
                </p>
              </div>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.id}
                  className="glass-card p-3.5 rounded-xl border border-white/[0.08] hover:border-cyan-500/30 transition-all group"
                >
                  <div className="flex items-center justify-between mb-2">
                    {getAgentBadge(item.agentType)}
                    <span className="text-[11px] text-slate-400 font-mono">
                      {new Date(item.createdAt).toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </span>
                  </div>

                  <h4 className="text-xs font-semibold text-white line-clamp-1 mb-1">
                    {item.title}
                  </h4>

                  <p className="text-[11px] text-slate-400 line-clamp-2 mb-3 bg-black/20 p-2 rounded-lg border border-white/[0.04]">
                    {item.outputPreview || item.inputPreview}
                  </p>

                  <div className="flex items-center justify-between pt-2 border-t border-white/[0.06]">
                    <button
                      onClick={() => onSelect(item)}
                      className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1 group-hover:translate-x-0.5 transition-transform"
                    >
                      <span>Load into Editor</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleCopy(item)}
                        className="p-1 rounded text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
                        title="Copy text"
                      >
                        {copiedId === item.id ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>
                      <button
                        onClick={() => onDelete(item.id)}
                        className="p-1 rounded text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                        title="Delete record"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
