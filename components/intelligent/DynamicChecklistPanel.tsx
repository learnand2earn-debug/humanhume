'use client';

import React, { useState } from 'react';
import {
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
  ShieldCheck,
  Zap,
} from 'lucide-react';
import { ChecklistItem, ChecklistStatus, ChecklistCategory } from '@/lib/intelligent/types';

interface DynamicChecklistPanelProps {
  checklist: ChecklistItem[];
  onAcknowledgeGap?: (itemId: string) => void;
  isLoading?: boolean;
}

export default function DynamicChecklistPanel({
  checklist,
  onAcknowledgeGap,
  isLoading,
}: DynamicChecklistPanelProps) {
  const [filter, setFilter] = useState<ChecklistStatus | 'all'>('all');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  const toggleExpand = (id: string) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredItems = checklist.filter((item) => {
    if (filter === 'all') return true;
    return item.status === filter;
  });

  const total = checklist.length;
  const completed = checklist.filter((i) => i.status === 'complete').length;
  const missing = checklist.filter((i) => i.status === 'missing').length;
  const uncertain = checklist.filter((i) => i.status === 'uncertain').length;
  const passPercent = total > 0 ? Math.round((completed / total) * 100) : 0;

  const getPriorityBadge = (p: string) => {
    switch (p) {
      case 'critical':
        return 'bg-rose-500/15 border-rose-500/30 text-rose-300';
      case 'high':
        return 'bg-amber-500/15 border-amber-500/30 text-amber-300';
      case 'medium':
        return 'bg-indigo-500/15 border-indigo-500/30 text-indigo-300';
      default:
        return 'bg-slate-500/15 border-slate-500/30 text-slate-300';
    }
  };

  const getStatusIcon = (status: ChecklistStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />;
      case 'missing':
        return <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />;
      case 'uncertain':
        return <HelpCircle className="w-4 h-4 text-amber-400 shrink-0" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />;
      default:
        return <Clock className="w-4 h-4 text-slate-400 shrink-0" />;
    }
  };

  return (
    <div className="w-full bg-[#0a1024]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl">
      {/* Header & Metrics */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-white/[0.08]">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-white tracking-tight">
              Dynamic Requirements Checklist
            </h3>
            <span className="text-xs font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 font-bold">
              {completed}/{total} Passed
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Content-aware audit dynamically derived from source files and task goals.
          </p>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center gap-3">
          <div className="w-28 bg-white/10 rounded-full h-2 overflow-hidden">
            <div
              className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-500"
              style={{ width: `${passPercent}%` }}
            />
          </div>
          <span className="font-mono text-xs font-bold text-emerald-400">{passPercent}%</span>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 mb-4">
        <button
          type="button"
          onClick={() => setFilter('all')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            filter === 'all'
              ? 'bg-white/15 text-white border border-white/20'
              : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
          }`}
        >
          All ({total})
        </button>
        <button
          type="button"
          onClick={() => setFilter('complete')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            filter === 'complete'
              ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
              : 'text-slate-400 hover:text-emerald-300 hover:bg-white/[0.04]'
          }`}
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
          <span>Complete ({completed})</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter('missing')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            filter === 'missing'
              ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
              : 'text-slate-400 hover:text-rose-300 hover:bg-white/[0.04]'
          }`}
        >
          <AlertCircle className="w-3.5 h-3.5 text-rose-400" />
          <span>Missing ({missing})</span>
        </button>
        <button
          type="button"
          onClick={() => setFilter('uncertain')}
          className={`px-3 py-1.5 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-all ${
            filter === 'uncertain'
              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              : 'text-slate-400 hover:text-amber-300 hover:bg-white/[0.04]'
          }`}
        >
          <HelpCircle className="w-3.5 h-3.5 text-amber-400" />
          <span>Uncertain ({uncertain})</span>
        </button>
      </div>

      {/* Checklist List */}
      <div className="space-y-2.5 max-h-[460px] overflow-y-auto pr-1">
        {filteredItems.length === 0 ? (
          <div className="p-8 text-center text-slate-500 text-xs">
            No checklist items match the current filter.
          </div>
        ) : (
          filteredItems.map((item) => {
            const isExpanded = expandedIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`p-3.5 rounded-xl border transition-all ${
                  item.status === 'complete'
                    ? 'bg-emerald-950/10 border-emerald-500/20'
                    : item.status === 'missing'
                    ? 'bg-rose-950/10 border-rose-500/25'
                    : 'bg-amber-950/10 border-amber-500/20'
                }`}
              >
                <div
                  className="flex items-start justify-between gap-3 cursor-pointer select-none"
                  onClick={() => toggleExpand(item.id)}
                >
                  <div className="flex items-start gap-2.5">
                    <div className="mt-0.5">{getStatusIcon(item.status)}</div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-bold text-white tracking-tight">
                          {item.title}
                        </span>
                        <span
                          className={`text-[9px] uppercase font-mono px-1.5 py-0.5 rounded border font-semibold ${getPriorityBadge(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">
                          [{item.category}]
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {item.status === 'missing' && onAcknowledgeGap && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onAcknowledgeGap(item.id);
                        }}
                        className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-white/10 hover:bg-white/20 text-slate-200 border border-white/10 transition-colors"
                        title="Proceed acknowledging this gap without blocking"
                      >
                        Acknowledge Gap
                      </button>
                    )}
                    <button
                      type="button"
                      className="text-slate-400 hover:text-white transition-colors"
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="mt-3 pt-3 border-t border-white/[0.06] text-xs space-y-1.5 pl-6 font-sans">
                    <div className="text-slate-400">
                      <strong className="text-slate-300">Validation Rule:</strong> {item.validationRule}
                    </div>
                    {item.evidence && (
                      <div className="text-emerald-300/90">
                        <strong className="text-emerald-200">Verified Evidence:</strong> {item.evidence}
                      </div>
                    )}
                    {item.userDecision && (
                      <div className="text-cyan-300/90">
                        <strong className="text-cyan-200">User Decision:</strong> {item.userDecision}
                      </div>
                    )}
                    <div className="text-[10px] font-mono text-slate-500">
                      Source: {item.source}
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
