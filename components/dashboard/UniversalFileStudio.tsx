'use client';

import React, { useState } from 'react';
import {
  FileText,
  FileSpreadsheet,
  FileCode,
  Download,
  Sparkles,
  Copy,
  Check,
  RefreshCw,
  FolderArchive,
  Image as ImageIcon,
  Globe,
  Database,
  Terminal,
  Cpu,
  Shield,
  Layers,
  ArrowRight,
  ExternalLink,
  Sliders,
  CheckCircle2,
} from 'lucide-react';
import { GeneratedFileResponse } from '@/lib/omni/file-generator';
import { safeFetchJson } from '@/lib/utils/safe-json';

interface FormatOption {
  ext: string;
  label: string;
  category: 'docs' | 'data' | 'web' | 'code' | 'devops' | 'archive';
  icon: any;
  defaultPrompt: string;
  defaultName: string;
}

const POPULAR_FORMATS: FormatOption[] = [
  // Office & Docs
  { ext: 'docx', label: 'Word Document (.docx)', category: 'docs', icon: FileText, defaultPrompt: 'Draft an executive enterprise NDA & Non-Compete agreement with formal legal covenants, liabilities, and signature blocks.', defaultName: 'Executive_NDA_Agreement' },
  { ext: 'pdf', label: 'PDF Document (.pdf)', category: 'docs', icon: FileText, defaultPrompt: 'Generate a comprehensive quarterly technical architecture report detailing cloud scalability, uptime metrics, and security audits.', defaultName: 'Quarterly_Tech_Report' },
  { ext: 'md', label: 'Markdown Doc (.md)', category: 'docs', icon: FileText, defaultPrompt: 'Create an exhaustive open-source developer documentation guide with API reference, authentication, and getting started guide.', defaultName: 'API_Documentation' },
  { ext: 'tex', label: 'LaTeX Article (.tex)', category: 'docs', icon: FileText, defaultPrompt: 'Write an academic research paper on Transformer-based neural language models with mathematical theorems, abstract, and citations.', defaultName: 'Research_Paper' },
  { ext: 'rtf', label: 'Rich Text (.rtf)', category: 'docs', icon: FileText, defaultPrompt: 'Format a company policy document on remote work and information security standards with formatted paragraphs.', defaultName: 'Company_Policy' },
  { ext: 'txt', label: 'Plain Text (.txt)', category: 'docs', icon: FileText, defaultPrompt: 'Generate a clean structured system diagnostic report and audit log summary with timestamps and event details.', defaultName: 'System_Audit_Report' },

  // Data & Spreadsheets
  { ext: 'xlsx', label: 'Excel Workbook (.xlsx)', category: 'data', icon: FileSpreadsheet, defaultPrompt: 'Build a full 5-year financial model for a B2B SaaS startup with Monthly Recurring Revenue, customer churn, CAC, and EBITDA projections.', defaultName: 'SaaS_Financial_Model' },
  { ext: 'csv', label: 'CSV Spreadsheet (.csv)', category: 'data', icon: FileSpreadsheet, defaultPrompt: 'Generate a realistic dataset of 25 global tech companies with valuations, employee count, founding year, and revenue.', defaultName: 'Global_Tech_Dataset' },
  { ext: 'json', label: 'JSON Dataset (.json)', category: 'data', icon: Database, defaultPrompt: 'Create a structured JSON schema and mock database of 10 enterprise users with role permissions, API keys, and activity logs.', defaultName: 'Enterprise_Users_Schema' },
  { ext: 'sql', label: 'SQL Schema & Seed (.sql)', category: 'data', icon: Database, defaultPrompt: 'Write complete PostgreSQL schema DDL for an e-commerce platform including customers, orders, inventory, foreign keys, and seed records.', defaultName: 'Ecommerce_Database_Schema' },
  { ext: 'xml', label: 'XML Document (.xml)', category: 'data', icon: Database, defaultPrompt: 'Generate a formal XML configuration file for banking transaction reconciliation with XML schema validation tags.', defaultName: 'Transaction_Reconciliation' },
  { ext: 'yaml', label: 'YAML Config (.yaml)', category: 'data', icon: Database, defaultPrompt: 'Write an advanced multi-environment configuration file for production, staging, and dev with database, Redis, and logging pools.', defaultName: 'Environment_Config' },

  // Web & Graphics
  { ext: 'html', label: 'HTML5 Standalone App (.html)', category: 'web', icon: Globe, defaultPrompt: 'Create a stunning single-page interactive crypto portfolio tracker with responsive Tailwind CSS, animated cards, and mock live chart.', defaultName: 'Crypto_Tracker_App' },
  { ext: 'svg', label: 'SVG Vector Graphic (.svg)', category: 'web', icon: ImageIcon, defaultPrompt: 'Create an intricate cybernetic eagle vector illustration with glowing neon cyan-purple gradients and geometric telemetry rings.', defaultName: 'Cyber_Eagle_Vector' },
  { ext: 'css', label: 'CSS Design System (.css)', category: 'web', icon: Globe, defaultPrompt: 'Generate a modern CSS3 design system with CSS custom properties (variables), dark-mode palette, glassmorphism cards, and button states.', defaultName: 'Modern_Design_System' },

  // Code & Engineering
  { ext: 'py', label: 'Python Script (.py)', category: 'code', icon: Terminal, defaultPrompt: 'Write a production-ready asynchronous Python script using aiohttp and BeautifulSoup to scrape product listings with retry logic and CSV export.', defaultName: 'async_web_scraper' },
  { ext: 'ts', label: 'TypeScript Module (.ts)', category: 'code', icon: FileCode, defaultPrompt: 'Develop a high-performance in-memory LRU Cache implementation in TypeScript with generic types, TTL expiration, and unit test suite.', defaultName: 'lru_cache_module' },
  { ext: 'tsx', label: 'React Component (.tsx)', category: 'code', icon: FileCode, defaultPrompt: 'Build an interactive drag-and-drop Kanban task board in React TypeScript with Tailwind CSS and column state transitions.', defaultName: 'KanbanBoard' },
  { ext: 'js', label: 'Node.js Script (.js)', category: 'code', icon: FileCode, defaultPrompt: 'Create a standalone Node.js REST API server using native http module with routing, JSON parsing, rate limiting, and health check.', defaultName: 'microservice_server' },
  { ext: 'sh', label: 'Bash Script (.sh)', category: 'code', icon: Terminal, defaultPrompt: 'Write a robust Linux server backup script with automated gzip compression, retention rotation, remote rsync sync, and Slack notifications.', defaultName: 'server_backup_automation' },
  { ext: 'ps1', label: 'PowerShell (.ps1)', category: 'code', icon: Terminal, defaultPrompt: 'Write an advanced Windows PowerShell administration script to audit active user sessions, memory usage, and export an HTML report.', defaultName: 'system_admin_audit' },
  { ext: 'go', label: 'Go Source (.go)', category: 'code', icon: Cpu, defaultPrompt: 'Write a concurrent worker pool in Go using goroutines and channels to process a queue of network ping requests with timeout handling.', defaultName: 'worker_pool' },
  { ext: 'rs', label: 'Rust Source (.rs)', category: 'code', icon: Cpu, defaultPrompt: 'Write a CLI tool in Rust that reads a file, calculates word frequencies, and prints the top 10 most common words sorted in descending order.', defaultName: 'word_frequency_cli' },
  { ext: 'java', label: 'Java Class (.java)', category: 'code', icon: Cpu, defaultPrompt: 'Create an Enterprise Order Processing Service in Java with interfaces, validation exceptions, design patterns, and main test runner.', defaultName: 'OrderProcessingService' },
  { ext: 'cpp', label: 'C++ Program (.cpp)', category: 'code', icon: Cpu, defaultPrompt: 'Write a modern C++20 program implementing a multithreaded thread pool with task queues and std::future synchronization.', defaultName: 'thread_pool_engine' },
  { ext: 'php', label: 'PHP Script (.php)', category: 'code', icon: FileCode, defaultPrompt: 'Write a modern PHP 8.2 webhook handler class that validates HMAC signatures, processes event payloads, and logs securely.', defaultName: 'webhook_handler' },

  // DevOps & Cloud
  { ext: 'dockerfile', label: 'Dockerfile (Container)', category: 'devops', icon: Shield, defaultPrompt: 'Write an optimized multi-stage production Dockerfile for a Next.js application using node:20-alpine, non-root user, and cached layers.', defaultName: 'Dockerfile' },
  { ext: 'k8s', label: 'Kubernetes YAML (.yaml)', category: 'devops', icon: Shield, defaultPrompt: 'Create full production Kubernetes deployment manifests including Deployment, ClusterIP Service, Ingress, and HorizontalPodAutoscaler.', defaultName: 'kubernetes_deployment' },

  // Archives & Bundles
  { ext: 'zip', label: 'ZIP Archive Bundle (.zip)', category: 'archive', icon: FolderArchive, defaultPrompt: 'Bundle a complete TypeScript library starter package with package.json, tsconfig.json, src/index.ts, and README.md into a compressed ZIP file.', defaultName: 'ts_starter_bundle' },
];

