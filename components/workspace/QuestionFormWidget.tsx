'use client';

import React, { useState } from 'react';
import {
  HelpCircle,
  Send,
  FastForward,
  Check,
  ChevronRight,
  Info,
  Sparkles,
} from 'lucide-react';
import { TargetedQuestion } from '@/lib/intelligent/types';

interface QuestionFormWidgetProps {
  questions: TargetedQuestion[];
  onSubmitAnswers: (answers: Record<string, string>) => void;
  onProceedAnyway?: () => void;
  isSubmitting?: boolean;
}

export default function QuestionFormWidget({
  questions,
  onSubmitAnswers,
  onProceedAnyway,
  isSubmitting = false,
}: QuestionFormWidgetProps) {
  // Store form state for each question
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    questions.forEach((q) => {
      if (q.answer) {
        initial[q.id] = q.answer;
      } else if (q.defaultChoice) {
        initial[q.id] = q.defaultChoice;
      } else {
        initial[q.id] = '';
      }
    });
    return initial;
  });

  const unanswered = questions.filter((q) => !q.answered);
  if (unanswered.length === 0) return null;

  const handleTextChange = (id: string, value: string) => {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  };

  const handleChoiceSelect = (id: string, option: string) => {
    setAnswers((prev) => ({ ...prev, [id]: option }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmitAnswers(answers);
  };

  const filledCount = Object.values(answers).filter((v) => v.trim().length > 0).length;

  return (
    <div className="w-full bg-[#0c1228]/95 border border-indigo-500/30 rounded-2xl p-5 shadow-2xl backdrop-blur-xl mb-4 relative overflow-hidden">
      {/* Glow background accent */}
      <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
            <HelpCircle className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
              Targeted Follow-up Questions
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-semibold">
                {unanswered.length} Required for Optimal Output
              </span>
            </h3>
            <p className="text-[11px] text-slate-400 mt-0.5">
              The AI detected essential details needed to complete this task with highest fidelity.
            </p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {unanswered.map((q, idx) => (
          <div
            key={q.id}
            className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-indigo-500/30 transition-colors space-y-2.5"
          >
            <div className="flex items-start gap-2.5">
              <span className="w-5 h-5 rounded-full bg-indigo-500/20 text-indigo-300 text-[10px] font-mono font-bold flex items-center justify-center flex-shrink-0 mt-0.5">
                {idx + 1}
              </span>
              <div className="space-y-1 flex-1">
                <label className="text-xs font-semibold text-slate-200 block">
                  {q.question}
                </label>
                {q.whyNeeded && (
                  <p className="text-[10px] text-slate-400 flex items-center gap-1.5">
                    <Info className="w-3 h-3 text-indigo-400 flex-shrink-0" />
                    <span>Why needed: {q.whyNeeded}</span>
                  </p>
                )}
              </div>
            </div>

            {/* Quick choices if available */}
            {q.options && q.options.length > 0 && (
              <div className="flex flex-wrap gap-1.5 pl-7">
                {q.options.map((opt) => {
                  const isSelected = answers[q.id] === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => handleChoiceSelect(q.id, opt)}
                      className={`text-[11px] px-3 py-1 rounded-lg border font-medium transition-all ${
                        isSelected
                          ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/30'
                          : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:text-white'
                      }`}
                    >
                      {opt}
                    </button>
                  );
                })}
              </div>
            )}

            {/* Text input / Custom answer */}
            <div className="pl-7">
              <input
                type="text"
                placeholder={q.options ? 'Or specify custom answer...' : 'Type your answer here...'}
                value={answers[q.id] || ''}
                onChange={(e) => handleTextChange(q.id, e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg bg-black/40 border border-white/10 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500/60 focus:ring-1 focus:ring-indigo-500/60 transition-colors"
              />
            </div>
          </div>
        ))}

        {/* Action Controls */}
        <div className="flex items-center justify-between pt-2 border-t border-white/5 flex-wrap gap-2">
          {onProceedAnyway && (
            <button
              type="button"
              onClick={onProceedAnyway}
              disabled={isSubmitting}
              className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 px-3 py-1.5 rounded-lg hover:bg-white/5 transition-colors disabled:opacity-50"
            >
              <FastForward className="w-3.5 h-3.5" />
              <span>Proceed with Available Data (Acknowledge Gaps)</span>
            </button>
          )}

          <div className="flex items-center gap-2 ml-auto">
            <button
              type="submit"
              disabled={isSubmitting || filledCount === 0}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Processing...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Submit & Synthesize Output</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>
    </div>
  );
}
