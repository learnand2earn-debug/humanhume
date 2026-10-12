export type SupportedFileType = 'docx' | 'pdf' | 'txt' | 'md' | 'rtf' | 'xlsx';

export type JobStatus =
  | 'QUEUED'
  | 'EXTRACTING'
  | 'ANALYZING'
  | 'PROTECTING'
  | 'HUMANIZING'
  | 'CHECKING'
  | 'FIXING'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'FAILED'
  | 'NEEDS_REVIEW'
  | 'PAUSED'
  | 'CANCELLED';

export interface ProtectedItem {
  id: string;
  type:
    | 'heading'
    | 'table'
    | 'list'
    | 'citation'
    | 'reference'
    | 'number'
    | 'percentage'
    | 'currency'
    | 'date'
    | 'url'
    | 'email'
    | 'code'
    | 'formula'
    | 'quote'
    | 'name'
    | 'term';
  originalText: string;
  placeholder: string;
  category: 'structural' | 'factual' | 'technical' | 'reference';
  startIndex?: number;
  endIndex?: number;
  metadata?: Record<string, unknown>;
}

export interface ProtectedContentMap {
  documentId: string;
  items: ProtectedItem[];
  tokenMap: Record<string, string>; // placeholder -> original
}

export interface DocumentRecord {
  id: string;
  userId: string;
  originalName: string;
  fileType: SupportedFileType;
  fileSize: number;
  originalPath: string;
  workingPath: string;
  status: JobStatus;
  traceId: string;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  errorMessage?: string;
  bestVersionId?: string;
  finalVersionId?: string;
  retryCount: number;
  maxRetries: number;
  readabilityScore?: number;
  preservationScore?: number;
  aiCheckScore?: number;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  label: string; // 'Original' | 'Version 1' | 'Version 2' | 'Auto-Fixed' | 'Final'
  filePath: string;
  text: string;
  qualityScore: number;
  checkerScore: number;
  preservationScore: number;
  readabilityScore: number;
  detectedIssues: string[];
  provider: string;
  durationMs: number;
  createdAt: string;
  isBest?: boolean;
  isFinal?: boolean;
}

export interface StepLog {
  step: JobStatus;
  label: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  timestamp: string;
  details?: string;
  durationMs?: number;
}

export interface ProcessingJob {
  id: string;
  documentId: string;
  traceId: string;
  status: JobStatus;
  currentStep: JobStatus;
  progressPercent: number;
  retryCount: number;
  maxRetries: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
  steps: StepLog[];
}

export interface QualityCheckResult {
  id: string;
  documentId: string;
  versionId: string;
  provider: string;
  score: number; // 0 - 100% (Probability of AI content)
  confidence: number; // 0 - 1.0
  status: 'PASS' | 'FAIL' | 'REVIEW';
  detectedIssues: string[];
  timestamp: string;
  details?: {
    perplexity?: number;
    burstiness?: number;
    flaggedSentences?: string[];
  };
  breakdown?: {
    perplexity?: number;
    burstiness?: number;
    flaggedSentences?: string[];
  };
}

export interface PreservationCheckResult {
  passed: boolean;
  preservationScore: number; // 0 - 100%
  restoredSectionsCount: number;
  issuesDetected: string[];
  restoredItems: Array<{
    type: string;
    original: string;
    altered: string;
    restored: boolean;
  }>;
}

export interface DiffChunk {
  type: 'unchanged' | 'added' | 'removed' | 'changed' | 'protected';
  text: string;
  oldText?: string;
  newText?: string;
  protectedItemType?: string;
}

export interface DocumentDiff {
  chunks: DiffChunk[];
  originalWordCount: number;
  humanizedWordCount: number;
  addedCount: number;
  removedCount: number;
  changedCount: number;
  protectedCount: number;
  preservationScore: number;
  readabilityScore: number;
  aiCheckScore: number;
  qualityStatus: 'PASS' | 'NEEDS_REVIEW' | 'FAIL';
}

export interface HumanizerConfig {
  apiUrl: string;
  apiKey?: string;
  model: string;
  responsePath: string;
  authHeader?: string;
  authPrefix?: string;
  timeoutMs?: number;
  chunkSize?: number;
}

export interface CheckerConfig {
  apiUrl: string;
  apiKey?: string;
  providerName: string;
  passThreshold: number; // AI score <= passThreshold is considered PASS (e.g. 20%)
  timeoutMs?: number;
}

export interface AdminSettings {
  mode: 'demo' | 'live';
  humanizer: HumanizerConfig;
  checker: CheckerConfig;
  discordWebhookUrl: string;
  maxRetries: number;
  maxFileSizeMb: number;
  retentionHours: number;
  autoFixEnabled: boolean;
  passThresholdScore: number;
  chunkSizeWords: number;
}

export interface SystemLog {
  id: string;
  traceId: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'security';
  module: string;
  action: string;
  message: string;
  metadata?: Record<string, unknown>;
}

export interface ApiUsageRecord {
  id: string;
  traceId: string;
  provider: string;
  requestType: 'humanize' | 'check' | 'test';
  status: 'SUCCESS' | 'ERROR' | 'TIMEOUT';
  durationMs: number;
  inputTokens?: number;
  outputTokens?: number;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
  systemContext?: {
    documentId?: string;
    documentStatus?: JobStatus;
    fileName?: string;
  };
}
