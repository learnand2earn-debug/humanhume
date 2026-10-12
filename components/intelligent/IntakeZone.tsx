'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  FileText,
  FileSpreadsheet,
  Image as ImageIcon,
  Video,
  Music,
  Code2,
  AlertTriangle,
  CheckCircle2,
  Trash2,
  Layers,
  Sparkles,
} from 'lucide-react';
import { UploadedIntakeFile, FileContradiction } from '@/lib/intelligent/types';

interface IntakeZoneProps {
  onStartSession: (prompt: string, files: File[]) => void;
  isLoading: boolean;
  existingFiles?: UploadedIntakeFile[];
  contradictions?: FileContradiction[];
}

const SUPPORTED_BADGES = [
  { ext: 'PDF / DOCX', desc: 'Documents', icon: FileText, color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' },
  { ext: 'XLSX / CSV', desc: 'Spreadsheets', icon: FileSpreadsheet, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
  { ext: 'PNG / JPG', desc: 'Visual Assets', icon: ImageIcon, color: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/20' },
  { ext: 'MP4 / MOV', desc: 'Video Streams', icon: Video, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
  { ext: 'MP3 / WAV', desc: 'Audio Speech', icon: Music, color: 'text-amber-400 bg-amber-500/10 border-amber-500/20' },
  { ext: 'TS / PY / JS', desc: 'Source Code', icon: Code2, color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' },
];

export default function IntakeZone({
  onStartSession,
  isLoading,
  existingFiles = [],
  contradictions = [],
}: IntakeZoneProps) {
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [prompt, setPrompt] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      addFiles(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      addFiles(Array.from(e.target.files));
    }
  };

  const addFiles = (newFiles: File[]) => {
    setSelectedFiles((prev) => {
      const existingNames = new Set(prev.map((f) => f.name));
      const fresh = newFiles.filter((f) => !existingNames.has(f.name));
      return [...prev, ...fresh];
    });
  };

  const removeFile = (idx: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedFiles.length === 0 && !prompt.trim()) return;
    onStartSession(prompt, selectedFiles);
  };

  return (
    <div className="w-full bg-[#0a1024]/80 border border-white/10 rounded-2xl p-6 backdrop-blur-xl shadow-2xl">
      {/* Contradiction Alert Banner if files conflict */}
      {contradictions.length > 0 && (
        <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200">
          <div className="flex items-center gap-2 mb-2 font-bold text-sm">
            <AlertTriangle className="w-5 h-5 text-amber-400" />
            <span>Cross-File Data Discrepancy Detected ({contradictions.length})</span>
          </div>
          <div className="space-y-1.5 text-xs text-amber-300/90 pl-7">
            {contradictions.map((c) => (
              <p key={c.id}>
                • <strong className="text-white">{c.topic}:</strong> {c.description}
              </p>
            ))}
          </div>
        </div>
      )}

      {/* Main Drag-and-Drop Area */}
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all duration-300 ${
          isDragging
            ? 'border-cyan-400 bg-cyan-500/10 scale-[1.01]'
            : 'border-white/15 bg-white/[0.02] hover:border-cyan-500/40 hover:bg-white/[0.04]'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
        <div className="w-14 h-14 mx-auto rounded-2xl bg-gradient-to-tr from-cyan-500/20 via-indigo-500/20 to-purple-500/20 border border-cyan-500/30 flex items-center justify-center mb-4 shadow-lg shadow-cyan-500/10">
          <UploadCloud className="w-7 h-7 text-cyan-400 animate-pulse" />
        </div>
        <h3 className="text-base font-bold text-white mb-1">
          Drop Single or Multiple Files for Intelligent Audit
        </h3>
        <p className="text-xs text-slate-400 max-w-lg mx-auto mb-4">
          Upload documents, spreadsheets, images, audio, video, or code. The engine extracts real content, audits structure, and prepares a dynamic requirements checklist.
        </p>

        {/* Supported Format Pills */}
        <div className="flex flex-wrap items-center justify-center gap-2">
          {SUPPORTED_BADGES.map((b) => {
            const Icon = b.icon;
            return (
              <span
                key={b.ext}
                className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-mono border ${b.color}`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="font-semibold">{b.ext}</span>
                <span className="opacity-70 font-sans">({b.desc})</span>
              </span>
            );
          })}
        </div>
      </div>

      {/* Staged File List */}
      {selectedFiles.length > 0 && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1">
            <span>Staged Files ({selectedFiles.length})</span>
            <button
              type="button"
              onClick={() => setSelectedFiles([])}
              className="text-rose-400 hover:text-rose-300 text-[11px]"
            >
              Clear All
            </button>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {selectedFiles.map((file, i) => (
              <div
                key={i}
                className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-200"
              >
                <div className="flex items-center gap-2 truncate pr-2">
                  <FileText className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span className="truncate font-medium">{file.name}</span>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-[10px] font-mono text-slate-400">
                    {(file.size / 1024).toFixed(0)} KB
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile(i);
                    }}
                    className="text-slate-400 hover:text-rose-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* User Task Prompt Box */}
      <form onSubmit={handleSubmit} className="mt-5">
        <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
          <span>User Request & Desired Outcome:</span>
          <span className="text-[11px] text-slate-500 font-normal">
            Explain the deliverable, constraints, or preferences
          </span>
        </label>
        <textarea
          rows={3}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
          placeholder="e.g. 'Complete my CV based on the uploaded file, fill all missing details, calculate metrics, and format for an Executive Architect role.'"
          className="w-full bg-[#070b18] border border-white/15 rounded-xl p-3 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:border-cyan-400 transition-colors resize-none"
        />

        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs text-slate-400">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>Stateful, iterative analysis — no data loss.</span>
          </div>

          <button
            type="submit"
            disabled={isLoading || (selectedFiles.length === 0 && !prompt.trim())}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-cyan-500 via-indigo-500 to-purple-600 hover:from-cyan-400 hover:to-purple-500 text-white font-semibold text-sm shadow-lg shadow-cyan-500/25 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2 cursor-pointer"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Analyzing Files & Building Checklist...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4" />
                <span>Start Intelligent Workflow</span>
              </>
            )}
          </button>
        </div>
      </form>
    </div>
  );
}
