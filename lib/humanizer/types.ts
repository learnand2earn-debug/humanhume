export interface HumanizerRequest {
  text: string;
  intensity: 'LOW' | 'NORMAL';
  isLegalClause?: boolean;
  protectedTokens?: string[];
  model?: string;
  traceId?: string;
}

export interface HumanizerResponse {
  success: boolean;
  humanizedText: string;
  provider: string;
  model: string;
  durationMs: number;
  rawStatus: number;
  usedFallback: boolean;
  errorMessage?: string;
}

export interface HumanizerProviderConfig {
  mode: 'DEMO' | 'LIVE';
  apiUrl: string;
  apiKey: string;
  model: string;
  responsePath: string; // e.g., "data.text" or "choices.0.message.content" or "output"
  timeoutMs: number;
}
