import { repository } from '../db/repository';

export class ErrorRecoveryAgent {
  /**
   * Evaluates an error, determines if it is safely retryable, and calculates
   * appropriate backoff delay.
   */
  static isRetryable(error: unknown): boolean {
    if (!error) return false;
    const msg = error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();

    // Safe retryable patterns
    const retryablePatterns = [
      'timeout',
      'timed out',
      'time out',
      'econnreset',
      'etimedout',
      'rate limit',
      '429',
      '503',
      '502',
      '504',
      'network',
      'temporary',
      'socket hang up',
      'fetch failed',
    ];

    return retryablePatterns.some((pattern) => msg.includes(pattern));
  }

  /**
   * Applies exponential backoff delay: 1000ms * 2^attempt + jitter
   */
  static async waitBackoff(attempt: number, maxDelayMs = 15000): Promise<number> {
    const base = Math.min(maxDelayMs, 1000 * Math.pow(2, attempt));
    const jitter = Math.random() * 500;
    const delay = Math.round(base + jitter);

    await new Promise((resolve) => setTimeout(resolve, delay));
    return delay;
  }

  /**
   * Logs recovery attempt safely without logging sensitive payloads.
   */
  static logRecovery(traceId: string, action: string, error: unknown, attempt: number) {
    const msg = error instanceof Error ? error.message : String(error);
    repository.addLog({
      traceId,
      level: 'warn',
      module: 'ErrorRecoveryAgent',
      action,
      message: `Recovery triggered on attempt ${attempt}: ${msg.slice(0, 200)}`,
    });
  }
}
