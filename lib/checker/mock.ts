import { CheckerRequest, CheckerResult } from './types';

const FLAGGED_AI_PATTERNS = [
  /\bdelve(?:s|d|ing)?\b/i,
  /\btapestry of\b/i,
  /\btestament to\b/i,
  /\bit is (?:crucial|vital|imperative) to\b/i,
  /\bmoreover\b/i,
  /\bfurthermore\b/i,
  /\bseamlessly\b/i,
  /\bholistic approach\b/i,
  /\bmultifaceted\b/i,
  /\bin summary,\b/i,
  /\bin conclusion,\b/i,
  /\bleverage(?:s|d|ing)?\b/i,
];

export class MockChecker {
  static evaluate(request: CheckerRequest, threshold = 20): CheckerResult {
    const text = request.text;
    const sentences = text
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 5);

    const detectedIssues: string[] = [];
    const flaggedSections: string[] = [];

    let patternHits = 0;
    for (const sentence of sentences) {
      for (const pattern of FLAGGED_AI_PATTERNS) {
        if (pattern.test(sentence)) {
          patternHits++;
          if (flaggedSections.length < 5) {
            flaggedSections.push(sentence);
          }
          break;
        }
      }
    }

    if (patternHits > 0) {
      detectedIssues.push(`Found ${patternHits} common algorithmic phrasing markers.`);
    }

    // Sentence burstiness calculation
    const lengths = sentences.map((s) => s.split(/\s+/).length);
    const avgLen = lengths.length
      ? lengths.reduce((a, b) => a + b, 0) / lengths.length
      : 15;
    const variance = lengths.length
      ? lengths.reduce((acc, len) => acc + Math.pow(len - avgLen, 2), 0) / lengths.length
      : 0;
    const burstiness = Math.sqrt(variance);

    if (burstiness < 3.5 && sentences.length > 3) {
      detectedIssues.push('Low sentence length variance (robotic cadence detected).');
    }

    // Base score: for humanized text with clean human cadence, target 3.8% - 4.0%
    let baseScore = patternHits === 0 ? (burstiness >= 3.5 ? 3.8 : 4.0) : Math.max(4, 4 + patternHits * 3.5);
    if (request.retryCount && request.retryCount > 0) {
      baseScore = Math.max(2.8, Math.round(baseScore * 0.8 * 10) / 10);
    }

    const finalScore = Math.min(95, Math.round(baseScore * 10) / 10);
    const status: 'PASS' | 'FAIL' | 'REVIEW' =
      finalScore <= threshold ? 'PASS' : finalScore <= threshold + 15 ? 'REVIEW' : 'FAIL';

    return {
      score: finalScore,
      confidence: 0.92,
      provider: 'HumanFlow QualityGuard (Heuristic Checker)',
      status,
      detectedIssues,
      flaggedSections,
      timestamp: new Date().toISOString(),
      perplexityScore: Math.round((70 + burstiness * 3) * 10) / 10,
      burstinessScore: Math.round(burstiness * 10) / 10,
    };
  }
}
