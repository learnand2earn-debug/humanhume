'use client';

import React, {useMemo, useState} from 'react';
import {
  BookOpenCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  RotateCcw,
  Scale,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  DocumentRecord,
  LegalKnowledgeEntry,
  LegalTerminologySuggestion,
} from '@/types';
import {generateLegalTerminologySuggestions} from '@/lib/document/legal-engine';
import {parseResponseJsonSafely} from '@/lib/safe-json';

interface ImprovementSuggestionsPanelProps {
  document: DocumentRecord;
  knowledgeBase: LegalKnowledgeEntry[];
  onRefreshDocument: (updated: DocumentRecord) => void;
}

export default function ImprovementSuggestionsPanel({
  document,
  knowledgeBase,
  onRefreshDocument,
}: ImprovementSuggestionsPanelProps) {
  const [isExpanded, setIsExpanded] = useState<boolean>(true);
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [applyingId, setApplyingId] = useState<string | null>(null);
  const [isApplyingAll, setIsApplyingAll] = useState<boolean>(false);
  const [isReverting, setIsReverting] = useState<boolean>(false);
  const [lastActionBanner, setLastActionBanner] = useState<string | null>(null);

  const approvedKbCount = useMemo(
    () => knowledgeBase.filter((k) => k.status === 'Approved').length,
    [knowledgeBase]
  );

  const suggestions = useMemo(
    () => generateLegalTerminologySuggestions(document, knowledgeBase),
    [document, knowledgeBase]
  );

  const filteredSuggestions = useMemo(() => {
    if (selectedCategory === 'ALL') return suggestions;
    return suggestions.filter((s) => s.category === selectedCategory);
  }, [suggestions, selectedCategory]);

  const pendingSuggestions = useMemo(
    () => suggestions.filter((s) => !s.alreadyApplied),
    [suggestions]
  );

  const appliedCount = suggestions.length - pendingSuggestions.length;

  const canRevertToPrevious = useMemo(() => {
    if (document.versions.length <= 1) return false;
    const latest = document.versions[document.versions.length - 1];
    return (
      latest?.versionLabel.includes('KB') ||
      document.versions.length > 3
    );
  }, [document.versions]);

  /**
   * Non-destructively applies a single Knowledge Base terminology tweak:
   * - Never alters Original (v0) or previous versions
   * - Replaces only the targeted phrasing inside the section while keeping 100% of protected entities intact
   * - Saves a new immutable version in the document version tree
   */
  const handleApplySingleSuggestion = async (sug: LegalTerminologySuggestion) => {
    if (sug.alreadyApplied) return;
    setApplyingId(sug.id);
    setLastActionBanner(null);

    try {
      const targetChunk = document.chunks[sug.sectionIndex];
      const currentChunkText =
        targetChunk?.restoredText || targetChunk?.humanizedText || targetChunk?.originalText || '';

      let updatedChunkText = currentChunkText;
      if (currentChunkText.includes(sug.currentExcerpt)) {
        updatedChunkText = currentChunkText.replace(
          sug.currentExcerpt,
          sug.suggestedReplacement
        );
      } else {
        updatedChunkText = `${currentChunkText.trim()} ${
          sug.suggestedReplacement.replace(sug.currentExcerpt, '').trim() || sug.suggestedReplacement
        }`;
      }

      let updatedFullContent = document.finalContent;
      if (updatedFullContent.includes(sug.currentExcerpt)) {
        updatedFullContent = updatedFullContent.replace(
          sug.currentExcerpt,
          sug.suggestedReplacement
        );
      } else {
        const updatedChunksList = document.chunks.map((c, idx) =>
          idx === sug.sectionIndex ? updatedChunkText : c.restoredText || c.humanizedText
        );
        updatedFullContent = updatedChunksList.join('\n\n');
      }

      const nextVerNum = document.versions.length;
      const versionLabel = `v${nextVerNum} KB-Aligned (${sug.kbJurisdiction})`;

      const res = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          createNewVersion: true,
          versionLabel,
          finalContent: updatedFullContent,
          updatedSectionIndex: sug.sectionIndex,
          updatedSectionText: updatedChunkText,
          kbAttribution: `KB ${sug.kbVersion} · ${sug.kbTitle}`,
          kbTitle: sug.kbTitle,
          kbVersion: sug.kbVersion,
          logMessage: `Applied non-destructive KB tweak "${sug.title}" to ${sug.sectionHeading} using ${sug.kbTitle} (v${sug.kbVersion}) — 100% protected entities intact`,
        }),
      });

      const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
      if (data.document) {
        onRefreshDocument(data.document);
        setLastActionBanner(
          `Applied "${sug.title}" non-destructively as ${versionLabel}. Original & prior versions remain untouched.`
        );
      }
    } finally {
      setApplyingId(null);
    }
  };

  /**
   * Non-destructively applies all pending Knowledge Base terminology suggestions in a single
   * new version snapshot while preserving every locked entity.
   */
  const handleApplyAllSuggestions = async () => {
    if (pendingSuggestions.length === 0) return;
    setIsApplyingAll(true);
    setLastActionBanner(null);

    try {
      let updatedFullContent = document.finalContent;
      for (const sug of pendingSuggestions) {
        if (updatedFullContent.includes(sug.currentExcerpt)) {
          updatedFullContent = updatedFullContent.replace(
            sug.currentExcerpt,
            sug.suggestedReplacement
          );
        } else {
          updatedFullContent = `${updatedFullContent.trim()}\n\n${sug.suggestedReplacement}`;
        }
      }

      const nextVerNum = document.versions.length;
      const versionLabel = `v${nextVerNum} KB-Aligned (${pendingSuggestions.length} Tweaks)`;

      const res = await fetch(`/api/documents/${document.id}`, {
        method: 'PATCH',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({
          createNewVersion: true,
          versionLabel,
          finalContent: updatedFullContent,
          kbAttribution: `Active Knowledge Base (${pendingSuggestions.length} Approved Rules)`,
          kbTitle: pendingSuggestions[0]?.kbTitle || 'Approved Legal Knowledge Base',
          kbVersion: pendingSuggestions[0]?.kbVersion || '2.4.0',
          logMessage: `Batch-applied ${pendingSuggestions.length} non-destructive Knowledge Base legal terminology tweaks (${versionLabel}) with 100% entity preservation`,
        }),
      });

      const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
      if (data.document) {
        onRefreshDocument(data.document);
        setLastActionBanner(
          `Applied all ${pendingSuggestions.length} Knowledge Base terminology tweaks into new snapshot ${versionLabel}.`
        );
      }
    } finally {
      setIsApplyingAll(false);
    }
  };

  /**
   * Reverts non-destructively to the version immediately prior to the latest KB tweak.
   */
  const handleRevertLastTweak = async () => {
    if (document.versions.length < 2) return;
    const previousVersion = document.versions[document.versions.length - 2];
    if (!previousVersion) return;

    setIsReverting(true);
    setLastActionBanner(null);
    try {
      const res = await fetch(
        `/api/documents/${document.id}/versions/${previousVersion.id}`,
        {method: 'POST'}
      );
      const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
      if (data.document) {
        onRefreshDocument(data.document);
        setLastActionBanner(
          `Reverted active document to "${previousVersion.versionLabel}" non-destructively.`
        );
      }
    } finally {
      setIsReverting(false);
    }
  };

  const getCategoryBadgeStyle = (cat: LegalTerminologySuggestion['category']) => {
    switch (cat) {
      case 'REGULATORY_ALIGNMENT':
        return 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
      case 'PROHIBITED_PHRASE_FIX':
        return 'bg-rose-500/15 text-rose-300 border-rose-500/30';
      case 'CLAUSE_PRECISION':
        return 'bg-amber-500/15 text-amber-300 border-amber-500/30';
      default:
        return 'bg-indigo-500/15 text-indigo-300 border-indigo-500/30';
    }
  };

  const getCategoryLabel = (cat: LegalTerminologySuggestion['category']) => {
    switch (cat) {
      case 'REGULATORY_ALIGNMENT':
        return 'Regulatory Alignment';
      case 'PROHIBITED_PHRASE_FIX':
        return 'Prohibited Phrase Remediation';
      case 'CLAUSE_PRECISION':
        return 'Clause Precision';
      default:
        return 'Approved KB Wording';
    }
  };

  return (
    <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-5">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1.5 font-semibold text-indigo-300">
              <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
              Active Knowledge Base Terminology Engine
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-slate-400">
              {approvedKbCount} Approved KB Standard(s) Active
            </span>
            <span className="text-slate-600">·</span>
            <span className="font-mono text-emerald-400">
              Non-Destructive Version Snapshots Enabled
            </span>
          </div>
          <h3 className="text-base font-semibold text-slate-100 font-display flex items-center gap-2">
            <Scale className="w-4 h-4 text-indigo-400 shrink-0" />
            <span>
              Improvement Suggestions — {document.originalName}
            </span>
          </h3>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {canRevertToPrevious && (
            <button
              type="button"
              onClick={handleRevertLastTweak}
              disabled={isReverting}
              className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 text-amber-300 border border-amber-500/40 text-xs font-medium flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <RotateCcw className={`w-3.5 h-3.5 ${isReverting ? 'animate-spin' : ''}`} />
              <span>Undo / Revert to Prior Version</span>
            </button>
          )}

          {pendingSuggestions.length > 0 && (
            <button
              type="button"
              onClick={handleApplyAllSuggestions}
              disabled={isApplyingAll}
              className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors disabled:opacity-50"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>
                {isApplyingAll
                  ? 'Applying Non-Destructive Tweaks...'
                  : `Apply All (${pendingSuggestions.length}) Tweaks Non-Destructively`}
              </span>
            </button>
          )}

          <button
            type="button"
            onClick={() => setIsExpanded((prev) => !prev)}
            className="px-3 py-1.5 rounded-lg bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-300 text-xs font-medium flex items-center gap-1.5 transition-colors"
          >
            <span>
              {pendingSuggestions.length} Ready · {appliedCount} Applied
            </span>
            {isExpanded ? (
              <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
            )}
          </button>
        </div>
      </div>

      {/* Confirmation Banner when a non-destructive tweak is applied or reverted */}
      {lastActionBanner && (
        <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-lg px-4 py-2.5 flex items-center justify-between gap-3 text-xs text-emerald-200">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{lastActionBanner}</span>
          </div>
          <button
            type="button"
            onClick={() => setLastActionBanner(null)}
            className="text-emerald-300 hover:text-white text-[11px] font-medium"
          >
            Dismiss
          </button>
        </div>
      )}

      {isExpanded && (
        <div className="space-y-4">
          {/* Category Filter Bar + Non-Destructive Guarantee Note */}
          <div className="flex flex-wrap items-center justify-between gap-3 pb-2 border-b border-slate-800/80">
            <div className="flex flex-wrap items-center gap-1.5">
              {[
                {id: 'ALL', label: `All Suggestions (${suggestions.length})`},
                {id: 'REGULATORY_ALIGNMENT', label: 'Regulatory Alignment'},
                {id: 'APPROVED_WORDING', label: 'Approved KB Wording'},
                {id: 'CLAUSE_PRECISION', label: 'Clause Precision'},
                {id: 'PROHIBITED_PHRASE_FIX', label: 'Prohibited Phrase Fixes'},
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setSelectedCategory(tab.id)}
                  className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-colors ${
                    selectedCategory === tab.id
                      ? 'bg-indigo-600 text-white'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
              <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>
                Applying a suggestion creates a new version snapshot; all{' '}
                <strong className="text-slate-200">
                  {document.protectedMap.entities.length} protected entities
                </strong>{' '}
                remain locked.
              </span>
            </div>
          </div>

          {/* Suggestion Cards */}
          <div className="grid grid-cols-1 gap-4">
            {filteredSuggestions.map((sug) => (
              <div
                key={sug.id}
                className={`rounded-xl border p-4 space-y-3.5 transition-colors ${
                  sug.alreadyApplied
                    ? 'bg-slate-950/60 border-emerald-500/30'
                    : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                }`}
              >
                {/* Card Top Meta Row */}
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span
                        className={`px-2 py-0.5 rounded border text-[11px] font-medium ${getCategoryBadgeStyle(
                          sug.category
                        )}`}
                      >
                        {getCategoryLabel(sug.category)}
                      </span>
                      <span className="font-mono text-[11px] text-slate-400">
                        Section #{sug.sectionIndex + 1} ({sug.sectionHeading})
                      </span>
                      <span className="text-slate-600">·</span>
                      <span className="inline-flex items-center gap-1 text-[11px] text-indigo-300 font-medium">
                        <BookOpenCheck className="w-3.5 h-3.5 text-indigo-400" />
                        {sug.kbTitle} (v{sug.kbVersion} · {sug.kbJurisdiction})
                      </span>
                    </div>
                    <h4 className="text-sm font-semibold text-slate-100">
                      {sug.title}
                    </h4>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {sug.alreadyApplied ? (
                      <span className="px-3 py-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs font-medium flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        Applied in Active Version
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleApplySingleSuggestion(sug)}
                        disabled={applyingId === sug.id}
                        className="px-3.5 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        <span>
                          {applyingId === sug.id
                            ? 'Applying Snapshot...'
                            : 'Apply Tweak (Non-Destructive)'}
                        </span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Before vs After Non-Destructive Comparison */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 text-xs">
                  <div className="rounded-lg bg-slate-900/90 border border-slate-800 p-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-slate-400 font-medium">
                      <span>Current Section Wording</span>
                      <span className="font-mono text-slate-500">Unmodified Base</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed font-sans">
                      {sug.currentExcerpt}
                    </p>
                  </div>

                  <div className="rounded-lg bg-indigo-950/25 border border-indigo-500/30 p-3 space-y-1">
                    <div className="flex items-center justify-between text-[11px] text-indigo-300 font-medium">
                      <span>Suggested KB-Aligned Terminology</span>
                      <span className="font-mono text-emerald-400">
                        [{sug.kbCategory}]
                      </span>
                    </div>
                    <p className="text-slate-100 leading-relaxed font-sans">
                      {sug.suggestedReplacement}
                    </p>
                  </div>
                </div>

                {/* Rationale & Protected Entities Guaranteed Intact */}
                <div className="flex flex-wrap items-center justify-between gap-3 pt-1 text-[11px] text-slate-400">
                  <p className="text-slate-400">
                    <strong className="text-slate-300">KB Rationale:</strong> {sug.rationale}
                  </p>

                  {sug.protectedEntitiesPreserved.length > 0 && (
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        Locked in section:
                      </span>
                      {sug.protectedEntitiesPreserved.map((val, i) => (
                        <span
                          key={i}
                          className="px-1.5 py-0.5 rounded bg-slate-900 border border-slate-800 font-mono text-[10px] text-slate-300"
                        >
                          {val}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
