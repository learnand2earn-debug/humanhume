'use client';

import React, { useState } from 'react';
import {
  CheckSquare,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Filter,
  ChevronDown,
  ChevronUp,
  ShieldAlert,
  Tag,
} from 'lucide-react';
import { ChecklistItem, ChecklistStatus, ChecklistPriority } from '@/lib/intelligent/types';

interface ChecklistWidgetProps {
  checklist: ChecklistItem[];
  onAcknowledgeGap?: (itemId: string) => void;
  isReadOnly?: boolean;
}

export default function ChecklistWidget({
  checklist,
  onAcknowledgeGap,
  isReadOnly = false,
}: ChecklistWidgetProps) {
  const [expanded, setExpanded] = useState(false);
  const [filter, setFilter] = useState<'all' | 'missing' | 'complete' | 'critical'>('all');

  if (!checklist || checklist.length === 0) return null;

  const total = checklist.length;
  const completed = checklist.filter((i) => i.status === 'complete').length;
  const missing = checklist.filter((i) => i.status === 'missing').length;
  const uncertain = checklist.filter((i) => i.status === 'uncertain').length;
  const critical = checklist.filter((i) => i.priority === 'critical').length;
  const progressPercent = Math.round((completed / total) * 100);

  const filteredItems = checklist.filter((item) => {
    if (filter === 'missing') return item.status === 'missing' || item.status === 'uncertain';
    if (filter === 'complete') return item.status === 'complete';
    if (filter === 'critical') return item.priority === 'critical';
    return true;
  });

  const getStatusIcon = (status: ChecklistStatus) => {
    switch (status) {
      case 'complete':
        return <CheckCircle2 className="w-4 h-4 text-emerald-400" />;
      case 'missing':
        return <AlertCircle className="w-4 h-4 text-rose-400" />;
      case 'uncertain':
        return <HelpCircle className="w-4 h-4 text-amber-400" />;
      case 'in_progress':
        return <Clock className="w-4 h-4 text-cyan-400 animate-spin" />;
      default:
        return <div className="w-3.5 h-3.5 rounded-full border border-slate-500" />;
    }
  };

  const getPriorityBadge = (priority: ChecklistPriority) => {
    switch (priority) {
      case 'critical':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'high':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'medium':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      case 'low':
        return 'bg-slate-500/20 text-slate-400 border-slate-500/30';
    }
  };

  return (
    <div className="w-full bg-[#080d1e]/90 border border-white/10 rounded-2xl p-4 shadow-xl backdrop-blur-xl mb-4">
      {/* Header */}
      <div
        className="flex items-center justify-between cursor-pointer select-none"
        onClick={() => setExpanded(!expanded)}
      >
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-purple-400">
            <CheckSquare className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">Dynamic Quality & Requirements Checklist</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 font-semibold">
                {completed}/{total} Done ({progressPercent}%)
              </span>
              {missing > 0 && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 font-bold">
                  {missing} Gaps
                </span>
              )}
            </div>
            <div className="flex items-center gap-3 mt-0.5 text-[11px] text-slate-400">
              <span>{critical} Critical criteria</span>
              {uncertain > 0 && <span>• {uncertain} Needs verification</span>}
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Mini progress bar */}
          <div className="hidden sm:flex items-center gap-2 w-28">
            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-purple-500 to-emerald-400 transition-all duration-500"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
          <button className="text-slate-400 hover:text-white p-1 transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-white/5 space-y-3">
          {/* Filters */}
          <div className="flex items-center justify-between flex-wrap gap-2 text-[11px]">
            <div className="flex items-center gap-1.5">
              <Filter className="w-3 h-3 text-slate-400" />
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('all');
                }}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  filter === 'all'
                    ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                All ({total})
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('missing');
                }}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  filter === 'missing'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Gaps ({missing + uncertain})
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('complete');
                }}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  filter === 'complete'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Satisfied ({completed})
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setFilter('critical');
                }}
                className={`px-2 py-0.5 rounded-md transition-colors ${
                  filter === 'critical'
                    ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Critical ({critical})
              </button>
            </div>
          </div>

          {/* Items List */}
          <div className="space-y-2 max-h-72 overflow-y-auto pr-1 custom-scrollbar">
            {filteredItems.map((item) => (
              <div
                key={item.id}
                className={`p-2.5 rounded-xl border text-xs transition-colors ${
                  item.status === 'complete'
                    ? 'bg-emerald-950/10 border-emerald-500/20'
                    : item.status === 'missing'
                    ? 'bg-rose-950/15 border-rose-500/30'
                    : 'bg-white/[0.02] border-white/5'
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start gap-2 flex-1">
                    <span className="mt-0.5 flex-shrink-0">{getStatusIcon(item.status)}</span>
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-semibold text-slate-200">{item.title}</span>
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded border font-semibold uppercase ${getPriorityBadge(
                            item.priority
                          )}`}
                        >
                          {item.priority}
                        </span>
                        <span className="text-[9px] font-mono text-slate-400 bg-white/5 px-1.5 py-0.2 rounded">
                          {item.category}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400">{item.description}</p>
                      {item.evidence && (
                        <p className="text-[10px] font-mono text-emerald-400/90 mt-0.5 bg-emerald-500/5 px-2 py-0.5 rounded border border-emerald-500/10 inline-block">
                          ✓ Evidence: {item.evidence}
                        </p>
                      )}
                    </div>
                  </div>

                  {!isReadOnly && onAcknowledgeGap && item.status !== 'complete' && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onAcknowledgeGap(item.id);
                      }}
                      className="text-[10px] px-2 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors whitespace-nowrap"
                    >
                      Acknowledge Gap
                    </button>
                  )}
                </div>
              </div>
            ))}

            {filteredItems.length === 0 && (
              <div className="text-center py-4 text-xs text-slate-500">
                No checklist items match the selected filter.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
