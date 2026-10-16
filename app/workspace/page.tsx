'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import Navbar from '@/components/Navbar';
import ConversationSidebar from '@/components/workspace/ConversationSidebar';
import TaskPlanWidget from '@/components/workspace/TaskPlanWidget';
import ChecklistWidget from '@/components/workspace/ChecklistWidget';
import QuestionFormWidget from '@/components/workspace/QuestionFormWidget';
import ArtifactWidget from '@/components/workspace/ArtifactWidget';
import Composer from '@/components/workspace/Composer';
import { UniversalConversation, AgentMessage, MessageAttachment } from '@/lib/agent/types';
import { safeFetchJson } from '@/lib/utils/safe-json';
import {
  Sparkles,
  Bot,
  User,
  PanelLeftClose,
  PanelLeft,
  Plus,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Video,
  Music,
  Code,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Clock,
  Layers,
  ArrowRight,
  ListTodo,
} from 'lucide-react';

export default function WorkspacePage() {
  const [conversations, setConversations] = useState<UniversalConversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activeConversation, setActiveConversation] = useState<UniversalConversation | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingStatusText, setLoadingStatusText] = useState('');
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);

  const loadConversations = async () => {
    try {
      const res = await fetch('/api/workspace/conversations');
      if (!res.ok) return;
      const rawText = await res.text();
      if (!rawText || rawText.includes('upstream error')) return;
      const data = JSON.parse(rawText);
      if (data.conversations) {
        setConversations(data.conversations);
        // Check URL query parameters
        let initialId: string | null = null;
        if (typeof window !== 'undefined') {
          const urlParams = new URLSearchParams(window.location.search);
          initialId = urlParams.get('id');
        }
        if (initialId && data.conversations.some((c: any) => c.id === initialId)) {
          setActiveId(initialId);
        } else if (data.conversations.length > 0 && !activeId) {
          setActiveId(data.conversations[0].id);
        }
      }
    } catch (err) {
      console.error('Failed to load conversations:', err);
    }
  };

  const loadConversationDetails = async (id: string) => {
    try {
      const res = await fetch(`/api/workspace/conversations/${id}`);
      if (!res.ok) return;
      const rawText = await res.text();
      if (!rawText || rawText.includes('upstream error')) return;
      const data = JSON.parse(rawText);
      if (data.conversation) {
        setActiveConversation(data.conversation);
      }
    } catch (err) {
      console.error('Failed to load conversation details:', err);
    }
  };

  // Load conversation list on mount
  useEffect(() => {
    loadConversations();
  }, []);

  // When activeId changes, fetch active conversation
  useEffect(() => {
    if (activeId) {
      loadConversationDetails(activeId);
    } else {
      setActiveConversation(null);
    }
  }, [activeId]);

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [activeConversation?.messages, isLoading]);

  const handleCreateNew = async () => {
    try {
      const res = await fetch('/api/workspace/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'New Autonomous Task' }),
      });
      if (!res.ok) return;
      const rawText = await res.text();
      if (!rawText || rawText.includes('upstream error')) return;
      const data = JSON.parse(rawText);
      if (data.conversation) {
        setConversations((prev) => [data.conversation, ...prev]);
        setActiveId(data.conversation.id);
      }
    } catch (err) {
      console.error('Failed to create new conversation:', err);
    }
  };

  const handleDeleteConversation = async (id: string) => {
    try {
      await fetch(`/api/workspace/conversations/${id}`, { method: 'DELETE' });
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        const remaining = conversations.filter((c) => c.id !== id);
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
      }
    } catch (err) {
      console.error('Failed to delete conversation:', err);
    }
  };

  const handleRenameConversation = async (id: string, newTitle: string) => {
    try {
      const { ok, data } = await safeFetchJson<{ conversation: UniversalConversation }>(`/api/workspace/conversations/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: newTitle }),
      });
      if (ok && data?.conversation) {
        setConversations((prev) =>
          prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c))
        );
        if (activeId === id) {
          setActiveConversation((prev) => (prev ? { ...prev, title: newTitle } : null));
        }
      }
    } catch (err) {
      console.error('Failed to rename conversation:', err);
    }
  };

  const handleSendMessage = async (
    text: string,
    files: File[] = [],
    answers?: Record<string, string>,
    acknowledgedGapIds?: string[]
  ) => {
    let currentConvId = activeId;

    if (!text.trim() && files.length === 0 && (!answers || Object.keys(answers).length === 0) && (!acknowledgedGapIds || acknowledgedGapIds.length === 0)) {
      text = 'Proceed with available information and synthesize output.';
    }

    // If no active conversation, create one first
    if (!currentConvId) {
      try {
        const { ok, data: createData } = await safeFetchJson<{ conversation: UniversalConversation }>('/api/workspace/conversations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: text.slice(0, 35) || 'New Autonomous Task' }),
        });
        if (ok && createData?.conversation) {
          currentConvId = createData.conversation.id;
          setActiveId(currentConvId);
          setConversations((prev) => [createData.conversation, ...prev]);
        }
      } catch (err) {
        console.error('Failed to create conversation on send:', err);
        return;
      }
    }

    if (!currentConvId) return;

    setIsLoading(true);
    setLoadingStatusText(
      files.length > 0
        ? `Ingesting & parsing ${files.length} file(s) with deep document intelligence...`
        : 'Analyzing instruction, building task plan & checklist...'
    );

    // Optimistically show user message
    const optimisticUserMsg: AgentMessage = {
      id: `temp_user_${Date.now()}`,
      role: 'user',
      text,
      timestamp: new Date().toISOString(),
      attachments: files.map((f, i) => ({
        id: `temp_att_${i}`,
        name: f.name,
        size: f.size,
        mimeType: f.type,
        category: 'document',
        storagePath: '',
      })),
    };

    setActiveConversation((prev) => {
      if (!prev) return null;
      return {
        ...prev,
        messages: [...prev.messages, optimisticUserMsg],
      };
    });

    try {
      const formData = new FormData();
      formData.append('prompt', text);
      formData.append('text', text);
      files.forEach((file) => {
        formData.append('files', file);
      });
      if (answers && Object.keys(answers).length > 0) {
        formData.append('answers', JSON.stringify(answers));
      }
      if (acknowledgedGapIds && acknowledgedGapIds.length > 0) {
        formData.append('acknowledgedGapIds', JSON.stringify(acknowledgedGapIds));
      }

      const res = await fetch(`/api/workspace/conversations/${currentConvId}/messages`, {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const rawErr = await res.text().catch(() => '');
        if (rawErr.toLowerCase().includes('upstream error')) {
          setLoadingStatusText('Server is warming up, please retry in a moment...');
        }
        return;
      }

      const rawText = await res.text();
      if (!rawText || rawText.includes('upstream error')) return;
      const data = JSON.parse(rawText);
      if (data.conversation) {
        setActiveConversation(data.conversation);
        setConversations((prev) =>
          prev.map((c) => (c.id === currentConvId ? data.conversation : c))
        );
      }
    } catch (err) {
      console.error('Failed to send message:', err);
    } finally {
      setIsLoading(false);
      setLoadingStatusText('');
    }
  };

  const handleAnswerQuestions = async (answers: Record<string, string>) => {
    if (!activeId) return;
    const answerEntries = Object.entries(answers)
      .filter(([_, v]) => (v || '').trim().length > 0)
      .map(([k, v]) => `${k}: ${v}`)
      .join('\n');
    const answerPrompt = answerEntries
      ? `I have provided the requested clarifications:\n${answerEntries}`
      : 'Proceed with standard defaults for pending questions.';
    await handleSendMessage(answerPrompt, [], answers);
  };

  const handleProceedAnyway = async () => {
    if (!activeId) return;
    await handleSendMessage(
      'Proceed with available information and synthesize output. I acknowledge any remaining gaps.',
      []
    );
  };

  const handleAcknowledgeGap = async (itemId: string) => {
    if (!activeId) return;
    await handleSendMessage(
      `Acknowledged requirement gap for item "${itemId}". Proceed with standard defaults.`,
      [],
      undefined,
      [itemId]
    );
  };

  const renderAttachmentPill = (att: MessageAttachment) => {
    const formatBytes = (b: number) => {
      if (b < 1024) return `${b} B`;
      if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)} KB`;
      return `${(b / (1024 * 1024)).toFixed(1)} MB`;
    };

    const getIcon = () => {
      switch (att.category) {
        case 'image':
          return <ImageIcon className="w-3.5 h-3.5 text-purple-400" />;
        case 'video':
          return <Video className="w-3.5 h-3.5 text-rose-400" />;
        case 'audio':
          return <Music className="w-3.5 h-3.5 text-pink-400" />;
        case 'spreadsheet':
          return <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />;
        case 'code':
          return <Code className="w-3.5 h-3.5 text-amber-400" />;
        default:
          return <FileText className="w-3.5 h-3.5 text-cyan-400" />;
      }
    };

    return (
      <div
        key={att.id}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200"
      >
        {getIcon()}
        <span className="font-medium max-w-[160px] truncate">{att.name}</span>
        <span className="text-[10px] text-slate-400 font-mono">({formatBytes(att.size)})</span>
        {att.headingsCount && att.headingsCount > 0 && (
          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
            {att.headingsCount} headings
          </span>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#050713] text-slate-100 flex flex-col font-sans selection:bg-cyan-500/30">
      <Navbar />

      <main className="flex-1 flex overflow-hidden h-[calc(100vh-4.5rem)] relative">
        {/* Collapsible Left Sidebar */}
        <ConversationSidebar
          conversations={conversations}
          activeId={activeId}
          onSelect={setActiveId}
          onNewChat={handleCreateNew}
          onDelete={handleDeleteConversation}
          onRename={handleRenameConversation}
          isCollapsed={sidebarCollapsed}
          onToggleCollapse={() => setSidebarCollapsed(!sidebarCollapsed)}
        />

        {/* Main Conversation & Task Execution Viewport */}
        <section className="flex-1 flex flex-col h-full overflow-hidden bg-radial-gradient relative">
          {/* Header Bar */}
          <div className="h-14 border-b border-white/[0.08] bg-[#070b1c]/80 backdrop-blur-xl px-4 flex items-center justify-between flex-shrink-0 z-10">
            <div className="flex items-center gap-3">
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/5 transition-colors"
                  title="Expand conversation list"
                >
                  <PanelLeft className="w-4 h-4" />
                </button>
              )}
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-cyan-500 to-indigo-500 flex items-center justify-center text-white shadow-md shadow-cyan-500/20">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] text-slate-400 font-mono hidden md:inline">HumanFlow OS /</span>
                    <h2 className="text-xs font-bold text-white tracking-tight flex items-center gap-2">
                      {activeConversation?.title || 'Universal AI Agent'}
                      {activeConversation && (
                        <span className="text-[10px] font-mono px-2 py-0.2 rounded-full bg-cyan-500/10 text-cyan-300 border border-cyan-500/20">
                          Autonomous Executor
                        </span>
                      )}
                    </h2>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center gap-2">
              {/* Quick Module Jump Links */}
              <div className="hidden lg:flex items-center gap-1.5 border-r border-white/10 pr-2 mr-1">
                <Link
                  href="/?view=pipeline"
                  className="px-2.5 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1"
                >
                  <Sparkles className="w-3 h-3 text-cyan-400" />
                  <span>Pipeline</span>
                </Link>
                <Link
                  href="/intelligent"
                  className="px-2.5 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1"
                >
                  <ListTodo className="w-3 h-3 text-purple-400" />
                  <span>Intelligent</span>
                </Link>
                <Link
                  href="/documentation"
                  className="px-2.5 py-1 rounded-lg text-[11px] text-slate-300 hover:text-white hover:bg-white/5 transition-colors flex items-center gap-1"
                >
                  <FileText className="w-3 h-3 text-blue-400" />
                  <span>Legal</span>
                </Link>
              </div>

              <button
                onClick={handleCreateNew}
                className="flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>New Task</span>
              </button>
            </div>
          </div>

          {/* Messages Feed */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6 custom-scrollbar">
            {(!activeConversation || activeConversation.messages.length === 0) && (
              /* Welcome / Empty State Screen */
              <div className="max-w-3xl mx-auto py-10 space-y-8 animate-in fade-in duration-300">
                <div className="text-center space-y-3">
                  <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Claude-Inspired Autonomous Agent & Multimodal Intelligence</span>
                  </div>
                  <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
                    Universal AI Agent Workspace
                  </h1>
                  <p className="text-sm text-slate-400 max-w-xl mx-auto leading-relaxed">
                    Give natural-language instructions, attach multimodal files (+), and let the AI build dynamic checklists, ask targeted clarifying questions, execute real tools, and verify outputs.
                  </p>
                </div>

                {/* Quick Starters Cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-4">
                  <button
                    onClick={() =>
                      handleSendMessage(
                        'Read KING 99.pdf and analyze its full document structure, heading hierarchy, and key facts.'
                      )
                    }
                    className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-cyan-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FileText className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-cyan-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-cyan-300">
                      Document Intelligence & Extraction
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Extract text structure, analyze headings, freeze citations, and synthesize clean copy.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'Complete my CV and calculate quantifiable metrics for a Senior Cloud Architect position.'
                      )
                    }
                    className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-purple-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Layers className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-purple-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-purple-300">
                      CV & Professional Deliverables
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Identify gaps, ask clarifying questions, and generate an executive-formatted CV.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'Analyze this dataset or spreadsheet, identify anomalies, and summarize statistical insights.'
                      )
                    }
                    className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-emerald-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <FileSpreadsheet className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-emerald-300">
                      Spreadsheet & Data Analysis
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Compute totals, format structured tables, and deliver CSV or JSON output.
                    </p>
                  </button>

                  <button
                    onClick={() =>
                      handleSendMessage(
                        'Create a comprehensive technical architecture specification for an enterprise AI workspace.'
                      )
                    }
                    className="p-4 rounded-2xl bg-white/[0.02] hover:bg-white/[0.05] border border-white/10 hover:border-amber-500/40 text-left transition-all group"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                        <Code className="w-4 h-4" />
                      </div>
                      <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-0.5 transition-all" />
                    </div>
                    <h3 className="text-xs font-bold text-slate-200 group-hover:text-amber-300">
                      Code & Technical Specifications
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Generate verified TypeScript, API schemas, and component architecture.
                    </p>
                  </button>
                </div>
              </div>
            )}

            {/* Render Conversation Messages */}
            {activeConversation?.messages.map((message) => (
              <div
                key={message.id}
                className={`max-w-4xl mx-auto flex gap-3 ${
                  message.role === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {/* Assistant Avatar */}
                {message.role === 'assistant' && (
                  <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 mt-1">
                    <Bot className="w-4 h-4" />
                  </div>
                )}

                {/* Message Bubble & Embedded Widgets */}
                <div
                  className={`space-y-3 ${
                    message.role === 'user'
                      ? 'max-w-2xl bg-gradient-to-r from-indigo-900/40 to-cyan-900/40 border border-cyan-500/30 rounded-2xl p-4 text-slate-100 shadow-xl'
                      : 'flex-1 max-w-3xl'
                  }`}
                >
                  {/* Attachments if any */}
                  {message.attachments && message.attachments.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-2">
                      {message.attachments.map(renderAttachmentPill)}
                    </div>
                  )}

                  {/* Main text message */}
                  {message.text && (
                    <div className="text-xs leading-relaxed text-slate-200 whitespace-pre-wrap">
                      {message.text}
                    </div>
                  )}

                  {/* Assistant Embedded Task Plan */}
                  {message.taskPlan && <TaskPlanWidget plan={message.taskPlan} />}

                  {/* Assistant Embedded Requirements Checklist */}
                  {message.checklist && message.checklist.length > 0 && (
                    <ChecklistWidget
                      checklist={message.checklist}
                      onAcknowledgeGap={handleAcknowledgeGap}
                    />
                  )}

                  {/* Assistant Targeted Clarifying Questions */}
                  {message.questions && message.questions.length > 0 && (
                    <QuestionFormWidget
                      questions={message.questions}
                      onSubmitAnswers={handleAnswerQuestions}
                      onProceedAnyway={handleProceedAnyway}
                      isSubmitting={isLoading}
                    />
                  )}

                  {/* Assistant Synthesized Deliverable Artifact */}
                  {message.artifact && (
                    <ArtifactWidget
                      artifact={message.artifact}
                      verificationReport={message.verificationReport}
                      conversationId={activeConversation.id}
                    />
                  )}
                </div>

                {/* User Avatar */}
                {message.role === 'user' && (
                  <div className="w-8 h-8 rounded-xl bg-indigo-500/20 border border-indigo-500/40 flex items-center justify-center text-indigo-300 flex-shrink-0 mt-1">
                    <User className="w-4 h-4" />
                  </div>
                )}
              </div>
            ))}

            {/* Loading / Execution Status Indicator */}
            {isLoading && (
              <div className="max-w-4xl mx-auto flex gap-3 items-center">
                <div className="w-8 h-8 rounded-xl bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 flex-shrink-0 animate-pulse">
                  <Bot className="w-4 h-4" />
                </div>
                <div className="flex items-center gap-2.5 px-4 py-2.5 rounded-2xl bg-white/[0.03] border border-cyan-500/30 text-xs text-cyan-300">
                  <div className="w-3.5 h-3.5 border-2 border-cyan-400/40 border-t-cyan-400 rounded-full animate-spin" />
                  <span>{loadingStatusText || 'Autonomous agent executing task...'}</span>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>

          {/* Composer Area at Bottom */}
          <div className="p-4 bg-gradient-to-t from-[#050713] via-[#050713]/90 to-transparent flex-shrink-0">
            <div className="max-w-4xl mx-auto">
              <Composer
                onSendMessage={handleSendMessage}
                isLoading={isLoading}
                onStopGeneration={() => setIsLoading(false)}
                placeholder="Give any task, ask a question, or attach files with (+) button..."
              />
            </div>
          </div>
        </section>
      </main>
    </div>
  );
}
