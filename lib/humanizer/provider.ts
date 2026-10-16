import { repository } from '../db/repository';
import { HumanizerClient } from './client';
import { MockHumanizer } from './mock';
import { HumanizeRequest, HumanizeResponse } from './types';

export class HumanizerProvider {
  private static failedEndpoints = new Set<string>();

  /**
   * Humanizes the given request, delegating to the live API or mock engine
   * according to Admin settings and connectivity.
   */
  static async humanize(request: HumanizeRequest): Promise<HumanizeResponse> {
    const settings = repository.getSettings();
    const rawKey = settings.humanizer.apiKey?.trim() || '';
    const isDummyKey =
      !rawKey ||
      rawKey.includes('1234567890') ||
      rawKey.startsWith('sk-test') ||
      rawKey === '******';

    const isLive =
      settings.mode === 'live' &&
      settings.humanizer.apiUrl &&
      !isDummyKey &&
      !this.failedEndpoints.has(request.documentId);

    const startTime = Date.now();

    if (isLive) {
      try {
        const client = new HumanizerClient({
          apiUrl: settings.humanizer.apiUrl,
          apiKey: rawKey,
          model: settings.humanizer.model,
          responsePath: settings.humanizer.responsePath,
          authHeader: settings.humanizer.authHeader,
          authPrefix: settings.humanizer.authPrefix,
          timeoutMs: Math.min(settings.humanizer.timeoutMs || 6000, 6000),
        });

        const res = await client.humanize(request);

        repository.recordApiUsage({
          traceId: request.documentId,
          provider: 'Humanizer API Live',
          requestType: 'humanize',
          status: 'SUCCESS',
          durationMs: res.durationMs,
        });

        return res;
      } catch (err: unknown) {
        const errMsg = err instanceof Error ? err.message : String(err);
        repository.recordApiUsage({
          traceId: request.documentId,
          provider: 'Humanizer API Live',
          requestType: 'humanize',
          status: 'ERROR',
          durationMs: Date.now() - startTime,
        });

        repository.addLog({
          traceId: request.documentId,
          level: 'warn',
          module: 'HumanizerProvider',
          action: 'live_api_fallback',
          message: `Live Humanizer API failed (${errMsg}). Falling back to local engine.`,
        });

        this.failedEndpoints.add(request.documentId);

        // Fall back to safe local demo engine so pipeline does not crash
        return await MockHumanizer.humanize(request);
      }
    }

    // Default Demo Mode
    const res = await MockHumanizer.humanize(request);

    repository.recordApiUsage({
      traceId: request.documentId,
      provider: 'HumanFlow Local Engine (Demo)',
      requestType: 'humanize',
      status: 'SUCCESS',
      durationMs: res.durationMs,
    });

    return res;
  }
}
