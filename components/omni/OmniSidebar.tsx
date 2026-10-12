'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Plus,
  Search,
  MessageSquare,
  Sparkles,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Wrench,
  Layers,
  Trash2,
  Edit2,
  Check,
  X,
  Sliders,
  PanelLeftClose,
  PanelLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { OmniConversation, OmniToolMode } from '@/lib/omni/types';

interface OmniSidebarProps {
  conversations: OmniConversation[];
  activeId: string | null;
  onSelectConversation: (id: string) => void;
  onNewChat: () => void;
  onDeleteConversation: (id: string) => void;
  onRenameConversation: (id: string, newTitle: string) => void;
  onOpenSettings: () => void;
  onSelectToolMode: (mode: OmniToolMode) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
  onSwitchToPipeline?: () => void;
}

export default function OmniSidebar({
  conversations,
  activeId,
  onSelectConversation,
  onNewChat,
  onDeleteConversation,
  onRenameConversation,
  onOpenSettings,
  onSelectToolMode,
  isCollapsed,
  onToggleCollapse,
  onSwitchToPipeline,
}: OmniSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState('');

  const filteredConversations = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (conv: OmniConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(conv.id);
    setEditingTitle(conv.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editingTitle.trim()) {
      onRenameConversation(id, editingTitle.trim());
    }
    setEditingId(null);
  };

  if (isCollapsed) {
    return (
      <aside className="w-16 h-full bg-[#060914] border-r border-white/[0.06] flex flex-col items-center py-4 justify-between z-20 shrink-0">
        <div className="flex flex-col items-center gap-4">
          <button
            onClick={onToggleCollapse}
            title="Expand Sidebar"
            className="p-2.5 rounded-2xl bg-[#0f1429] hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-800 transition-colors"
          >
            <PanelLeft className="w-5 h-5 text-cyan-400" />
          </button>

          <button
            onClick={onNewChat}
            title="New Chat"
            className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 to-indigo-600 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 transition-all"
          >
            <Plus className="w-5 h-5" />
          </button>
        </div>

        <button
          onClick={onOpenSettings}
          title="Settings"
          className="p-2.5 rounded-2xl bg-[#0f1429] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
        >
          <Sliders className="w-5 h-5" />
        </button>
      </aside>
    );
  }

  return (
    <aside className="w-72 sm:w-80 h-full bg-[#060914] border-r border-white/[0.06] flex flex-col justify-between z-20 shrink-0 shadow-xl select-none">
      {/* Top Header */}
      <div className="p-4 border-b border-white/[0.06]">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[1.5px] shadow-lg shadow-indigo-500/20">
              <div className="w-full h-full bg-[#080d1e] rounded-[10px] flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-cyan-400" />
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-white text-base tracking-tight leading-none">
                OmniFlow <span className="text-cyan-400 font-mono text-xs">AI</span>
              </h1>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5">ChatGPT & Claude Unified</p>
            </div>
          </div>

          <button
            onClick={onToggleCollapse}
            title="Collapse Sidebar"
            className="p-1.5 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        </div>

        {/* New Chat Button */}
        <button
          onClick={onNewChat}
          className="w-full py-2.5 px-3.5 rounded-2xl bg-gradient-to-r from-cyan-500/15 to-indigo-500/15 hover:from-cyan-500/25 hover:to-indigo-500/25 text-cyan-200 border border-cyan-500/30 font-semibold text-xs flex items-center justify-between shadow-sm transition-all group"
        >
          <div className="flex items-center gap-2">
            <Plus className="w-4 h-4 text-cyan-400 group-hover:rotate-90 transition-transform duration-300" />
            <span>New chat</span>
          </div>
          <span className="text-[10px] font-mono text-slate-400 border border-slate-700/60 px-1.5 py-0.5 rounded">
            Ctrl+K
          </span>
        </button>

        {/* Search */}
        <div className="relative mt-3">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search conversations..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-[#0d1226] border border-slate-800/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-500/60"
          />
        </div>
      </div>

      {/* Quick Launch Tools */}
      <div className="px-4 py-2 border-b border-white/[0.04]">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono mb-1.5 px-1">
          Quick Launch Tools
        </div>
        <div className="grid grid-cols-2 gap-1.5">
          <button
            onClick={() => onSelectToolMode('create_file')}
            className="px-2.5 py-2 rounded-xl bg-[#0b1022] hover:bg-[#121936] border border-slate-800/70 text-left text-xs flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <FileText className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span className="truncate">File Creator</span>
          </button>

          <button
            onClick={() => onSelectToolMode('fix_file')}
            className="px-2.5 py-2 rounded-xl bg-[#0b1022] hover:bg-[#121936] border border-slate-800/70 text-left text-xs flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <Wrench className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="truncate">File Fixer</span>
          </button>

          <button
            onClick={() => onSelectToolMode('image')}
            className="px-2.5 py-2 rounded-xl bg-[#0b1022] hover:bg-[#121936] border border-slate-800/70 text-left text-xs flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <ImageIcon className="w-3.5 h-3.5 text-purple-400 shrink-0" />
            <span className="truncate">Image Studio</span>
          </button>

          <button
            onClick={() => onSelectToolMode('deep_think')}
            className="px-2.5 py-2 rounded-xl bg-[#0b1022] hover:bg-[#121936] border border-slate-800/70 text-left text-xs flex items-center gap-2 text-slate-300 hover:text-white transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
            <span className="truncate">Reasoning</span>
          </button>
        </div>
      </div>

      {/* Conversations List */}
      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-1">
        <div className="text-[10px] uppercase font-bold text-slate-400 tracking-wider font-mono px-2 py-1">
          Recent Chats
        </div>

        {filteredConversations.length === 0 ? (
          <div className="px-3 py-8 text-center text-xs text-slate-500">
            No chats found. Click &quot;New chat&quot; to begin!
          </div>
        ) : (
          filteredConversations.map((conv) => {
            const isActive = activeId === conv.id;
            const isEditing = editingId === conv.id;

            return (
              <div
                key={conv.id}
                onClick={() => onSelectConversation(conv.id)}
                className={`group relative flex items-center justify-between px-3 py-2.5 rounded-xl cursor-pointer text-xs transition-all ${
                  isActive
                    ? 'bg-[#121a38] text-white font-medium border border-cyan-500/30'
                    : 'text-slate-400 hover:bg-[#0c1226] hover:text-slate-200'
                }`}
              >
                <div className="flex items-center gap-2.5 truncate flex-1 pr-2">
                  <MessageSquare className={`w-3.5 h-3.5 shrink-0 ${isActive ? 'text-cyan-400' : 'text-slate-500'}`} />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editingTitle}
                      onChange={(e) => setEditingTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#090d1f] border border-cyan-500/50 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none w-full"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate">{conv.title}</span>
                  )}
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  {isEditing ? (
                    <>
                      <button
                        onClick={(e) => saveRename(conv.id, e)}
                        className="p-1 hover:text-emerald-400 transition-colors"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingId(null);
                        }}
                        className="p-1 hover:text-red-400 transition-colors"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <>
                      <button
                        onClick={(e) => startRename(conv, e)}
                        title="Rename"
                        className="p-1 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          if (confirm('Delete this conversation?')) {
                            onDeleteConversation(conv.id);
                          }
                        }}
                        title="Delete"
                        className="p-1 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Profile & Links */}
      <div className="p-3 border-t border-white/[0.06] bg-[#070b1a] space-y-1.5">
        {onSwitchToPipeline && (
          <button
            onClick={onSwitchToPipeline}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-[#0b1022] hover:bg-[#121936] border border-cyan-500/20 text-xs text-cyan-300 hover:text-white transition-colors"
          >
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              <span className="font-semibold">Document Humanizer</span>
            </div>
            <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">0% AI</span>
          </button>
        )}

        <Link
          href="/intelligent"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0b1022] hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <span>Automation Studio</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </Link>

        <Link
          href="/documentation"
          className="flex items-center justify-between px-3 py-2 rounded-xl bg-[#0b1022] hover:bg-slate-800 text-xs text-slate-300 hover:text-white transition-colors"
        >
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Legal Studio</span>
          </div>
          <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
        </Link>

        <div className="flex items-center justify-between px-2 pt-1">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-full bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-[11px] font-bold text-cyan-300">
              AI
            </div>
            <div>
              <div className="text-xs font-semibold text-white leading-none">Omni Pro</div>
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">Online • Ready</div>
            </div>
          </div>

          <button
            onClick={onOpenSettings}
            title="Settings"
            className="p-2 rounded-xl hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
          >
            <Sliders className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
}
