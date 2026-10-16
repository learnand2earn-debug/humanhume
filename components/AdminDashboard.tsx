'use client';

import React, { useState, useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Clock,
  Settings as SettingsIcon,
  Activity,
  ShieldAlert,
  HardDrive,
  RefreshCw,
  Play,
  Pause,
  XCircle,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Bell,
  KeyRound,
  Download,
  Terminal,
  Zap,
  Scale,
  BookOpen,
  Sliders,
} from 'lucide-react';
import { AdminSettings, DocumentRecord, ProcessingJob, SystemLog } from '@/lib/types';
import { safeFetchJson } from '@/lib/utils/safe-json';
import AdminLegalKnowledgeBaseView from './dashboard/AdminLegalKnowledgeBaseView';
import AdminLegalSettingsView from './dashboard/AdminLegalSettingsView';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<
    'dashboard' | 'queue' | 'documents' | 'humanizer' | 'checker' | 'automation' | 'logs' | 'health' | 'legal-kb' | 'legal-settings'
  >('dashboard');

  const [stats, setStats] = useState<any>(null);
  const [jobs, setJobs] = useState<ProcessingJob[]>([]);
  const [documents, setDocuments] = useState<DocumentRecord[]>([]);
  const [settings, setSettings] = useState<AdminSettings | null>(null);
  const [logs, setLogs] = useState<SystemLog[]>([]);

  // Test API state
  const [humanizerTestResult, setHumanizerTestResult] = useState<{
    loading: boolean;
    success?: boolean;
    latencyMs?: number;
    message?: string;
  }>({ loading: false });

  const [checkerTestResult, setCheckerTestResult] = useState<{
    loading: boolean;
    success?: boolean;
    latencyMs?: number;
    message?: string;
  }>({ loading: false });

  const [saveStatus, setSaveStatus] = useState<string | null>(null);

  // Form states
  const [formHumanizerUrl, setFormHumanizerUrl] = useState('');
  const [formHumanizerKey, setFormHumanizerKey] = useState('');
  const [formHumanizerModel, setFormHumanizerModel] = useState('');
  const [formCheckerUrl, setFormCheckerUrl] = useState('');
  const [formCheckerKey, setFormCheckerKey] = useState('');
  const [formMaxRetries, setFormMaxRetries] = useState(3);
  const [formMode, setFormMode] = useState<'demo' | 'live'>('demo');
  const [formDiscordWebhook, setFormDiscordWebhook] = useState('');

  const loadAll = async () => {
    try {
      const [statsRes, jobsRes, settingsRes, logsRes] = await Promise.all([
        safeFetchJson('/api/admin/stats'),
        safeFetchJson('/api/admin/jobs'),
        safeFetchJson('/api/admin/settings'),
        safeFetchJson('/api/admin/logs?limit=50'),
      ]);

      if (statsRes.ok && statsRes.data) setStats(statsRes.data);
      if (jobsRes.ok && jobsRes.data) {
        setJobs(jobsRes.data.jobs || []);
        setDocuments(jobsRes.data.documents || []);
      }
      if (settingsRes.ok && settingsRes.data) {
        setSettings(settingsRes.data.settings);
        const s = settingsRes.data.settings;
        if (s) {
          setFormHumanizerUrl(s.humanizer?.apiUrl || '');
          setFormHumanizerKey(s.humanizer?.apiKey || '');
          setFormHumanizerModel(s.humanizer?.model || '');
          setFormCheckerUrl(s.checker?.apiUrl || '');
          setFormCheckerKey(s.checker?.apiKey || '');
          setFormMaxRetries(s.maxRetries || 3);
          setFormMode(s.mode || 'demo');
          setFormDiscordWebhook(s.discordWebhookUrl || '');
        }
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
    }
  };

  useEffect(() => {
    loadAll();
    const interval = setInterval(loadAll, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveStatus('Saving configuration...');
    try {
      const payload: Partial<AdminSettings> = {
        mode: formMode,
        maxRetries: Number(formMaxRetries),
        discordWebhookUrl: formDiscordWebhook,
        humanizer: {
          ...(settings?.humanizer || ({} as any)),
          apiUrl: formHumanizerUrl,
          apiKey: formHumanizerKey,
          model: formHumanizerModel,
        },
        checker: {
          ...(settings?.checker || ({} as any)),
          apiUrl: formCheckerUrl,
          apiKey: formCheckerKey,
        },
      };

      const { ok, data, error } = await safeFetchJson<{ settings: AdminSettings }>('/api/admin/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!ok) throw new Error(error || 'Save failed');
      if (data?.settings) {
        setSettings(data.settings);
        setSaveStatus('Configuration successfully saved and applied.');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (err: unknown) {
      setSaveStatus(`Failed to save: ${err instanceof Error ? err.message : String(err)}`);
    }
  };

  const testHumanizerApi = async () => {
    setHumanizerTestResult({ loading: true });
    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/admin/test-humanizer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          apiUrl: formHumanizerUrl,
          apiKey: formHumanizerKey,
          model: formHumanizerModel,
        }),
      });
      setHumanizerTestResult({
        loading: false,
        success: Boolean(ok && data?.success),
        latencyMs: data?.latencyMs,
        message: data?.message || error || 'Test completed',
      });
    } catch (err: unknown) {
      setHumanizerTestResult({
        loading: false,
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const testCheckerApi = async () => {
    setCheckerTestResult({ loading: true });
    try {
      const { ok, data, error } = await safeFetchJson<any>('/api/admin/test-checker', { method: 'POST' });
      setCheckerTestResult({
        loading: false,
        success: Boolean(ok && data?.success),
        latencyMs: data?.latencyMs,
        message: data?.message || error || 'Test completed',
      });
    } catch (err: unknown) {
      setCheckerTestResult({
        loading: false,
        success: false,
        message: err instanceof Error ? err.message : String(err),
      });
    }
  };

  const handleJobAction = async (docId: string, action: 'pause' | 'resume' | 'cancel' | 'retry') => {
    try {
      await fetch(`/api/documents/${docId}/${action}`, { method: 'POST' });
      await loadAll();
    } catch (err) {
      console.error(`Failed to execute ${action}:`, err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12" id="admin-dashboard-container">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-6 mb-8 border-b border-white/10 gap-4">
        <div>
          <h1 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-indigo-500 to-purple-500 p-[1.5px]">
              <div className="w-full h-full bg-[#080d1e] rounded-[14px] flex items-center justify-center">
                <SettingsIcon className="w-5 h-5 text-indigo-400" />
              </div>
            </div>
            Admin Command Console
          </h1>
          <p className="text-slate-400 text-xs sm:text-sm mt-1">
            System Telemetry, Queue Operations, API Adapters, and Security Safeguards
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadAll}
            className="px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors shadow-sm"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Telemetry
          </button>
        </div>
      </div>

      {/* Tabs Bar */}
      <div className="flex items-center gap-2 overflow-x-auto pb-4 mb-8 border-b border-white/5 no-scrollbar">
        {[
          { id: 'dashboard', label: 'Dashboard & Metrics', icon: LayoutDashboard },
          { id: 'queue', label: 'Processing Queue', icon: Clock },
          { id: 'documents', label: 'Document Registry', icon: FileText },
          { id: 'humanizer', label: 'Humanizer API Settings', icon: KeyRound },
          { id: 'checker', label: 'Checker Settings', icon: ShieldAlert },
          { id: 'automation', label: 'Automation & Webhooks', icon: Bell },
          { id: 'legal-kb', label: 'Legal Knowledge Base', icon: Scale },
          { id: 'legal-settings', label: 'Legal & Doc Settings', icon: Sliders },
          { id: 'logs', label: 'System Logs', icon: Terminal },
          { id: 'health', label: 'System Health & Storage', icon: HardDrive },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              id={`admin-tab-${tab.id}`}
              className={`px-4 py-2.5 rounded-2xl text-xs font-display font-semibold whitespace-nowrap flex items-center gap-2 transition-all ${
                isActive
                  ? 'bg-gradient-to-r from-indigo-600/30 to-cyan-600/30 text-cyan-300 border border-cyan-400/50 shadow-lg shadow-cyan-500/10'
                  : 'text-slate-400 hover:text-white hover:bg-white/5 border border-transparent'
              }`}
            >
              <Icon className="w-4 h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab 1: Dashboard & Metrics */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* KPI Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
            <div className="glass-card rounded-2xl p-5 border-l-4 border-l-cyan-400 shadow-lg">
              <div className="text-xs text-slate-400 font-medium">Total Documents</div>
              <div className="font-display font-extrabold text-3xl text-white mt-1.5 font-mono">
                {stats.analytics.totalDocuments}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {stats.analytics.todayDocuments} registered today
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border-l-4 border-l-amber-400 shadow-lg">
              <div className="text-xs text-slate-400 font-medium">Processing Queue</div>
              <div className="font-display font-extrabold text-3xl text-amber-300 mt-1.5 font-mono">
                {stats.analytics.processing}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Active worker tasks</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border-l-4 border-l-emerald-400 shadow-lg">
              <div className="text-xs text-slate-400 font-medium">Completed Deliveries</div>
              <div className="font-display font-extrabold text-3xl text-emerald-300 mt-1.5 font-mono">
                {stats.analytics.completed}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                Success Rate: {stats.analytics.successRate}%
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border-l-4 border-l-rose-500 shadow-lg">
              <div className="text-xs text-slate-400 font-medium">Failed / Needs Review</div>
              <div className="font-display font-extrabold text-3xl text-rose-400 mt-1.5 font-mono">
                {stats.analytics.failed + stats.analytics.needsReview}
              </div>
              <div className="text-[11px] text-slate-400 mt-1">
                {stats.analytics.needsReview} flagged for review
              </div>
            </div>

            <div className="glass-card rounded-2xl p-5 border-l-4 border-l-indigo-400 shadow-lg">
              <div className="text-xs text-slate-400 font-medium">Avg Processing Time</div>
              <div className="font-display font-extrabold text-3xl text-indigo-300 mt-1.5 font-mono">
                {Math.round(stats.analytics.avgProcessingTimeMs / 1000)}s
              </div>
              <div className="text-[11px] text-slate-400 mt-1">End-to-end autonomous cycle</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border-l-4 border-l-teal-400 shadow-lg">
              <div className="text-xs text-slate-400 font-medium">Avg Fact Preservation</div>
              <div className="font-display font-extrabold text-3xl text-teal-300 mt-1.5 font-mono">
                {stats.analytics.avgQualityScore}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Factual & entity integrity</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border-l-4 border-l-purple-400 shadow-lg">
              <div className="text-xs text-slate-400 font-medium">Avg AI Score</div>
              <div className="font-display font-extrabold text-3xl text-purple-300 mt-1.5 font-mono">
                {stats.analytics.avgAiScore}%
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Heuristic AI probability</div>
            </div>

            <div className="glass-card rounded-2xl p-5 border-l-4 border-l-blue-400 shadow-lg">
              <div className="text-xs text-slate-400 font-medium">API Calls / Errors</div>
              <div className="font-display font-extrabold text-3xl text-blue-300 mt-1.5 font-mono">
                {stats.analytics.apiCalls} <span className="text-sm text-slate-400">/ {stats.analytics.apiErrors}</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-1">Telemetry log count</div>
            </div>
          </div>

          {/* Quick Queue Overview */}
          <div className="glass-panel rounded-3xl p-6 sm:p-8">
            <h3 className="font-display text-lg font-bold text-white mb-4 flex items-center justify-between">
              <span>Active Processing Jobs ({jobs.length})</span>
              <button
                onClick={() => setActiveTab('queue')}
                className="text-xs text-cyan-400 hover:underline font-mono"
              >
                View full queue →
              </button>
            </h3>

            {jobs.length === 0 ? (
              <div className="text-center py-8 text-slate-500 text-sm">
                No active jobs in queue. Upload a document to trigger the pipeline.
              </div>
            ) : (
              <div className="space-y-2.5">
                {jobs.slice(0, 5).map((job) => (
                  <div
                    key={job.id}
                    className="p-4 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between"
                  >
                    <div>
                      <span className="text-xs font-mono text-cyan-400 font-bold">
                        {job.documentId}
                      </span>
                      <span className="mx-2 text-slate-600">•</span>
                      <span className="text-xs text-slate-300 font-semibold">{job.status}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="w-28 h-2 bg-slate-800 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-cyan-400 rounded-full"
                          style={{ width: `${job.progressPercent}%` }}
                        />
                      </div>
                      <span className="text-xs font-mono text-slate-400 font-semibold">
                        {job.progressPercent}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Tab 2: Processing Queue & Manual Control */}
      {activeTab === 'queue' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="pb-4 mb-4 border-b border-white/10">
            <h3 className="font-display text-xl font-bold text-white">Autonomous Job Queue</h3>
            <p className="text-xs text-slate-400 mt-1">
              Inspect, pause, resume, cancel, or re-run active pipeline operations
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="pb-3 pl-2">Job / Document ID</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">Current Step</th>
                  <th className="pb-3">Progress</th>
                  <th className="pb-3">Retries</th>
                  <th className="pb-3 pr-2 text-right">Manual Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {jobs.map((job) => (
                  <tr key={job.id} className="hover:bg-white/[0.02]">
                    <td className="py-4 pl-2 font-mono text-slate-200">
                      {job.documentId}
                      <div className="text-[10px] text-slate-500">{job.traceId}</div>
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold border ${
                          job.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : job.status === 'FAILED'
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                            : job.status === 'PAUSED'
                            ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {job.status}
                      </span>
                    </td>
                    <td className="py-4 text-slate-300 font-medium">{job.currentStep}</td>
                    <td className="py-4 font-mono font-bold text-cyan-400">{job.progressPercent}%</td>
                    <td className="py-4 font-mono text-slate-400">{job.retryCount}</td>
                    <td className="py-4 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {job.status === 'PAUSED' ? (
                          <button
                            onClick={() => handleJobAction(job.documentId, 'resume')}
                            className="p-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30"
                            title="Resume Job"
                          >
                            <Play className="w-3.5 h-3.5" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleJobAction(job.documentId, 'pause')}
                            className="p-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30"
                            title="Pause Job"
                          >
                            <Pause className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <button
                          onClick={() => handleJobAction(job.documentId, 'retry')}
                          className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30"
                          title="Retry Job"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleJobAction(job.documentId, 'cancel')}
                          className="p-2 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30"
                          title="Cancel Job"
                        >
                          <XCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 3: Document Registry */}
      {activeTab === 'documents' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="pb-4 mb-4 border-b border-white/10">
            <h3 className="font-display text-xl font-bold text-white">Registered Documents</h3>
            <p className="text-xs text-slate-400 mt-1">
              Total of {documents.length} documents uploaded and tracked in storage
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-white/10 text-slate-400 uppercase tracking-wider font-mono">
                <tr>
                  <th className="pb-3 pl-2">File Name</th>
                  <th className="pb-3">Type</th>
                  <th className="pb-3">Size</th>
                  <th className="pb-3">Status</th>
                  <th className="pb-3">AI Score</th>
                  <th className="pb-3">Preservation</th>
                  <th className="pb-3 pr-2 text-right">Downloads</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {documents.map((doc) => (
                  <tr key={doc.id} className="hover:bg-white/[0.02]">
                    <td className="py-4 pl-2">
                      <div className="font-semibold text-white font-display text-sm">{doc.originalName}</div>
                      <div className="text-[10px] font-mono text-slate-500">{doc.id}</div>
                    </td>
                    <td className="py-4 font-mono font-bold uppercase text-cyan-400">{doc.fileType}</td>
                    <td className="py-4 font-mono text-slate-400">
                      {(doc.fileSize / 1024).toFixed(1)} KB
                    </td>
                    <td className="py-4">
                      <span
                        className={`px-2.5 py-0.5 rounded-full font-mono text-[10px] uppercase font-bold border ${
                          doc.status === 'COMPLETED'
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                            : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                        }`}
                      >
                        {doc.status}
                      </span>
                    </td>
                    <td className="py-4 font-mono text-cyan-300 font-semibold">
                      {doc.aiCheckScore !== undefined ? `${doc.aiCheckScore}%` : '-'}
                    </td>
                    <td className="py-4 font-mono text-emerald-400 font-semibold">
                      {doc.preservationScore !== undefined ? `${doc.preservationScore}%` : '-'}
                    </td>
                    <td className="py-4 pr-2 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={`/api/documents/${doc.id}/download?type=original`}
                          className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10"
                          title="Download Original"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </a>
                        <a
                          href={`/api/documents/${doc.id}/download?type=final`}
                          className="p-2 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/30 font-semibold"
                          title="Download Final"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab 4: Humanizer API Settings */}
      {activeTab === 'humanizer' && (
        <form onSubmit={handleSaveSettings} className="glass-panel rounded-3xl p-6 sm:p-9 space-y-7">
          <div className="pb-4 border-b border-white/10 flex items-center justify-between">
            <div>
              <h3 className="font-display text-xl font-bold text-white flex items-center gap-2.5">
                <KeyRound className="w-5 h-5 text-indigo-400" />
                Humanizer API Adapter Configuration
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Configure your external humanizer provider or switch between Demo Mode and Live API.
              </p>
            </div>

            {/* Mode Switcher */}
            <div className="flex items-center gap-2 bg-slate-900/90 p-1.5 rounded-2xl border border-white/10">
              <button
                type="button"
                onClick={() => setFormMode('demo')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  formMode === 'demo'
                    ? 'bg-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Demo Mode
              </button>
              <button
                type="button"
                onClick={() => setFormMode('live')}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all ${
                  formMode === 'live'
                    ? 'bg-emerald-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Live Mode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Humanizer API Endpoint URL
              </label>
              <input
                type="text"
                id="input-humanizer-url"
                value={formHumanizerUrl}
                onChange={(e) => setFormHumanizerUrl(e.target.value)}
                placeholder="https://api.openai.com/v1/chat/completions"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Standard REST endpoint accepting JSON payloads.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Humanizer API Key (Server-Side Masked)
              </label>
              <input
                type="text"
                id="input-humanizer-key"
                value={formHumanizerKey}
                onChange={(e) => setFormHumanizerKey(e.target.value)}
                placeholder="sk-****************92"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Stored securely on the server. Never exposed to browser clients.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Humanizer Model Identifier
              </label>
              <input
                type="text"
                id="input-humanizer-model"
                value={formHumanizerModel}
                onChange={(e) => setFormHumanizerModel(e.target.value)}
                placeholder="gpt-4o-mini"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Maximum Retries on High AI Detection
              </label>
              <input
                type="number"
                id="input-max-retries"
                min={1}
                max={6}
                value={formMaxRetries}
                onChange={(e) => setFormMaxRetries(Number(e.target.value))}
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Test API Button Section */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="btn-test-humanizer-api"
                onClick={testHumanizerApi}
                disabled={humanizerTestResult.loading}
                className="px-5 py-2.5 rounded-2xl bg-indigo-600/30 hover:bg-indigo-600/40 text-indigo-300 border border-indigo-500/40 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Activity className="w-4 h-4 text-indigo-400" />
                {humanizerTestResult.loading ? 'Pinging API...' : 'Test Humanizer API'}
              </button>

              {humanizerTestResult.message && (
                <div
                  className={`text-xs px-3.5 py-2 rounded-xl border flex items-center gap-2 ${
                    humanizerTestResult.success
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {humanizerTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>
                    {humanizerTestResult.message}
                    {humanizerTestResult.latencyMs && (
                      <strong className="ml-1 font-mono">({humanizerTestResult.latencyMs}ms)</strong>
                    )}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              id="btn-save-humanizer-settings"
              className="glow-btn px-7 py-3 rounded-2xl text-white font-display font-bold text-xs shadow-xl transition-all"
            >
              Save Configuration
            </button>
          </div>

          {saveStatus && (
            <div className="p-3.5 rounded-2xl bg-slate-900 border border-white/10 text-xs text-cyan-300 font-mono">
              {saveStatus}
            </div>
          )}
        </form>
      )}

      {/* Tab 5: Checker Settings */}
      {activeTab === 'checker' && (
        <form onSubmit={handleSaveSettings} className="glass-panel rounded-3xl p-6 sm:p-9 space-y-7">
          <div className="pb-4 border-b border-white/10">
            <h3 className="font-display text-xl font-bold text-white flex items-center gap-2.5">
              <ShieldAlert className="w-5 h-5 text-cyan-400" />
              AI Detection Checker Settings
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure third-party detector API or rely on the integrated heuristic quality guard.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Checker API Endpoint URL
              </label>
              <input
                type="text"
                id="input-checker-url"
                value={formCheckerUrl}
                onChange={(e) => setFormCheckerUrl(e.target.value)}
                placeholder="https://api.copyleaks.com/v3/writer-detector"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400"
              />
              <span className="text-[11px] text-slate-500 mt-1 block">
                Leave empty to use the built-in heuristic guard.
              </span>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-2">
                Checker API Key
              </label>
              <input
                type="text"
                id="input-checker-key"
                value={formCheckerKey}
                onChange={(e) => setFormCheckerKey(e.target.value)}
                placeholder="sk-****************92"
                className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
              />
            </div>
          </div>

          {/* Test Checker Button */}
          <div className="pt-4 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <button
                type="button"
                id="btn-test-checker-api"
                onClick={testCheckerApi}
                disabled={checkerTestResult.loading}
                className="px-5 py-2.5 rounded-2xl bg-cyan-600/30 hover:bg-cyan-600/40 text-cyan-300 border border-cyan-500/40 text-xs font-bold flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                <Activity className="w-4 h-4 text-cyan-400" />
                {checkerTestResult.loading ? 'Pinging Checker...' : 'Test Checker API'}
              </button>

              {checkerTestResult.message && (
                <div
                  className={`text-xs px-3.5 py-2 rounded-xl border flex items-center gap-2 ${
                    checkerTestResult.success
                      ? 'bg-emerald-950/40 text-emerald-300 border-emerald-500/30'
                      : 'bg-rose-950/40 text-rose-300 border-rose-500/30'
                  }`}
                >
                  {checkerTestResult.success ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  )}
                  <span>
                    {checkerTestResult.message}
                    {checkerTestResult.latencyMs && (
                      <strong className="ml-1 font-mono">({checkerTestResult.latencyMs}ms)</strong>
                    )}
                  </span>
                </div>
              )}
            </div>

            <button
              type="submit"
              className="glow-btn px-7 py-3 rounded-2xl text-white font-display font-bold text-xs shadow-xl transition-all"
            >
              Save Configuration
            </button>
          </div>
        </form>
      )}

      {/* Tab 6: Automation & Webhooks */}
      {activeTab === 'automation' && (
        <form onSubmit={handleSaveSettings} className="glass-panel rounded-3xl p-6 sm:p-9 space-y-7">
          <div className="pb-4 border-b border-white/10">
            <h3 className="font-display text-xl font-bold text-white flex items-center gap-2.5">
              <Bell className="w-5 h-5 text-indigo-400" />
              Discord Webhook & Automation Settings
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Configure real-time Discord notifications for lifecycle events without sharing private document text.
            </p>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-300 mb-2">
              Discord Webhook URL
            </label>
            <input
              type="text"
              id="input-discord-webhook"
              value={formDiscordWebhook}
              onChange={(e) => setFormDiscordWebhook(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="w-full bg-slate-900/90 border border-white/10 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400 font-mono"
            />
            <span className="text-[11px] text-slate-500 mt-1 block">
              Notifications for: Document Uploaded, Processing Started, Completed, Retries, and Failures.
            </span>
          </div>

          <div className="pt-4 border-t border-white/10 flex justify-end">
            <button
              type="submit"
              className="glow-btn px-7 py-3 rounded-2xl text-white font-display font-bold text-xs shadow-xl transition-all"
            >
              Save Webhook Configuration
            </button>
          </div>
        </form>
      )}

      {/* Tab 7: System Logs */}
      {activeTab === 'logs' && (
        <div className="glass-panel rounded-3xl p-6 sm:p-8">
          <div className="flex items-center justify-between pb-4 mb-4 border-b border-white/10">
            <div>
              <h3 className="font-display text-xl font-bold text-white flex items-center gap-2.5">
                <Terminal className="w-5 h-5 text-cyan-400" />
                Audit Logs & Telemetry Stream
              </h3>
              <p className="text-xs text-slate-400 mt-1">
                Live stream of extraction, humanization, checks, and error recovery
              </p>
            </div>
          </div>

          <div className="space-y-2.5 font-mono text-xs max-h-[560px] overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3.5 rounded-2xl bg-slate-900/70 border border-white/5 flex items-start gap-3"
              >
                <span
                  className={`px-2 py-0.5 rounded-full text-[10px] uppercase font-bold shrink-0 border ${
                    log.level === 'error'
                      ? 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                      : log.level === 'warn'
                      ? 'bg-amber-500/20 text-amber-300 border-amber-500/30'
                      : 'bg-cyan-500/20 text-cyan-300 border-cyan-500/30'
                  }`}
                >
                  {log.level}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2 text-slate-400 text-[11px] mb-1">
                    <span className="text-cyan-300 font-semibold">[{log.module}]</span>
                    <span>•</span>
                    <span className="text-slate-500">{new Date(log.timestamp).toLocaleTimeString()}</span>
                    <span>•</span>
                    <span className="text-slate-500 font-mono">Trace: {log.traceId}</span>
                  </div>
                  <div className="text-slate-200">{log.message}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 8: System Health & Storage */}
      {activeTab === 'health' && stats && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2.5">
              <HardDrive className="w-5 h-5 text-indigo-400" />
              Storage Subsystem
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-slate-400">Original Untouched Files:</span>
                <span className="font-mono text-white font-semibold">
                  {stats.storageStats.originalCount} files
                </span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-slate-400">Intermediate Working Copies:</span>
                <span className="font-mono text-white font-semibold">
                  {stats.storageStats.processingCount} files
                </span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-slate-400">Final Delivered Documents:</span>
                <span className="font-mono text-white font-semibold">
                  {stats.storageStats.finalCount} files
                </span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-slate-400">Total Storage Footprint:</span>
                <span className="font-mono text-cyan-400 font-bold">
                  {(stats.storageStats.totalSizeBytes / 1024 / 1024).toFixed(2)} MB
                </span>
              </div>
            </div>
          </div>

          <div className="glass-panel rounded-3xl p-6 sm:p-8 space-y-4">
            <h3 className="font-display text-lg font-bold text-white flex items-center gap-2.5">
              <Activity className="w-5 h-5 text-emerald-400" />
              Server Runtime Health
            </h3>
            <div className="space-y-3 text-xs">
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-slate-400">System Status:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {stats.systemHealth.status}
                </span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-slate-400">Embedded Repository:</span>
                <span className="font-mono text-emerald-400 font-bold">
                  {stats.systemHealth.database}
                </span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-slate-400">Process Memory Usage:</span>
                <span className="font-mono text-slate-200">
                  {stats.systemHealth.memoryUsageMb} MB
                </span>
              </div>
              <div className="flex justify-between py-2.5 border-b border-white/5">
                <span className="text-slate-400">Uptime:</span>
                <span className="font-mono text-slate-200">
                  {Math.round(stats.systemHealth.uptimeSeconds / 60)} minutes
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Legal Knowledge Base */}
      {activeTab === 'legal-kb' && <AdminLegalKnowledgeBaseView />}

      {/* Tab: Legal Settings & Analytics */}
      {activeTab === 'legal-settings' && <AdminLegalSettingsView />}
    </div>
  );
}
