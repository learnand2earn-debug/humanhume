import { repository } from '../db/repository';
import { QualityCheckResult } from '../types';
import { CheckerProvider } from './provider';
import { CheckerRequest } from './types';

export class QualityCheckerAgent {
  /**
   * Evaluates humanized document text for AI detection markers and quality standards.
   */
  static async evaluate(request: CheckerRequest): Promise<QualityCheckResult> {
    const rawResult = await CheckerProvider.check(request);

    const record: QualityCheckResult = {
      id: `qc_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      documentId: request.documentId,
      versionId: request.versionId,
      provider: rawResult.provider,
      score: rawResult.score,
      confidence: rawResult.confidence,
      status: rawResult.status,
      detectedIssues: rawResult.detectedIssues,
      details: {
        perplexity: rawResult.perplexityScore,
        burstiness: rawResult.burstinessScore,
        flaggedSentences: rawResult.flaggedSections,
      },
      timestamp: rawResult.timestamp,
    };

    // Save record to repository
    repository.saveQualityCheck(record);

    return record;
  }
}
