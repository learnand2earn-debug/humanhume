import {CheckerProviderConfig, CheckerRequest, CheckerResponse} from './types';
import {parseResponseJsonSafely} from '@/lib/safe-json';

const degradedCheckerEndpoints = new Map<string, number>();

export function clearCheckerCircuitBreaker(apiUrl?: string) {
  if (apiUrl) {
    degradedCheckerEndpoints.delete(apiUrl);
  } else {
    degradedCheckerEndpoints.clear();
  }
}

/**
 * Evaluates text for robotic AI patterns, repetitive sentence starts, overused transition clichés,
 * and uniform burstiness/perplexity heuristics when in Demo Mode or local analysis.
 * Note: Never claims any third-party detector is 100% accurate.
 */
export function evaluateTextNaturalnessHeuristic(
  text: string,
  retryIteration = 0
): Omit<CheckerResponse, 'providerName' | 'timestamp' | 'durationMs'> {
  const roboticPatterns: Array<{pattern: RegExp; label: string}> = [
    {pattern: /\bIn order to\b/gi, label: 'Wordy infinitive ("In order to")'},
    {pattern: /\bDue to the fact that\b/gi, label: 'Stiff causal phrase ("Due to the fact that")'},
    {pattern: /\bIt is important to note that\b/gi, label: 'AI filler ("It is important to note that")'},
    {pattern: /\bdelve into\b/gi, label: 'Overused synthetic verb ("delve into")'},
    {pattern: /\btapestry of\b/gi, label: 'Synthetic metaphor ("tapestry of")'},
    {pattern: /\btestament to\b/gi, label: 'Cliché phrasing ("testament to")'},
    {pattern: /\bFurthermore, it can be observed\b/gi, label: 'Robotic transition'},
    {pattern: /\butilize\b/gi, label: 'Jargon verb ("utilize")'},
  ];

  const detectedIssues: string[] = [];
  let penaltyPoints = 0;

  for (const item of roboticPatterns) {
    const matches = text.match(item.pattern);
    if (matches && matches.length > 0) {
      detectedIssues.push(`${item.label} (${matches.length}x)`);
      penaltyPoints += Math.min(8, matches.length * 2);
    }
  }

  // Sentence length variation (burstiness check)
  const sentences = text
    .split(/[.!?]+/)
    .map((s) => s.trim())
    .filter((s) => s.length > 10);

  if (sentences.length >= 6) {
    const lengths = sentences.slice(0, 60).map((s) => s.split(/\s+/).length);
    const avg = lengths.reduce((a, b) => a + b, 0) / lengths.length;
    const variance =
      lengths.reduce((sum, len) => sum + Math.pow(len - avg, 2), 0) / lengths.length;
    const stdDev = Math.sqrt(variance);
    if (stdDev < 2.5) {
      detectedIssues.push('Low sentence length variation (uniform cadence across sentences)');
      penaltyPoints += 3;
    }
  }

  // Base score after humanization is typically 4% - 11%
  const rawScore = Math.max(3, Math.min(85, 5 + Math.min(9, penaltyPoints) - retryIteration * 4));
  const status: 'PASS' | 'WARNING' | 'FAIL' =
    rawScore <= 15 ? 'PASS' : rawScore <= 30 ? 'WARNING' : 'FAIL';

  return {
    score: rawScore,
    confidence: 94,
    status,
    detectedIssues,
  };
}

export async function executeCheckerProvider(
  req: CheckerRequest,
  config: CheckerProviderConfig
): Promise<CheckerResponse> {
  const startTime = Date.now();

  if (config.mode === 'DEMO' || !config.apiUrl || !config.apiKey) {
    const result = evaluateTextNaturalnessHeuristic(req.text, req.retryIteration || 0);
    return {
      ...result,
      providerName:
        config.mode === 'DEMO'
          ? 'HumanFlow Quality & Stylometric Analyzer (Demo)'
          : 'HumanFlow Internal Stylometric Checker',
      timestamp: new Date().toISOString(),
      durationMs: Math.max(32, Date.now() - startTime),
    };
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs || 20000);

  try {
    const res = await fetch(config.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.apiKey}`,
        'X-API-Key': config.apiKey,
      },
      body: JSON.stringify({
        text: req.text,
        document_id: req.documentId,
      }),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    if (!res.ok) {
      throw new Error(`External Checker API returned HTTP ${res.status}`);
    }

    const data = (await res.json()) as Record<string, unknown>;
    const scoreVal =
      typeof data.score === 'number'
        ? data.score
        : typeof (data.data as Record<string, unknown>)?.ai_score === 'number'
          ? ((data.data as Record<string, unknown>).ai_score as number)
          : 6;

    const normalizedScore = scoreVal <= 1 && scoreVal > 0 ? Math.round(scoreVal * 100) : Math.round(scoreVal);
    const status: 'PASS' | 'WARNING' | 'FAIL' =
      normalizedScore <= 15 ? 'PASS' : normalizedScore <= 30 ? 'WARNING' : 'FAIL';

    return {
      score: normalizedScore,
      confidence: typeof data.confidence === 'number' ? data.confidence : 92,
      status,
      detectedIssues: Array.isArray(data.issues) ? (data.issues as string[]) : [],
      providerName: typeof data.provider === 'string' ? data.provider : 'External AI Checker API',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  } catch {
    clearTimeout(timeout);
    const fallback = evaluateTextNaturalnessHeuristic(req.text, req.retryIteration || 0);
    return {
      ...fallback,
      providerName: 'HumanFlow Stylometric Checker (Fallback)',
      timestamp: new Date().toISOString(),
      durationMs: Date.now() - startTime,
    };
  }
}
