'use client';

import React, { useState, useEffect } from 'react';
import Navbar from '@/components/Navbar';
import WorkflowStageBar from '@/components/intelligent/WorkflowStageBar';
import IntakeZone from '@/components/intelligent/IntakeZone';
import DynamicChecklistPanel from '@/components/intelligent/DynamicChecklistPanel';
import TargetedQuestionCard from '@/components/intelligent/TargetedQuestionCard';
import OutputViewer from '@/components/intelligent/OutputViewer';
import VerificationReportCard from '@/components/intelligent/VerificationReportCard';
import { WorkflowSession, WorkflowStage } from '@/lib/intelligent/types';
import {
  Sparkles,
  RotateCcw,
  History,
  FileText,
  AlertCircle,
  CheckCircle2,
  ListTodo,
  Layers,
  ArrowRight,
  ExternalLink,
  PlusCircle,
} from 'lucide-react';

export default function IntelligentWorkflowPage() {
  const [sessions, setSessions] = useState<WorkflowSession[]>([]);
  const [activeSession, setActiveSession] = useState<WorkflowSession | null>(null);
  const [selectedVersionIndex, setSelectedVersionIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Load existing sessions
  const loadSessions = async () => {
    try {
      const res = await fetch('/api/intelligent/sessions');
      const data = await res.json();
      if (data.success && data.sessions) {
        setSessions(data.sessions);
      }
    } catch (err) {
      console.error('Failed to load workflow sessions:', err);
    }
  };

  useEffect(() => {
    loadSessions();
  }, []);

  // Set selected version to the latest when activeSession updates
  useEffect(() => {
    if (activeSession && activeSession.versions.length > 0) {
      setSelectedVersionIndex(activeSession.versions.length - 1);
    }
  }, [activeSession?.versions.length]);

  // Handler: Start a new session
  const handleStartSession = async (prompt: string, files: File[]) => {
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const formData = new FormData();
      formData.append('prompt', prompt);
      files.forEach((file) => formData.append('files', file));

      const res = await fetch('/api/intelligent/sessions', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();
      if (data.success && data.session) {
        setActiveSession(data.session);
        loadSessions();
      } else {
        setErrorMessage(data.error || 'Failed to initialize intelligent workflow.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Quickstart prefill demo
  const handleQuickstartDemo = async (type: 'cv' | 'proposal' | 'spec') => {
    let demoPrompt = '';
    let demoFileContent = '';
    let demoFileName = '';

    if (type === 'cv') {
      demoPrompt = 'Audit my CV, complete missing metrics, and format for an Executive AI Architect role.';
      demoFileName = 'John_Doe_Executive_CV.txt';
      demoFileContent = `JOHN DOE
john.doe.engineering@example.com | +1 (555) 234-5678

Summary:
Full-stack and AI software architect with 10+ years experience building scalable web applications.

Experience:
Principal Architect - Enterprise Cloud Solutions (2021 - Present)
- Led modernization of core document processing system.
- Directed team of software engineers.
- Cut infrastructure costs significantly.

Senior Software Engineer - Apex Systems (2017 - 2021)
- Built web dashboards for enterprise customers.
- Improved pipeline performance.

Skills:
TypeScript, React, Python, Node.js, AWS, PostgreSQL

Education:
B.S. in Computer Science - State University
`;
    } else if (type === 'proposal') {
      demoPrompt = 'Create a comprehensive commercial proposal and SOW for developing an enterprise AI document processing system.';
      demoFileName = 'Client_Project_RFP.txt';
      demoFileContent = `PROJECT REQUEST FOR PROPOSAL
Client: Global Tech Solutions Ltd.
Target Scope: Automated Document Analysis & Verification Workflow
Budget Estimate: [TBD - Pending Proposal]
Target Delivery: Q4 2026

Key Requirements:
1. Multi-format file intake (DOCX, PDF, XLSX, images).
2. Dynamic requirements checklist generation.
3. Post-generation verification with 90%+ quality threshold.
4. Export to DOCX and PDF formats.
`;
    } else {
      demoPrompt = 'Formulate a technical architecture specification with fault tolerance and data contracts.';
      demoFileName = 'Architecture_Requirements.md';
      demoFileContent = `# System Architecture Requirements
Goal: Build a stateful, iterative multi-agent document intelligence workflow.
Key Components: Universal Intake, Dynamic Checklist Generator, Question Engine, Verifier Engine.
Availability SLA: 99.98%
Edge Cases: Malformed file headers, timeout recovery, concurrent writes.
`;
    }

    const demoFile = new File([demoFileContent], demoFileName, { type: 'text/plain' });
    await handleStartSession(demoPrompt, [demoFile]);
  };

  // Handler: Submit answers to follow-up questions
  const handleSubmitAnswers = async (answers: Record<string, string>) => {
    if (!activeSession) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/intelligent/sessions/${activeSession.id}/answer`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setActiveSession(data.session);

        // Automatically trigger deliverable generation if ready
        await handleTriggerGenerate(data.session.id);
      } else {
        setErrorMessage(data.error || 'Failed to submit answers.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Proceed with acknowledged gaps
  const handleProceedWithGaps = async () => {
    if (!activeSession) return;
    setIsLoading(true);

    try {
      const missingIds = activeSession.checklist
        .filter((i) => i.status === 'missing' || i.status === 'uncertain')
        .map((i) => i.id);

      const res = await fetch(`/api/intelligent/sessions/${activeSession.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: missingIds }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setActiveSession(data.session);
        await handleTriggerGenerate(data.session.id);
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to acknowledge gaps.');
    } finally {
      setIsLoading(false);
    }
  };

  // Handler: Single checklist item gap acknowledge
  const handleAcknowledgeSingleGap = async (itemId: string) => {
    if (!activeSession) return;
    try {
      const res = await fetch(`/api/intelligent/sessions/${activeSession.id}/acknowledge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ itemIds: [itemId] }),
      });
      const data = await res.json();
      if (data.success && data.session) {
        setActiveSession(data.session);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handler: Trigger generation or iterative refinement
  const handleTriggerGenerate = async (sessionId = activeSession?.id, revisionNotes?: string) => {
    if (!sessionId) return;
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch(`/api/intelligent/sessions/${sessionId}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ revisionNotes }),
      });

      const data = await res.json();
      if (data.success && data.session) {
        setActiveSession(data.session);
        loadSessions();
      } else {
        setErrorMessage(data.error || 'Generation failed.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Network request failed.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setActiveSession(null);
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen bg-[#060913] text-slate-100 flex flex-col font-sans">
      <Navbar />

      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
        {/* Top Feature Hero Banner */}
        <div className="mb-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2.5">
              <span className="p-2 rounded-xl bg-gradient-to-tr from-cyan-500/20 to-purple-500/20 border border-cyan-500/30 text-cyan-400">
                <Sparkles className="w-5 h-5" />
              </span>
              <h1 className="text-2xl font-black font-display tracking-tight text-white sm:text-3xl">
                Claude-Style Intelligent File Analysis
              </h1>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-mono font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                Iterative Loop
              </span>
            </div>
            <p className="text-xs sm:text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
              Universal file intake, dynamic requirements checklists, targeted missing-information follow-ups, and post-generation verification audits.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {activeSession && (
              <button
                type="button"
                onClick={handleReset}
                className="px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <PlusCircle className="w-4 h-4 text-cyan-400" />
                <span>New Session</span>
              </button>
            )}

            {sessions.length > 0 && !activeSession && (
              <span className="text-xs text-slate-400 font-mono">
                {sessions.length} Saved Sessions
              </span>
            )}
          </div>
        </div>

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-rose-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Active Session Progression Stepper */}
        {activeSession && <WorkflowStageBar currentStage={activeSession.currentStage} />}

        {/* VIEW 1: No Active Session -> Universal Intake Zone & Quickstarts */}
        {!activeSession ? (
          <div className="space-y-8">
            {/* Quickstart Demos */}
            <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-indigo-950/20 to-purple-950/30 border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 flex items-center justify-center text-cyan-300 border border-cyan-500/30 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-white">Interactive One-Click Quickstarts</h4>
                  <p className="text-xs text-slate-400">
                    Instantly load sample deliverables to test the dynamic checklist and verification workflow:
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickstartDemo('cv')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-cyan-200 border border-cyan-500/30 transition-all cursor-pointer"
                >
                  CV Completion
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickstartDemo('proposal')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-indigo-200 border border-indigo-500/30 transition-all cursor-pointer"
                >
                  Business Proposal
                </button>
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleQuickstartDemo('spec')}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-purple-200 border border-purple-500/30 transition-all cursor-pointer"
                >
                  Technical Spec
                </button>
              </div>
            </div>

            {/* Ingestion Drop Zone */}
            <IntakeZone onStartSession={handleStartSession} isLoading={isLoading} />

            {/* Saved Past Sessions */}
            {sessions.length > 0 && (
              <div className="p-6 rounded-2xl bg-[#0a1024]/80 border border-white/10 backdrop-blur-xl">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <History className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-white tracking-tight">
                      Recent Workflow Sessions ({sessions.length})
                    </h3>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {sessions.slice(0, 6).map((s) => (
                    <div
                      key={s.id}
                      onClick={() => setActiveSession(s)}
                      className="p-4 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/10 hover:border-cyan-500/40 cursor-pointer transition-all group"
                    >
                      <div className="flex items-center justify-between mb-1.5">
                        <span className="text-[10px] font-mono text-cyan-400 uppercase">
                          {s.task?.taskType || 'Task'}
                        </span>
                        <span className="text-[10px] font-mono text-slate-500">
                          {new Date(s.updatedAt).toLocaleDateString()}
                        </span>
                      </div>
                      <h4 className="text-xs font-bold text-white group-hover:text-cyan-200 transition-colors line-clamp-1">
                        {s.title}
                      </h4>
                      <p className="text-[11px] text-slate-400 line-clamp-2 mt-1">
                        {s.userPrompt || 'No initial prompt'}
                      </p>
                      <div className="mt-3 pt-2 border-t border-white/[0.06] flex items-center justify-between text-[10px] text-slate-400 font-mono">
                        <span>{s.checklist.length} checklist items</span>
                        <span className="text-emerald-400 font-semibold">
                          {s.versions.length} versions
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          /* VIEW 2: Active Session Running (Dual Split Grid) */
          <div className="space-y-6">
            {/* Top Session Details Banner */}
            <div className="p-4 rounded-2xl bg-[#0a1024]/90 border border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="text-base font-bold text-white">{activeSession.title}</h2>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-500/15 border border-cyan-500/30 text-cyan-300">
                    {activeSession.task.deliverableTitle}
                  </span>
                </div>
                <div className="flex items-center gap-4 text-xs text-slate-400 mt-1">
                  <span>{activeSession.files.length} source file(s)</span>
                  <span>Target Format: {activeSession.task.targetFormat.toUpperCase()}</span>
                  <span>Audience: {activeSession.task.targetAudience}</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  disabled={isLoading}
                  onClick={() => handleTriggerGenerate(activeSession.id)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-cyan-500 to-indigo-600 hover:from-cyan-400 hover:to-indigo-500 text-white font-semibold text-xs shadow-lg shadow-cyan-500/20 flex items-center gap-1.5 transition-all cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {activeSession.versions.length === 0 ? 'Synthesize Deliverable' : 'Generate Refinement'}
                  </span>
                </button>
              </div>
            </div>

            {/* Main Dual-Pane Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              {/* Left Column (Checklist & Questions) - 5 Cols */}
              <div className="lg:col-span-5 space-y-6">
                {/* Targeted Question Card (if unanswered questions exist) */}
                <TargetedQuestionCard
                  questions={activeSession.questions}
                  onSubmitAnswers={handleSubmitAnswers}
                  onProceedWithGaps={handleProceedWithGaps}
                  isLoading={isLoading}
                />

                {/* Dynamic Checklist Panel */}
                <DynamicChecklistPanel
                  checklist={activeSession.checklist}
                  onAcknowledgeGap={handleAcknowledgeSingleGap}
                  isLoading={isLoading}
                />

                {/* Uploaded Files Fact Summary */}
                {activeSession.files.length > 0 && (
                  <div className="p-4 rounded-2xl bg-[#0a1024]/80 border border-white/10 text-xs">
                    <div className="flex items-center gap-2 font-bold text-white mb-2">
                      <Layers className="w-4 h-4 text-cyan-400" />
                      <span>Ingested Source Context ({activeSession.files.length})</span>
                    </div>
                    <div className="space-y-2">
                      {activeSession.files.map((file) => (
                        <div
                          key={file.id}
                          className="p-2.5 rounded-xl bg-white/[0.02] border border-white/0.06 text-slate-300"
                        >
                          <div className="font-semibold text-white flex items-center justify-between">
                            <span>{file.fileName}</span>
                            <span className="text-[10px] font-mono text-cyan-400 uppercase">
                              {file.category}
                            </span>
                          </div>
                          <p className="text-[11px] text-slate-400 mt-1">
                            {file.structureSummary}
                          </p>
                          {file.extractedFacts.length > 0 && (
                            <div className="mt-2 text-[10px] text-emerald-400 font-mono">
                              ✓ {file.extractedFacts.length} factual entities isolated
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Right Column (Output Viewer & Post-Gen Verifier) - 7 Cols */}
              <div className="lg:col-span-7 space-y-6">
                {/* Post-Gen Verification Report if generated */}
                {activeSession.verificationReport && (
                  <VerificationReportCard report={activeSession.verificationReport} />
                )}

                {/* Output Viewer */}
                <OutputViewer
                  versions={activeSession.versions}
                  currentVersionIndex={selectedVersionIndex}
                  onSelectVersion={setSelectedVersionIndex}
                  onRefineOutput={(notes) => handleTriggerGenerate(activeSession.id, notes)}
                  sessionId={activeSession.id}
                  isLoading={isLoading}
                />
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
