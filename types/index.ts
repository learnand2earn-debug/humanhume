export type SupportedFileType = 'DOCX' | 'PDF' | 'TXT' | 'MD' | 'RTF' | 'XLSX';

export type JobStatus =
  | 'QUEUED'
  | 'EXTRACTING'
  | 'ANALYZING'
  | 'HUMANIZING'
  | 'CHECKING'
  | 'FIXING'
  | 'FINALIZING'
  | 'COMPLETED'
  | 'NEEDS_REVIEW'
  | 'PAUSED'
  | 'CANCELLED'
  | 'FAILED';

export type RetentionPolicy = '1h' | '24h' | '7d' | '30d' | 'Never';

export type ProtectedCategory =
  | 'heading'
  | 'title'
  | 'subtitle'
  | 'bullet_list'
  | 'numbered_list'
  | 'table'
  | 'person_name'
  | 'company_name'
  | 'date'
  | 'number'
  | 'percentage'
  | 'currency'
  | 'url'
  | 'email'
  | 'citation'
  | 'reference'
  | 'quotation'
  | 'code'
  | 'formula'
  | 'technical_term'
  | 'legal_term'
  | 'medical_term'
  | 'product_name'
  | 'proper_noun'
  | 'clause_number'
  | 'legal_obligation';

export interface ProtectedEntity {
  id: string;
  token: string;
  originalValue: string;
  category: ProtectedCategory;
  sectionIndex: number;
  critical: boolean;
}

export interface EmbeddedDocumentImage {
  id: string;
  label: string;
  caption: string;
  sectionIndex: number; // Which section/chunk this image belongs to (or -1 for cover/header)
  pageNumber?: number; // 1-indexed original page number where image was located
  positionRatio?: number; // 0.0 to 1.0 relative vertical/byte position in the original document
  dataUrl: string; // Valid PNG or JPEG data URL (data:image/png;base64,... or data:image/jpeg;base64,...)
  mimeType: 'image/png' | 'image/jpeg';
  width: number;
  height: number;
  aspectRatio?: number; // True width / height aspect ratio preserved on re-injection
}

export interface ProtectedContentMap {
  documentId: string;
  entities: ProtectedEntity[];
  headings: string[];
  citations: string[];
  numbersAndDates: string[];
  definedTerms: string[];
  structuralStats: {
    paragraphCount: number;
    headingCount: number;
    listCount: number;
    tableCount: number;
    codeBlockCount: number;
    wordCount: number;
    imageCount?: number;
  };
}

export interface DocumentChunk {
  id: string;
  index: number;
  heading?: string;
  isLegalClause: boolean;
  intensity: 'LOW' | 'NORMAL';
  originalText: string;
  maskedText: string;
  humanizedText: string;
  restoredText: string;
  protectedEntities: ProtectedEntity[];
  status: 'PENDING' | 'HUMANIZED' | 'CHECKED' | 'FIXED' | 'RESTORED';
  aiScore?: number;
  preservationScore?: number;
  fixReason?: string;
}

export interface PreservationComparisonResult {
  passed: boolean;
  preservationScore: number;
  readabilityScore: number;
  missingParagraphs: number;
  addedParagraphs: number;
  changedNumbers: string[];
  changedNames: string[];
  changedDates: string[];
  changedCitations: string[];
  changedUrls: string[];
  changedHeadings: string[];
  changedTerms: string[];
  restoredSectionsCount: number;
  restorationLogs: string[];
}

export interface DiffToken {
  type: 'unchanged' | 'added' | 'removed' | 'changed' | 'protected';
  value: string;
  originalValue?: string;
  category?: ProtectedCategory;
}

export interface DocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number;
  versionLabel: string; // 'Original' | 'Version 1' | 'Version 2' | 'Final' | 'v1 Draft' | 'v2 Humanized' | 'v3 Corrected' | 'v4 Final'
  filePath: string;
  content: string;
  qualityScore: number;
  checkerScore: number; // AI score % (lower is more human)
  preservationScore: number;
  readabilityScore: number;
  retryCount: number;
  provider: string;
  processingDurationMs: number;
  status: 'VALID' | 'NEEDS_REVIEW' | 'RESTORED';
  createdAt: string;
}

export interface QualityCheckResult {
  id: string;
  documentId: string;
  versionId: string;
  provider: string;
  aiScore: number; // e.g., 6 (%)
  confidence: number; // e.g., 94 (%)
  status: 'PASS' | 'WARNING' | 'FAIL';
  detectedIssues: string[];
  timestamp: string;
}

