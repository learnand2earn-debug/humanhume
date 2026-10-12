'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import {
  FileText,
  Sliders,
  Sparkles,
  ShieldCheck,
  Activity,
  Zap,
  ListTodo,
  Bot,
  Layers,
  ChevronDown,
  PlusCircle,
  ExternalLink,
  CheckCircle2,
  HardDrive,
  Cpu,
} from 'lucide-react';

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [mode, setMode] = useState<'demo' | 'live'>('demo');
  const [stats, setStats] = useState<{
    totalDocuments: number;
    processingDocuments: number;
    totalConversations: number;
  }>({
    totalDocuments: 0,
    processingDocuments: 0,
    totalConversations: 0,
  });
  const [showQuickMenu, setShowQuickMenu] = useState(false);
  const [showHealthModal, setShowHealthModal] = useState(false);

  useEffect(() => {
    fetch('/api/admin/settings')
      .then((r) => r.json())
      .then((data) => {
        if (data.settings?.mode) {
          setMode(data.settings.mode);
        }
      })
      .catch(() => {});

    const fetchStats = () => {
      fetch('/api/system/overview')
        .then((r) => r.json())
        .then((data) => {
          if (data.stats) {
            setStats({
              totalDocuments: data.stats.totalDocuments,
              processingDocuments: data.stats.processingDocuments,
              totalConversations: data.stats.totalConversations,
            });
          }
        })
        .catch(() => {});
    };

    fetchStats();
    const interval = setInterval(fetchStats, 6000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="sticky top-0 z-50 glass-panel border-b border-white/[0.08] backdrop-blur-2xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-18 flex items-center justify-between">
        {/* Brand Logo & System Identifier */}
        <Link href="/" className="flex items-center gap-3.5 group" id="nav-brand-logo">
          <div className="relative">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-500 p-[1.5px] shadow-lg shadow-indigo-500/25 group-hover:scale-105 transition-all duration-300">
              <div className="w-full h-full bg-[#080d1e] rounded-[14px] flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-cyan-400 group-hover:rotate-12 transition-transform duration-300" />
              </div>
            </div>
            <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-400 border-2 border-[#060913] animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display font-extrabold text-xl tracking-tight text-white group-hover:text-cyan-200 transition-colors">
                HumanFlow <span className="text-cyan-400 font-mono font-bold text-lg">OS</span>
              </span>
              <span
                id="nav-mode-badge"
                className={`text-[10px] uppercase font-mono px-2 py-0.5 rounded-full font-bold tracking-wider ${
                  mode === 'live'
                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm shadow-emerald-500/20'
                    : 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm shadow-indigo-500/20'
                }`}
              >
                {mode === 'live' ? 'Live Engine' : 'Unified OS'}
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium hidden sm:block tracking-wide">
              Enterprise AI Document & Autonomous Agent Platform
            </p>
          </div>
        </Link>

        {/* Global Unified Navigation */}
        <nav className="hidden lg:flex items-center gap-1.5 bg-white/[0.03] p-1.5 rounded-2xl border border-white/[0.06]">
          <Link
            href="/"
            id="nav-link-command-center"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
              pathname === '/'
                ? 'bg-gradient-to-r from-cyan-500/25 to-indigo-500/25 text-white border border-cyan-400/40 shadow-md shadow-cyan-500/10'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>Document Pipeline</span>
          </Link>

          <Link
            href="/workspace"
            id="nav-link-workspace"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
              pathname.startsWith('/workspace')
                ? 'bg-gradient-to-r from-cyan-500/25 to-purple-500/25 text-white border border-cyan-400/50 shadow-md shadow-cyan-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>AI Workspace</span>
            {stats.totalConversations > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-cyan-500/20 text-cyan-300 font-mono">
                {stats.totalConversations}
              </span>
            )}
          </Link>

          <Link
            href="/intelligent"
            id="nav-link-intelligent"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
              pathname.startsWith('/intelligent')
                ? 'bg-gradient-to-r from-purple-500/25 to-pink-500/25 text-white border border-purple-500/40 shadow-md shadow-purple-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <ListTodo className="w-3.5 h-3.5 text-purple-400" />
            <span>Intelligent Studio</span>
          </Link>

          <Link
            href="/documentation"
            id="nav-link-documentation"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
              pathname.startsWith('/documentation')
                ? 'bg-gradient-to-r from-blue-500/25 to-cyan-500/25 text-white border border-blue-500/40 shadow-md shadow-blue-500/20'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            <span>Legal Studio</span>
          </Link>

          <Link
            href="/admin"
            id="nav-link-admin"
            className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold transition-all duration-200 flex items-center gap-2 ${
              pathname.startsWith('/admin')
                ? 'bg-gradient-to-r from-indigo-500/25 to-purple-500/25 text-white border border-purple-500/30 shadow-md shadow-purple-500/10'
                : 'text-slate-300 hover:text-white hover:bg-white/[0.06]'
            }`}
          >
            <Sliders className="w-3.5 h-3.5 text-purple-400" />
            <span>Admin</span>
          </Link>
        </nav>

        {/* Action Controls & Health Status */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Quick Launch Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowQuickMenu(!showQuickMenu)}
              className="glow-btn px-3.5 py-2 rounded-xl text-white text-xs font-bold flex items-center gap-1.5 transition-all shadow-md shadow-cyan-500/20"
            >
              <Zap className="w-3.5 h-3.5 text-cyan-300 fill-cyan-300" />
              <span className="hidden sm:inline">Launch</span>
              <ChevronDown className="w-3 h-3 text-slate-300" />
            </button>

            {showQuickMenu && (
              <div
                className="absolute right-0 mt-2 w-64 glass-panel-glow rounded-2xl p-2 border border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150"
                onClick={() => setShowQuickMenu(false)}
              >
                <div className="text-[10px] font-mono uppercase tracking-wider text-slate-400 px-3 py-1.5 font-bold">
                  Unified System Actions
                </div>
                <Link
                  href="/?view=pipeline"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <div>
                    <div className="font-semibold">Humanize Document</div>
                    <div className="text-[10px] text-slate-400">100% Fact-Frozen Pipeline</div>
                  </div>
                </Link>

                <Link
                  href="/workspace"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <Bot className="w-4 h-4 text-purple-400" />
                  <div>
                    <div className="font-semibold">AI Autonomous Task</div>
                    <div className="text-[10px] text-slate-400">Interactive planner & chat</div>
                  </div>
                </Link>

                <Link
                  href="/intelligent"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <ListTodo className="w-4 h-4 text-emerald-400" />
                  <div>
                    <div className="font-semibold">Intelligent Audit</div>
                    <div className="text-[10px] text-slate-400">Multimodal verification</div>
                  </div>
                </Link>

                <Link
                  href="/documentation"
                  className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-slate-200 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <FileText className="w-4 h-4 text-blue-400" />
                  <div>
                    <div className="font-semibold">Draft Legal Contract</div>
                    <div className="text-[10px] text-slate-400">Pre-built compliant templates</div>
                  </div>
                </Link>
              </div>
            )}
          </div>

          {/* System Telemetry Pill (Clickable) */}
          <div className="relative">
            <button
              onClick={() => setShowHealthModal(!showHealthModal)}
              className="flex items-center gap-2 text-xs text-slate-300 glass-card px-3 py-1.5 rounded-xl border border-white/10 hover:border-cyan-400/30 transition-all cursor-pointer"
              title="Click to view System Health Telemetry"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden md:inline font-medium">Fact Guard:</span>
              <strong className="text-white font-semibold">100%</strong>
              {stats.processingDocuments > 0 ? (
                <span className="flex items-center gap-1 font-mono text-[11px] text-cyan-300 ml-1 pl-2 border-l border-white/10">
                  <Activity className="w-3 h-3 text-cyan-400 animate-pulse" />
                  {stats.processingDocuments} active
                </span>
              ) : null}
            </button>

            {showHealthModal && (
              <div className="absolute right-0 mt-2 w-80 glass-panel-glow rounded-2xl p-4 border border-white/10 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-150">
                <div className="flex items-center justify-between pb-2 border-b border-white/10 mb-3">
                  <div className="flex items-center gap-2 text-xs font-bold text-white">
                    <Cpu className="w-4 h-4 text-cyan-400" />
                    <span>System Telemetry & Health</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.5 rounded-full font-bold">
                    ONLINE
                  </span>
                </div>

                <div className="space-y-2.5 text-xs">
                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      Fact Preservation Guard
                    </span>
                    <strong className="text-emerald-400 font-mono">100% Locked</strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3.5 h-3.5 text-cyan-400" />
                      Documents Processed
                    </span>
                    <strong className="text-cyan-400 font-mono">{stats.totalDocuments} Total</strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <Activity className="w-3.5 h-3.5 text-purple-400" />
                      Processing Queue
                    </span>
                    <strong className="text-purple-400 font-mono">
                      {stats.processingDocuments > 0 ? `${stats.processingDocuments} Active` : 'Idle / Ready'}
                    </strong>
                  </div>

                  <div className="flex items-center justify-between text-slate-300">
                    <span className="flex items-center gap-1.5">
                      <HardDrive className="w-3.5 h-3.5 text-slate-400" />
                      Storage Isolation
                    </span>
                    <strong className="text-slate-200 font-mono">Zero Overwrite</strong>
                  </div>

                  <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                    <span>Engine: Multi-Agent Hybrid</span>
                    <span>v0.1.0-enterprise</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
