'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  CheckCircle2,
  Send,
  Sparkles,
  ArrowRight,
  Info,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { TargetedQuestion } from '@/lib/intelligent/types';

interface TargetedQuestionCardProps {
  questions: TargetedQuestion[];
  onSubmitAnswers: (answers: Record<string, string>) => void;
  onProceedWithGaps: () => void;
  isLoading: boolean;
}

export default function TargetedQuestionCard({
  questions,
  onSubmitAnswers,
  onProceedWithGaps,
  isLoading,
}: TargetedQuestionCardProps) {
  const pendingQuestions = questions.filter((q) => !q.answered);
  const answeredQuestions = questions.filter((q) => q.answered);

  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    pendingQuestions.forEach((q) => {
      if (q.defaultChoice) initial[q.id] = q.defaultChoice;
    });
    return initial;
  });

  const [showHistory, setShowHistory] = useState(false);

  const handleSelectChoice = (questionId: string, choice: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: choice }));
  };

  const handleTextChange = (questionId: string, val: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: val }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitAnswers(answers);
  };

  if (pendingQuestions.length === 0 && answeredQuestions.length === 0) {
    return null;
  }

  return (
    <div className="w-full bg-[#0a1024]/90 border border-white/10 rounded-2xl p-5 backdrop-blur-xl shadow-xl">
      {pendingQuestions.length > 0 ? (
        <form onSubmit={handleSubmit}>
          <div className="flex items-center justify-between mb-4 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-cyan-500/15 border border-cyan-500/30 flex items-center justify-center">
                <HelpCircle className="w-4 h-4 text-cyan-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">
                  Targeted Clarifications Required ({pendingQuestions.length})
                </h3>
                <p className="text-xs text-slate-400">
                  Targeted high-value questions to resolve incomplete requirements before final generation.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={onProceedWithGaps}
              disabled={isLoading}
              className="text-xs font-semibold text-slate-400 hover:text-amber-300 transition-colors underline cursor-pointer"
            >
              Proceed with acknowledged gaps →
            </button>
          </div>

          {/* Question Items */}
          <div className="space-y-4">
            {pendingQuestions.map((q, idx) => (
              <div
                key={q.id}
                className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-3"
              >
                <div>
                  <div className="flex items-center gap-2 text-xs text-cyan-300 font-semibold mb-1">
                    <span>Question {idx + 1} of {pendingQuestions.length}</span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">{q.question}</h4>
                  <p className="text-xs text-slate-400 mt-1">{q.context}</p>
                </div>

                {/* Multiple choice options */}
                {q.type === 'choice' && q.options && q.options.length > 0 ? (
                  <div className="space-y-1.5 pt-1">
                    {q.options.map((opt) => {
                      const isSelected = answers[q.id] === opt;
                      return (
                        <div
                          key={opt}
                          onClick={() => handleSelectChoice(q.id, opt)}
                          className={`p-2.5 rounded-xl border text-xs cursor-pointer flex items-center justify-between transition-all ${
                            isSelected
                              ? 'bg-cyan-500/15 border-cyan-400 text-cyan-100 shadow-md shadow-cyan-500/10'
                              : 'bg-white/[0.02] border-white/10 text-slate-300 hover:bg-white/[0.06]'
                          }`}
                        >
                          <span className="font-medium">{opt}</span>
                          {isSelected && <Check className="w-4 h-4 text-cyan-400 shrink-0" />}
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <textarea
                    rows={2}
                    value={answers[q.id] || ''}
                    onChange={(e) => handleTextChange(q.id, e.target.value)}
                    placeholder="Enter specific instructions or confirmed facts..."
                    className="w-full bg-[#070b18] border border-white/15 rounded-xl p-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
                  />
                )}

                <div className="flex items-center gap-1.5 text-[11px] text-slate-500">
                  <Info className="w-3.5 h-3.5" />
                  <span>Why needed: {q.whyNeeded}</span>
                </div>
              </div>
            ))}
          </div>

          {/* Action Row */}
          <div className="mt-4 pt-3 border-t border-white/[0.08] flex items-center justify-between">
            <span className="text-xs text-slate-400">
              Answers are permanently merged into the task state without restarting.
            </span>
            <button
              type="submit"
              disabled={isLoading}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-2 cursor-pointer transition-all"
            >
              <Send className="w-3.5 h-3.5" />
              <span>Merge Answers & Update Checklist</span>
            </button>
          </div>
        </form>
      ) : (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>All follow-up questions have been successfully answered. Ready to generate!</span>
          </div>
        </div>
      )}

      {/* Answer History Accordion */}
      {answeredQuestions.length > 0 && (
        <div className="mt-3 pt-3 border-t border-white/[0.06]">
          <button
            type="button"
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-xs text-slate-400 hover:text-white transition-colors"
          >
            <span>Resolved Question History ({answeredQuestions.length})</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>

          {showHistory && (
            <div className="mt-2 space-y-2">
              {answeredQuestions.map((q) => (
                <div
                  key={q.id}
                  className="p-2.5 rounded-lg bg-white/[0.02] border border-white/[0.06] text-xs text-slate-300"
                >
                  <p className="font-semibold text-white">{q.question}</p>
                  <p className="text-emerald-300 text-[11px] mt-1 font-mono">
                    ✓ Answer: {q.answer}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
