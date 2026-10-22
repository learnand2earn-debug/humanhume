'use client';

import React from 'react';
import Link from 'next/link';
import {ArrowLeft, Sparkles} from 'lucide-react';
import PdfHumanizerPanel from '@/components/PdfHumanizerPanel';

export default function DedicatedPdfHumanizerPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      {/* Top Header */}
      <header className="border-b border-slate-800 bg-slate-950/80 backdrop-blur sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="inline-flex items-center gap-2 text-xs font-medium text-slate-400 hover:text-slate-100 transition-colors bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-lg"
            >
              <ArrowLeft size={14} />
              Back to Full Studio
            </Link>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-violet-600/20 border border-violet-500/30 flex items-center justify-center">
                <Sparkles size={16} className="text-violet-400" />
              </div>
              <span className="font-bold text-sm tracking-tight text-white">
                HumanFlow <span className="text-violet-400 font-normal">PDF Humanizer</span>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[11px] px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30 font-medium">
              Native Image Preservation Active
            </span>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-5xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-6 lg:p-8 shadow-2xl">
          <PdfHumanizerPanel />
        </div>
      </main>
    </div>
  );
}
