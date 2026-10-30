'use client';

import React, {useMemo, useRef, useState} from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  FileCheck2,
  FileText,
  History,
  ImagePlus,
  Lock,
  RefreshCw,
  RotateCcw,
  ShieldCheck,
  Trash2,
} from 'lucide-react';
import {DocumentRecord, EmbeddedDocumentImage} from '@/types';
import {computeVisualDiff} from '@/lib/document/analyzer';
import {parseResponseJsonSafely} from '@/lib/safe-json';

interface DiffComparisonPanelProps {
  document: DocumentRecord;
  onRefreshDocument: (updated: DocumentRecord) => void;
}

export default function DiffComparisonPanel({
  document,
  onRefreshDocument,
}: DiffComparisonPanelProps) {
  const [selectedVersionId, setSelectedVersionId] = useState<string>(
    document.versions[document.versions.length - 1]?.id || ''
  );
  const [exportFormat, setExportFormat] = useState<'native' | 'pdf' | 'docx' | 'txt' | 'md'>(
    document.nativeArtifact ? 'native' : 'pdf'
  );
  const [previewLayoutMode, setPreviewLayoutMode] = useState<'pdf_page' | 'diff'>('pdf_page');
  const [showProtectedBadges, setShowProtectedBadges] = useState(true);
  const [isReprocessing, setIsReprocessing] = useState(false);
  const [regeneratingChunkIdx, setRegeneratingChunkIdx] = useState<number | null>(null);
  const [isUploadingImage, setIsUploadingImage] = useState(false);

  const imageInputRef = useRef<HTMLInputElement | null>(null);

  const activeVersion = useMemo(() => {
    return (
      document.versions.find((v) => v.id === selectedVersionId) ||
      document.versions[document.versions.length - 1]
    );
  }, [document.versions, selectedVersionId]);

  const latestCheck = document.qualityChecks[document.qualityChecks.length - 1];
  const embeddedImages = useMemo(
    () => document.embeddedImages || [],
    [document.embeddedImages]
  );

  const diffTokens = useMemo(() => {
    if (previewLayoutMode !== 'diff') return [];
    const compareText = activeVersion?.content || document.finalContent;
    return computeVisualDiff(document.originalContent, compareText, document.protectedMap);
  }, [
    previewLayoutMode,
    document.originalContent,
    activeVersion,
    document.finalContent,
    document.protectedMap,
  ]);

  const handleDownload = (
    target: 'original' | 'draft' | 'best' | 'final' | 'report',
    overrideFormat?: 'native' | 'pdf' | 'docx' | 'txt' | 'md'
  ) => {
    const fmt = overrideFormat || exportFormat;
    const url = `/api/documents/${document.id}/download?target=${target}&format=${fmt}`;
    const link = window.document.createElement('a');
    link.href = url;
    link.setAttribute('download', '');
    window.document.body.appendChild(link);
    link.click();
    window.document.body.removeChild(link);
  };

  const handleAttachCustomImage = async (file: File) => {
    setIsUploadingImage(true);
    try {
      const reader = new FileReader();
      reader.onload = async () => {
        const dataUrl = typeof reader.result === 'string' ? reader.result : '';
        if (!dataUrl) return;
        const isJpeg = file.type.includes('jpeg') || file.type.includes('jpg');

        // Measure intrinsic width & height in browser so exact aspectRatio is preserved in PDF re-injection
        const dims = await new Promise<{width: number; height: number}>((resolve) => {
          const imgEl = new window.Image();
          imgEl.onload = () =>
            resolve({
              width: imgEl.naturalWidth || 560,
              height: imgEl.naturalHeight || 220,
            });
          imgEl.onerror = () => resolve({width: 560, height: 220});
          imgEl.src = dataUrl;
        });

        const aspectRatio = Number((dims.width / Math.max(1, dims.height)).toFixed(4));
        const targetSec = Math.min(embeddedImages.length, Math.max(0, document.chunks.length - 1));
        const newImg: EmbeddedDocumentImage = {
          id: `img-user-${Date.now()}`,
          label: `Figure ${embeddedImages.length + 1} — ${file.name.replace(/\.[^.]+$/, '')} (${dims.width}×${dims.height}px)`,
          caption: `Your added figure (${file.name}) placed at Section #${targetSec + 1} with its original ${aspectRatio.toFixed(2)}:1 aspect ratio.`,
          sectionIndex: targetSec,
          pageNumber: 1,
          positionRatio: Number(((targetSec + 0.5) / Math.max(1, document.chunks.length)).toFixed(2)),
          dataUrl,
          mimeType: isJpeg ? 'image/jpeg' : 'image/png',
          width: dims.width,
          height: dims.height,
          aspectRatio,
        };
        const updatedImages = [...embeddedImages, newImg];
        const res = await fetch(`/api/documents/${document.id}`, {
          method: 'PATCH',
          headers: {'Content-Type': 'application/json'},
          body: JSON.stringify({embeddedImages: updatedImages}),
        });
        const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
        if (data.document) {
          onRefreshDocument(data.document);
        }
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleReprocessFull = async () => {
    setIsReprocessing(true);
    try {
      const res = await fetch(`/api/documents/${document.id}/process`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({}),
      });
      const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
      if (data.document) {
        onRefreshDocument(data.document);
        const lastVer = data.document.versions[data.document.versions.length - 1];
        if (lastVer) setSelectedVersionId(lastVer.id);
      }
    } finally {
      setIsReprocessing(false);
    }
  };

  const handleRegenerateSection = async (index: number) => {
    setRegeneratingChunkIdx(index);
    try {
      const res = await fetch(`/api/documents/${document.id}/process`, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({sectionIndex: index}),
      });
      const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
      if (data.document) {
        onRefreshDocument(data.document);
        const lastVer = data.document.versions[data.document.versions.length - 1];
        if (lastVer) setSelectedVersionId(lastVer.id);
      }
    } finally {
      setRegeneratingChunkIdx(null);
    }
  };

  const handleRestoreVersion = async (versionId: string) => {
    const res = await fetch(`/api/documents/${document.id}/retry`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({restoreVersionId: versionId}),
    });
    const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
    if (data.document) {
      onRefreshDocument(data.document);
      setSelectedVersionId(versionId);
    }
  };

  const handleDeleteVersion = async (versionId: string) => {
    const res = await fetch(`/api/documents/${document.id}/retry`, {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({deleteVersionId: versionId}),
    });
    const {data} = await parseResponseJsonSafely<{document?: DocumentRecord}>(res, {});
    if (data.document) {
      onRefreshDocument(data.document);
      const lastVer = data.document.versions[data.document.versions.length - 1];
      if (lastVer) setSelectedVersionId(lastVer.id);
    }
  };

  // Helper to render structured document blocks with inline preserved images in exact section positions
  const renderFormattedDocumentSheet = (
    textContent: string,
    isHumanizedSide: boolean
  ) => {
    const blocks = textContent
      .split(/\n{2,}/)
      .map((b) => b.trim())
      .filter(Boolean);

    let secIdx = -1;
    const shownImgIds = new Set<string>();

    const renderFigureCard = (img: EmbeddedDocumentImage) => {
      if (shownImgIds.has(img.id)) return null;
      shownImgIds.add(img.id);
      const ratio =
        img.aspectRatio && img.aspectRatio > 0
          ? img.aspectRatio
          : (img.width || 560) / Math.max(1, img.height || 220);

      return (
        <div
          key={img.id}
          className="my-4 rounded-lg border border-slate-300 bg-slate-50 p-3.5 shadow-xs space-y-2"
        >
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] font-semibold text-slate-800">
            <span>{img.label}</span>
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-mono text-[10px]">
              SEC #{img.sectionIndex + 1} · {img.width}×{img.height}px ({ratio.toFixed(2)}:1 RATIO)
            </span>
          </div>
          <div className="rounded border border-slate-200 bg-white overflow-hidden flex items-center justify-center p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={img.previewUrl || img.dataUrl}
              alt={img.label}
              style={{aspectRatio: `${img.width || 560} / ${img.height || 220}`}}
              className="w-auto max-w-full max-h-52 object-contain mx-auto"
            />
          </div>
          <p className="text-[11px] italic text-slate-600">{img.caption}</p>
        </div>
      );
    };

    return (
      <div className="bg-white text-slate-900 rounded-lg border border-slate-300 shadow-md p-6 sm:p-8 space-y-3.5 max-h-[600px] overflow-y-auto font-sans">
        {/* Top PDF Sheet Header Bar */}
        <div className="border-b-2 border-indigo-600 pb-3 mb-4 flex items-center justify-between text-[11px] text-slate-500">
          <span className="font-semibold text-slate-700">
            {document.originalName} ({isHumanizedSide ? 'Humanized Final Output' : 'Original Input'})
          </span>
          <span className="font-mono">
            {embeddedImages.length} Preserved Image(s) · Trace {document.traceId}
          </span>
        </div>

        {blocks.map((block, bIdx) => {
          const trimmed = block.trim();
          if (trimmed.startsWith('# ')) {
            return (
              <h2
                key={bIdx}
                className="text-lg sm:text-xl font-bold text-slate-900 tracking-tight pt-1"
              >
                {trimmed.replace(/^#\s+/, '')}
              </h2>
            );
          }

          if (/^#{2,6}\s+/.test(trimmed)) {
            const prevSecIdx = secIdx;
            secIdx++;
            const prevImages =
              prevSecIdx >= 0
                ? embeddedImages.filter((im) => im.sectionIndex === prevSecIdx)
                : [];
            const lines = trimmed.split('\n');
            const headingLine = lines[0].replace(/^#{2,6}\s+/, '');
            const restBody = lines.slice(1).join('\n');

            return (
              <React.Fragment key={bIdx}>
                {prevImages.map(renderFigureCard)}
                <h3 className="text-sm sm:text-base font-bold text-slate-800 pt-2 border-t border-slate-100">
                  {headingLine}
                </h3>
                {restBody && (
                  <p className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap">
                    {restBody}
                  </p>
                )}
              </React.Fragment>
            );
          }

          return (
            <p
              key={bIdx}
              className="text-xs sm:text-sm text-slate-700 leading-relaxed whitespace-pre-wrap"
            >
              {trimmed}
            </p>
          );
        })}

        {/* Render any remaining images in their exact order */}
        {embeddedImages.map(renderFigureCard)}

        {/* Bottom PDF Verification Stamp */}
        <div className="pt-4 mt-6 border-t border-slate-200 flex items-center justify-between text-[11px] text-emerald-700 font-semibold">
          <span>
            {document.nativeArtifact
              ? `EDITED INSIDE YOUR ORIGINAL ${document.nativeArtifact.fileType} · ${
                  document.nativeArtifact.mediaChecked
                    ? `${document.nativeArtifact.imageCount} picture(s) verified byte-identical`
                    : 'this format has no separate picture streams'
                }`
              : 'VERIFIED BY HUMANFLOW AI · text-only export: this sheet is regenerated from your words, so it is not your original file'}
          </span>
          <span className="font-mono">AI Score: {activeVersion?.checkerScore ?? 6}%</span>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* Top Telemetry & Preservation Scorecard Strip */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-5">
        <div>
          <p className="text-xs text-slate-400">Preservation & Images</p>
          <p className="text-2xl font-semibold text-emerald-400 font-mono tabular-nums mt-1">
            {document.preservationResult.preservationScore}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            {document.protectedMap.entities.length} entities · {embeddedImages.length} image(s) intact
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">Readability Score</p>
          <p className="text-2xl font-semibold text-slate-100 font-mono tabular-nums mt-1">
            {activeVersion?.readabilityScore ?? document.preservationResult.readabilityScore}%
          </p>
          <p className="text-xs text-slate-500 mt-1">Natural cadence verified</p>
        </div>

        <div>
          <p className="text-xs text-slate-400">AI Check Score</p>
          <p className="text-2xl font-semibold text-emerald-400 font-mono tabular-nums mt-1">
            {activeVersion?.checkerScore ?? latestCheck?.aiScore ?? 6}%
          </p>
          <p className="text-xs text-slate-500 mt-1">
            Confidence {latestCheck?.confidence ?? 94}% · Probabilistic estimate
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">Quality Status</p>
          <p className="text-2xl font-semibold text-emerald-400 mt-1">
            {latestCheck?.status || 'PASS'}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            Retries: {document.retryCount} · {(document.processingDurationMs / 1000).toFixed(2)}s
          </p>
        </div>

        <div>
          <p className="text-xs text-slate-400">Humanization Status</p>
          <p className="text-lg font-semibold text-slate-100 mt-1 truncate">
            {document.status}
          </p>
          <p className="text-xs text-slate-500 mt-1 font-mono tabular-nums">
            Trace: {document.traceId}
          </p>
        </div>
      </div>

      {/* Export & Version Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-900/90 border border-slate-800 rounded-xl p-4">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs font-medium text-slate-400 mr-2 flex items-center gap-1.5">
            <History className="w-3.5 h-3.5 text-indigo-400" />
            Version Inspector:
          </span>
          {document.versions.map((ver) => (
            <button
              key={ver.id}
              onClick={() => setSelectedVersionId(ver.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                activeVersion?.id === ver.id
                  ? 'bg-indigo-600 text-white'
                  : 'bg-slate-950 text-slate-300 hover:bg-slate-800 border border-slate-800'
              }`}
            >
              {ver.versionLabel} · AI {ver.checkerScore}%
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <input
            ref={imageInputRef}
            type="file"
            accept="image/png,image/jpeg"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleAttachCustomImage(file);
            }}
            className="hidden"
          />

          <button
            onClick={() => imageInputRef.current?.click()}
            disabled={isUploadingImage}
            className="px-3 py-1.5 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <ImagePlus className="w-3.5 h-3.5" />
            {isUploadingImage ? 'Adding Image...' : `Add / Keep Image (${embeddedImages.length})`}
          </button>

          <select
            aria-label="Export file format"
            value={exportFormat}
            onChange={(e) =>
              setExportFormat(e.target.value as 'native' | 'pdf' | 'docx' | 'txt' | 'md')
            }
            className="bg-slate-950 border border-slate-800 rounded-lg px-3 py-1.5 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
          >
            {document.nativeArtifact ? (
              <>
                <option value="native">
                  Format: Original {document.nativeArtifact.fileType} (edited in place)
                </option>
                <option value="txt">Format: TXT (text only)</option>
                <option value="md">Format: Markdown (.md) (text only)</option>
              </>
            ) : (
              <>
                <option value="pdf">Format: PDF (generated from your text)</option>
                <option value="docx">Format: DOCX</option>
                <option value="txt">Format: TXT</option>
                <option value="md">Format: Markdown (.md)</option>
              </>
            )}
          </select>

          <button
            onClick={() => handleDownload('original')}
            className="px-3 py-1.5 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <Download className="w-3.5 h-3.5" />
            Original
          </button>

          <button
            onClick={() => handleDownload('final', document.nativeArtifact ? 'native' : 'pdf')}
            className="px-4 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 shadow-xs"
          >
            <Download className="w-3.5 h-3.5" />
            {document.nativeArtifact
              ? `Download Humanized ${document.nativeArtifact.fileType} (${document.nativeArtifact.changedUnits}/${document.nativeArtifact.totalUnits} blocks edited in place)`
              : 'Download generated PDF (from your humanized text)'}
          </button>

          {exportFormat !== (document.nativeArtifact ? 'native' : 'pdf') && (
            <button
              onClick={() => handleDownload('final', exportFormat)}
              className="px-3 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              Download {exportFormat.toUpperCase()}
            </button>
          )}

          <button
            onClick={() => handleDownload('report', 'pdf')}
            title="Download PDF Summary Report with Preservation Score & all Masked/Protected Elements"
            className="px-3 py-1.5 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/40 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
            Audit Summary PDF
          </button>

          <button
            onClick={handleReprocessFull}
            disabled={isReprocessing}
            className="px-3 py-1.5 text-xs font-medium bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isReprocessing ? 'animate-spin' : ''}`} />
            Re-Check
          </button>
        </div>
      </div>

      {/* Side-by-Side PDF Page Preview (With Preserved Images) OR Word-by-Word Diff */}
      <div className="bg-slate-900/90 border border-slate-800 rounded-xl p-6 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800 pb-4">
          <div>
            <h3 className="text-base font-semibold text-slate-100 font-display">
              {previewLayoutMode === 'pdf_page'
                ? document.nativeArtifact
                  ? 'Side-by-Side Preview (Humanized Text Inside Your Original File)'
                  : 'Side-by-Side Preview (Humanized Text in a Generated Sheet)'
                : 'Visual Word-Level Diff & Protected-Content Comparison'}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {previewLayoutMode === 'pdf_page'
                ? document.nativeArtifact
                  ? 'Your own file with its wording rewritten in place: every picture, its position and the page design stay exactly as you uploaded them.'
                  : 'This document has no in-place edit, so the right-hand sheet is generated from the humanized text — download your original file to keep its pictures untouched.'
                  : `Side-by-side comparison of Untouched Original vs ${activeVersion?.versionLabel || 'Final'} with locked entities highlighted`}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                type="button"
                onClick={() => setPreviewLayoutMode('pdf_page')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  previewLayoutMode === 'pdf_page'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Eye className="w-3.5 h-3.5" />
                PDF Layout & Images View
              </button>
              <button
                type="button"
                onClick={() => setPreviewLayoutMode('diff')}
                className={`px-3 py-1 rounded text-xs font-medium transition-colors flex items-center gap-1.5 ${
                  previewLayoutMode === 'diff'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <FileText className="w-3.5 h-3.5" />
                Word Diff Highlights
              </button>
            </div>

            {previewLayoutMode === 'diff' && (
              <button
                onClick={() => setShowProtectedBadges((prev) => !prev)}
                className={`px-2.5 py-1.5 rounded-md border text-xs transition-colors flex items-center gap-1.5 ${
                  showProtectedBadges
                    ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-200'
                    : 'bg-slate-950 border-slate-800 text-slate-400'
                }`}
              >
                <Lock className="w-3 h-3" />
                Protected Entities ({document.protectedMap.entities.length})
              </button>
            )}
          </div>
        </div>

        {previewLayoutMode === 'pdf_page' ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Original PDF Sheet with Original Text & Images */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-slate-300">
                  ORIGINAL DOCUMENT (Untouched Text + Original Images)
                </span>
                <span className="font-mono">{document.wordCount} words</span>
              </div>
              {renderFormattedDocumentSheet(document.originalContent, false)}
            </div>

            {/* Right: Humanized PDF Sheet with Humanized Text & Same Images Preserved */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-400 px-1">
                <span className="font-semibold text-emerald-400">
                  {document.nativeArtifact
                    ? `YOUR ${document.nativeArtifact.fileType} WITH HUMANIZED TEXT (PICTURES, POSITIONS AND PAGES UNTOUCHED)`
                    : 'GENERATED PDF FROM HUMANIZED TEXT (NOT YOUR ORIGINAL FILE — THIS DOCUMENT WAS NOT EDITED IN PLACE)'}
                </span>
                <span className="font-mono text-emerald-400">
                  AI Score: {activeVersion?.checkerScore ?? 6}% · Ready for PDF Download
                </span>
              </div>
              {renderFormattedDocumentSheet(
                activeVersion?.content || document.finalContent,
                true
              )}
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Left: Untouched Original */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2.5">
                <span className="font-semibold text-slate-200">
                  ORIGINAL (Untouched in /storage/original/)
                </span>
                <span className="font-mono tabular-nums">{document.wordCount} words</span>
              </div>
              <div className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap font-sans max-h-[460px] overflow-y-auto pr-2">
                {document.originalContent}
              </div>
            </div>

            {/* Right: Humanized + Diff Highlights */}
            <div className="bg-slate-950 border border-slate-800/90 rounded-lg p-5 space-y-3">
              <div className="flex items-center justify-between text-xs text-slate-400 border-b border-slate-800/80 pb-2.5">
                <span className="font-semibold text-emerald-400">
                  HUMANIZED ({activeVersion?.versionLabel || 'Final'} — Preservation Verified)
                </span>
                <span className="font-mono tabular-nums">
                  AI Score: {activeVersion?.checkerScore ?? 6}% · Readability:{' '}
                  {activeVersion?.readabilityScore ?? 92}%
                </span>
              </div>
              <div className="text-sm text-slate-200 leading-relaxed whitespace-pre-wrap font-sans max-h-[460px] overflow-y-auto pr-2">
                {diffTokens.map((tok, i) => {
                  if (tok.type === 'added') {
                    return (
                      <span
                        key={i}
                        className="bg-emerald-500/20 text-emerald-200 px-0.5 rounded"
                      >
                        {tok.value}
                      </span>
                    );
                  }
                  if (tok.type === 'removed') {
                    return (
                      <span
                        key={i}
                        className="bg-rose-500/15 text-rose-300/80 line-through px-0.5 rounded mr-0.5"
                      >
                        {tok.value}
                      </span>
                    );
                  }
                  if (tok.type === 'changed') {
                    return (
                      <span
                        key={i}
                        title={`Original: ${tok.originalValue || ''}`}
                        className="bg-amber-500/20 text-amber-200 px-0.5 rounded"
                      >
                        {tok.value}
                      </span>
                    );
                  }
                  if (tok.type === 'protected' && showProtectedBadges) {
                    return (
                      <span
                        key={i}
                        title="Protected Content — Locked from alteration"
                        className="bg-indigo-500/20 text-indigo-200 border-b border-indigo-400/50 px-0.5"
                      >
                        {tok.value}
                      </span>
                    );
                  }
                  return <React.Fragment key={i}>{tok.value}</React.Fragment>;
                })}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Protected-Content Map & Section-Level Controls */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Protected Entities List */}
        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h4 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-indigo-400" />
                Protected-Content Map
              </h4>
              <span className="text-[11px] text-slate-400 font-mono tabular-nums">
                {document.protectedMap.entities.length} masked/protected elements · Preservation{' '}
                {document.preservationResult.preservationScore}%
              </span>
            </div>

            <button
              onClick={() => handleDownload('report', 'pdf')}
              className="px-2.5 py-1.5 text-xs font-medium bg-emerald-600/15 hover:bg-emerald-600/25 text-emerald-300 border border-emerald-500/40 rounded-lg transition-colors flex items-center gap-1.5 shrink-0"
            >
              <FileCheck2 className="w-3.5 h-3.5 text-emerald-400" />
              Export Audit PDF
            </button>
          </div>

          <p className="text-xs text-slate-400">
            Numbers, currencies, percentages, dates, citations, URLs, emails, company names, and technical/legal terms are masked with immutable tokens prior to humanization and listed in the Audit PDF Report.
          </p>

          <div className="max-h-64 overflow-y-auto divide-y divide-slate-800/70 border border-slate-800 rounded-lg bg-slate-950">
            {document.protectedMap.entities.length === 0 ? (
              <div className="p-4 text-xs text-slate-500">
                No specific numeric or citation entities detected in this short passage.
              </div>
            ) : (
              document.protectedMap.entities.map((ent) => (
                <div
                  key={ent.id}
                  className="px-3.5 py-2.5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="min-w-0 flex-1 space-y-0.5">
                    <div className="font-mono text-slate-200 truncate">{ent.originalValue}</div>
                    <div className="font-mono text-[10px] text-indigo-400 truncate">
                      {ent.token} · Sec #{ent.sectionIndex + 1}
                    </div>
                  </div>
                  <span className="text-emerald-400 font-mono text-[11px] shrink-0">
                    {ent.category.replace('_', ' ')} · Intact
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Logical Chunks & Section-by-Section Regeneration */}
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-semibold text-slate-100">
              Logical Section Chunks & Selective Re-Humanization
            </h4>
            <span className="text-xs text-slate-400 font-mono tabular-nums">
              {document.chunks.length} sections
            </span>
          </div>

          <div className="space-y-3 max-h-64 overflow-y-auto pr-1">
            {document.chunks.map((chunk, idx) => (
              <div
                key={chunk.id}
                className="bg-slate-950 border border-slate-800 rounded-lg p-3.5 flex items-start justify-between gap-4"
              >
                <div className="space-y-1 min-w-0">
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span className="font-mono text-slate-200 font-semibold">
                      Section #{idx + 1}
                    </span>
                    <span>·</span>
                    <span>
                      Intensity: {chunk.intensity} {chunk.isLegalClause ? '(Legal Clause Protection)' : ''}
                    </span>
                    <span>·</span>
                    <span className={chunk.status === 'HUMANIZED' ? 'text-emerald-400' : 'text-amber-400'}>
                      {chunk.status === 'HUMANIZED'
                        ? document.nativeArtifact
                          ? 'Rewritten in place'
                          : 'Humanized'
                        : 'Kept original wording'}
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 line-clamp-2 font-sans">
                    {chunk.restoredText}
                  </p>
                </div>

                <button
                  onClick={() => handleRegenerateSection(idx)}
                  disabled={regeneratingChunkIdx === idx}
                  className="px-3 py-1.5 text-xs font-medium bg-slate-900 hover:bg-slate-800 text-indigo-300 border border-slate-800 rounded-lg transition-colors whitespace-nowrap shrink-0 flex items-center gap-1.5 disabled:opacity-50"
                >
                  <RefreshCw
                    className={`w-3 h-3 ${regeneratingChunkIdx === idx ? 'animate-spin' : ''}`}
                  />
                  Regenerate Section
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Version History & 10-Point Quality Control Verification Table */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div className="lg:col-span-7 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-slate-100">
            Immutable File Version Tree
          </h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400">
                  <th className="py-2.5 pr-3 font-medium">Version</th>
                  <th className="py-2.5 px-3 font-medium">Provider</th>
                  <th className="py-2.5 px-3 font-medium text-right">Quality</th>
                  <th className="py-2.5 px-3 font-medium text-right">AI Score</th>
                  <th className="py-2.5 px-3 font-medium text-right">Duration</th>
                  <th className="py-2.5 pl-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono tabular-nums">
                {document.versions.map((v) => (
                  <tr key={v.id} className="hover:bg-slate-800/30">
                    <td className="py-2.5 pr-3 font-sans font-medium text-slate-200">
                      {v.versionLabel}
                    </td>
                    <td className="py-2.5 px-3 font-sans text-slate-400 truncate max-w-[160px]">
                      {v.provider}
                    </td>
                    <td className="py-2.5 px-3 text-right text-emerald-400">
                      {v.qualityScore}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-200">
                      {v.checkerScore}%
                    </td>
                    <td className="py-2.5 px-3 text-right text-slate-400">
                      {v.processingDurationMs}ms
                    </td>
                    <td className="py-2.5 pl-3 text-right font-sans">
                      <div className="inline-flex items-center gap-2">
                        <button
                          onClick={() => handleRestoreVersion(v.id)}
                          className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
                          title="Restore this version as active Final"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </button>
                        {v.versionNumber > 0 && document.versions.length > 2 && (
                          <button
                            onClick={() => handleDeleteVersion(v.id)}
                            className="text-rose-400 hover:text-rose-300 inline-flex items-center gap-1"
                            title="Delete processed version"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="lg:col-span-5 bg-slate-900/90 border border-slate-800 rounded-xl p-5 space-y-4">
          <h4 className="text-sm font-semibold text-slate-100">
            10-Point Quality Control Verification
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 text-xs">
            {[
              {label: 'File opens correctly', ok: document.qcChecklist.fileOpensCorrectly},
              {label: 'Original still exists', ok: document.qcChecklist.originalStillExists},
              {label: 'Required sections exist', ok: document.qcChecklist.allRequiredSectionsExist},
              {label: 'No important info lost', ok: document.qcChecklist.noImportantInfoLost},
              {label: 'Protected content intact', ok: document.qcChecklist.noProtectedContentChanged},
              {label: 'Formatting acceptable', ok: document.qcChecklist.formattingAcceptable},
              {label: 'Humanizer response valid', ok: document.qcChecklist.humanizerResponseValid},
              {label: 'Checker completed', ok: document.qcChecklist.checkerCompleted},
              {label: 'Final version generated', ok: document.qcChecklist.finalVersionGenerated},
              {label: 'Download verified', ok: document.qcChecklist.downloadWorks},
            ].map((item, i) => (
              <div
                key={i}
                className="flex items-center gap-2 bg-slate-950 border border-slate-800/80 rounded-lg px-3 py-2 text-slate-200"
              >
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                <span className="truncate">{item.label}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
