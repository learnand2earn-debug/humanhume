'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  ArrowUp,
  Paperclip,
  Image as ImageIcon,
  FileText,
  Globe,
  Brain,
  Wrench,
  Plus,
  Mic,
  MicOff,
  X,
  Sparkles,
  StopCircle,
} from 'lucide-react';
import { OmniToolMode, OmniAttachment } from '@/lib/omni/types';

interface OmniComposerProps {
  onSendMessage: (prompt: string, mode: OmniToolMode, attachments: OmniAttachment[]) => void;
  isLoading: boolean;
  onStop?: () => void;
  initialMode?: OmniToolMode;
}

export default function OmniComposer({
  onSendMessage,
  isLoading,
  onStop,
  initialMode = 'auto',
}: OmniComposerProps) {
  const [prompt, setPrompt] = useState('');
  const [mode, setMode] = useState<OmniToolMode>(initialMode);
  const [attachments, setAttachments] = useState<OmniAttachment[]>([]);
  const [isRecording, setIsRecording] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Update mode if initialMode prop changes
  useEffect(() => {
    setMode(initialMode);
  }, [initialMode]);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [prompt]);

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!prompt.trim() && attachments.length === 0) || isLoading) return;
    onSendMessage(prompt.trim(), mode, attachments);
    setPrompt('');
    setAttachments([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // File Upload Handler
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      const isImg = file.type.startsWith('image/');

      const reader = new FileReader();
      if (isImg) {
        reader.onload = (event) => {
          setAttachments((prev) => [
            ...prev,
            {
              id: `att_${Date.now()}_${i}`,
              name: file.name,
              size: file.size,
              type: 'image',
              content: event.target?.result as string,
              url: event.target?.result as string,
            },
          ]);
        };
        reader.readAsDataURL(file);
      } else {
        reader.onload = (event) => {
          setAttachments((prev) => [
            ...prev,
            {
              id: `att_${Date.now()}_${i}`,
              name: file.name,
              size: file.size,
              type: file.name.endsWith('.docx') ? 'document' : 'code',
              content: event.target?.result as string,
            },
          ]);
        };
        reader.readAsText(file);
      }
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((a) => a.id !== id));
  };

  // Speech Recognition (Dictation)
  const handleToggleVoice = () => {
    if (typeof window === 'undefined') return;

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert('Speech recognition is not supported in this browser. Please use Chrome or Edge.');
      return;
    }

    if (isRecording) {
      setIsRecording(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'en-US';
      recognition.interimResults = false;
      recognition.continuous = false;

      recognition.onstart = () => setIsRecording(true);
      recognition.onend = () => setIsRecording(false);
      recognition.onerror = () => setIsRecording(false);

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        setPrompt((prev) => (prev ? `${prev} ${transcript}` : transcript));
      };

      recognition.start();
    } catch {
      setIsRecording(false);
    }
  };

  const getPlaceholder = () => {
    switch (mode) {
      case 'image':
        return 'Describe the image or artwork you want to generate (e.g. Cyberpunk Tokyo street at night, 4K)...';
      case 'create_file':
        return 'Describe the file to create (e.g. Create an Excel sales forecast, or Word consulting agreement)...';
      case 'fix_file':
        return 'Paste broken code or attach a file to analyze, debug, and fix all errors...';
      case 'web_search':
        return 'Search the live web for verified facts, documentation, or news...';
      case 'deep_think':
        return 'Ask a complex reasoning or architectural question for deep step-by-step thinking...';
      default:
        return 'Message OmniFlow... (Ask anything, request a file, generate images, or fix code)';
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto px-4 sm:px-6 pb-4">
      {/* Container Box */}
      <div className="relative rounded-3xl bg-[#0c1226]/90 border border-slate-800 shadow-2xl backdrop-blur-2xl p-3 sm:p-4 focus-within:border-cyan-500/50 transition-all">
        {/* Attachments Pills */}
        {attachments.length > 0 && (
          <div className="flex flex-wrap gap-2 pb-3 mb-2 border-b border-slate-800/80">
            {attachments.map((att) => (
              <div
                key={att.id}
                className="flex items-center gap-2 pl-3 pr-2 py-1.5 rounded-xl bg-[#141b36] border border-slate-700 text-xs text-slate-200"
              >
                {att.type === 'image' ? (
                  <ImageIcon className="w-3.5 h-3.5 text-cyan-400" />
                ) : (
                  <FileText className="w-3.5 h-3.5 text-indigo-400" />
                )}
                <span className="font-medium truncate max-w-[160px]">{att.name}</span>
                <button
                  onClick={() => removeAttachment(att.id)}
                  className="p-1 hover:bg-slate-700 rounded-lg text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Text Input */}
        <textarea
          ref={textareaRef}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={getPlaceholder()}
          rows={1}
          className="w-full bg-transparent text-slate-100 placeholder-slate-500 text-sm sm:text-base resize-none focus:outline-none min-h-[44px] max-h-[200px] leading-relaxed"
        />

        {/* Bottom Bar: Quick Mode Pills & Action Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-2 pt-2 mt-1">
          {/* Quick Mode Switcher */}
          <div className="flex flex-wrap items-center gap-1.5">
            {/* Attachment Button */}
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              multiple
              className="hidden"
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              title="Attach files (Code, Images, Documents, Spreadsheets)"
              className="p-2 rounded-xl bg-[#121832] hover:bg-slate-800 text-slate-400 hover:text-white border border-slate-800 transition-colors"
            >
              <Paperclip className="w-4 h-4" />
            </button>

            {/* Mode: Image Gen */}
            <button
              onClick={() => setMode(mode === 'image' ? 'auto' : 'image')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                mode === 'image'
                  ? 'bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-sm'
                  : 'bg-[#121832] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <ImageIcon className="w-3.5 h-3.5" />
              <span>Image Gen</span>
            </button>

            {/* Mode: Create File */}
            <button
              onClick={() => setMode(mode === 'create_file' ? 'auto' : 'create_file')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                mode === 'create_file'
                  ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 shadow-sm'
                  : 'bg-[#121832] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Create File</span>
            </button>

            {/* Mode: Fix File */}
            <button
              onClick={() => setMode(mode === 'fix_file' ? 'auto' : 'fix_file')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                mode === 'fix_file'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 shadow-sm'
                  : 'bg-[#121832] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Wrench className="w-3.5 h-3.5" />
              <span>Fix File</span>
            </button>

            {/* Mode: Humanize */}
            <button
              onClick={() => {
                setPrompt((p) => p ? `Humanize: ${p}` : 'Humanize: ');
              }}
              className="px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 bg-[#121832] text-slate-400 hover:text-cyan-300 border border-slate-800 hover:border-cyan-500/30 transition-all"
              title="Autonomous Document Humanizer (<4% AI score)"
            >
              <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
              <span>Humanize</span>
            </button>

            {/* Mode: Deep Think */}
            <button
              onClick={() => setMode(mode === 'deep_think' ? 'auto' : 'deep_think')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all ${
                mode === 'deep_think'
                  ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40 shadow-sm'
                  : 'bg-[#121832] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Brain className="w-3.5 h-3.5" />
              <span>Reasoning</span>
            </button>

            {/* Mode: Web Search */}
            <button
              onClick={() => setMode(mode === 'web_search' ? 'auto' : 'web_search')}
              className={`px-3 py-1.5 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all hidden sm:flex ${
                mode === 'web_search'
                  ? 'bg-blue-500/20 text-blue-300 border border-blue-500/40 shadow-sm'
                  : 'bg-[#121832] text-slate-400 hover:text-slate-200 border border-slate-800'
              }`}
            >
              <Globe className="w-3.5 h-3.5" />
              <span>Search</span>
            </button>
          </div>

          {/* Right Action Controls: Voice + Send / Stop */}
          <div className="flex items-center gap-2">
            <button
              onClick={handleToggleVoice}
              title={isRecording ? 'Stop Recording' : 'Voice Input'}
              className={`p-2.5 rounded-2xl border transition-colors ${
                isRecording
                  ? 'bg-red-500/20 text-red-400 border-red-500/40 animate-pulse'
                  : 'bg-[#121832] hover:bg-slate-800 text-slate-400 hover:text-white border-slate-800'
              }`}
            >
              {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
            </button>

            {isLoading ? (
              <button
                onClick={onStop}
                title="Stop generation"
                className="p-2.5 rounded-2xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/40 shadow-lg transition-all"
              >
                <StopCircle className="w-4 h-4" />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={!prompt.trim() && attachments.length === 0}
                className="p-2.5 rounded-2xl bg-gradient-to-tr from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-indigo-500 text-white disabled:opacity-30 disabled:cursor-not-allowed shadow-lg shadow-cyan-500/25 transition-all duration-300"
              >
                <ArrowUp className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>

      <p className="text-[11px] text-center text-slate-500 mt-2 font-mono">
        OmniFlow AI • Can create native files (.docx, .xlsx, .pdf), fix code, and generate images. Verify critical outputs.
      </p>
    </div>
  );
}
