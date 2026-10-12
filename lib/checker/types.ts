export interface CheckerRequest {
  text: string;
  documentId: string;
  versionId: string;
  retryCount?: number;
}

export interface CheckerResult {
  score: number; // 0 - 100% (Probability that text is AI-generated)
  confidence: number; // 0.0 - 1.0
  provider: string;
  status: 'PASS' | 'FAIL' | 'REVIEW';
  detectedIssues: string[];
  flaggedSections: string[];
  timestamp: string;
  perplexityScore?: number;
  burstinessScore?: number;
}
