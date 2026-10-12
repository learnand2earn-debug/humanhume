'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Plus,
  Send,
  Square,
  FileText,
  Image as ImageIcon,
  Video,
  Music,
  Code,
  FileSpreadsheet,
  X,
  UploadCloud,
  Paperclip,
} from 'lucide-react';

export interface PendingFile {
  file: File;
  id: string;
  name: string;
  size: number;
  type: string;
  category: 'document' | 'image' | 'video' | 'audio' | 'spreadsheet' | 'code' | 'other';
  previewUrl?: string;
}

interface ComposerProps {
  onSendMessage: (text: string, files: File[]) => void;
  isLoading: boolean;
  onStopGeneration?: () => void;
  placeholder?: string;
}

export default function Composer({
  onSendMessage,
  isLoading,
  onStopGeneration,
  placeholder = 'Ask anything, give instructions, or attach documents...',
}: ComposerProps) {
  const [text, setText] = useState('');
  const [pendingFiles, setPendingFiles] = useState<PendingFile[]>([]);
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const plusMenuRef = useRef<HTMLDivElement>(null);

  // Hidden inputs for specific categories
  const fileInputDocRef = useRef<HTMLInputElement>(null);
  const fileInputImageRef = useRef<HTMLInputElement>(null);
  const fileInputVideoRef = useRef<HTMLInputElement>(null);
  const fileInputAudioRef = useRef<HTMLInputElement>(null);
  const fileInputGeneralRef = useRef<HTMLInputElement>(null);

  // Adjust textarea height dynamically
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 200)}px`;
    }
  }, [text]);

  // Click outside to close plus menu
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (plusMenuRef.current && !plusMenuRef.current.contains(event.target as Node)) {
        setShowPlusMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const categorizeFile = (file: File): PendingFile['category'] => {
    const ext = file.name.split('.').pop()?.toLowerCase() || '';
    if (['jpg', 'jpeg', 'png', 'webp', 'gif', 'bmp', 'svg'].includes(ext)) return 'image';
    if (['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext)) return 'video';
    if (['mp3', 'wav', 'm4a', 'ogg', 'aac'].includes(ext)) return 'audio';
    if (['csv', 'xlsx', 'xls', 'tsv'].includes(ext)) return 'spreadsheet';
    if (['js', 'ts', 'jsx', 'tsx', 'py', 'json', 'html', 'css', 'go', 'rs', 'java', 'c', 'cpp'].includes(ext)) return 'code';
    if (['pdf', 'docx', 'doc', 'txt', 'rtf', 'md', 'pptx'].includes(ext)) return 'document';
    return 'other';
  };

  const handleAddFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return;
    const newFiles: PendingFile[] = [];

    Array.from(fileList).forEach((file) => {
      const category = categorizeFile(file);
      let previewUrl: string | undefined = undefined;
      if (category === 'image') {
        previewUrl = URL.createObjectURL(file);
      }
      newFiles.push({
        file,
        id: `pf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
        name: file.name,
        size: file.size,
        type: file.type,
        category,
        previewUrl,
      });
    });

    setPendingFiles((prev) => [...prev, ...newFiles]);
    setShowPlusMenu(false);
  };

  const removeFile = (id: string) => {
    setPendingFiles((prev) => {
      const item = prev.find((f) => f.id === id);
      if (item?.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
      return prev.filter((f) => f.id !== id);
    });
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit();
    }
  };

  const handleSubmit = () => {
    if ((!text.trim() && pendingFiles.length === 0) || isLoading) return;
    const filesToSubmit = pendingFiles.map((p) => p.file);
    onSendMessage(text, filesToSubmit);
    setText('');
    setPendingFiles([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Drag & drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files) {
      handleAddFiles(e.dataTransfer.files);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  return (
    <div
      className={`relative w-full rounded-2xl bg-[#090d20]/95 border transition-all duration-200 shadow-2xl backdrop-blur-2xl ${
        isDragOver
          ? 'border-cyan-400 ring-2 ring-cyan-400/30 bg-cyan-950/20'
          : 'border-white/10 hover:border-white/20 focus-within:border-cyan-500/50 focus-within:ring-1 focus-within:ring-cyan-500/50'
      }`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Hidden native file inputs */}
      <input
        type="file"
        ref={fileInputDocRef}
        className="hidden"
        multiple
        accept=".pdf,.doc,.docx,.txt,.md,.rtf,.html,.csv,.xlsx,.pptx,.json"
        onChange={(e) => handleAddFiles(e.target.files)}
      />
      <input
        type="file"
        ref={fileInputImageRef}
        className="hidden"
        multiple
        accept="image/*"
        onChange={(e) => handleAddFiles(e.target.files)}
      />
      <input
        type="file"
        ref={fileInputVideoRef}
        className="hidden"
        multiple
        accept="video/*"
        onChange={(e) => handleAddFiles(e.target.files)}
      />
      <input
        type="file"
        ref={fileInputAudioRef}
        className="hidden"
        multiple
        accept="audio/*"
        onChange={(e) => handleAddFiles(e.target.files)}
      />
      <input
        type="file"
        ref={fileInputGeneralRef}
        className="hidden"
        multiple
        onChange={(e) => handleAddFiles(e.target.files)}
      />

      {/* Attachment Previews Area */}
      {pendingFiles.length > 0 && (
        <div className="flex flex-wrap gap-2 p-3 pb-0 border-b border-white/5">
          {pendingFiles.map((pf) => (
            <div
              key={pf.id}
              className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs text-slate-200 group relative"
            >
              {pf.category === 'image' && pf.previewUrl ? (
                <img
                  src={pf.previewUrl}
                  alt={pf.name}
                  className="w-5 h-5 rounded object-cover"
                />
              ) : pf.category === 'video' ? (
                <Video className="w-4 h-4 text-purple-400" />
              ) : pf.category === 'audio' ? (
                <Music className="w-4 h-4 text-pink-400" />
              ) : pf.category === 'spreadsheet' ? (
                <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
              ) : pf.category === 'code' ? (
                <Code className="w-4 h-4 text-amber-400" />
              ) : (
                <FileText className="w-4 h-4 text-cyan-400" />
              )}

              <div className="flex flex-col">
                <span className="font-medium max-w-[150px] truncate text-slate-200">
                  {pf.name}
                </span>
                <span className="text-[10px] text-slate-500">{formatFileSize(pf.size)}</span>
              </div>

              <button
                type="button"
                onClick={() => removeFile(pf.id)}
                className="text-slate-400 hover:text-rose-400 p-0.5 rounded transition-colors ml-1"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Main Composer Row */}
      <div className="flex items-end gap-2 p-3">
        {/* Plus Button with Menu */}
        <div className="relative" ref={plusMenuRef}>
          <button
            type="button"
            onClick={() => setShowPlusMenu(!showPlusMenu)}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              showPlusMenu
                ? 'bg-cyan-500 text-black rotate-45'
                : 'bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10'
            }`}
            title="Attach files, media, or documents"
          >
            <Plus className="w-5 h-5 transition-transform" />
          </button>

          {/* Plus Popover Menu */}
          {showPlusMenu && (
            <div className="absolute bottom-12 left-0 w-64 bg-[#0d142d] border border-cyan-500/30 rounded-2xl p-2 shadow-2xl backdrop-blur-2xl z-50 space-y-1 animate-in fade-in slide-in-from-bottom-2 duration-150">
              <div className="px-2 py-1.5 text-[10px] font-mono uppercase tracking-wider text-slate-400 font-bold border-b border-white/5">
                Multimodal Input Intake
              </div>

              <button
                type="button"
                onClick={() => {
                  fileInputDocRef.current?.click();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-cyan-500/10 hover:text-cyan-300 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center">
                  <FileText className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold">Documents & PDFs</div>
                  <div className="text-[10px] text-slate-500">PDF, Word, TXT, MD, PPTX</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  fileInputImageRef.current?.click();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-purple-500/10 hover:text-purple-300 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-purple-500/20 text-purple-400 flex items-center justify-center">
                  <ImageIcon className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold">Photos & Images</div>
                  <div className="text-[10px] text-slate-500">PNG, JPG, WEBP, SVG</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  fileInputVideoRef.current?.click();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-rose-500/10 hover:text-rose-300 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
                  <Video className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold">Video Files</div>
                  <div className="text-[10px] text-slate-500">MP4, MOV, WEBM</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  fileInputAudioRef.current?.click();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-pink-500/10 hover:text-pink-300 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center">
                  <Music className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold">Audio & Recordings</div>
                  <div className="text-[10px] text-slate-500">MP3, WAV, M4A</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => {
                  fileInputGeneralRef.current?.click();
                }}
                className="w-full flex items-center gap-3 px-3 py-2 rounded-xl text-xs text-slate-200 hover:bg-indigo-500/10 hover:text-indigo-300 transition-colors text-left"
              >
                <div className="w-6 h-6 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                  <UploadCloud className="w-3.5 h-3.5" />
                </div>
                <div>
                  <div className="font-semibold">All Files / Spreadsheets</div>
                  <div className="text-[10px] text-slate-500">CSV, XLSX, Code, Data</div>
                </div>
              </button>
            </div>
          )}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          rows={1}
          className="flex-1 max-h-48 min-h-[38px] bg-transparent text-sm text-slate-100 placeholder-slate-500 focus:outline-none resize-none px-2 py-2 leading-relaxed"
        />

        {/* Send / Stop Button */}
        {isLoading ? (
          <button
            type="button"
            onClick={onStopGeneration}
            className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-300 hover:bg-rose-500/30 border border-rose-500/40 flex items-center justify-center transition-colors"
            title="Stop generation"
          >
            <Square className="w-4 h-4 fill-rose-300" />
          </button>
        ) : (
          <button
            type="button"
            onClick={handleSubmit}
            disabled={!text.trim() && pendingFiles.length === 0}
            className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${
              text.trim() || pendingFiles.length > 0
                ? 'bg-gradient-to-r from-cyan-500 to-indigo-500 text-white shadow-lg shadow-cyan-500/20 hover:scale-105 active:scale-95'
                : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'
            }`}
            title="Send message (Enter)"
          >
            <Send className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Drag & drop overlay hint */}
      {isDragOver && (
        <div className="absolute inset-0 rounded-2xl bg-cyan-950/80 border-2 border-dashed border-cyan-400 flex items-center justify-center pointer-events-none z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2 text-cyan-300 font-semibold text-sm">
            <UploadCloud className="w-5 h-5 animate-bounce" />
            <span>Drop files here to attach</span>
          </div>
        </div>
      )}
    </div>
  );
}