export interface ProcessingStepRecord {
  step:
    | 'UPLOAD'
    | 'VALIDATION'
    | 'EXTRACTION'
    | 'ANALYSIS'
    | 'PROTECTION'
    | 'HUMANIZATION'
    | 'QUALITY_CHECK'
    | 'PRESERVATION_CHECK'
    | 'AUTO_FIX'
    | 'FINAL_CHECK'
    | 'FINALIZE';
  label: string;
  status: 'PENDING' | 'ACTIVE' | 'COMPLETED' | 'WARNING' | 'FAILED';
  startedAt?: string;
  completedAt?: string;
  detail?: string;
}

export interface ProcessConsoleLogEntry {
  id: string;
  timestamp: string;
  elapsedMs: number;
  step: ProcessingStepRecord['step'];
  level: 'INFO' | 'SUCCESS' | 'WARN' | 'ERROR';
  commandOrModule: string;
  message: string;
}

export interface QualityControlChecklist {
  fileOpensCorrectly: boolean;
  originalStillExists: boolean;
  allRequiredSectionsExist: boolean;
  noImportantInfoLost: boolean;
  noProtectedContentChanged: boolean;
  formattingAcceptable: boolean;
  humanizerResponseValid: boolean;
  checkerCompleted: boolean;
  finalVersionGenerated: boolean;
  downloadWorks: boolean;
}

export interface DocumentRecord {
  id: string;
  traceId: string; // e.g. HF-20261016-8F3A91
  userId: string;
  sourceModule: 'UPLOAD' | 'DOCUMENTATION_STUDIO';
  originalName: string;
  fileType: SupportedFileType;
  fileSize: number;
  wordCount: number;
  pageCount: number;
  status: JobStatus;
  progressPercent: number;
  currentStepLabel: string;
  retentionPolicy: RetentionPolicy;
  originalContent: string;
  finalContent: string;
  embeddedImages?: EmbeddedDocumentImage[];
  protectedMap: ProtectedContentMap;
  chunks: DocumentChunk[];
  versions: DocumentVersion[];
  qualityChecks: QualityCheckResult[];
  preservationResult: PreservationComparisonResult;
  qcChecklist: QualityControlChecklist;
  steps: ProcessingStepRecord[];
  processLogs?: ProcessConsoleLogEntry[];
  retryCount: number;
  processingDurationMs: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
  // Documentation Studio specific metadata
  docStudioMeta?: {
    documentType: string;
    jurisdiction: string;
    isLegalDocument: boolean;
    templateId?: string;
    templateVersion: string;
    knowledgeBaseVersion: string;
    variables: Record<string, string>;
    missingFields: string[];
    legalQualityStatus: 'PASS' | 'WARNING' | 'NEEDS REVIEW';
    legalWarnings: string[];
    disclaimerText: string;
    disclaimerEnabled: boolean;
    sourcesUsed: KnowledgeSourceAttribution[];
  };
}

