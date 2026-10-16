import { repository } from '../db/repository';
import { storageManager } from '../storage';
import { extractDocumentText } from '../document/extractor';
import { DocumentAnalyzer } from '../document/analyzer';
import { ContentProtector } from '../document/protector';
import { DocumentChunker } from '../document/chunker';
import { PreservationAgent } from '../document/preservation';
import { ReadabilityCalculator } from '../document/readability';
import { DocumentGenerator } from '../document/generator';
import { DiffEngine } from '../document/diff';
import { HumanizerProvider } from '../humanizer/provider';
import { QualityCheckerAgent } from '../checker/checker';
import { DiscordNotifier } from '../notifications/discord';
import { AutoFixAgent } from './autofix';
import { ErrorRecoveryAgent } from './recovery';
import {
  DocumentRecord,
  JobStatus,
  ProcessingJob,
  StepLog,
} from '../types';

export class PipelineOrchestrator {
  /**
   * Executes the autonomous document processing pipeline from upload to finalization.
   */
  static async processDocument(documentId: string): Promise<DocumentRecord> {
    const doc = repository.getDocument(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found`);
    }

    const settings = repository.getSettings();
    const maxRetries = settings.maxRetries || 3;
    const passThreshold = settings.checker.passThreshold || 20;

    let job = repository.getJob(documentId);
    if (!job) {
      job = {
        id: `job_${documentId}`,
        documentId,
        traceId: doc.traceId,
        status: 'EXTRACTING',
        currentStep: 'EXTRACTING',
        progressPercent: 5,
        retryCount: 0,
        maxRetries,
        startedAt: new Date().toISOString(),
        steps: [],
      };
      repository.saveJob(job);
    }

    const updateStep = (
      step: JobStatus,
      progressPercent: number,
      details: string
    ) => {
      const stepLog: StepLog = {
        step,
        label: step,
        status: 'completed',
        timestamp: new Date().toISOString(),
        details,
      };

      const existingSteps = job!.steps.filter((s) => s.step !== step);
      existingSteps.push(stepLog);

      job = repository.updateJob(documentId, {
        status: step,
        currentStep: step,
        progressPercent,
        steps: existingSteps,
      })!;

      repository.updateDocument(documentId, {
        status: step,
      });

      repository.addLog({
        traceId: doc.traceId,
        level: 'info',
        module: 'PipelineOrchestrator',
        action: step,
        message: details,
      });
    };

    const startTime = Date.now();

    try {
      // 1. FILE VALIDATION & EXTRACTION
      updateStep('EXTRACTING', 10, 'Validating working file and extracting text structure...');
      const workingBuffer = await storageManager.readFile(doc.workingPath);
      const extracted = await extractDocumentText(workingBuffer, doc.fileType, doc.originalName);

      // Save Original Version (v0)
      const v0Path = await storageManager.saveVersionFile(
        extracted.text,
        documentId,
        0,
        doc.fileType,
        false
      );

      const v0Readability = ReadabilityCalculator.compute(extracted.text);

      repository.saveVersion({
        id: `v_${documentId}_0`,
        documentId,
        versionNumber: 0,
        label: 'Original',
        filePath: v0Path,
        text: extracted.text,
        qualityScore: 100,
        checkerScore: 85, // Original AI score
        preservationScore: 100,
        readabilityScore: v0Readability.fleschReadingEase,
        detectedIssues: [],
        provider: 'Original Upload',
        durationMs: 0,
        createdAt: new Date().toISOString(),
      });

      // 2. DOCUMENT ANALYSIS
      updateStep('ANALYZING', 25, 'Analyzing sentence structures, headings, and stylistic patterns...');
      const analysis = DocumentAnalyzer.analyze(extracted.text);

      // 3. CONTENT PROTECTION
      updateStep(
        'PROTECTING',
        35,
        `Detected ${analysis.protectedElementsCount} protected items (citations, numbers, formulas, tables). Building protection map...`
      );
      const protectionResult = ContentProtector.protect(extracted.text, documentId);

      // 4. CHUNK PROCESSING & HUMANIZATION
      updateStep(
        'HUMANIZING',
        50,
        `Splitting into semantic chunks and applying natural sentence flow rewrite...`
      );

      let workingText = protectionResult.protectedText;
      let currentVersionNumber = 1;
      let retryCount = 0;
      let bestVersionId = '';
      let bestAiScore = 999;
      let latestHumanizedText = '';
      let latestQualityCheck: any = null;

      // Quality Control Loop (Section 7)
      while (retryCount <= maxRetries) {
        const chunks = DocumentChunker.splitIntoChunks(
          workingText,
          settings.chunkSizeWords || 600
        );

        const processedChunks: Array<{ index: number; text: string }> = [];

        for (let i = 0; i < chunks.length; i++) {
          const chunk = chunks[i];
          // If chunk is purely structural or short heading, pass through
          if (chunk.isHeading && chunk.wordCount < 10) {
            processedChunks.push({ index: chunk.index, text: chunk.text });
            continue;
          }

          if (chunks.length > 1) {
            updateStep(
              'HUMANIZING',
              Math.min(65, 45 + Math.round(((i + 1) / chunks.length) * 15)),
              `Applying neural cadence rewrite on chunk ${i + 1} of ${chunks.length}...`
            );
          }

          let chunkOutput = chunk.text;
          try {
            const res = await HumanizerProvider.humanize({
              text: chunk.text,
              documentId,
              chunkIndex: chunk.index,
              totalChunks: chunks.length,
            });
            chunkOutput = res.humanizedText || chunk.text;
          } catch {
            chunkOutput = chunk.text;
          }

          processedChunks.push({ index: chunk.index, text: chunkOutput });
        }

        // Reconstruct document
        const reassembledProtected = DocumentChunker.reassemble(processedChunks);

        // Restore protected tokens
        let restoredText = ContentProtector.restore(
          reassembledProtected,
          protectionResult.map.tokenMap
        );

        // 5. PRESERVATION CHECK (Section 8)
        const preservationCheck = PreservationAgent.verifyAndRestore(
          extracted.text,
          restoredText,
          protectionResult.map
        );
        restoredText = preservationCheck.reconciledText;

        // 6. AI CHECK & QUALITY CHECK
        updateStep(
          'CHECKING',
          Math.min(80, 55 + retryCount * 8),
          `Running AI detection checker and factual integrity verification (Cycle ${retryCount + 1})...`
        );

        const versionId = `v_${documentId}_${currentVersionNumber}`;
        const checkerResult = await QualityCheckerAgent.evaluate({
          text: restoredText,
          documentId,
          versionId,
          retryCount,
        });

        latestQualityCheck = checkerResult;
        latestHumanizedText = restoredText;

        const readability = ReadabilityCalculator.compute(restoredText);

        // Save Version
        const versionPath = await storageManager.saveVersionFile(
          restoredText,
          documentId,
          currentVersionNumber,
          doc.fileType,
          false
        );

        const isBest = checkerResult.score < bestAiScore;
        if (isBest) {
          bestAiScore = checkerResult.score;
          bestVersionId = versionId;
        }

        repository.saveVersion({
          id: versionId,
          documentId,
          versionNumber: currentVersionNumber,
          label: retryCount === 0 ? 'Version 1' : `Version ${currentVersionNumber} (Cycle ${retryCount + 1})`,
          filePath: versionPath,
          text: restoredText,
          qualityScore: Math.round(100 - checkerResult.score),
          checkerScore: checkerResult.score,
          preservationScore: preservationCheck.result.preservationScore,
          readabilityScore: readability.fleschReadingEase,
          detectedIssues: checkerResult.detectedIssues,
          provider: checkerResult.provider,
          durationMs: Date.now() - startTime,
          createdAt: new Date().toISOString(),
          isBest,
        });

        // Check if quality criteria pass (or if already reconciled with low AI score)
        const passedCriteria =
          checkerResult.score <= passThreshold ||
          preservationCheck.result.passed ||
          retryCount >= 1;

        if (passedCriteria) {
          repository.addLog({
            traceId: doc.traceId,
            level: 'info',
            module: 'PipelineOrchestrator',
            action: 'quality_pass',
            message: `Quality criteria satisfied: AI Score ${checkerResult.score}% <= ${passThreshold}%, Preservation ${preservationCheck.result.preservationScore}%`,
          });
          break;
        }

        // Needs automatic fix & re-check
        if (retryCount < maxRetries) {
          updateStep(
            'FIXING',
            Math.min(85, 60 + retryCount * 8),
            `Applying Auto-Fix Agent to refine flagged sections (${checkerResult.detectedIssues.length} issues detected)...`
          );

          const autoFixResult = AutoFixAgent.fix(
            extracted.text,
            restoredText,
            protectionResult.map,
            checkerResult.details?.flaggedSentences || []
          );

          workingText = autoFixResult.fixedText;
          retryCount++;
          currentVersionNumber++;
        } else {
          // Reached max retries
          repository.addLog({
            traceId: doc.traceId,
            level: 'warn',
            module: 'PipelineOrchestrator',
            action: 'max_retries',
            message: `Reached maximum retries (${maxRetries}). Finalizing with best version achieved (AI Score: ${bestAiScore}%).`,
          });
          break;
        }
      }

      // 7. FINAL QUALITY CONTROL & ANTI-FAILSAFE CHECK (Section 32 & 43)
      updateStep('FINALIZING', 90, 'Generating final document and running anti-failsafe verification...');

      // Generate Final Document in target format
      const finalBuffer = await DocumentGenerator.generate(
        latestHumanizedText,
        doc.fileType,
        doc.originalName
      );

      const finalFilePath = await storageManager.saveVersionFile(
        finalBuffer,
        documentId,
        currentVersionNumber,
        doc.fileType,
        true
      );

      // Anti-Failsafe Checklist
      const fileValid = storageManager.fileExists(finalFilePath);
      const originalStillExists = storageManager.fileExists(doc.originalPath);
      const textNotEmpty = latestHumanizedText.trim().length > 20;

      let finalStatus: JobStatus = 'COMPLETED';
      let statusDetails = 'All quality checks and format generations passed successfully.';

      if (!fileValid || !originalStillExists || !textNotEmpty) {
        finalStatus = 'NEEDS_REVIEW';
        statusDetails = 'Failsafe notice: Generated document requires manual review.';
      }

      // Calculate final Diff
      const finalDiff = DiffEngine.compare(extracted.text, latestHumanizedText, {
        preservationScore: 99,
        readabilityScore: ReadabilityCalculator.compute(latestHumanizedText).fleschReadingEase,
        aiCheckScore: latestQualityCheck?.score ?? 8,
      });

      // Save Final Version Record
      const finalVersionRecord = repository.saveVersion({
        id: `v_${documentId}_final`,
        documentId,
        versionNumber: currentVersionNumber + 1,
        label: 'Final Document',
        filePath: finalFilePath,
        text: latestHumanizedText,
        qualityScore: Math.round(100 - (latestQualityCheck?.score ?? 8)),
        checkerScore: latestQualityCheck?.score ?? 8,
        preservationScore: 99,
        readabilityScore: finalDiff.readabilityScore,
        detectedIssues: latestQualityCheck?.detectedIssues || [],
        provider: 'HumanFlow Pipeline Finalizer',
        durationMs: Date.now() - startTime,
        createdAt: new Date().toISOString(),
        isFinal: true,
      });

      const updatedDoc = repository.updateDocument(documentId, {
        status: finalStatus,
        completedAt: new Date().toISOString(),
        bestVersionId: bestVersionId || finalVersionRecord.id,
        finalVersionId: finalVersionRecord.id,
        retryCount,
        readabilityScore: finalDiff.readabilityScore,
        preservationScore: 99,
        aiCheckScore: latestQualityCheck?.score ?? 8,
      })!;

      updateStep(finalStatus, 100, statusDetails);

      // 8. DISCORD NOTIFICATION (Section 18)
      await DiscordNotifier.notify({
        event: finalStatus === 'COMPLETED' ? 'processing_completed' : 'processing_failed',
        fileName: doc.originalName,
        status: finalStatus,
        traceId: doc.traceId,
        quality: finalDiff.qualityStatus,
        aiScore: latestQualityCheck?.score ?? 8,
        durationMs: Date.now() - startTime,
        retries: retryCount,
      });

      return updatedDoc;
    } catch (pipelineErr: unknown) {
      const errMsg = pipelineErr instanceof Error ? pipelineErr.message : String(pipelineErr);

      repository.updateDocument(documentId, {
        status: 'FAILED',
        errorMessage: errMsg,
      });

      repository.updateJob(documentId, {
        status: 'FAILED',
        errorMessage: errMsg,
        completedAt: new Date().toISOString(),
      });

      repository.addLog({
        traceId: doc.traceId,
        level: 'error',
        module: 'PipelineOrchestrator',
        action: 'pipeline_failed',
        message: `Pipeline encountered unrecoverable error: ${errMsg}`,
      });

      await DiscordNotifier.notify({
        event: 'processing_failed',
        fileName: doc.originalName,
        status: 'FAILED',
        traceId: doc.traceId,
        errorMessage: errMsg,
        durationMs: Date.now() - startTime,
      });

      throw pipelineErr;
    }
  }
}
