'use client';

import React, { useState, useRef, DragEvent, ChangeEvent } from 'react';
import {
  UploadCloud,
  FileText,
  AlertCircle,
  CheckCircle2,
  FileCheck2,
  Loader2,
  Sparkles,
  Zap,
} from 'lucide-react';
import { DocumentRecord } from '@/lib/types';

interface FileUploadZoneProps {
  onUploadSuccess: (doc: DocumentRecord) => void;
}

const SUPPORTED_FORMATS = [
  { ext: 'DOCX', desc: 'Word Document', badge: 'bg-blue-500/15 border-blue-500/30 text-blue-300 group-hover:border-blue-400' },
  { ext: 'PDF', desc: 'Portable PDF', badge: 'bg-rose-500/15 border-rose-500/30 text-rose-300 group-hover:border-rose-400' },
  { ext: 'TXT', desc: 'Plain Text', badge: 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300 group-hover:border-emerald-400' },
  { ext: 'MD', desc: 'Markdown Notes', badge: 'bg-purple-500/15 border-purple-500/30 text-purple-300 group-hover:border-purple-400' },
  { ext: 'RTF', desc: 'Rich Text', badge: 'bg-amber-500/15 border-amber-500/30 text-amber-300 group-hover:border-amber-400' },
  { ext: 'XLSX', desc: 'Spreadsheet', badge: 'bg-cyan-500/15 border-cyan-500/30 text-cyan-300 group-hover:border-cyan-400' },
];

export default function FileUploadZone({ onUploadSuccess }: FileUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = async (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      await uploadFile(file);
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      await uploadFile(file);
    }
  };

  const uploadFile = async (file: File) => {
    setErrorMessage(null);
    const ext = file.name.slice(file.name.lastIndexOf('.')).toLowerCase();
    const validExtensions = ['.docx', '.pdf', '.txt', '.md', '.rtf', '.xlsx'];

    if (!validExtensions.includes(ext)) {
      setErrorMessage(
        `Unsupported file type "${ext}". HumanFlow AI supports DOCX, PDF, TXT, MD, RTF, and XLSX.`
      );
      return;
    }

    if (file.size === 0) {
      setErrorMessage(
        `The file "${file.name}" is completely empty (0 bytes). Please select a document that contains text to humanize.`
      );
      return;
    }

    if (file.size > 50 * 1024 * 1024) {
      setErrorMessage('File size exceeds the 50 MB limit.');
      return;
    }

    try {
      setIsUploading(true);
      setUploadProgress(25);

      const formData = new FormData();
      formData.append('file', file);

      setUploadProgress(50);
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        body: formData,
      });

      setUploadProgress(85);
      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload document');
      }

      setUploadProgress(100);
      setTimeout(() => {
        setIsUploading(false);
        onUploadSuccess(data.document);
      }, 400);
    } catch (err: unknown) {
      setIsUploading(false);
      setErrorMessage(err instanceof Error ? err.message : String(err));
    }
  };

  return (
    <div className="w-full">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileChange}
        accept=".docx,.pdf,.txt,.md,.rtf,.xlsx"
        className="hidden"
        id="file-input-hidden"
      />

      {/* Outer Animated Gradient Border Container */}
      <div className="animated-border-wrapper shadow-2xl">
        <div
          id="drop-zone-container"
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          onClick={() => !isUploading && fileInputRef.current?.click()}
          className={`relative cursor-pointer rounded-[1.2rem] p-8 sm:p-14 transition-all duration-300 text-center ${
            isDragging
              ? 'bg-[#0a1024] scale-[1.008]'
              : isUploading
              ? 'bg-[#080d1e] cursor-wait'
              : 'bg-[#090e20]/95 hover:bg-[#0b132c]'
          }`}
        >
          {/* Subtle Ambient Glow */}
          <div className="absolute inset-0 bg-gradient-to-b from-indigo-500/10 via-transparent to-cyan-500/10 rounded-[1.2rem] pointer-events-none" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Animated Floating Upload Icon */}
            <div
              className={`w-20 h-20 rounded-3xl flex items-center justify-center mb-6 transition-all duration-300 ${
                isDragging
                  ? 'scale-110 bg-cyan-500/25 text-cyan-300 border border-cyan-400 shadow-xl shadow-cyan-500/30'
                  : isUploading
                  ? 'bg-indigo-500/25 text-indigo-300 animate-pulse border border-indigo-400/40'
                  : 'bg-gradient-to-b from-white/10 to-white/5 text-cyan-400 border border-white/10 shadow-lg shadow-black/40 hover:scale-105 hover:border-cyan-400/50 hover:shadow-cyan-500/20'
              }`}
            >
              {isUploading ? (
                <Loader2 className="w-10 h-10 animate-spin text-cyan-400" />
              ) : (
                <UploadCloud className="w-10 h-10 animate-float text-cyan-400" />
              )}
            </div>

            {/* Heading in Modern Display Font */}
            <h2 className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight text-white mb-3">
              {isUploading ? (
                <span className="shimmer-text">Uploading & Enqueuing Document...</span>
              ) : (
                <>
                  Drop your document here or{' '}
                  <span className="text-cyan-400 underline decoration-cyan-500/40 underline-offset-4 hover:text-cyan-300">
                    browse
                  </span>
                </>
              )}
            </h2>

            <p className="text-slate-400 text-sm max-w-xl mb-8 leading-relaxed">
              Autonomous end-to-end pipeline: extracts text, freezes citations and data points,
              polishes phrasing to natural human rhythm, verifies AI quality scores, and compiles the
              final document with zero factual deviation.
            </p>

            {/* Progress Bar when uploading */}
            {isUploading && (
              <div className="w-full max-w-md mb-8">
                <div className="flex justify-between text-xs text-slate-300 mb-2 font-mono">
                  <span className="flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
                    Launching autonomous pipeline...
                  </span>
                  <span className="font-bold text-cyan-400">{uploadProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-900 rounded-full overflow-hidden border border-white/10 p-[1px]">
                  <div
                    className="h-full bg-gradient-to-r from-cyan-400 via-indigo-500 to-purple-500 transition-all duration-300 rounded-full shadow-lg shadow-cyan-500/50"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
              </div>
            )}

            {/* Format Badges Grid */}
            <div className="w-full max-w-3xl">
              <div className="text-[11px] font-mono font-semibold uppercase tracking-widest text-slate-400 mb-3.5 flex items-center justify-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
                <span>Supported Formats (Max 50 MB • Original Kept Untouched)</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2.5">
                {SUPPORTED_FORMATS.map((f) => (
                  <div
                    key={f.ext}
                    className={`border rounded-2xl p-3 flex flex-col items-center justify-center transition-all duration-200 hover:-translate-y-1 hover:shadow-lg ${f.badge}`}
                  >
                    <span className="font-mono font-extrabold text-xs tracking-wider">{f.ext}</span>
                    <span className="text-[10px] text-slate-400 mt-0.5 truncate max-w-full">
                      {f.desc}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Error alert if any */}
      {errorMessage && (
        <div
          id="upload-error-alert"
          className="mt-4 p-4 rounded-2xl bg-rose-950/60 border border-rose-500/40 text-rose-200 text-sm flex items-center gap-3 animate-in fade-in"
        >
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
          <div className="flex-1">
            <strong className="font-semibold font-display">Upload Blocked:</strong> {errorMessage}
          </div>
          <button
            onClick={() => setErrorMessage(null)}
            className="text-xs px-3 py-1.5 rounded-lg bg-rose-900/50 hover:bg-rose-800/50 text-rose-200 font-semibold"
          >
            Dismiss
          </button>
        </div>
      )}
    </div>
  );
}
