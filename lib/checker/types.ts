export interface CheckerRequest {
  text: string;
  documentId: string;
  versionId: string;
  traceId?: string;
  retryIteration?: number;
}

export interface CheckerResponse {
  score: number; // Estimated AI probability percentage (0 - 100, lower is better, e.g., 6%)
  confidence: number; // 0 - 100
  status: 'PASS' | 'WARNING' | 'FAIL';
  detectedIssues: string[];
  providerName: string;
  timestamp: string;
  durationMs: number;
}

export interface CheckerProviderConfig {
  mode: 'DEMO' | 'LIVE';
  apiUrl: string;
  apiKey: string;
  responsePath: string;
  timeoutMs: number;
}
