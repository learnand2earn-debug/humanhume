export type FileCategory =
  | 'document'
  | 'image'
  | 'video'
  | 'audio'
  | 'spreadsheet'
  | 'presentation'
  | 'code'
  | 'data'
  | 'other';

export interface FileMetadata {
  fileName: string;
  originalName: string;
  mimeType: string;
  sizeBytes: number;
  category: FileCategory;
  extension: string;
  dimensions?: { width: number; height: number };
  durationSeconds?: number;
  wordCount?: number;
  characterCount?: number;
  headingsCount?: number;
  tableCount?: number;
  sheetsCount?: number;
  rowCount?: number;
  columnCount?: number;
  languages?: string[];
  tags?: string[];
  pagesEstimate?: number;
}

export interface ExtractedFact {
  id: string;
  key: string;
  value: string;
  sourceFile: string;
  confidence: number;
  category: 'entity' | 'date' | 'metric' | 'constraint' | 'preference' | 'contact' | 'scope';
}

export interface FileContradiction {
  id: string;
  topic: string;
  description: string;
  conflictingFiles: string[];
  values: { file: string; value: string }[];
  severity: 'critical' | 'moderate' | 'minor';
  resolved: boolean;
  resolution?: string;
}

export interface UploadedIntakeFile {
  id: string;
  fileName: string;
  originalName: string;
  fileSize: number;
  mimeType: string;
  category: FileCategory;
  storagePath: string;
  status: 'pending' | 'analyzing' | 'ready' | 'error';
  errorMessage?: string;
  metadata: FileMetadata;
  extractedText: string;
  extractedFacts: ExtractedFact[];
  structureSummary: string;
  potentialGaps: string[];
  uploadedAt: string;
}

export type ChecklistCategory =
  | 'content'
  | 'data'
  | 'design'
  | 'technical'
  | 'format'
  | 'verification'
  | 'other';

export type ChecklistStatus =
  | 'complete'
  | 'missing'
  | 'uncertain'
  | 'in_progress'
  | 'blocked'
  | 'not_applicable';

export type ChecklistPriority = 'critical' | 'high' | 'medium' | 'low';

export interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  category: ChecklistCategory;
  status: ChecklistStatus;
  priority: ChecklistPriority;
  required?: boolean;
  source?: string; // e.g. "User prompt", "File: spec.pdf", "Post-gen audit"
  validationRule?: string; // criteria for passing
  sourceEvidence?: string; // Observed facts from supplied files
  location?: string; // Page, section, timestamp or field when known
  reason?: string; // Why this item matters
  question?: string; // Exact question to ask, when required
  answer?: string | null;
  answerConfirmed?: boolean;
  resolution?: string | null;
  resolvedInVersion?: number;
  userDecision?: string;
  evidence?: string; // proof why it's complete or missing
  notes?: string;
}

export interface TargetedQuestion {
  id: string;
  checklistItemId?: string;
  question: string;
  context: string;
  whyNeeded: string;
  type: 'text' | 'choice' | 'boolean' | 'multiselect';
  options?: string[];
  defaultChoice?: string;
  required?: boolean;
  answered: boolean;
  answer?: string;
  userSelection?: string | string[];
  answeredAt?: string;
  acknowledgedGap?: boolean;
}

export interface TaskUnderstanding {
  taskType: string; // e.g. 'complete_cv', 'technical_spec', 'business_proposal', 'recreate_design'
  deliverableTitle: string;
  goal: string;
  targetAudience: string;
  toneAndStyle: string;
  explicitRequirements: string[];
  implicitRequirements: string[];
  constraints: string[];
  targetFormat: 'markdown' | 'docx' | 'pdf' | 'html' | 'txt' | 'json';
  completionCriteria: string[];
}

export interface OutputVersion {
  versionNumber: number;
  createdAt: string;
  title: string;
  format: 'markdown' | 'docx' | 'pdf' | 'html' | 'txt' | 'json';
  content: string;
  changelog: string[];
  resolvedItemIds: string[];
  passRate: number; // 0-100%
  issuesCount: number;
  isFinal: boolean;
  exportPaths?: Record<string, string>;
}

export interface VerificationIssue {
  id: string;
  checklistItemId?: string;
  severity: 'critical' | 'warning' | 'info';
  category: string;
  description: string;
  recommendation: string;
  resolved: boolean;
}

export interface VerificationReport {
  id: string;
  versionNumber: number;
  generatedAt: string;
  passed: boolean;
  qualityScore: number; // 0-100
  totalItems: number;
  completedItems: number;
  missingItems: number;
  acknowledgedGapsCount: number;
  issues: VerificationIssue[];
  recommendations: string[];
  deliverableAuditSummary: string;
  nextStepRecommendation: 'deliver' | 'iterate' | 'ask_clarification';
}

export type WorkflowStage =
  | 'STAGE_A_INTAKE' // Receive user request & files
  | 'STAGE_B_UNDERSTAND' // Understand user's desired outcome
  | 'STAGE_C_ANALYZE' // Extract & analyze content
  | 'STAGE_D_CHECKLIST' // Build dynamic checklist
  | 'STAGE_E_GAPS' // Identify missing/uncertain items
  | 'STAGE_F_QUESTIONS' // Ask targeted follow-up questions
  | 'STAGE_G_MERGE' // Merge answers into task context
  | 'STAGE_H_GENERATE' // Generate, edit or complete output
  | 'STAGE_I_POST_ANALYZE' // Analyze resulting output again
  | 'STAGE_J_POST_CHECKLIST' // Create another checklist if anything missing
  | 'STAGE_K_REPEAT' // Repeat until criteria pass
  | 'STAGE_L_DELIVER'; // Deliver final output & verification report

export interface WorkflowSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  currentStage: WorkflowStage;
  userPrompt: string;
  files: UploadedIntakeFile[];
  contradictions: FileContradiction[];
  task: TaskUnderstanding;
  checklist: ChecklistItem[];
  questions: TargetedQuestion[];
  versions: OutputVersion[];
  currentVersionNumber: number;
  verificationReport?: VerificationReport;
  acknowledgedGaps: string[];
  userPreferences: Record<string, unknown>;
  executionLog: Array<{
    stage: WorkflowStage;
    action: string;
    timestamp: string;
    details: string;
  }>;
}
