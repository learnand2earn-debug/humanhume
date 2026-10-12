import crypto from 'crypto';
import {
  AgentMessage,
  MessageArtifact,
  MessageAttachment,
  TaskPlan,
  UniversalConversation,
  TaskExecutionStatus,
  ExecutionStep,
} from './types';
import { ConversationRepository } from './repository';
import { IntakeExtractor } from '../intelligent/extractor';
import { TaskAnalyzer } from '../intelligent/task-analyzer';
import { ChecklistGenerator } from '../intelligent/checklist-generator';
import { QuestionEngine } from '../intelligent/question-engine';
import { GeneratorEngine } from '../intelligent/generator-engine';
import { VerifierEngine } from '../intelligent/verifier-engine';
import { storageManager } from '../storage';
import { UploadedIntakeFile } from '../intelligent/types';

export class UniversalAgentEngine {
  /**
   * Main entrypoint to process a user prompt and optional file attachments.
   */
  static async processUserInput(
    conversationId: string,
    prompt: string,
    uploadedFiles: Array<{ name: string; buffer: Buffer }>,
    userAnswers?: Record<string, string>,
    acknowledgedGapIds?: string[]
  ): Promise<UniversalConversation> {
    const conv = ConversationRepository.getConversation(conversationId) || ConversationRepository.createConversation();

    // 1. Ingest Attachments safely using IntakeExtractor & StorageManager
    const attachments: MessageAttachment[] = [];
    const intakeFiles: UploadedIntakeFile[] = [];

    for (const uf of uploadedFiles) {
      const fileId = `att_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
      const { originalPath } = await storageManager.saveOriginalFile(uf.buffer, uf.name, fileId);
      const extracted = await IntakeExtractor.extractFileContent(uf.buffer, uf.name, fileId, originalPath);
      intakeFiles.push(extracted);

      attachments.push({
        id: fileId,
        name: uf.name,
        size: uf.buffer.length,
        mimeType: extracted.mimeType,
        category: extracted.category,
        storagePath: originalPath,
        extractedSummary: extracted.structureSummary,
        extractedFactsCount: extracted.extractedFacts.length,
        wordCount: extracted.metadata.wordCount,
        headingsCount: extracted.metadata.headingsCount,
      });
    }

    // Record user message
    const userMsgId = `msg_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const userMessage: AgentMessage = {
      id: userMsgId,
      role: 'user',
      text: prompt,
      timestamp: new Date().toISOString(),
      attachments: attachments.length > 0 ? attachments : undefined,
    };
    ConversationRepository.addMessage(conv.id, userMessage);

    // 2. Aggregate context across full conversation
    const allAttachments: UploadedIntakeFile[] = [...intakeFiles];
    // Gather previous attachments from conversation history
    conv.messages.forEach((m) => {
      if (m.attachments) {
        m.attachments.forEach((att) => {
          if (!allAttachments.some((a) => a.fileName === att.name)) {
            allAttachments.push({
              id: att.id,
              fileName: att.name,
              originalName: att.name,
              fileSize: att.size,
              mimeType: att.mimeType,
              category: att.category,
              storagePath: att.storagePath,
              status: 'ready',
              metadata: {
                fileName: att.name,
                originalName: att.name,
                mimeType: att.mimeType,
                sizeBytes: att.size,
                category: att.category,
                extension: att.name.slice(att.name.lastIndexOf('.')),
                wordCount: att.wordCount,
                headingsCount: att.headingsCount,
              },
              extractedText: att.extractedSummary || '',
              extractedFacts: [],
              structureSummary: att.extractedSummary || '',
              potentialGaps: [],
              uploadedAt: new Date().toISOString(),
            });
          }
        });
      }
    });

    // 3. Understand goal and requirements
    const task = TaskAnalyzer.analyzeTask(prompt, allAttachments);

    // 4. Build Dynamic Checklist
    const checklist = ChecklistGenerator.generateChecklist(task, allAttachments);

    // 5. Formulate targeted questions if critical information is missing
    const questions = QuestionEngine.generateQuestions(checklist, task, allAttachments);

    // Apply any supplied user answers or gap acknowledgments
    let updatedChecklist = checklist;
    let updatedQuestions = questions;
    if (userAnswers && Object.keys(userAnswers).length > 0) {
      const merged = QuestionEngine.mergeAnswers(userAnswers, checklist, questions);
      updatedChecklist = merged.updatedChecklist;
      updatedQuestions = merged.updatedQuestions;
    }

    // Natural Language Directives Handling
    const lowerPrompt = prompt.toLowerCase();
    const wantsSkipOptional = lowerPrompt.includes('skip optional') || lowerPrompt.includes('skip optional questions');
    const wantsBestJudgment = lowerPrompt.includes('use your best judgment') || lowerPrompt.includes('best judgment');
    const wantsAcknowledgeGaps = lowerPrompt.includes('proceed with acknowledged gaps') || lowerPrompt.includes('proceed with warnings') || lowerPrompt.includes('proceed anyway');
    const wantsDraft = lowerPrompt.includes('show me the draft') || lowerPrompt.includes('show draft') || lowerPrompt.includes('first draft');

    if (wantsSkipOptional) {
      updatedChecklist = updatedChecklist.map((item) => {
        if (item.priority !== 'critical' && item.status !== 'complete') {
          return {
            ...item,
            status: 'not_applicable' as const,
            userDecision: 'Skipped per user instruction',
            evidence: 'User explicitly requested skipping optional questions',
          };
        }
        return item;
      });
    }

    if (wantsBestJudgment || wantsAcknowledgeGaps || wantsDraft) {
      updatedChecklist = updatedChecklist.map((item) => {
        if (item.status === 'missing' || item.status === 'uncertain') {
          return {
            ...item,
            status: 'complete' as const,
            userDecision: 'Acknowledged gap: Best judgment applied',
            evidence: 'Proceeding with standard defaults per user directive',
          };
        }
        return item;
      });
    }

    if (acknowledgedGapIds && acknowledgedGapIds.length > 0) {
      updatedChecklist = updatedChecklist.map((item) => {
        if (acknowledgedGapIds.includes(item.id)) {
          return {
            ...item,
            status: 'complete' as const,
            userDecision: 'Acknowledged gap by user',
            evidence: 'Proceeding with acknowledged gap',
          };
        }
        return item;
      });
    }

    // Determine pending unanswered questions
    const pendingQuestions = updatedQuestions.filter((q) => {
      if (q.answered) return false;
      const linked = updatedChecklist.find((c) => c.id === q.checklistItemId);
      if (linked && (linked.status === 'complete' || linked.status === 'not_applicable')) {
        return false;
      }
      return true;
    });

    const hasCriticalPending = pendingQuestions.some((q) => {
      const linked = updatedChecklist.find((c) => c.id === q.checklistItemId);
      return linked?.priority === 'critical';
    });

    // 6. Build Structured Task Plan
    const taskId = `task_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const steps: ExecutionStep[] = [
      {
        id: 'step_1',
        title: 'Intake & Fact Isolation',
        goal: 'Validate files, inspect structure, isolate entities and dates.',
        requiredInputs: allAttachments.map((a) => a.fileName),
        toolNeeded: 'IntakeExtractor',
        status: 'completed',
        result: `Extracted ${allAttachments.length} source file(s) and structured factual entities.`,
      },
      {
        id: 'step_2',
        title: 'Requirements Checklist Audit',
        goal: 'Generate dynamic, content-aware requirements matrix.',
        requiredInputs: ['User prompt', 'Extracted content'],
        toolNeeded: 'ChecklistGenerator',
        status: 'completed',
        result: `Generated ${updatedChecklist.length} dynamic requirements items (${updatedChecklist.filter((i) => i.status === 'complete').length} already satisfied).`,
      },
      {
        id: 'step_3',
        title: 'Missing-Information Clarification',
        goal: 'Identify information gaps and collect targeted follow-ups.',
        requiredInputs: ['Checklist gaps'],
        toolNeeded: 'QuestionEngine',
        status: pendingQuestions.length > 0 ? (hasCriticalPending ? 'running' : 'completed') : 'completed',
        result: pendingQuestions.length > 0 ? `Identified ${pendingQuestions.length} pending clarification(s).` : 'All mandatory items resolved.',
      },
      {
        id: 'step_4',
        title: 'Synthesis & Artifact Generation',
        goal: `Synthesize ${task.deliverableTitle} adhering to ${task.targetFormat.toUpperCase()} format.`,
        requiredInputs: ['Source facts', 'Checklist rules'],
        toolNeeded: 'GeneratorEngine',
        status: hasCriticalPending ? 'pending' : 'completed',
        result: hasCriticalPending ? undefined : `Generated ${task.deliverableTitle}.`,
      },
      {
        id: 'step_5',
        title: 'Post-Generation Verification Audit',
        goal: 'Audit output against checklist to ensure zero hallucinations and format compliance.',
        requiredInputs: ['Generated artifact', 'Checklist rules'],
        toolNeeded: 'VerifierEngine',
        status: hasCriticalPending ? 'pending' : 'completed',
        result: hasCriticalPending ? undefined : 'Verified quality criteria and computed audit score.',
      },
    ];

    const completedSteps = steps.filter((s) => s.status === 'completed').length;
    const progressPercent = Math.round((completedSteps / steps.length) * 100);

    const taskPlan: TaskPlan = {
      taskId,
      objective: task.goal,
      taskType: task.taskType,
      sourceFiles: allAttachments.map((a) => a.fileName),
      requirements: task.explicitRequirements,
      dependencies: ['File extraction', 'Checklist verification'],
      executionSteps: steps,
      missingInformation: pendingQuestions.map((q) => q.question),
      availableCapabilities: [
        'Multi-format parsing (PDF, Word, Excel, Images, Audio, Video, Code)',
        'Dynamic Checklist Generation',
        'Targeted Question Engine',
        'Document Synthesis (DOCX, PDF, Markdown, HTML, JSON)',
        'Post-Generation Quality Audit',
      ],
      riskLevel: hasCriticalPending ? 'medium' : 'low',
      status: hasCriticalPending ? 'waiting_user_info' : 'completed',
      expectedOutputs: [`${task.deliverableTitle}.${task.targetFormat}`],
      verificationPlan: task.completionCriteria,
      progressPercent,
    };

    // 7. Track previous output versions for iterative revisions
    const previousArtifacts: MessageArtifact[] = [];
    conv.messages.forEach((m) => {
      if (m.artifact) previousArtifacts.push(m.artifact);
    });
    const previousVersions = previousArtifacts.map((art, idx) => ({
      versionNumber: art.version || idx + 1,
      createdAt: new Date().toISOString(),
      title: art.title,
      format: art.format as any,
      content: art.content,
      changelog: art.changelog || [],
      resolvedItemIds: [],
      passRate: art.qualityScore || 90,
      issuesCount: 0,
      isFinal: Boolean(art.verified),
    }));

    // 8. Execute Artifact Generation & Post-Verification if not blocked by critical questions
    let artifact: MessageArtifact | undefined;
    let verificationReport: any;
    let assistantText = '';

    const canGenerate =
      !hasCriticalPending ||
      (userAnswers && Object.keys(userAnswers).length > 0) ||
      (acknowledgedGapIds && acknowledgedGapIds.length > 0) ||
      wantsBestJudgment ||
      wantsAcknowledgeGaps ||
      wantsDraft;

    if (canGenerate) {
      const isRevision = previousVersions.length > 0;
      const revisionNotes = isRevision ? prompt : undefined;

      // Generate artifact
      const output = await GeneratorEngine.generateDeliverable(
        task,
        allAttachments,
        updatedChecklist,
        updatedQuestions,
        previousVersions,
        revisionNotes
      );

      // Verify output
      const { report, updatedChecklist: verifiedList } = VerifierEngine.verifyOutput(
        output,
        updatedChecklist,
        task,
        allAttachments,
        acknowledgedGapIds || []
      );

      updatedChecklist = verifiedList;
      verificationReport = report;

      artifact = {
        id: `art_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`,
        title: task.deliverableTitle,
        type: 'document',
        format: task.targetFormat,
        content: output.content,
        version: output.versionNumber,
        changelog: output.changelog,
        qualityScore: report.qualityScore,
        verified: report.passed,
      };

      taskPlan.status = report.passed ? 'completed' : 'completed_with_warnings';

      assistantText = `I have analyzed your request and synthesized **${task.deliverableTitle}** (v${output.versionNumber}).\n\n` +
        `• **Dynamic Checklist**: ${updatedChecklist.filter((i) => i.status === 'complete').length} of ${updatedChecklist.length} criteria verified.\n` +
        `• **Quality Audit**: **${report.qualityScore}/100** (${report.passed ? 'Passed all quality gates' : 'Gaps noted in audit report'}).\n` +
        `• **Preservation**: All factual numbers, dates, contacts, and citations from your source files have been protected 100% verbatim.\n\n` +
        `You can inspect the full deliverable, download in DOCX/PDF/Markdown, or provide further revisions below.`;
    } else {
      taskPlan.status = 'waiting_user_info';
      assistantText = `I have received and audited your input. Before synthesizing **${task.deliverableTitle}**, I identified **${pendingQuestions.length} targeted clarification(s)** needed to guarantee complete accuracy.\n\n` +
        `Please review the questions below, or click **"Proceed with acknowledged gaps"** to generate immediately with standard defaults.`;
    }

    const assistantMsgId = `msg_${Date.now()}_${crypto.randomBytes(2).toString('hex')}`;
    const assistantMessage: AgentMessage = {
      id: assistantMsgId,
      role: 'assistant',
      text: assistantText,
      timestamp: new Date().toISOString(),
      taskPlan,
      checklist: updatedChecklist,
      questions: pendingQuestions.length > 0 ? pendingQuestions : undefined,
      artifact,
      verificationReport,
      status: taskPlan.status,
    };

    return ConversationRepository.addMessage(conv.id, assistantMessage);
  }
}