export default function UniversalFileStudio() {
  const [selectedFormat, setSelectedFormat] = useState<string>('xlsx');
  const [customExt, setCustomExt] = useState<string>('');
  const [fileName, setFileName] = useState<string>('SaaS_Financial_Model');
  const [prompt, setPrompt] = useState<string>(POPULAR_FORMATS[6].defaultPrompt);
  const [categoryFilter, setCategoryFilter] = useState<'all' | 'docs' | 'data' | 'web' | 'code' | 'devops' | 'archive'>('all');

  const [isGenerating, setIsGenerating] = useState<boolean>(false);
  const [generationStep, setGenerationStep] = useState<string>('');
  const [currentResult, setCurrentResult] = useState<GeneratedFileResponse | null>(null);
  const [rawGeneratedContent, setRawGeneratedContent] = useState<string>('');
  const [activeView, setActiveView] = useState<'preview' | 'code'>('preview');
  const [copied, setCopied] = useState<boolean>(false);
  const [history, setHistory] = useState<GeneratedFileResponse[]>([]);

  const handleSelectFormat = (fmt: FormatOption) => {
    setSelectedFormat(fmt.ext);
    setCustomExt('');
    setFileName(fmt.defaultName);
    setPrompt(fmt.defaultPrompt);
  };

  const activeExt = customExt ? customExt.replace(/^\./, '').toLowerCase() : selectedFormat;

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      alert('Please enter a description or prompt for what to generate.');
      return;
    }

    setIsGenerating(true);
    setGenerationStep('Engaging Omni Intelligence Engine...');
    setCurrentResult(null);

    try {
      setGenerationStep(`Authoring comprehensive .${activeExt.toUpperCase()} content...`);

      const { ok, data, error } = await safeFetchJson<{
        success: boolean;
        file: GeneratedFileResponse;
        content: string;
      }>('/api/omni/generate-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fileName: fileName.trim() || `file_${activeExt}`,
          fileType: activeExt,
          prompt: prompt.trim(),
          title: fileName.replace(/_/g, ' '),
        }),
      });

      if (!ok || !data) {
        throw new Error(error || 'Generation failed. Server might be warming up.');
      }

      setGenerationStep('Compiling native binary structure & caching...');

      if (data.file) {
        setCurrentResult(data.file);
        setRawGeneratedContent(data.content || data.file.previewSnippet || '');
        setHistory((prev) => [data.file, ...prev.filter((f) => f.id !== data.file.id)].slice(0, 8));
      }
    } catch (err: any) {
      alert(`File generation error: ${err.message || 'Unknown network error'}`);
    } finally {
      setIsGenerating(false);
      setGenerationStep('');
    }
  };

  const handleDownload = (file: GeneratedFileResponse) => {
    try {
      const link = document.createElement('a');
      link.href = file.downloadUrl;
      link.download = file.fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e: any) {
      alert(`Download trigger failed: ${e.message}`);
    }
  };

  const handleCopy = () => {
    if (!rawGeneratedContent) return;
    navigator.clipboard.writeText(rawGeneratedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const filteredFormats = POPULAR_FORMATS.filter(
    (f) => categoryFilter === 'all' || f.category === categoryFilter
  );

  return (
    <div className="space-y-8 max-w-7xl mx-auto" id="universal-file-studio">
      {/* HEADER BANNER */}
      <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-cyan-500/30 shadow-2xl relative overflow-hidden space-y-4">
        <div className="absolute top-0 right-0 w-96 h-96 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-bold tracking-wider">
              <Sparkles className="w-3.5 h-3.5 text-cyan-400 animate-spin" />
              <span>UNIVERSAL FILE FORGE • DUNYA KI KOI BHI FILE BANAO</span>
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-black text-white tracking-tight">
              Create <span className="shimmer-text">Any File in the World</span> with AI
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Generate real, production-ready files in <strong>40+ formats</strong> — Word documents, Excel spreadsheets, PDFs, vector SVGs, standalone HTML5 apps, Python scripts, database schemas, and ZIP archives.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-xl sm:text-2xl font-mono font-black text-cyan-400">40+</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Formats</div>
            </div>
            <div className="p-4 rounded-2xl bg-white/[0.03] border border-white/10 text-center">
              <div className="text-xl sm:text-2xl font-mono font-black text-emerald-400">1-Click</div>
              <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Download</div>
            </div>
          </div>
        </div>
      </div>

      {/* MAIN TWO-COLUMN WORKBENCH */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: FORMAT SELECTION & PROMPT INPUT (7 Cols) */}
        <div className="lg:col-span-7 space-y-6">
          {/* 1. Category Filter Strip */}
          <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-4">
            <div className="flex items-center justify-between flex-wrap gap-2 text-xs">
              <span className="font-bold text-slate-300 flex items-center gap-2">
                <Sliders className="w-4 h-4 text-cyan-400" />
                Select File Type Category
              </span>
              <div className="flex flex-wrap gap-1.5">
                {(['all', 'docs', 'data', 'web', 'code', 'devops', 'archive'] as const).map((cat) => (
                  <button
                    key={cat}
                    onClick={() => setCategoryFilter(cat)}
                    className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all cursor-pointer ${
                      categoryFilter === cat
                        ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 shadow-sm'
                        : 'text-slate-400 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    {cat === 'all' ? 'All Types' : cat}
                  </button>
                ))}
              </div>
            </div>

            {/* Formats Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 max-h-56 overflow-y-auto pr-1">
              {filteredFormats.map((fmt) => {
                const Icon = fmt.icon;
                const isSelected = selectedFormat === fmt.ext && !customExt;
                return (
                  <button
                    key={fmt.ext}
                    onClick={() => handleSelectFormat(fmt)}
                    className={`p-3 rounded-xl border text-left flex items-start gap-3 transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-cyan-500/20 border-cyan-400 shadow-md shadow-cyan-500/15'
                        : 'bg-white/[0.02] border-white/5 hover:bg-white/[0.06] hover:border-white/10'
                    }`}
                  >
                    <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${isSelected ? 'text-cyan-400' : 'text-slate-400'}`} />
                    <div className="min-w-0">
                      <div className={`text-xs font-bold truncate ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                        .{fmt.ext.toUpperCase()}
                      </div>
                      <div className="text-[10px] text-slate-400 truncate">{fmt.label.split('(')[0]}</div>
                    </div>
                  </button>
                );
              })}
            </div>

            {/* Custom File Extension Input */}
            <div className="pt-3 border-t border-white/5 flex items-center gap-3">
              <span className="text-xs text-slate-400 whitespace-nowrap">Or type ANY custom extension:</span>
              <div className="flex items-center gap-1.5 flex-1">
                <span className="text-cyan-400 font-mono font-bold text-sm">.</span>
                <input
                  type="text"
                  placeholder="e.g. dart, swift, sol, lua, proto, r"
                  value={customExt}
                  onChange={(e) => setCustomExt(e.target.value)}
                  className="w-full bg-slate-950/70 border border-white/10 rounded-xl px-3 py-1.5 text-xs text-cyan-300 font-mono focus:outline-none focus:border-cyan-400"
                />
              </div>
            </div>
          </div>

          {/* 2. File Name & Instructions */}
          <div className="glass-panel p-6 rounded-2xl border border-white/10 space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">File Name</label>
              <div className="flex items-center gap-2 bg-slate-950/80 border border-white/10 rounded-xl px-3 py-2">
                <input
                  type="text"
                  value={fileName}
                  onChange={(e) => setFileName(e.target.value)}
                  placeholder="My_Deliverable_File"
                  className="w-full bg-transparent text-sm text-white font-mono focus:outline-none"
                />
                <span className="px-2 py-0.5 rounded-lg bg-cyan-500/10 text-cyan-300 text-xs font-mono font-bold border border-cyan-500/20">
                  .{activeExt}
                </span>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">
                  Content Specifications & Instructions
                </label>
                <span className="text-[11px] text-slate-400 font-mono">Full AI Synthesis</span>
              </div>
              <textarea
                rows={5}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Describe exactly what content, data, schema, or logic this file should contain..."
                className="w-full bg-slate-950/80 border border-white/10 rounded-xl p-3.5 text-xs sm:text-sm text-slate-200 focus:outline-none focus:border-cyan-400 transition-colors leading-relaxed"
              />
            </div>

            {/* Generate Action Button */}
            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-500 via-indigo-600 to-purple-600 hover:opacity-95 text-white font-bold text-sm shadow-xl shadow-cyan-500/25 flex items-center justify-center gap-2.5 transition-all cursor-pointer disabled:opacity-50"
            >
              {isGenerating ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-cyan-300" />
                  <span>{generationStep || 'Forging file in progress...'}</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4 text-cyan-200" />
                  <span>Forge .{activeExt.toUpperCase()} File Now</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE PREVIEW & DOWNLOAD CARD (5 Cols) */}
        <div className="lg:col-span-5 space-y-6">
          {currentResult ? (
            <div className="glass-panel p-6 rounded-3xl border border-cyan-500/40 shadow-2xl space-y-5 animate-in fade-in zoom-in-95 duration-300">
              {/* File Header Details */}
              <div className="flex items-start justify-between pb-4 border-b border-white/10 gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-400/40 flex items-center justify-center shadow-lg shadow-cyan-500/10">
                    <CheckCircle2 className="w-6 h-6 text-cyan-400" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-white text-base truncate max-w-[200px]" title={currentResult.fileName}>
                      {currentResult.fileName}
                    </h3>
                    <div className="flex items-center gap-2 mt-1">
                      <span className="px-2 py-0.5 rounded-md bg-cyan-500/15 text-cyan-300 font-mono text-[11px] font-bold border border-cyan-500/30 uppercase">
                        {currentResult.fileType}
                      </span>
                      <span className="text-xs text-slate-400 font-mono font-medium">
                        {(currentResult.sizeBytes / 1024).toFixed(1)} KB
                      </span>
                    </div>
                  </div>
                </div>

                {/* Primary Download Button */}
                <button
                  onClick={() => handleDownload(currentResult)}
                  className="glow-btn px-4 py-2.5 rounded-xl text-white text-xs font-bold flex items-center gap-2 transition-all shadow-xl cursor-pointer"
                >
                  <Download className="w-4 h-4" />
                  <span>Download</span>
                </button>
              </div>

              {/* View Toggles for preview */}
              <div className="flex items-center justify-between text-xs pt-1">
                <span className="font-bold text-slate-300">Deliverable Preview</span>
                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopy}
                    className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors flex items-center gap-1.5 text-xs font-mono"
                    title="Copy Content"
                  >
                    {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copied ? 'Copied' : 'Copy'}</span>
                  </button>
                </div>
              </div>

              {/* LIVE RENDER CANVAS */}
              <div className="bg-slate-950/90 border border-white/10 rounded-2xl p-4 overflow-hidden max-h-96 overflow-y-auto">
                {currentResult.fileType === 'svg' ? (
                  <div
                    className="flex items-center justify-center p-4 bg-slate-900 rounded-xl"
                    dangerouslySetInnerHTML={{ __html: rawGeneratedContent }}
                  />
                ) : currentResult.fileType === 'html' ? (
                  <div className="space-y-3">
                    <div className="text-[11px] font-mono text-cyan-400 flex items-center gap-1.5">
                      <Globe className="w-3.5 h-3.5" />
                      <span>Live HTML5 Standalone Preview</span>
                    </div>
                    <iframe
                      srcDoc={rawGeneratedContent}
                      title="HTML Preview"
                      sandbox="allow-scripts"
                      className="w-full h-64 rounded-xl border border-white/10 bg-white"
                    />
                  </div>
                ) : (
                  <pre className="font-mono text-xs text-slate-300 whitespace-pre-wrap leading-relaxed select-text">
                    {rawGeneratedContent}
                  </pre>
                )}
              </div>

              <div className="pt-3 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                <span>MIME: {currentResult.mimeType.split(';')[0]}</span>
                <span className="text-emerald-400">Verified Binary Ready</span>
              </div>
            </div>
          ) : (
            <div className="glass-panel p-10 rounded-3xl border border-white/10 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                <FileCode className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h4 className="font-display font-bold text-white text-base">Deliverable Preview Canvas</h4>
                <p className="text-xs text-slate-400 max-w-xs mx-auto">
                  Select a format on the left, describe your requirements, and click <strong>Forge File Now</strong> to preview and download.
                </p>
              </div>
            </div>
          )}

          {/* HISTORY STRIP */}
          {history.length > 0 && (
            <div className="glass-panel p-4 rounded-2xl border border-white/10 space-y-3">
              <div className="text-xs font-bold text-slate-400 uppercase tracking-wider flex items-center justify-between">
                <span>Recent Forged Files</span>
                <span className="font-mono text-[10px] text-cyan-400">{history.length} Files</span>
              </div>
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {history.map((h) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/5 flex items-center justify-between transition-colors text-xs"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span className="px-1.5 py-0.5 rounded bg-cyan-500/15 text-cyan-300 font-mono text-[10px] font-bold uppercase shrink-0">
                        .{h.fileType}
                      </span>
                      <span className="text-slate-200 truncate font-mono text-xs">{h.fileName}</span>
                    </div>
                    <button
                      onClick={() => handleDownload(h)}
                      className="p-1.5 rounded-lg bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 transition-colors shrink-0"
                      title="Download File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
