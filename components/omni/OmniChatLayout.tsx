'use client';

import React, { useState, useEffect, useRef } from 'react';
import OmniSidebar from './OmniSidebar';
import OmniHeader from './OmniHeader';
import OmniMessageItem from './OmniMessageItem';
import OmniComposer from './OmniComposer';
import OmniCanvasPanel from './OmniCanvasPanel';
import OmniSettingsModal from './OmniSettingsModal';
import OmniImageStudioModal from './OmniImageStudioModal';
import {
  GeneratedImageMeta,
  OmniConversation,
  OmniMessage,
  OmniModelId,
  OmniToolMode,
  OmniAttachment,
  OmniArtifact,
} from '@/lib/omni/types';
import {
  Sparkles,
  FileText,
  Wrench,
  Image as ImageIcon,
  Code,
  Globe,
  ArrowRight,
  Brain,
  FileSpreadsheet,
} from 'lucide-react';

interface OmniChatLayoutProps {
  onSwitchToPipeline?: () => void;
}

export default function OmniChatLayout({ onSwitchToPipeline }: OmniChatLayoutProps = {}) {
  const [conversations, setConversations] = useState<OmniConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [currentModel, setCurrentModel] = useState<OmniModelId>('gpt-4o');
  const [activeToolMode, setActiveToolMode] = useState<OmniToolMode>('auto');
  const [isLoading, setIsLoading] = useState(false);
  const [activeArtifact, setActiveArtifact] = useState<OmniArtifact | null>(null);
  const [isCanvasOpen, setIsCanvasOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isImageStudioOpen, setIsImageStudioOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Load conversations on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // Keyboard shortcut Ctrl+K / Cmd+K for new chat
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        handleNewChat();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/omni/chat');
      const data = await res.json();
      if (data.conversations && data.conversations.length > 0) {
        setConversations(data.conversations);
        if (!activeId) {
          setActiveId(data.conversations[0].id);
        }
      } else {
        // Create initial default chat
        handleNewChat();
      }
    } catch (e) {
      console.warn('Failed to load conversations:', e);
    }
  };

  const activeConversation = conversations.find((c) => c.id === activeId) || null;

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isLoading]);

  const handleNewChat = () => {
    const newConv: OmniConversation = {
      id: `conv_${Date.now()}`,
      title: 'New Chat',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      model: currentModel,
      messages: [],
    };
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(newConv.id);
    setActiveArtifact(null);
    setIsCanvasOpen(false);
  };

  const handleSelectConversation = (id: string) => {
    setActiveId(id);
    const selected = conversations.find((c) => c.id === id);
    if (selected) {
      setCurrentModel(selected.model || 'gpt-4o');
      // Set active artifact to latest message's artifact if any
      const lastArtifactMsg = [...selected.messages].reverse().find((m) => m.artifact);
      if (lastArtifactMsg && lastArtifactMsg.artifact) {
        setActiveArtifact(lastArtifactMsg.artifact);
      }
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/omni/chat?id=${id}`, { method: 'DELETE' });
      const remaining = conversations.filter((c) => c.id !== id);
      setConversations(remaining);
      if (activeId === id) {
        if (remaining.length > 0) {
          setActiveId(remaining[0].id);
        } else {
          handleNewChat();
        }
      }
    } catch (e) {
      console.warn('Delete conversation failed:', e);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    setConversations((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
    );
  };

  const handleClearAllChats = async () => {
    try {
      await fetch('/api/omni/chat', { method: 'DELETE' });
      setConversations([]);
      handleNewChat();
      setIsSettingsOpen(false);
    } catch (e) {
      console.warn('Clear all chats failed:', e);
    }
  };

  const handleSendMessage = async (
    prompt: string,
    toolMode: OmniToolMode,
    attachments: OmniAttachment[]
  ) => {
    setIsLoading(true);

    // Optimistically append user message
    const tempUserMsg: OmniMessage = {
      id: `user_${Date.now()}`,
      role: 'user',
      content: prompt,
      timestamp: new Date().toISOString(),
      model: currentModel,
      attachments: attachments.length > 0 ? attachments : undefined,
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeId) {
          return {
            ...c,
            title: c.messages.length === 0 ? prompt.slice(0, 36) : c.title,
            messages: [...c.messages, tempUserMsg],
          };
        }
        return c;
      })
    );

    try {
      const res = await fetch('/api/omni/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId: activeId,
          prompt,
          model: currentModel,
          toolMode,
          attachments,
        }),
      });

      const data = await res.json();
      if (data.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === data.conversation.id ? data.conversation : c))
        );
        if (data.message?.artifact) {
          setActiveArtifact(data.message.artifact);
          setIsCanvasOpen(true);
        }
      }
    } catch (err) {
      console.error('Send message failed:', err);
    } finally {
      setIsLoading(false);
      setActiveToolMode('auto');
    }
  };

  const handleOpenArtifact = (artifact: OmniArtifact) => {
    setActiveArtifact(artifact);
    setIsCanvasOpen(true);
  };

  const handleImageStudioResult = (image: GeneratedImageMeta) => {
    const assistantMsg: OmniMessage = {
      id: `img_msg_${Date.now()}`,
      role: 'assistant',
      content: `I've synthesized your visual artwork using **${image.modelName}** in **${image.style}** style! 🎨\n\n• **Prompt:** *${image.prompt}*\n• **Model Architecture:** \`${image.modelName}\`\n• **Quality Tier:** ${image.quality?.toUpperCase() || 'ULTRA 4K'}\n• **Dimensions:** ${image.width}×${image.height}`,
      timestamp: new Date().toISOString(),
      generatedImages: [image],
      artifact: {
        id: image.id,
        title: `Artwork: ${image.prompt.slice(0, 30)}...`,
        type: 'image',
        content: image.imageUrl,
      },
    };

    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeId) {
          return {
            ...c,
            title: c.messages.length === 0 ? `Art: ${image.prompt.slice(0, 28)}` : c.title,
            messages: [...c.messages, assistantMsg],
          };
        }
        return c;
      })
    );

    setActiveArtifact(assistantMsg.artifact!);
    setIsCanvasOpen(true);
  };

  const handleExportChat = (format: 'markdown' | 'json') => {
    if (!activeConversation) return;
    let content = '';
    let mime = 'text/plain';
    let ext = 'txt';

    if (format === 'json') {
      content = JSON.stringify(activeConversation, null, 2);
      mime = 'application/json';
      ext = 'json';
    } else {
      content = `# ${activeConversation.title}\n\n`;
      activeConversation.messages.forEach((m) => {
        content += `### ${m.role === 'user' ? 'User' : `OmniFlow (${m.model || 'AI'})`}\n*${new Date(
          m.timestamp
        ).toLocaleString()}*\n\n${m.content}\n\n---\n\n`;
      });
      mime = 'text/markdown';
      ext = 'md';
    }

    const blob = new Blob([content], { type: `${mime};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OmniFlow_Chat_${activeConversation.id}.${ext}`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Preset Prompts for the Welcome screen
  const promptPresets = [
    {
      title: 'Generate Full Web Application',
      description: 'Write an interactive Next.js or React dashboard with live preview',
      icon: Code,
      color: 'text-cyan-400',
      prompt: 'Write a complete, responsive modern analytics dashboard component in React with live chart stats and interactive filters.',
      mode: 'auto' as OmniToolMode,
    },
    {
      title: 'Create Word (.docx) or Excel (.xlsx)',
      description: 'Generate formatted documents or financial spreadsheets for instant download',
      icon: FileSpreadsheet,
      color: 'text-emerald-400',
      prompt: 'Create an executive financial model spreadsheet in Excel (.xlsx) with Q1-Q4 projections, costs, and profit calculations ready for download.',
      mode: 'create_file' as OmniToolMode,
    },
    {
      title: 'Analyze & Fix Broken Code/File',
      description: 'Inspect errors, repair syntax, and inspect side-by-side Diff',
      icon: Wrench,
      color: 'text-amber-400',
      prompt: 'Please analyze and fix this broken code snippet:\n```js\nfunction calculateMetrics(data) {\n  let total = 0;\n  data.items.forEach(item => {\n    total += item.price\n  console.log("total", total)\n  return total\n}\n```',
      mode: 'fix_file' as OmniToolMode,
    },
    {
      title: 'AI Image Studio (DALL-E 3)',
      description: 'Generate 4K photorealistic, cyberpunk, anime, or 3D renders',
      icon: ImageIcon,
      color: 'text-purple-400',
      prompt: 'Generate an ultra-detailed cyberpunk futuristic cityscape at twilight with neon skyscrapers and flying vehicles in 4k photorealistic style.',
      mode: 'image' as OmniToolMode,
    },
  ];

  return (
    <div className="flex h-screen w-full bg-[#060913] text-slate-100 overflow-hidden font-sans">
      {/* 1. SIDEBAR (ChatGPT & Claude Style) */}
      <OmniSidebar
        conversations={conversations}
        activeId={activeId}
        onSelectConversation={handleSelectConversation}
        onNewChat={handleNewChat}
        onDeleteConversation={handleDeleteConversation}
        onRenameConversation={handleRenameConversation}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onSelectToolMode={(mode) => {
          if (mode === 'image') {
            setIsImageStudioOpen(true);
          } else {
            setActiveToolMode(mode);
          }
        }}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        onSwitchToPipeline={onSwitchToPipeline}
      />

      {/* 2. MAIN CHAT CONTAINER */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {/* Top Header */}
        <OmniHeader
          currentModel={currentModel}
          onModelChange={setCurrentModel}
          activeArtifact={activeArtifact}
          onToggleCanvas={() => setIsCanvasOpen(!isCanvasOpen)}
          isCanvasOpen={isCanvasOpen}
          onClearChat={() => {
            if (activeId) {
              setConversations((prev) =>
                prev.map((c) => (c.id === activeId ? { ...c, messages: [] } : c))
              );
            }
          }}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onExportChat={handleExportChat}
          onSwitchToPipeline={onSwitchToPipeline}
          onOpenImageStudio={() => setIsImageStudioOpen(true)}
        />

        {/* Message Thread or Welcome Screen */}
        <div className="flex-1 overflow-y-auto overflow-x-hidden relative">
          {(!activeConversation || activeConversation.messages.length === 0) ? (
            /* EMPTY STATE: ChatGPT / Claude Style Welcome Screen */
            <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-8 flex flex-col items-center text-center animate-fadeIn">
              <div className="relative mb-6">
                <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 p-[2px] shadow-2xl shadow-indigo-500/30">
                  <div className="w-full h-full bg-[#070b1a] rounded-[22px] flex items-center justify-center">
                    <Sparkles className="w-8 h-8 text-cyan-400" />
                  </div>
                </div>
                <span className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full bg-emerald-400 border-2 border-[#060913] animate-pulse" />
              </div>

              <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight mb-3">
                How can I assist you today?
              </h2>
              <p className="text-sm sm:text-base text-slate-400 max-w-xl mb-10 leading-relaxed">
                OmniFlow AI combines the best of <strong>ChatGPT</strong> and <strong>Claude</strong>. Create native files, fix code bugs with diffs, generate images, or ask anything in English or Urdu!
              </p>

              {/* Prompt Suggestion Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 w-full max-w-2xl text-left">
                {promptPresets.map((preset, idx) => {
                  const Icon = preset.icon;
                  return (
                    <button
                      key={idx}
                      onClick={() => handleSendMessage(preset.prompt, preset.mode, [])}
                      className="p-4 rounded-2xl bg-[#0b1024]/80 hover:bg-[#121938] border border-slate-800/80 hover:border-cyan-500/40 text-left transition-all duration-300 group shadow-lg"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2.5">
                          <Icon className={`w-4 h-4 ${preset.color}`} />
                          <h4 className="text-sm font-semibold text-white group-hover:text-cyan-200 transition-colors">
                            {preset.title}
                          </h4>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-1 transition-all" />
                      </div>
                      <p className="text-xs text-slate-400 leading-relaxed">{preset.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            /* CONVERSATION MESSAGE LIST */
            <div className="divide-y divide-white/[0.03]">
              {activeConversation.messages.map((msg) => (
                <OmniMessageItem
                  key={msg.id}
                  message={msg}
                  onOpenArtifact={handleOpenArtifact}
                  onRegenerate={() => {
                    const lastUserMsg = [...activeConversation.messages]
                      .reverse()
                      .find((m) => m.role === 'user');
                    if (lastUserMsg) {
                      handleSendMessage(lastUserMsg.content, 'auto', lastUserMsg.attachments || []);
                    }
                  }}
                />
              ))}

              {/* Typing / Thinking Loading Indicator */}
              {isLoading && (
                <div className="py-6 px-4 sm:px-6 bg-[#090d1f]/60 border-y border-white/[0.04]">
                  <div className="max-w-4xl mx-auto flex gap-4 sm:gap-6 items-start">
                    <div className="w-9 h-9 rounded-2xl bg-gradient-to-tr from-cyan-400 to-indigo-500 p-[1.5px] shadow-lg shrink-0">
                      <div className="w-full h-full bg-[#080d1e] rounded-[14px] flex items-center justify-center">
                        <Sparkles className="w-4 h-4 text-cyan-400 animate-spin" />
                      </div>
                    </div>
                    <div className="space-y-2 pt-1.5">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-sm text-white">OmniFlow is thinking</span>
                        <div className="flex gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce" />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-100" />
                          <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-bounce delay-200" />
                        </div>
                      </div>
                      <p className="text-xs text-slate-400 font-mono">
                        Executing multi-modal neural reasoning & synthesizing deliverables...
                      </p>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Bottom Composer */}
        <OmniComposer
          onSendMessage={handleSendMessage}
          isLoading={isLoading}
          initialMode={activeToolMode}
          onStop={() => setIsLoading(false)}
        />
      </main>

      {/* 3. ARTIFACTS & LIVE CANVAS PANEL (Claude Artifacts & ChatGPT Canvas) */}
      {isCanvasOpen && (
        <OmniCanvasPanel
          artifact={activeArtifact}
          onClose={() => setIsCanvasOpen(false)}
        />
      )}

      {/* 4. SETTINGS MODAL */}
      <OmniSettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        onClearAllChats={handleClearAllChats}
      />

      {/* 5. ULTRA AI IMAGE STUDIO MODAL (Flux.1 Pro, Midjourney v6, DALL-E 3 HD, Imagen 3) */}
      <OmniImageStudioModal
        isOpen={isImageStudioOpen}
        onClose={() => setIsImageStudioOpen(false)}
        onImageGenerated={handleImageStudioResult}
      />
    </div>
  );
}