export interface ProcessingJob {
  id: string;
  traceId: string;
  documentId: string;
  documentName: string;
  status: JobStatus;
  currentStep: string;
  progressPercent: number;
  retryCount: number;
  maxRetries: number;
  startedAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface SystemLogEntry {
  id: string;
  traceId: string;
  level: 'INFO' | 'WARN' | 'ERROR' | 'SECURITY';
  stage: string;
  message: string;
  documentId?: string;
  metadata?: Record<string, string | number | boolean>;
  timestamp: string;
}

export interface ApiUsageRecord {
  id: string;
  provider: string;
  requestType: 'HUMANIZE' | 'CHECK' | 'TEST_HUMANIZER' | 'TEST_CHECKER';
  status: 'SUCCESS' | 'FALLBACK' | 'ERROR';
  durationMs: number;
  tokensOrChars: number;
  traceId: string;
  createdAt: string;
}

export interface AppNotification {
  id: string;
  userId: string;
  title: string;
  message: string;
  type: 'SUCCESS' | 'INFO' | 'WARNING' | 'ERROR';
  documentId?: string;
  traceId?: string;
  discordSent: boolean;
  read: boolean;
  createdAt: string;
}

// ==================================================
// DOCUMENTATION STUDIO & LEGAL KNOWLEDGE BASE TYPES
// ==================================================

export type KnowledgeSourceCategory =
  | 'AUTHORITATIVE SOURCE'
  | 'INTERNAL TEMPLATE'
  | 'ADMIN-PROVIDED GUIDANCE'
  | 'GENERAL INFORMATION';

export type KnowledgeApprovalStatus = 'Draft' | 'Under Review' | 'Approved' | 'Archived';

export type JurisdictionType =
  | 'United States'
  | 'United Kingdom'
  | 'European Union'
  | 'UAE'
  | 'Pakistan'
  | 'Canada'
  | 'Australia'
  | 'Custom'
  | 'Not Applicable';

export interface LegalKnowledgeEntry {
  id: string;
  title: string;
  category: KnowledgeSourceCategory;
  jurisdiction: JurisdictionType;
  documentType: string;
  content: string;
  summary: string;
  approvedWording: string[];
  prohibitedWording: string[];
  requiredClauses: string[];
  optionalClauses: string[];
  source: string;
  sourceUrl?: string;
  effectiveDate: string;
  reviewDate: string;
  version: string;
  status: KnowledgeApprovalStatus;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export interface KnowledgeConflict {
  id: string;
  entryAId: string;
  entryATitle: string;
  entryBId: string;
  entryBTitle: string;
  jurisdiction: JurisdictionType;
  documentType: string;
  conflictDescription: string;
  status: 'OPEN' | 'RESOLVED';
  resolvedWithEntryId?: string;
  detectedAt: string;
}

export interface DocumentTypeFieldSchema {
  key: string; // e.g., 'CLIENT_NAME'
  label: string;
  placeholder: string;
  required: boolean;
  type: 'text' | 'textarea' | 'date' | 'currency' | 'select';
  options?: string[];
  defaultValue?: string;
}

export interface DocumentTypeDefinition {
  id: string;
  name: string;
  category: 'Legal & Contracts' | 'Privacy & Compliance' | 'Technical & Product' | 'Operations & HR';
  requiresJurisdiction: boolean;
  description: string;
  draftingInstructions: string[];
  requiredSections: string[];
  optionalSections: string[];
  fields: DocumentTypeFieldSchema[];
  defaultIntensity: 'LOW' | 'NORMAL';
  version: string;
}

export interface KnowledgeSourceAttribution {
  sectionTitle: string;
  sourceTitle: string;
  knowledgeEntryId?: string;
  category: KnowledgeSourceCategory | 'Generated from configured drafting instructions';
  jurisdiction: string;
  version: string;
  lastUpdated: string;
}

export interface LegalAuditLog {
  id: string;
  user: string;
  action: string;
  documentId: string;
  documentName: string;
  version: string;
  templateName: string;
  knowledgeBaseVersion: string;
  humanizerRun: boolean;
  checkerRun: boolean;
  finalStatus: string;
  timestamp: string;
}

export interface PlatformSettings {
  processingMode: 'DEMO' | 'LIVE';
  humanizerApiUrl: string;
  humanizerApiKeyMasked: string;
  humanizerModel: string;
  humanizerResponsePath: string;
  checkerApiUrl: string;
  checkerApiKeyMasked: string;
  checkerResponsePath: string;
  discordWebhookUrlMasked: string;
  maxRetries: number;
  timeoutSeconds: number;
  chunkSizeWords: number;
  rateLimitPerMinute: number;
  defaultRetention: RetentionPolicy;
  browserNotificationsEnabled: boolean;
  discordNotificationsEnabled: boolean;
  maxFileSizeMb?: number;
  // Legal & Documentation Studio Settings
  defaultJurisdiction: JurisdictionType;
  legalClauseProtection: 'HIGH' | 'STRICT';
  normalProseIntensity: 'LOW' | 'NORMAL';
  requireAdminApprovalForKB: boolean;
  legalDisclaimerText: string;
  legalDisclaimerEnabled: boolean;
}

export interface LegalTerminologySuggestion {
  id: string;
  title: string;
  category:
    | 'APPROVED_WORDING'
    | 'PROHIBITED_PHRASE_FIX'
    | 'CLAUSE_PRECISION'
    | 'REGULATORY_ALIGNMENT';
  sectionIndex: number;
  sectionHeading: string;
  currentExcerpt: string;
  suggestedReplacement: string;
  rationale: string;
  kbEntryId: string;
  kbTitle: string;
  kbVersion: string;
  kbJurisdiction: JurisdictionType;
  kbCategory: KnowledgeSourceCategory;
  protectedEntitiesPreserved: string[];
  alreadyApplied: boolean;
}

