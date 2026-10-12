'use client';

import React, { useState, useEffect } from 'react';
import {
  Sliders,
  Scale,
  ShieldCheck,
  Activity,
  CheckCircle2,
  Clock,
  Terminal,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { DocumentationSettings, LegalAnalytics, LegalAuditLog } from '@/lib/legal/types';

export default function AdminLegalSettingsView() {
  const [analytics, setAnalytics] = useState<LegalAnalytics | null>(null);
  const [auditLogs, setAuditLogs] = useState<LegalAuditLog[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Form states
  const [maxAttempts, setMaxAttempts] = useState(3);
  const [disclaimerText, setDisclaimerText] = useState('');
  const [disclaimerEnabled, setDisclaimerEnabled] = useState(true);
  const [defaultJurisdiction, setDefaultJurisdiction] = useState('United States');
  const [intensity, setIntensity] = useState<'LOW' | 'CONSERVATIVE' | 'NORMAL'>('CONSERVATIVE');
  const [protectionLevel, setProtectionLevel] = useState<'HIGH' | 'MAXIMUM' | 'NORMAL'>('HIGH');
  const [requireApproval, setRequireApproval] = useState(true);
  const [retentionDays, setRetentionDays] = useState(90);

  const loadData = async () => {
    try {
      const [setRes, anaRes, logsRes] = await Promise.all([
        fetch('/api/documentation/settings').then((r) => r.json()),
        fetch('/api/documentation/analytics').then((r) => r.json()),
        fetch('/api/documentation/audit-logs?limit=50').then((r) => r.json()),
      ]);

      if (setRes.settings) {
        setMaxAttempts(setRes.settings.maxAutomaticAttempts || 3);
        setDisclaimerText(setRes.settings.legalDisclaimer || '');
        setDisclaimerEnabled(setRes.settings.disclaimerEnabled !== false);
        setDefaultJurisdiction(setRes.settings.defaultJurisdiction || 'United States');
        setIntensity(setRes.settings.defaultHumanizationIntensity || 'CONSERVATIVE');
        setProtectionLevel(setRes.settings.legalClauseProtection || 'HIGH');
        setRequireApproval(setRes.settings.requiredAdminApproval !== false);
        setRetentionDays(setRes.settings.documentRetentionDays || 90);
      }

      if (anaRes.analytics) setAnalytics(anaRes.analytics);
      if (logsRes.logs) setAuditLogs(logsRes.logs);
    } catch (err) {
      console.error('Failed to load legal settings & analytics:', err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveMessage(null);
    try {
      const payload: Partial<DocumentationSettings> = {
        maxAutomaticAttempts: Number(maxAttempts),
        legalDisclaimer: disclaimerText,
        disclaimerEnabled,
        defaultJurisdiction,
        defaultHumanizationIntensity: intensity,
        legalClauseProtection: protectionLevel,
        requiredAdminApproval: requireApproval,
        documentRetentionDays: Number(retentionDays),
      };

      const res = await fetch('/api/documentation/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setSaveMessage('Legal and Documentation Settings updated successfully.');
        setTimeout(() => setSaveMessage(null), 3500);
      }
      setIsSaving(false);
    } catch (err) {
      console.error('Failed to save settings:', err);
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-8">
      {/* Analytics KPI Grid (Section 28) */}
      {analytics && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-cyan-400" />
              <span>Documentation Studio Analytics</span>
            </h2>
            <button
              onClick={loadData}
              className="text-xs text-cyan-400 hover:underline flex items-center gap-1 font-mono"
            >
              <RefreshCw className="w-3 h-3" />
              Refresh Metrics
            </button>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <div className="glass-card p-4 rounded-xl border-l-4 border-l-cyan-400 space-y-1">
              <p className="text-xs text-slate-400 font-medium">Documents Drafted</p>
              <p className="text-2xl font-bold text-white font-mono">{analytics.documentsDrafted}</p>
              <p className="text-[11px] text-slate-400">{analytics.documentsHumanized} humanized</p>
            </div>

            <div className="glass-card p-4 rounded-xl border-l-4 border-l-emerald-400 space-y-1">
              <p className="text-xs text-slate-400 font-medium">Success Rate</p>
              <p className="text-2xl font-bold text-emerald-300 font-mono">{analytics.processingSuccessRate}%</p>
              <p className="text-[11px] text-slate-400">Avg: {Math.round(analytics.averageProcessingTimeMs / 1000)}s cycle</p>
            </div>

            <div className="glass-card p-4 rounded-xl border-l-4 border-l-amber-400 space-y-1">
              <p className="text-xs text-slate-400 font-medium">Requiring Legal Review</p>
              <p className="text-2xl font-bold text-amber-300 font-mono">{analytics.documentsRequiringReview}</p>
              <p className="text-[11px] text-slate-400">{analytics.legalChecks} quality checks</p>
            </div>

            <div className="glass-card p-4 rounded-xl border-l-4 border-l-purple-400 space-y-1">
              <p className="text-xs text-slate-400 font-medium">Approved Knowledge</p>
              <p className="text-2xl font-bold text-purple-300 font-mono">{analytics.totalApprovedKnowledge}</p>
              <p className="text-[11px] text-slate-400">{analytics.pendingKnowledgeImports} pending approval</p>
            </div>
          </div>
        </div>
      )}

      {/* Settings Configuration Form (Section 39) */}
      <form onSubmit={handleSaveSettings} className="glass-panel p-6 rounded-2xl border border-white/10 space-y-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Sliders className="w-5 h-5 text-indigo-400" />
            <span>Legal Drafting & Safeguard Policies</span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Configure automatic correction attempts, legal disclaimer, default jurisdiction, and clause protection intensity.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Max Automatic Attempts */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Maximum Automatic Correction Cycles (Section 17)
            </label>
            <input
              type="number"
              min={1}
              max={5}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value))}
              className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
            <p className="text-[11px] text-slate-400">
              Default: 3. If preservation deviations are detected, the engine fixes only that section and re-checks.
            </p>
          </div>

          {/* Default Jurisdiction */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Default Legal Jurisdiction (Section 5)
            </label>
            <select
              value={defaultJurisdiction}
              onChange={(e) => setDefaultJurisdiction(e.target.value)}
              className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="United States">United States</option>
              <option value="United Kingdom">United Kingdom</option>
              <option value="European Union">European Union</option>
              <option value="Pakistan">Pakistan</option>
              <option value="UAE">UAE</option>
              <option value="Canada">Canada</option>
              <option value="Australia">Australia</option>
            </select>
          </div>

          {/* Humanization Intensity */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Default Humanization Intensity (Section 14)
            </label>
            <select
              value={intensity}
              onChange={(e) => setIntensity(e.target.value as 'LOW' | 'CONSERVATIVE' | 'NORMAL')}
              className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="CONSERVATIVE">CONSERVATIVE (Recommended for legal covenants)</option>
              <option value="LOW">LOW (Minimal phrasing adjustments)</option>
              <option value="NORMAL">NORMAL (Broader cadence variation)</option>
            </select>
          </div>

          {/* Legal Clause Protection Level */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">
              Legal Clause Protection Level
            </label>
            <select
              value={protectionLevel}
              onChange={(e) => setProtectionLevel(e.target.value as 'HIGH' | 'MAXIMUM' | 'NORMAL')}
              className="w-full bg-[#0a1024] border border-white/15 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="HIGH">HIGH (Locks entities, dates, numbers, citations)</option>
              <option value="MAXIMUM">MAXIMUM (Strict verbatim clause preservation)</option>
              <option value="NORMAL">NORMAL (Standard protection)</option>
            </select>
          </div>

          {/* Legal Disclaimer Text (Section 22) */}
          <div className="md:col-span-2 space-y-1.5">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-300">Mandatory Legal Disclaimer</label>
              <label className="flex items-center gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={disclaimerEnabled}
                  onChange={(e) => setDisclaimerEnabled(e.target.checked)}
                  className="rounded text-cyan-500"
                />
                <span>Insert in Generated Documents</span>
              </label>
            </div>
            <textarea
              rows={3}
              value={disclaimerText}
              onChange={(e) => setDisclaimerText(e.target.value)}
              className="w-full bg-[#0a1024] border border-white/15 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-cyan-400"
            />
          </div>

          {/* Admin Approval Requirement for Uploaded Knowledge (Section 31) */}
          <div className="md:col-span-2 p-4 rounded-xl bg-white/[0.02] border border-white/10 flex items-center justify-between">
            <div className="space-y-0.5">
              <p className="text-xs font-bold text-white">Require Admin Approval For Uploaded Knowledge</p>
              <p className="text-[11px] text-slate-400">
                Uploaded PDFs, Word, or Markdown documents must be placed into Draft state and reviewed before entering production.
              </p>
            </div>
            <input
              type="checkbox"
              checked={requireApproval}
              onChange={(e) => setRequireApproval(e.target.checked)}
              className="w-4 h-4 rounded text-cyan-500"
            />
          </div>
        </div>

        {saveMessage && (
          <p className="text-xs text-emerald-300 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/20">
            {saveMessage}
          </p>
        )}

        <div className="flex items-center justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-white font-bold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5"
          >
            {isSaving ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
            <span>Save Legal Policies</span>
          </button>
        </div>
      </form>

      {/* Audit Log Table (Section 29) */}
      <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
        <h3 className="text-sm font-bold text-white flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" />
          <span>Legal & Documentation Audit Log</span>
        </h3>
        <p className="text-xs text-slate-400">
          Immutable historical trail of drafting events, template revisions, and humanization runs.
        </p>

        <div className="overflow-x-auto max-h-96">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.04] text-slate-300 font-semibold uppercase tracking-wider sticky top-0">
              <tr>
                <th className="p-3">Timestamp</th>
                <th className="p-3">Action</th>
                <th className="p-3">User</th>
                <th className="p-3">Document</th>
                <th className="p-3">Version</th>
                <th className="p-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5 font-mono text-[11px]">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-white/[0.02]">
                  <td className="p-3 text-slate-400 whitespace-nowrap">
                    {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                  </td>
                  <td className="p-3 font-semibold text-cyan-300">{log.action}</td>
                  <td className="p-3 text-slate-300">{log.user}</td>
                  <td className="p-3 text-slate-400 max-w-xs truncate">{log.documentId || '—'}</td>
                  <td className="p-3 text-slate-300">{log.version || '—'}</td>
                  <td className="p-3">
                    <span className="px-2 py-0.5 rounded-full text-[10px] uppercase font-bold bg-white/10 text-slate-200">
                      {log.finalStatus || 'LOGGED'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
