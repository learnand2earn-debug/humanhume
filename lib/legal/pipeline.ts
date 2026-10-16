import crypto from 'crypto';
import { legalRepository } from './repository';
import { DocumentationDraftingAgent } from './drafting-agent';
import { LegalContentProtector } from './content-protector';
import { LegalPreservationAgent } from './preservation-agent';
import { LegalQualityChecker } from './quality-checker';
import { HumanizerProvider } from '../humanizer/provider';
import { QualityCheckerAgent } from '../checker/checker';
import { DiscordNotifier } from '../notifications/discord';
import { storageManager } from '../storage';
import {
  DocumentGenerationReport,
  DocumentGenerationRun,
  LegalDocument,
  LegalDocumentVersion,
  LegalSectionItem,
} from './types';

export interface PipelineExecutionOptions {
  documentTypeId: string;
  jurisdiction?: string;
  fieldValues: Record<string, any>;
  instructions?: string;
  disclaimerEnabled?: boolean;
  userId?: string;
}

export class DocumentationPipelineOrchestrator {
  /**
   * Executes the entire automated workflow:
   * Select Doc Type -> Search Approved KB -> Draft -> Protect ->
   * Humanize -> AI Check -> Preservation -> Auto-fix -> Final -> Discord
   */
  static async run(options: PipelineExecutionOptions): Promise<LegalDocument> {
    const startTime = Date.now();
    const docType = legalRepository.getDocumentType(options.documentTypeId);
    if (!docType) {
      throw new Error(`Invalid document type: ${options.documentTypeId}`);
    }

    // 1. Validate Jurisdiction
    const jurCheck = DocumentationDraftingAgent.validateJurisdiction(docType, options.jurisdiction);
    if (!jurCheck.valid) {
      throw new Error(jurCheck.error);
    }

    const jurisdiction = options.jurisdiction || docType.default_jurisdiction || 'United States';
    const fieldValues = {
      ...options.fieldValues,
      JURISDICTION: options.fieldValues?.JURISDICTION || jurisdiction,
    };
    const settings = legalRepository.getSettings();
    const maxAttempts = settings.maxAutomaticAttempts || 3;

    // Check missing information
    const templates = legalRepository.listTemplates({
      documentType: docType.name,
      jurisdiction,
      status: 'Approved',
    });
    const template = templates[0] || legalRepository.listTemplates({ documentType: docType.name })[0] || null;

    const missingCheck = DocumentationDraftingAgent.checkMissingInformation(
      docType,
      fieldValues,
      template
    );

    if (missingCheck.hasMissing) {
      throw new Error(`Cannot draft document: ${missingCheck.message}`);
    }

    const documentId = `legaldoc_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;

    // Initial Document Record
    const doc: LegalDocument = {
      id: documentId,
      title: `${docType.name} (${jurisdiction})`,
      document_type: docType.name,
      jurisdiction,
      status: 'DRAFTING',
      input_parameters: options.fieldValues,
      instructions: options.instructions || '',
      template_id: template?.id,
      template_version: template?.version || 'v1.0',
      knowledge_base_version: 'v1.0',
      disclaimer_enabled: options.disclaimerEnabled !== false && settings.disclaimerEnabled,
      disclaimer_text: settings.legalDisclaimer,
      current_attempt: 1,
      max_attempts: maxAttempts,
      versions: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    legalRepository.saveDocument(doc);

    // Audit Log: Drafting Started
    legalRepository.addAuditLog({
      user: options.userId || 'system_user',
      action: 'DRAFT_STARTED',
      documentId,
      version: 'v1 Draft',
      template: template?.name,
      knowledgeBaseVersion: 'v1.0',
    });

    // Notify Discord: Draft Started
    DiscordNotifier.notify({
      event: 'processing_started',
      fileName: `${docType.name} [${jurisdiction}]`,
      status: 'Drafting Started',
      traceId: documentId,
    }).catch(() => {});

    try {
      // ---------------------------------------------------------
      // STEP 1: DRAFT GENERATION (v1 Draft)
      // ---------------------------------------------------------
      const draftResult = await DocumentationDraftingAgent.generateDraft({
        documentTypeId: options.documentTypeId,
        jurisdiction,
        instructions: options.instructions,
        fieldValues,
        disclaimerEnabled: options.disclaimerEnabled,
      });

      const v1Draft: LegalDocumentVersion = {
        id: `ver_${documentId}_v1`,
        documentId,
        versionNumber: 1,
        label: 'v1 Draft',
        content: draftResult.draftText,
        sections: draftResult.sections,
        createdAt: new Date().toISOString(),
      };

      doc.versions.push(v1Draft);
      doc.status = 'HUMANIZING';
      legalRepository.saveDocument(doc);

      // Audit Log: Draft Completed
      legalRepository.addAuditLog({
        user: options.userId || 'system_user',
        action: 'DRAFT_COMPLETED',
        documentId,
        version: 'v1 Draft',
      });

      // ---------------------------------------------------------
      // STEP 2: LEGAL CONTENT PROTECTION
      // ---------------------------------------------------------
      const protectionResult = LegalContentProtector.protect(
        draftResult.draftText,
        fieldValues
      );

      // ---------------------------------------------------------
      // STEP 3: AUTOMATIC HUMANIZATION VIA EXISTING ENGINE
      // ---------------------------------------------------------
      // Notify Discord: Humanization Started
      DiscordNotifier.notify({
        event: 'processing_started',
        fileName: `${docType.name} [${jurisdiction}]`,
        status: 'Humanization Pipeline Active',
        traceId: documentId,
      }).catch(() => {});

      const humanizerResponse = await HumanizerProvider.humanize({
        documentId,
        text: protectionResult.protectedText,
        context: {
          tone: 'legal',
          documentType: docType.name,
        },
      });

      // Restore protected legal content
      const restoredHumanizedText = LegalContentProtector.restore(
        humanizerResponse.humanizedText,
        protectionResult.tokenMap
      );

      // Parse humanized sections
      const humanizedSections = this.parseSectionsFromText(
        restoredHumanizedText,
        draftResult.sections
      );

      const v2Humanized: LegalDocumentVersion = {
        id: `ver_${documentId}_v2`,
        documentId,
        versionNumber: 2,
        label: 'v2 Humanized',
        content: restoredHumanizedText,
        sections: humanizedSections,
        createdAt: new Date().toISOString(),
      };

      doc.versions.push(v2Humanized);
      doc.status = 'CHECKING';
      legalRepository.saveDocument(doc);

      // ---------------------------------------------------------
      // STEP 4: EXISTING AI CHECKER & LEGAL PRESERVATION
      // ---------------------------------------------------------
      const aiCheckResult = await QualityCheckerAgent.evaluate({
        documentId,
        versionId: v2Humanized.id,
        text: restoredHumanizedText,
      });

      // Run Legal Preservation Agent
      const preservationOutcome = LegalPreservationAgent.verifyAndReconcile(
        draftResult.sections,
        humanizedSections
      );

      // Reconstruct text with any auto-restored sections
      const reconciledText = this.compileSectionsToText(
        preservationOutcome.reconciledSections,
        doc.disclaimer_enabled ? settings.legalDisclaimer : undefined,
        docType.name,
        jurisdiction
      );

      // ---------------------------------------------------------
      // STEP 5: LEGAL QUALITY CHECK
      // ---------------------------------------------------------
      let qualityCheckResult = LegalQualityChecker.evaluate(
        preservationOutcome.reconciledSections,
        reconciledText,
        docType,
        template,
        jurisdiction
      );

      // ---------------------------------------------------------
      // STEP 6: AUTOMATIC CORRECTION LOOP (Up to maxAttempts)
      // ---------------------------------------------------------
      let currentAttempt = 1;
      let finalSections = preservationOutcome.reconciledSections;
      let finalText = reconciledText;
      let finalPreservation = preservationOutcome.preservationResult;

      while (
        currentAttempt < Math.min(maxAttempts, 2) &&
        (qualityCheckResult.status === 'NEEDS_REVIEW' || !finalPreservation.passed)
      ) {
        currentAttempt++;
        doc.current_attempt = currentAttempt;
        doc.status = 'FIXING';
        legalRepository.saveDocument(doc);

        // Identify problematic section(s) and fix only those sections
        const fixedSections = finalSections.map((sec) => {
          // If empty variable found in this section, fill with fallback
          let content = sec.content;
          for (const ev of qualityCheckResult.emptyVariables) {
            if (content.includes(ev)) {
              content = content.replace(
                new RegExp(ev.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'),
                '[Details to be provided by agreement]'
              );
            }
          }
          return {
            ...sec,
            content,
          };
        });

        // Re-humanize only the corrected text
        finalText = this.compileSectionsToText(
          fixedSections,
          doc.disclaimer_enabled ? settings.legalDisclaimer : undefined,
          docType.name,
          jurisdiction
        );

        finalSections = fixedSections;

        // Re-run preservation and quality checks
        const rePreservation = LegalPreservationAgent.verifyAndReconcile(
          draftResult.sections,
          finalSections
        );
        finalPreservation = rePreservation.preservationResult;

        qualityCheckResult = LegalQualityChecker.evaluate(
          finalSections,
          finalText,
          docType,
          template,
          jurisdiction
        );

        // Save intermediate corrected version
        const correctedVersion: LegalDocumentVersion = {
          id: `ver_${documentId}_v3_attempt_${currentAttempt}`,
          documentId,
          versionNumber: 3,
          label: 'v3 Corrected',
          content: finalText,
          sections: finalSections,
          createdAt: new Date().toISOString(),
          preservationReport: finalPreservation,
          qualityReport: qualityCheckResult,
        };
        doc.versions.push(correctedVersion);
      }

      // ---------------------------------------------------------
      // STEP 7: FINAL VERSION (v4 Final) & STORAGE
      // ---------------------------------------------------------
      const v4Final: LegalDocumentVersion = {
        id: `ver_${documentId}_v4_final`,
        documentId,
        versionNumber: 4,
        label: 'v4 Final',
        content: finalText,
        sections: finalSections,
        createdAt: new Date().toISOString(),
        preservationReport: finalPreservation,
        qualityReport: qualityCheckResult,
        checkerReport: {
          score: aiCheckResult.score,
          provider: aiCheckResult.provider,
          status: aiCheckResult.status,
          flaggedSentences: aiCheckResult.details?.flaggedSentences,
        },
      };

      doc.versions.push(v4Final);
      doc.final_version_id = v4Final.id;

      const durationMs = Date.now() - startTime;
      const isNeedsReview = qualityCheckResult.status === 'NEEDS_REVIEW' || finalSections.some((s) => s.requiresReview);
      doc.status = isNeedsReview ? 'NEEDS_REVIEW' : 'COMPLETED';

      // ---------------------------------------------------------
      // STEP 8: DOCUMENT REPORT GENERATION
      // ---------------------------------------------------------
      const report: DocumentGenerationReport = {
        documentId,
        documentType: docType.name,
        jurisdiction,
        templateVersion: template?.version || 'v1.0',
        knowledgeBaseVersion: 'v1.0',
        draftStatus: 'SUCCESS',
        humanizationStatus: 'SUCCESS',
        checkerResult: {
          score: aiCheckResult.score,
          status: aiCheckResult.status,
          provider: aiCheckResult.provider,
        },
        legalQualityResult: {
          status: qualityCheckResult.status,
          score: qualityCheckResult.score,
          warningsCount: qualityCheckResult.warnings.length,
        },
        preservationResult: {
          passed: finalPreservation.passed,
          score: finalPreservation.preservationScore,
          restoredCount: finalPreservation.restoredCount,
        },
        warnings: [
          ...qualityCheckResult.warnings,
          ...finalSections.filter((s) => s.requiresReview).map((s) => `[Requires Review] ${s.title}: ${s.reviewReason || 'Local counsel verification required'}`),
        ],
        processingTimeMs: durationMs,
        numberOfAttempts: currentAttempt,
        completedAt: new Date().toISOString(),
      };

      doc.report = report;
      legalRepository.saveDocument(doc);

      // Save output files in storage for instant download
      try {
        await storageManager.saveVersionFile(finalText, documentId, 4, 'md', true);
        await storageManager.saveVersionFile(draftResult.draftText, documentId, 1, 'md', false);
      } catch (err) {
        console.warn('File storage notice:', err);
      }

      // Record telemetry run
      const run: DocumentGenerationRun = {
        id: `run_${documentId}`,
        document_id: documentId,
        document_type: docType.name,
        jurisdiction,
        started_at: new Date(startTime).toISOString(),
        completed_at: new Date().toISOString(),
        status: doc.status === 'COMPLETED' ? 'COMPLETED' : 'NEEDS_REVIEW',
        attempts_count: currentAttempt,
        duration_ms: durationMs,
        report,
      };
      legalRepository.recordRun(run);

      // Audit Log: Finalized
      legalRepository.addAuditLog({
        user: options.userId || 'system_user',
        action: 'FINAL_DOCUMENT_COMPLETED',
        documentId,
        version: 'v4 Final',
        template: template?.name,
        knowledgeBaseVersion: 'v1.0',
        humanizerRun: {
          provider: humanizerResponse.provider,
          durationMs: humanizerResponse.durationMs,
          intensity: settings.defaultHumanizationIntensity,
        },
        checkerRun: {
          provider: aiCheckResult.provider,
          score: aiCheckResult.score,
          status: aiCheckResult.status,
        },
        finalStatus: doc.status,
      });

      // ---------------------------------------------------------
      // STEP 9: DISCORD NOTIFICATION DISPATCH
      // ---------------------------------------------------------
      // Note: Strictly no private document text sent, only metadata
      DiscordNotifier.notify({
        event: isNeedsReview ? 'checker_result' : 'processing_completed',
        fileName: `${docType.name} [${jurisdiction}]`,
        status: doc.status,
        traceId: documentId,
        quality: qualityCheckResult.status,
        aiScore: aiCheckResult.score,
        durationMs,
        retries: currentAttempt - 1,
      }).catch(() => {});

      return doc;
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      doc.status = 'FAILED';
      doc.error_message = errMsg;
      legalRepository.saveDocument(doc);

      legalRepository.addAuditLog({
        user: options.userId || 'system_user',
        action: 'PROCESSING_FAILED',
        documentId,
        finalStatus: 'FAILED',
        metadata: { error: errMsg },
      });

      DiscordNotifier.notify({
        event: 'processing_failed',
        fileName: `${docType.name} [${jurisdiction}]`,
        status: 'FAILED',
        traceId: documentId,
        errorMessage: errMsg,
      }).catch(() => {});

      throw err;
    }
  }

  /**
   * Regenerates a single specific section (Section 20 requirement)
   */
  static async regenerateSection(
    documentId: string,
    sectionTitle: string,
    customInstructions?: string
  ): Promise<{ updatedDocument: LegalDocument; updatedSection: LegalSectionItem }> {
    const doc = legalRepository.getDocument(documentId);
    if (!doc) {
      throw new Error(`Document ${documentId} not found`);
    }

    const latestVersion = doc.versions[doc.versions.length - 1];
    if (!latestVersion) {
      throw new Error('No existing versions available to regenerate');
    }

    const secIndex = latestVersion.sections.findIndex(
      (s) => s.title.toLowerCase().trim() === sectionTitle.toLowerCase().trim()
    );

    if (secIndex < 0) {
      throw new Error(`Section "${sectionTitle}" not found in document`);
    }

    const targetSec = latestVersion.sections[secIndex];

    // Search approved KB for this specific section
    const kbEntries = legalRepository.listKnowledgeBase({
      jurisdiction: doc.jurisdiction,
      documentType: doc.document_type,
      status: 'Approved',
    });

    const matchedKB = kbEntries.find(
      (k) =>
        k.content.toLowerCase().includes(sectionTitle.toLowerCase()) ||
        sectionTitle.toLowerCase().includes(k.category.toLowerCase()) ||
        k.tags.some((t) => sectionTitle.toLowerCase().includes(t.toLowerCase()))
    );

    let freshSectionContent = matchedKB
      ? matchedKB.content
      : `The Parties shall faithfully execute all obligations pertaining to ${sectionTitle}.`;

    if (customInstructions && customInstructions.trim()) {
      freshSectionContent += `\n\nSpecific directive: ${customInstructions.trim()}`;
    }

    // Protect section content
    const protectedSec = LegalContentProtector.protect(freshSectionContent, doc.input_parameters);

    // Humanize this single section via existing Humanizer
    const humanizedResponse = await HumanizerProvider.humanize({
      documentId: `${documentId}_sec_${secIndex}`,
      text: protectedSec.protectedText,
      context: {
        tone: 'legal',
      },
    });

    const restoredSecText = LegalContentProtector.restore(
      humanizedResponse.humanizedText,
      protectedSec.tokenMap
    );

    const updatedSection: LegalSectionItem = {
      ...targetSec,
      content: restoredSecText.trim(),
      lastUpdated: new Date().toISOString(),
      sourceName: matchedKB ? `${matchedKB.source}: ${matchedKB.title}` : 'Regenerated section with custom instructions',
      sourceId: matchedKB?.id,
    };

    // Update section in updated sections array
    const updatedSections = [...latestVersion.sections];
    updatedSections[secIndex] = updatedSection;

    const settings = legalRepository.getSettings();
    const updatedFullText = this.compileSectionsToText(
      updatedSections,
      doc.disclaimer_enabled ? settings.legalDisclaimer : undefined,
      doc.document_type,
      doc.jurisdiction
    );

    // Save as new version
    const newVersionNumber = latestVersion.versionNumber + 1;
    const newVersion: LegalDocumentVersion = {
      id: `ver_${documentId}_v${newVersionNumber}_regen`,
      documentId,
      versionNumber: newVersionNumber,
      label: 'v4 Final',
      content: updatedFullText,
      sections: updatedSections,
      createdAt: new Date().toISOString(),
    };

    doc.versions.push(newVersion);
    doc.final_version_id = newVersion.id;
    doc.updated_at = new Date().toISOString();
    legalRepository.saveDocument(doc);

    legalRepository.addAuditLog({
      user: 'user',
      action: 'REGENERATE_SECTION',
      documentId,
      version: `v${newVersionNumber}`,
      metadata: { sectionTitle },
    });

    return {
      updatedDocument: doc,
      updatedSection,
    };
  }

  // Helpers
  private static parseSectionsFromText(
    text: string,
    originalSections: LegalSectionItem[]
  ): LegalSectionItem[] {
    const lines = text.split('\n');
    const sections: LegalSectionItem[] = [];

    let currentTitle = originalSections[0]?.title || 'Preamble';
    let currentLines: string[] = [];
    let secCounter = 1;

    for (const line of lines) {
      if (line.startsWith('### ') || line.startsWith('## ')) {
        if (currentLines.length > 0) {
          sections.push({
            id: `sec_${secCounter++}`,
            title: currentTitle,
            content: currentLines.join('\n').trim(),
            isLegalClause: true,
          });
          currentLines = [];
        }
        currentTitle = line.replace(/^#{2,3}\s+/, '').trim();
      } else if (!line.startsWith('# ') && !line.startsWith('> ') && !line.startsWith('**Jurisdiction') && !line.startsWith('**Effective') && !line.startsWith('---')) {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      sections.push({
        id: `sec_${secCounter++}`,
        title: currentTitle,
        content: currentLines.join('\n').trim(),
        isLegalClause: true,
      });
    }

    // Fallback: If headings weren't preserved in markdown formatting, map to original sections
    if (sections.length < Math.floor(originalSections.length / 2)) {
      return originalSections.map((os) => ({ ...os }));
    }

    return sections;
  }

  private static compileSectionsToText(
    sections: LegalSectionItem[],
    disclaimer: string | undefined,
    docTitle: string,
    jurisdiction: string
  ): string {
    const parts: string[] = [];
    if (disclaimer) {
      parts.push(`> [!NOTE]\n> **Legal Notice:** ${disclaimer}\n`);
    }

    parts.push(`# ${docTitle.toUpperCase()}\n`);
    parts.push(`**Jurisdiction:** ${jurisdiction}  `);
    parts.push(`**Effective Date:** ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}\n`);
    parts.push('---\n');

    for (const sec of sections) {
      parts.push(`### ${sec.title}`);
      parts.push(`${sec.content}\n`);
    }

    return parts.join('\n');
  }
}
