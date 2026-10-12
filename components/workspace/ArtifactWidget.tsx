'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FileText,
  Code,
  Download,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  FileSpreadsheet,
  FileCode,
  Sparkles,
  Zap,
  Layers,
  ArrowRight,
  ShieldCheck,
} from 'lucide-react';
import { MessageArtifact } from '@/lib/agent/types';
import { VerificationReport } from '@/lib/intelligent/types';

interface ArtifactWidgetProps {
  artifact: MessageArtifact;
  verificationReport?: VerificationReport;
  conversationId: string;
}

export default function ArtifactWidget({
  artifact,
  verificationReport,
  conversationId,
}: ArtifactWidgetProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [expanded, setExpanded] = useState(true);
  const [showVerification, setShowVerification] = useState(false);
  const [isBridging, setIsBridging] = useState(false);
  const [bridgeMessage, setBridgeMessage] = useState<string | null>(null);

  const handleCopy = () => {
    navigator.clipboard.writeText(artifact.content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDownload = (format: string) => {
    const exportUrl = `/api/workspace/conversations/${conversationId}/export?format=${format}&v=${artifact.version}`;
    window.open(exportUrl, '_blank');
  };

  const handleBridgeToPipeline = async () => {
    setIsBridging(true);
    setBridgeMessage('Sending to Fact-Preserving Humanizer Pipeline...');
    try {
      const res = await fetch('/api/pipeline/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: artifact.content,
          fileName: `${artifact.title.replace(/\s+/g, '_')}_v${artifact.version}.txt`,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBridgeMessage('Enqueued! Redirecting to Pipeline...');
        setTimeout(() => {
          router.push(`/?view=pipeline&docId=${data.documentId}`);
        }, 600);
      } else {
        setBridgeMessage(`Failed: ${data.error}`);
        setTimeout(() => setBridgeMessage(null), 3000);
      }
    } catch (err: any) {
      setBridgeMessage(`Network error: ${err.message}`);
      setTimeout(() => setBridgeMessage(null), 3000);
    } finally {
      setIsBridging(false);
    }
  };

  const handleBridgeToLegal = async () => {
    setIsBridging(true);
    setBridgeMessage('Exporting to Legal Studio...');
    try {
      const res = await fetch('/api/documentation/bridge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: artifact.title,
          text: artifact.content,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setBridgeMessage('Exported! Redirecting to Legal Studio...');
        setTimeout(() => {
          router.push('/documentation');
        }, 600);
      } else {
        setBridgeMessage(`Failed: ${data.error}`);
        setTimeout(() => setBridgeMessage(null), 3000);
      }
    } catch (err: any) {
      setBridgeMessage(`Network error: ${err.message}`);
      setTimeout(() => setBridgeMessage(null), 3000);
    } finally {
      setIsBridging(false);
    }
  };

  const getFormatBadge = (fmt: string) => {
    switch (fmt.toLowerCase()) {
      case 'docx':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'pdf':
        return 'bg-rose-500/20 text-rose-300 border-rose-500/30';
      case 'html':
        return 'bg-orange-500/20 text-orange-300 border-orange-500/30';
      case 'json':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'typescript':
      case 'javascript':
      case 'python':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      default:
        return 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30';
    }
  };

  const score = artifact.qualityScore ?? verificationReport?.qualityScore ?? 90;

  return (
    <div className="w-full bg-[#0a0f24] border border-cyan-500/30 rounded-2xl shadow-2xl overflow-hidden my-4">
      {/* Top Header */}
      <div className="bg-gradient-to-r from-cyan-950/40 via-indigo-950/40 to-purple-950/40 p-4 border-b border-white/10 flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            {artifact.type === 'code' ? (
              <Code className="w-4 h-4" />
            ) : artifact.type === 'data' ? (
              <FileSpreadsheet className="w-4 h-4" />
            ) : (
              <FileText className="w-4 h-4" />
            )}
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h4 className="text-xs font-bold text-white tracking-tight">{artifact.title}</h4>
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border font-bold uppercase ${getFormatBadge(artifact.format)}`}>
                {artifact.format}
              </span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-slate-300">
                v{artifact.version}
              </span>
              {artifact.verified && (
                <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3 h-3" /> Verified ({score}%)
                </span>
              )}
            </div>
            {artifact.changelog && artifact.changelog.length > 0 && (
              <p className="text-[11px] text-slate-400 mt-0.5">
                {artifact.changelog[artifact.changelog.length - 1]}
              </p>
            )}
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleCopy}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white text-xs border border-white/10 transition-colors"
            title="Copy content to clipboard"
          >
            {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            <span>{copied ? 'Copied' : 'Copy'}</span>
          </button>

          {/* Download Dropdown */}
          <div className="relative group">
            <button
              onClick={() => handleDownload(artifact.format)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-semibold shadow-md transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Export {artifact.format.toUpperCase()}</span>
            </button>
          </div>

          <button
            onClick={() => setExpanded(!expanded)}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/5 transition-colors"
          >
            {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Content View */}
      {expanded && (
        <div className="p-4 bg-black/40">
          <div className="max-h-96 overflow-y-auto pr-2 custom-scrollbar font-mono text-xs leading-relaxed text-slate-200 whitespace-pre-wrap selection:bg-cyan-500/30">
            {artifact.content}
          </div>
        </div>
      )}

      {/* Unified Cross-System Bridges Bar */}
      <div className="bg-[#080d22] border-t border-white/10 p-3 flex flex-wrap items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 text-[11px] text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Cross-System Actions:</span>
          {bridgeMessage && (
            <span className="text-cyan-300 font-mono text-[11px] animate-pulse">
              {bridgeMessage}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={isBridging}
            onClick={handleBridgeToPipeline}
            className="px-3 py-1.5 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Send this artifact to Fact-Preserving Humanizer pipeline"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Humanize in Pipeline</span>
          </button>

          <button
            disabled={isBridging}
            onClick={handleBridgeToLegal}
            className="px-3 py-1.5 rounded-lg bg-blue-500/15 hover:bg-blue-500/25 text-blue-300 border border-blue-500/30 text-xs font-semibold flex items-center gap-1.5 transition-all disabled:opacity-50"
            title="Import into Legal & Documentation Studio"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Export to Legal Studio</span>
          </button>
        </div>
      </div>

      {/* Quality & Verification Audit Bar */}
      {verificationReport && (
        <div className="bg-[#070b1a] border-t border-white/10 p-3">
          <div
            className="flex items-center justify-between cursor-pointer select-none"
            onClick={() => setShowVerification(!showVerification)}
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-purple-400" />
              <span className="text-xs font-bold text-slate-300">Independent Quality & Integrity Audit</span>
              <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Score: {verificationReport.qualityScore}/100
              </span>
              <span className="text-[10px] text-slate-400">
                ({verificationReport.completedItems}/{verificationReport.totalItems} requirements verified)
              </span>
            </div>
            <button className="text-slate-400 hover:text-white text-xs">
              {showVerification ? 'Hide Details' : 'View Audit Details'}
            </button>
          </div>

          {showVerification && (
            <div className="mt-3 pt-3 border-t border-white/5 space-y-2 text-xs">
              <p className="text-[11px] text-slate-300 bg-white/5 p-2 rounded-lg border border-white/5">
                {verificationReport.deliverableAuditSummary}
              </p>
              {verificationReport.issues.length > 0 && (
                <div className="space-y-1 mt-2">
                  <div className="text-[11px] font-semibold text-slate-400">Noted Audit Items:</div>
                  {verificationReport.issues.map((iss) => (
                    <div
                      key={iss.id}
                      className="flex items-start gap-2 p-2 rounded-lg bg-amber-500/10 border border-amber-500/20 text-[11px] text-amber-200"
                    >
                      <AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5 text-amber-400" />
                      <div>
                        <span className="font-semibold">{iss.category}: </span>
                        <span>{iss.description}</span>
                        {iss.recommendation && (
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            Tip: {iss.recommendation}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
