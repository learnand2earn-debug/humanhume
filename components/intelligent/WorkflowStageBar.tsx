'use client';

import React from 'react';
import { WorkflowStage } from '@/lib/intelligent/types';
import {
  FileCheck2,
  Sparkles,
  Search,
  ListTodo,
  AlertCircle,
  HelpCircle,
  GitMerge,
  Cpu,
  Eye,
  CheckCircle2,
  RefreshCw,
  Trophy,
} from 'lucide-react';

interface WorkflowStageBarProps {
  currentStage: WorkflowStage;
}

const STAGES: Array<{
  key: WorkflowStage;
  label: string;
  step: string;
  icon: React.ComponentType<{ className?: string }>;
}> = [
  { key: 'STAGE_A_INTAKE', label: 'File Intake', step: 'A', icon: FileCheck2 },
  { key: 'STAGE_B_UNDERSTAND', label: 'Understand Goal', step: 'B', icon: Sparkles },
  { key: 'STAGE_C_ANALYZE', label: 'Deep Extraction', step: 'C', icon: Search },
  { key: 'STAGE_D_CHECKLIST', label: 'Dynamic Checklist', step: 'D', icon: ListTodo },
  { key: 'STAGE_E_GAPS', label: 'Gap Identification', step: 'E', icon: AlertCircle },
  { key: 'STAGE_F_QUESTIONS', label: 'Targeted Questions', step: 'F', icon: HelpCircle },
  { key: 'STAGE_G_MERGE', label: 'Merge Context', step: 'G', icon: GitMerge },
  { key: 'STAGE_H_GENERATE', label: 'Creation / Edit', step: 'H', icon: Cpu },
  { key: 'STAGE_I_POST_ANALYZE', label: 'Output Inspection', step: 'I', icon: Eye },
  { key: 'STAGE_J_POST_CHECKLIST', label: 'Post-Audit', step: 'J', icon: CheckCircle2 },
  { key: 'STAGE_K_REPEAT', label: 'Refine Loop', step: 'K', icon: RefreshCw },
  { key: 'STAGE_L_DELIVER', label: 'Final Delivery', step: 'L', icon: Trophy },
];

export default function WorkflowStageBar({ currentStage }: WorkflowStageBarProps) {
  const currentIndex = STAGES.findIndex((s) => s.key === currentStage);

  return (
    <div className="w-full bg-[#080d1e]/80 border border-white/10 rounded-2xl p-4 backdrop-blur-xl shadow-xl shadow-cyan-950/20 mb-6">
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <div className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-ping" />
          <span className="text-xs uppercase font-mono tracking-wider text-cyan-300 font-bold">
            Claude-Style Intelligent Workflow Pipeline
          </span>
        </div>
        <div className="text-xs font-mono text-slate-400">
          Stage <strong className="text-cyan-400">{STAGES[currentIndex]?.step || 'A'}</strong> of 12:{' '}
          <span className="text-white font-medium">{STAGES[currentIndex]?.label || 'File Intake'}</span>
        </div>
      </div>

      {/* Progress Track */}
      <div className="relative overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center min-w-[760px] justify-between relative">
          <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-white/10 -translate-y-1/2 -z-0" />
          <div
            className="absolute top-1/2 left-4 h-0.5 bg-gradient-to-r from-cyan-500 via-indigo-500 to-emerald-400 -translate-y-1/2 -z-0 transition-all duration-500"
            style={{
              width: `${(Math.max(0, currentIndex) / (STAGES.length - 1)) * 96}%`,
            }}
          />

          {STAGES.map((s, idx) => {
            const Icon = s.icon;
            const isCompleted = idx < currentIndex || currentStage === 'STAGE_L_DELIVER';
            const isActive = idx === currentIndex && currentStage !== 'STAGE_L_DELIVER';

            return (
              <div key={s.key} className="flex flex-col items-center group relative z-10">
                <div
                  className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono text-xs font-bold transition-all duration-300 border ${
                    isCompleted
                      ? 'bg-emerald-500/20 border-emerald-400/60 text-emerald-300 shadow-md shadow-emerald-500/20'
                      : isActive
                      ? 'bg-cyan-500/25 border-cyan-400 text-cyan-200 ring-4 ring-cyan-500/20 shadow-lg shadow-cyan-500/30 scale-110'
                      : 'bg-[#0f172a] border-white/10 text-slate-500'
                  }`}
                  title={`${s.step}: ${s.label}`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <span
                  className={`text-[10px] mt-2 font-medium tracking-tight whitespace-nowrap transition-colors ${
                    isActive
                      ? 'text-cyan-300 font-bold'
                      : isCompleted
                      ? 'text-slate-300'
                      : 'text-slate-500'
                  }`}
                >
                  {s.step}: {s.label}
                </span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
