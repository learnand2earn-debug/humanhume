import crypto from 'crypto';
import { IntakeExtractor } from './extractor';
import { TaskAnalyzer } from './task-analyzer';
import { ChecklistGenerator } from './checklist-generator';
import { QuestionEngine } from './question-engine';
import { GeneratorEngine } from './generator-engine';
import { VerifierEngine } from './verifier-engine';
import { IntelligentSessionRepository } from './repository';
import {
  WorkflowSession,
  UploadedIntakeFile,
  OutputVersion,
  VerificationReport,
  TargetedQuestion,
  ChecklistItem,
} from './types';
import { storageManager } from '@/lib/storage';

export class WorkflowEngine {
  /**
   * Initializes a new workflow session from uploaded files and user prompt.
   * Executes Stages A through E in sequence.
   */
  static async startSession(
    userPrompt: string,
    rawFiles: Array<{ name: string; buffer: Buffer }>
  ): Promise<WorkflowSession> {
    const sessionId = `isess_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

    // STAGE A: Universal File Intake
    const intakeFiles: UploadedIntakeFile[] = [];
    for (const rf of rawFiles) {
      const fileId = `file_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
      const { originalPath } = await storageManager.saveOriginalFile(rf.buffer, rf.name, fileId);
      const extracted = await IntakeExtractor.extractFileContent(rf.buffer, rf.name, fileId, originalPath);
      intakeFiles.push(extracted);
    }

    // Detect contradictions across files
    const contradictions = IntakeExtractor.detectContradictions(intakeFiles);

    // STAGE B: Understand user's desired outcome
    const task = TaskAnalyzer.analyzeTask(userPrompt, intakeFiles);

    // STAGE C: Extract and analyze available content (already done in IntakeExtractor)

    // STAGE D: Build dynamic requirements checklist
    const checklist = ChecklistGenerator.generateChecklist(task, intakeFiles);

    // STAGE E: Identify missing, uncertain and incomplete items
    // STAGE F: Formulate targeted follow-up questions
    const questions = QuestionEngine.generateQuestions(checklist, task, intakeFiles, [], contradictions);

    const session: WorkflowSession = {
      id: sessionId,
      title: `${task.deliverableTitle} (${intakeFiles.length > 0 ? intakeFiles[0].fileName : 'New Task'})`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      currentStage: questions.length > 0 ? 'STAGE_F_QUESTIONS' : 'STAGE_H_GENERATE',
      userPrompt,
      files: intakeFiles,
      contradictions,
      task,
      checklist,
      questions,
      versions: [],
      currentVersionNumber: 0,
      acknowledgedGaps: [],
      userPreferences: {},
      executionLog: [
        {
          stage: 'STAGE_A_INTAKE',
          action: 'Files Ingested',
          timestamp: new Date().toISOString(),
          details: `Ingested ${intakeFiles.length} file(s) safely into isolated storage.`,
        },
        {
          stage: 'STAGE_B_UNDERSTAND',
          action: 'Task Analyzed',
          timestamp: new Date().toISOString(),
          details: `Identified task type: "${task.taskType}" with deliverable title: "${task.deliverableTitle}".`,
        },
        {
          stage: 'STAGE_D_CHECKLIST',
          action: 'Checklist Generated',
          timestamp: new Date().toISOString(),
          details: `Generated ${checklist.length} dynamic requirements items tailored to source data.`,
        },
      ],
    };

    IntelligentSessionRepository.createSession(session);
    return session;
  }

  /**
   * Submits answers to targeted follow-up questions (STAGE G: Merge answers).
   */
  static async submitAnswers(
    sessionId: string,
    answers: Record<string, string>
  ): Promise<WorkflowSession> {
    const session = IntelligentSessionRepository.getSession(sessionId);
    if (!session) throw new Error(`Workflow session ${sessionId} not found`);

    const { updatedChecklist, updatedQuestions } = QuestionEngine.mergeAnswers(
      answers,
      session.checklist,
      session.questions
    );

    session.checklist = updatedChecklist;
    session.questions = updatedQuestions;
    session.currentStage = 'STAGE_G_MERGE';

    IntelligentSessionRepository.appendLog(
      sessionId,
      'STAGE_G_MERGE',
      'Answers Merged',
      `Merged ${Object.keys(answers).length} user answers into task context and resolved linked checklist items.`
    );

    return IntelligentSessionRepository.updateSession(session);
  }

  /**
   * Acknowledges remaining gaps explicitly to proceed without blocking (STAGE G).
   */
  static async acknowledgeGaps(
    sessionId: string,
    itemIds: string[]
  ): Promise<WorkflowSession> {
    const session = IntelligentSessionRepository.getSession(sessionId);
    if (!session) throw new Error(`Workflow session ${sessionId} not found`);

    session.acknowledgedGaps = Array.from(new Set([...session.acknowledgedGaps, ...itemIds]));

    // Mark acknowledged items
    session.checklist = session.checklist.map((item) => {
      if (itemIds.includes(item.id)) {
        return {
          ...item,
          status: 'complete' as const,
          userDecision: 'Acknowledged gap by user',
          evidence: 'User explicitly confirmed proceeding with acknowledged gap',
        };
      }
      return item;
    });

    IntelligentSessionRepository.appendLog(
      sessionId,
      'STAGE_G_MERGE',
      'Gaps Acknowledged',
      `User confirmed proceeding with ${itemIds.length} acknowledged gap(s).`
    );

    return IntelligentSessionRepository.updateSession(session);
  }

  /**
   * Generates or iteratively refines the deliverable (STAGE H, I, J, K, L).
   */
  static async generateOutput(
    sessionId: string,
    revisionNotes?: string
  ): Promise<WorkflowSession> {
    const session = IntelligentSessionRepository.getSession(sessionId);
    if (!session) throw new Error(`Workflow session ${sessionId} not found`);

    // STAGE H: Generate, edit or complete output
    const output = await GeneratorEngine.generateDeliverable(
      session.task,
      session.files,
      session.checklist,
      session.questions,
      session.versions,
      revisionNotes
    );

    // STAGE I & J: Analyze resulting output again & post-generation verification
    const { report, updatedChecklist } = VerifierEngine.verifyOutput(
      output,
      session.checklist,
      session.task,
      session.files,
      session.acknowledgedGaps
    );

    output.passRate = report.qualityScore;
    output.issuesCount = report.issues.length;
    output.isFinal = report.passed;

    session.versions.push(output);
    session.currentVersionNumber = output.versionNumber;
    session.checklist = updatedChecklist;
    session.verificationReport = report;

    // STAGE K or L: Repeat or deliver
    if (report.passed) {
      session.currentStage = 'STAGE_L_DELIVER';
      IntelligentSessionRepository.appendLog(
        sessionId,
        'STAGE_L_DELIVER',
        'Final Deliverable Delivered',
        `Version v${output.versionNumber} verified successfully with score ${report.qualityScore}%. Delivery ready.`
      );
    } else {
      session.currentStage = 'STAGE_I_POST_ANALYZE';
      IntelligentSessionRepository.appendLog(
        sessionId,
        'STAGE_I_POST_ANALYZE',
        'Output Inspected',
        `Generated v${output.versionNumber}. Quality Score: ${report.qualityScore}%. ${report.issues.length} issue(s) flagged.`
      );
    }

    return IntelligentSessionRepository.updateSession(session);
  }
}
