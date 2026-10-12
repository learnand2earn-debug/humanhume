'use client';

import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  Send,
  Sparkles,
  Bot,
  Loader2,
  Zap,
} from 'lucide-react';

interface AnimatedChatbotProps {
  activeDocumentId?: string;
}

export default function AnimatedChatbot({ activeDocumentId }: AnimatedChatbotProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Array<{ sender: 'user' | 'assistant'; text: string }>>([
    {
      sender: 'assistant',
      text: 'Hello! I am your HumanFlow Assistant. Ask me anything about your document status, preservation guard, supported formats, or API setup.',
    },
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleSend = async (messageToSend?: string) => {
    const text = (messageToSend || inputValue).trim();
    if (!text || isTyping) return;

    setMessages((prev) => [...prev, { sender: 'user', text }]);
    if (!messageToSend) setInputValue('');
    setIsTyping(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: text,
          activeDocumentId,
        }),
      });

      const data = await res.json();
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: data.reply || 'System is online and running normally.',
        },
      ]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          sender: 'assistant',
          text: 'Unable to reach assistant engine. Please verify system connectivity.',
        },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const quickQuestions = [
    'What is happening with my file?',
    'What files are supported?',
    'How does preservation work?',
    'How do I configure API keys?',
  ];

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Floating Toggle Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          id="chatbot-toggle-button"
          className="relative group p-4 rounded-3xl glow-btn text-white shadow-2xl hover:scale-105 active:scale-95 transition-all duration-300 flex items-center gap-3"
          aria-label="Open HumanFlow Assistant"
        >
          <div className="relative">
            <Bot className="w-6 h-6 text-white group-hover:rotate-12 transition-transform" />
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-cyan-300 border-2 border-slate-900 animate-ping" />
          </div>
          <span className="font-display font-bold text-sm hidden sm:inline tracking-tight pr-1">
            HumanFlow Assistant
          </span>
        </button>
      )}

      {/* Expanded Chat Window */}
      {isOpen && (
        <div
          id="chatbot-window"
          className="w-[92vw] sm:w-[410px] h-[540px] glass-panel-glow rounded-3xl flex flex-col shadow-2xl border border-indigo-500/40 overflow-hidden animate-in fade-in zoom-in-95 duration-200"
        >
          {/* Header */}
          <div className="p-4 bg-slate-950/85 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-400 via-indigo-500 to-purple-500 flex items-center justify-center p-[1px] shadow-md shadow-indigo-500/30">
                <div className="w-full h-full bg-[#080d1e] rounded-[15px] flex items-center justify-center">
                  <Bot className="w-5 h-5 text-cyan-400" />
                </div>
              </div>
              <div>
                <h4 className="font-display font-bold text-sm text-white flex items-center gap-2">
                  HumanFlow Assistant
                  <span className="w-2 h-2 rounded-full bg-emerald-400 inline-block animate-pulse" />
                </h4>
                <p className="text-[11px] text-slate-400 font-medium">Autonomous Telemetry & Guide</p>
              </div>
            </div>

            <button
              onClick={() => setIsOpen(false)}
              id="chatbot-close-button"
              className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages Body */}
          <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-950/50 text-xs">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`flex gap-2.5 ${m.sender === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {m.sender === 'assistant' && (
                  <div className="w-7 h-7 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center shrink-0 border border-indigo-500/30 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5" />
                  </div>
                )}
                <div
                  className={`p-3.5 rounded-2xl max-w-[84%] leading-relaxed ${
                    m.sender === 'user'
                      ? 'bg-gradient-to-r from-indigo-600 to-cyan-600 text-white rounded-tr-none shadow-md shadow-indigo-500/20 font-medium'
                      : 'bg-slate-900/90 text-slate-200 border border-white/10 rounded-tl-none shadow-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{m.text}</p>
                </div>
              </div>
            ))}

            {isTyping && (
              <div className="flex items-center gap-2.5 text-slate-400 text-xs pl-9">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span className="font-mono">Checking live system status...</span>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Quick Prompts */}
          <div className="p-2.5 bg-slate-950/80 border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
            {quickQuestions.map((q, idx) => (
              <button
                key={idx}
                onClick={() => handleSend(q)}
                className="whitespace-nowrap px-3 py-1.5 rounded-full text-[11px] bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors shrink-0 font-medium hover:text-white"
              >
                {q}
              </button>
            ))}
          </div>

          {/* Input Box */}
          <div className="p-3 bg-slate-950/95 border-t border-white/10 flex items-center gap-2">
            <input
              type="text"
              id="chatbot-input-field"
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSend()}
              placeholder="Ask about your document status..."
              className="flex-1 bg-slate-900 border border-white/10 rounded-2xl px-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-cyan-400/50"
            />
            <button
              onClick={() => handleSend()}
              disabled={!inputValue.trim() || isTyping}
              id="chatbot-send-button"
              className="glow-btn p-2.5 rounded-2xl text-white hover:opacity-90 disabled:opacity-40 transition-opacity"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
