'use client';

import React, { useState } from 'react';
import {
  ListChecks,
  CheckCircle2,
  Clock,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Cpu,
  Layers,
  ArrowRight,
} from 'lucide-react';
import { TaskPlan, TaskExecutionStatus } from '@/lib/agent/types';

interface TaskPlanWidgetProps {
  plan: TaskPlan;
}

export default function TaskPlanWidget({ plan }: TaskPlanWidgetProps) {
  const [expanded, setExpanded] = useState(false);

  const getStatusBadge = (status: TaskExecutionStatus) => {
    switch (status) {
      case 'completed':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'executing':
      case 'ready':
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30 animate-pulse';
      case 'waiting_user_info':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'failed':
      case 'blocked':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      default:
        return 'bg-slate-500/20 text-slate-300 border-slate-500/30';
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
          <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
            <ListChecks className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-white tracking-tight">Autonomous Task Plan</span>
              <span className={`text-[10px] font-mono uppercase px-2 py-0.5 rounded-full border font-bold ${getStatusBadge(plan.status)}`}>
                {plan.status.replace(/_/g, ' ')}
              </span>
              <span className="text-[10px] font-mono text-cyan-400 font-semibold">
                [{plan.taskType}]
              </span>
            </div>
            <p className="text-xs text-slate-400 line-clamp-1 mt-0.5">{plan.objective}</p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <div className="w-20 bg-white/10 rounded-full h-1.5 overflow-hidden">
              <div
                className="bg-gradient-to-r from-cyan-400 to-emerald-400 h-full transition-all duration-300"
                style={{ width: `${plan.progressPercent}%` }}
              />
            </div>
            <span className="text-[11px] font-mono font-bold text-emerald-400">{plan.progressPercent}%</span>
          </div>

          <button type="button" className="text-slate-400 hover:text-white transition-colors">
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Expandable Steps */}
      {expanded && (
        <div className="mt-4 pt-3 border-t border-white/[0.08] space-y-2">
          {plan.executionSteps.map((step, idx) => (
            <div
              key={step.id}
              className={`p-2.5 rounded-xl border text-xs transition-all ${
                step.status === 'completed'
                  ? 'bg-emerald-950/10 border-emerald-500/20'
                  : step.status === 'running'
                  ? 'bg-cyan-950/20 border-cyan-500/30'
                  : 'bg-white/[0.02] border-white/5 opacity-70'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  {step.status === 'completed' ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : step.status === 'running' ? (
                    <Clock className="w-4 h-4 text-cyan-400 animate-spin shrink-0" />
                  ) : (
                    <div className="w-4 h-4 rounded-full border border-slate-600 flex items-center justify-center text-[10px] text-slate-500 font-mono">
                      {idx + 1}
                    </div>
                  )}
                  <span className="font-semibold text-white">{step.title}</span>
                </div>
                <span className="text-[10px] font-mono text-slate-400">Tool: {step.toolNeeded}</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-1 pl-6">{step.goal}</p>
              {step.result && (
                <div className="mt-1 pl-6 text-[11px] text-emerald-300/90 font-mono">
                  ✓ {step.result}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
