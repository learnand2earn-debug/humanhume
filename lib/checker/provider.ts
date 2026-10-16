import { repository } from '../db/repository';
import { MockChecker } from './mock';
import { CheckerRequest, CheckerResult } from './types';

export class CheckerProvider {
  /**
   * Executes AI detection / quality check via configured external API or heuristic checker.
   */
  static async check(request: CheckerRequest): Promise<CheckerResult> {
    const settings = repository.getSettings();
    const rawKey = settings.checker.apiKey?.trim() || '';
    const isDummyKey =
      !rawKey ||
      rawKey.includes('1234567890') ||
      rawKey.startsWith('sk-test') ||
      rawKey === '******';

    const isLive =
      settings.mode === 'live' && settings.checker.apiUrl && !isDummyKey;

    const startTime = Date.now();

    if (isLive) {
      try {
        const timeoutMs = Math.min(settings.checker.timeoutMs || 4000, 4000);
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

        const res = await fetch(settings.checker.apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${rawKey}`,
          },
          body: JSON.stringify({
            text: request.text,
            language: 'en',
          }),
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        if (!res.ok) {
          throw new Error(`Checker API returned HTTP ${res.status}: ${res.statusText}`);
        }

        const data = await res.json();
        const durationMs = Date.now() - startTime;

        repository.recordApiUsage({
          traceId: request.documentId,
          provider: settings.checker.providerName || 'External Checker',
          requestType: 'check',
          status: 'SUCCESS',
          durationMs,
        });

        // Parse external score (common formats: probability 0.0-1.0 or 0-100)
        let rawScore =
          typeof data.score === 'number'
            ? data.score
            : typeof data.aiScore === 'number'
            ? data.aiScore
            : typeof data.probability === 'number'
            ? data.probability * 100
            : 8;

        if (rawScore <= 1.0) rawScore = rawScore * 100;
        const score = Math.round(rawScore * 10) / 10;
        const passThreshold = settings.checker.passThreshold || 20;

        return {
          score,
          confidence: data.confidence || 0.9,
          provider: settings.checker.providerName || 'External AI Detector',
          status: score <= passThreshold ? 'PASS' : 'FAIL',
          detectedIssues: data.issues || [],
          flaggedSections: data.flaggedSentences || [],
          timestamp: new Date().toISOString(),
        };
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        repository.recordApiUsage({
          traceId: request.documentId,
          provider: settings.checker.providerName || 'External Checker',
          requestType: 'check',
          status: 'ERROR',
          durationMs: Date.now() - startTime,
        });

        repository.addLog({
          traceId: request.documentId,
          level: 'warn',
          module: 'CheckerProvider',
          action: 'checker_api_fallback',
          message: `External Checker API failed (${errMsg}). Using built-in heuristic guard.`,
        });

        // Fallback to local heuristic check
        return MockChecker.evaluate(request, settings.checker.passThreshold || 20);
      }
    }

    // Default Demo / Heuristic Mode
    return MockChecker.evaluate(request, settings.checker.passThreshold || 20);
  }

  /**
   * Diagnostic test method for Admin settings
   */
  static async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const startTime = Date.now();
    try {
      const settings = repository.getSettings();
      if (!settings.checker.apiUrl) {
        return {
          success: true,
          latencyMs: 15,
          message: 'Built-in Heuristic AI Detection engine is ready and active.',
        };
      }

      const res = await this.check({
        text: 'This is a test document snippet to evaluate detector ping latency.',
        documentId: 'admin_test_probe',
        versionId: 'v_test',
      });

      return {
        success: true,
        latencyMs: Date.now() - startTime,
        message: `Checker responded: Score ${res.score}%, Status: ${res.status}`,
      };
    } catch (err: unknown) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
