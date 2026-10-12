export interface HumanizeRequest {
  text: string;
  documentId: string;
  chunkIndex?: number;
  totalChunks?: number;
  context?: {
    documentType?: string;
    tone?: string;
    preservedTokensCount?: number;
  };
}

export interface HumanizeResponse {
  humanizedText: string;
  provider: string;
  model: string;
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  rawResponse?: unknown;
}

export interface HumanizerClientConfig {
  apiUrl: string;
  apiKey: string;
  model: string;
  responsePath?: string;
  authHeader?: string;
  authPrefix?: string;
  timeoutMs?: number;
}
