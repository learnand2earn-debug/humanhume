import { ChecklistItem, TargetedQuestion, VerificationReport, FileCategory } from '../intelligent/types';

export type TaskExecutionStatus =
  | 'planning'
  | 'waiting_user_info'
  | 'waiting_approval'
  | 'ready'
  | 'executing'
  | 'waiting_tool'
  | 'validating'
  | 'needs_correction'
  | 'blocked'
  | 'completed'
  | 'completed_with_warnings'
  | 'failed';

export interface ExecutionStep {
  id: string;
  title: string;
  goal: string;
  requiredInputs: string[];
  toolNeeded: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'skipped';
  result?: string;
  error?: string;
  durationMs?: number;
}

export interface TaskPlan {
  taskId: string;
  objective: string;
  taskType: string;
  sourceFiles: string[];
  requirements: string[];
  dependencies: string[];
  executionSteps: ExecutionStep[];
  missingInformation: string[];
  availableCapabilities: string[];
  riskLevel: 'low' | 'medium' | 'high';
  status: TaskExecutionStatus;
  expectedOutputs: string[];
  verificationPlan: string[];
  progressPercent: number;
}

export interface MessageAttachment {
  id: string;
  name: string;
  size: number;
  mimeType: string;
  category: FileCategory;
  storagePath: string;
  extractedSummary?: string;
  extractedFactsCount?: number;
  headingsCount?: number;
  wordCount?: number;
}

export interface MessageArtifact {
  id: string;
  title: string;
  type: 'document' | 'code' | 'data' | 'media' | 'presentation';
  format: string; // 'markdown' | 'docx' | 'pdf' | 'typescript' | 'html' | 'json'
  content: string;
  version: number;
  changelog?: string[];
  qualityScore?: number;
  verified?: boolean;
}

export interface AgentMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  text: string;
  timestamp: string;
  attachments?: MessageAttachment[];
  taskPlan?: TaskPlan;
  checklist?: ChecklistItem[];
  questions?: TargetedQuestion[];
  artifact?: MessageArtifact;
  verificationReport?: VerificationReport;
  status?: TaskExecutionStatus;
}

export interface UniversalConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: AgentMessage[];
  currentTaskId?: string;
  pinned?: boolean;
}
