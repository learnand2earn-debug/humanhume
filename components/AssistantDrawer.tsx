'use client';

import React, {useState} from 'react';
import {Bot, MessageSquare, Send, ShieldAlert, Sparkles, X} from 'lucide-react';
import {AnimatePresence, motion} from 'motion/react';
import {parseResponseJsonSafely} from '@/lib/safe-json';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  action?: {
    type: 'NAVIGATE_STUDIO' | 'NAVIGATE_UPLOAD' | 'NAVIGATE_ADMIN' | 'SELECT_DOC_TYPE';
    payload?: string;
    label: string;
  };
  timestamp: string;
}

interface AssistantDrawerProps {
  onNavigateTab: (tab: 'workspace' | 'studio' | 'admin', studioDocTypeId?: string) => void;
}

export default function AssistantDrawer({onNavigateTab}: AssistantDrawerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      id: 'welcome-1',
      role: 'assistant',
      content:
        'Hello! I am **HumanFlow Assistant**. I monitor your live document humanization queue, preservation checks, and approved Legal Knowledge Base. Ask me about your active file or trigger a document draft.',
      timestamp: 'Just now',
    },
  ]);

  const msgCounterRef = React.useRef(1);

  const sendMessage = async (textToSend: string) => {
    const clean = textToSend.trim();
    if (!clean) return;

    msgCounterRef.current += 1;
    const userMsg: ChatTurn = {
      id: `u-${msgCounterRef.current}`,
      role: 'user',
      content: clean,
      timestamp: 'Just now',
    };

    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({message: clean}),
      });
      const {data} = await parseResponseJsonSafely<{
        reply?: string;
        suggestedAction?: ChatTurn['action'];
      }>(res, {});

      msgCounterRef.current += 1;
      const botMsg: ChatTurn = {
        id: `b-${msgCounterRef.current}`,
        role: 'assistant',
        content: data.reply || 'Your document is safe and original files remain untouched.',
        action: data.suggestedAction,
        timestamp: 'Just now',
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch {
      msgCounterRef.current += 1;
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${msgCounterRef.current}`,
          role: 'assistant',
          content: 'Unable to reach status service right now. Your original documents remain safely stored.',
          timestamp: 'Now',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const quickCommands = [
    'What is happening with my file?',
    'Create a website development agreement.',
    'Draft an NDA.',
    'Create a privacy policy.',
    'Show legal warnings.',
    'Explain this clause.',
  ];

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 z-40 flex items-center gap-2.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2.5 rounded-xl shadow-lg transition-all text-xs font-medium whitespace-nowrap"
      >
        <MessageSquare className="w-4 h-4" />
        <span>HumanFlow Assistant</span>
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{opacity: 0, y: 16, scale: 0.98}}
            animate={{opacity: 1, y: 0, scale: 1}}
            exit={{opacity: 0, y: 16, scale: 0.98}}
            transition={{duration: 0.16}}
            className="fixed bottom-6 right-6 z-50 w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[600px]"
          >
            {/* Header */}
            <div className="px-4 py-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-7 h-7 rounded-lg bg-indigo-600/20 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-semibold text-slate-100">HumanFlow Assistant</h4>
                  <p className="text-[11px] text-slate-400">
                    Grounded in Live Pipeline & Approved Knowledge Base
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsOpen(false)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
                aria-label="Close assistant"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Legal Information vs Advice Safety Banner */}
            <div className="px-4 py-2 bg-slate-950/70 border-b border-slate-800/80 flex items-center gap-2 text-[11px] text-slate-400">
              <ShieldAlert className="w-3.5 h-3.5 text-amber-400 shrink-0" />
              <span>
                Provides system status & approved legal information (not formal legal representation).
              </span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 min-h-[280px] max-h-[340px]">
              {messages.map((m) => (
                <div
                  key={m.id}
                  className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-xl px-3.5 py-2.5 text-xs leading-relaxed ${
                      m.role === 'user'
                        ? 'bg-indigo-600 text-white'
                        : 'bg-slate-950 border border-slate-800 text-slate-200'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                    {m.action && (
                      <button
                        onClick={() => {
                          if (m.action?.type === 'SELECT_DOC_TYPE') {
                            onNavigateTab('studio', m.action.payload);
                            setIsOpen(false);
                          } else if (m.action?.type === 'NAVIGATE_ADMIN') {
                            onNavigateTab('admin');
                            setIsOpen(false);
                          } else if (m.action?.type === 'NAVIGATE_UPLOAD') {
                            onNavigateTab('workspace');
                            setIsOpen(false);
                          }
                        }}
                        className="mt-2.5 w-full px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
                      >
                        <Sparkles className="w-3.5 h-3.5" />
                        {m.action.label}
                      </button>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-500 mt-1 px-1">{m.timestamp}</span>
                </div>
              ))}
              {isLoading && (
                <div className="text-xs text-slate-400 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2.5 w-fit">
                  Inspecting live system state...
                </div>
              )}
            </div>

            {/* Quick Commands */}
            <div className="px-4 py-2 border-t border-slate-800 bg-slate-950/60 flex items-center gap-1.5 overflow-x-auto">
              {quickCommands.map((cmd) => (
                <button
                  key={cmd}
                  onClick={() => sendMessage(cmd)}
                  className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-md text-[11px] whitespace-nowrap shrink-0 transition-colors"
                >
                  {cmd}
                </button>
              ))}
            </div>

            {/* Input */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                sendMessage(input);
              }}
              className="p-3 bg-slate-950 border-t border-slate-800 flex items-center gap-2"
            >
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ask about your file or say 'Draft an NDA'..."
                className="flex-1 bg-slate-900 border border-slate-800 rounded-lg px-3 py-2 text-xs text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-indigo-500"
              />
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="px-3 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-xs font-medium transition-colors"
                aria-label="Send message"
              >
                <Send className="w-3.5 h-3.5" />
              </button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
