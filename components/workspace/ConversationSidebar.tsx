'use client';

import React, { useState } from 'react';
import {
  Plus,
  MessageSquare,
  Search,
  Trash2,
  Edit2,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { UniversalConversation } from '@/lib/agent/types';

interface ConversationSidebarProps {
  conversations: UniversalConversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onRename: (id: string, newTitle: string) => void;
  onDelete: (id: string) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export default function ConversationSidebar({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onRename,
  onDelete,
  isCollapsed,
  onToggleCollapse,
}: ConversationSidebarProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');

  const filtered = conversations.filter((c) =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const startRename = (c: UniversalConversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const saveRename = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  const cancelRename = (e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(null);
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('Delete this conversation?')) {
      onDelete(id);
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-14 bg-[#070b18] border-r border-white/10 flex flex-col items-center py-4 shrink-0 transition-all">
        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 mb-4"
          title="Expand sidebar"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
        <button
          type="button"
          onClick={onNewChat}
          className="w-10 h-10 rounded-xl bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 flex items-center justify-center hover:bg-cyan-500/30 transition-all"
          title="New Chat"
        >
          <Plus className="w-5 h-5" />
        </button>
      </div>
    );
  }

  return (
    <aside className="w-72 bg-[#070b18] border-r border-white/10 flex flex-col h-full shrink-0 select-none">
      {/* Top Bar: New Chat & Collapse */}
      <div className="p-3 border-b border-white/[0.08] flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={onNewChat}
          className="flex-1 px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-white text-xs font-semibold flex items-center gap-2 border border-white/10 transition-colors cursor-pointer"
        >
          <Plus className="w-4 h-4 text-cyan-400" />
          <span>New Chat</span>
        </button>

        <button
          type="button"
          onClick={onToggleCollapse}
          className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
          title="Collapse sidebar"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      </div>

      {/* Search Input */}
      <div className="p-3 border-b border-white/[0.06]">
        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search conversations..."
            className="w-full bg-[#0a1024] border border-white/10 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors"
          />
        </div>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto p-2 space-y-1">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-xs text-slate-500">
            {conversations.length === 0 ? 'No conversations yet.' : 'No matching results.'}
          </div>
        ) : (
          filtered.map((c) => {
            const isActive = c.id === activeId;
            const isEditing = editingId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => onSelect(c.id)}
                className={`group relative p-2.5 rounded-xl text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                  isActive
                    ? 'bg-cyan-500/15 border border-cyan-500/30 text-white shadow-sm shadow-cyan-500/10'
                    : 'text-slate-300 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div className="flex items-center gap-2 truncate flex-1">
                  <MessageSquare
                    className={`w-3.5 h-3.5 shrink-0 ${
                      isActive ? 'text-cyan-400' : 'text-slate-500 group-hover:text-slate-300'
                    }`}
                  />
                  {isEditing ? (
                    <input
                      type="text"
                      value={editTitle}
                      onChange={(e) => setEditTitle(e.target.value)}
                      onClick={(e) => e.stopPropagation()}
                      className="bg-[#0b1228] border border-cyan-400 rounded px-1.5 py-0.5 text-xs text-white w-full focus:outline-none"
                      autoFocus
                    />
                  ) : (
                    <span className="truncate font-medium">{c.title}</span>
                  )}
                </div>

                {/* Edit & Delete Actions */}
                <div className="flex items-center gap-1 shrink-0">
                  {isEditing ? (
                    <>
                      <button
                        type="button"
                        onClick={(e) => saveRename(c.id, e)}
                        className="text-emerald-400 hover:text-emerald-300 p-0.5"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={cancelRename}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                      >
                        <X className="w-3.5 h-3.5" />
                      </button>
                    </>
                  ) : (
                    <div className="opacity-0 group-hover:opacity-100 flex items-center gap-1 transition-opacity">
                      <button
                        type="button"
                        onClick={(e) => startRename(c, e)}
                        className="text-slate-400 hover:text-white p-0.5"
                        title="Rename"
                      >
                        <Edit2 className="w-3 h-3" />
                      </button>
                      <button
                        type="button"
                        onClick={(e) => handleDelete(c.id, e)}
                        className="text-slate-400 hover:text-rose-400 p-0.5"
                        title="Delete"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer Branding */}
      <div className="p-3 border-t border-white/[0.08] text-[11px] text-slate-500 font-mono flex items-center justify-between">
        <span className="flex items-center gap-1.5 text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
          <span>Universal AI Agent</span>
        </span>
        <span className="px-1.5 py-0.5 rounded bg-white/[0.05] border border-white/10 text-[9px]">
          v2.0
        </span>
      </div>
    </aside>
  );
}
