export type LegalJurisdiction =
  | 'Pakistan'
  | 'United States'
  | 'United Kingdom'
  | 'European Union'
  | 'Canada'
  | 'Australia'
  | 'UAE'
  | 'Custom'
  | 'All';

export type KnowledgeCategory =
  | 'legal_principle'
  | 'template'
  | 'clause'
  | 'definition'
  | 'compliance_note'
  | 'jurisdiction_note'
  | 'drafting_instruction'
  | 'approved_wording'
  | 'prohibited_wording'
  | 'required_clause'
  | 'optional_clause'
  | 'clause_dependency'
  | 'general_information';

export type KnowledgeSourceType =
  | 'AUTHORITATIVE_SOURCE'
  | 'INTERNAL_TEMPLATE'
  | 'ADMIN_GUIDANCE'
  | 'GENERAL_INFO';

export type KnowledgeStatus = 'Draft' | 'Under Review' | 'Approved' | 'Archived';

export interface LegalKnowledgeBaseEntry {
  id: string;
  title: string;
  category: KnowledgeCategory;
  jurisdiction: LegalJurisdiction | string;
  document_type: string;
  content: string;
  summary: string;
  source: KnowledgeSourceType;
  source_url?: string;
  effective_date: string;
  review_date?: string;
  version: string;
  status: KnowledgeStatus;
  tags: string[];
  approved_by?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalTemplateVariable {
  name: string; // e.g. "CLIENT_NAME"
  label: string; // e.g. "Client Name"
  placeholder: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  defaultValue?: string;
  description?: string;
  options?: string[];
}

export interface LegalTemplate {
  id: string;
  name: string;
  document_type: string;
  jurisdiction: LegalJurisdiction | string;
  purpose: string;
  required_sections: string[];
  optional_sections: string[];
  required_clauses: string[];
  optional_clauses: string[];
  variables: LegalTemplateVariable[];
  legal_notes: string;
  humanization_rules: {
    clause_protection: 'HIGH' | 'MAXIMUM' | 'NORMAL';
    tone: 'legal' | 'formal' | 'plain_language';
    intensity: 'LOW' | 'CONSERVATIVE' | 'NORMAL';
  };
  version: string;
  approval_status: KnowledgeStatus;
  template_content: string;
  created_at: string;
  updated_at: string;
}

export interface LegalClause {
  id: string;
  title: string;
  category: string;
  document_type: string;
  jurisdiction: LegalJurisdiction | string;
  clause_text: string;
  approved_wording: string;
  prohibited_wording: string[];
  required: boolean;
  dependencies: string[];
  version: string;
  status: KnowledgeStatus;
  created_at: string;
  updated_at: string;
}

export interface LegalDocumentField {
  name: string;
  label: string;
  type: 'text' | 'number' | 'date' | 'select' | 'textarea';
  required: boolean;
  placeholder?: string;
  options?: string[];
  defaultValue?: string;
  description?: string;
}

export interface LegalDocumentType {
  id: string;
  name: string;
  category: 'legal' | 'technical' | 'business' | 'compliance';
  is_legal: boolean;
  description: string;
  default_jurisdiction?: LegalJurisdiction | string;
  default_instructions: string[];
  required_sections: string[];
  fields: LegalDocumentField[];
}

export interface LegalSectionItem {
  id: string;
  sectionNumber?: number;
  title: string;
  content: string;
  isLegalClause: boolean;
  sourceId?: string;
  sourceName?: string;
  jurisdiction?: string;
  version?: string;
  lastUpdated?: string;
  requiresReview?: boolean;
  reviewReason?: string;
}

export interface LegalDocumentVersion {
  id: string;
  documentId: string;
  versionNumber: number; // 1: Draft, 2: Humanized, 3: Corrected, 4: Final
  label: 'v1 Draft' | 'v2 Humanized' | 'v3 Corrected' | 'v4 Final';
  content: string;
  sections: LegalSectionItem[];
  createdAt: string;
  preservationReport?: LegalPreservationCheckResult;
  qualityReport?: LegalQualityCheckResult;
  checkerReport?: {
    score: number;
    provider: string;
    status: 'PASS' | 'FAIL' | 'REVIEW';
    flaggedSentences?: string[];
  };
}

export interface LegalQualityCheckResult {
  status: 'PASS' | 'WARNING' | 'NEEDS_REVIEW';
  score: number; // 0 - 100
  missingSections: string[];
  missingClauses: string[];
  contradictoryClauses: Array<{ clauseA: string; clauseB: string; reason: string }>;
  undefinedTerms: string[];
  emptyVariables: string[];
  inconsistentEntities: Array<{ type: string; found: string[]; expected: string }>;
  missingSignatures: boolean;
  duplicateClauses: string[];
  brokenReferences: string[];
  warnings: string[];
  details: string;
  checkedAt: string;
}

export interface LegalPreservationCheckResult {
  passed: boolean;
  preservationScore: number; // 0 - 100%
  restoredCount: number;
  restoredSections: Array<{
    sectionTitle: string;
    originalContent: string;
    alteredContent: string;
    restorationReason: string;
  }>;
  deviationsDetected: string[];
  originalObligationsCount: number;
  humanizedObligationsCount: number;
  checkedAt: string;
}

export interface DocumentGenerationReport {
  documentId: string;
  documentType: string;
  jurisdiction: string;
  templateVersion: string;
  knowledgeBaseVersion: string;
  draftStatus: string;
  humanizationStatus: string;
  checkerResult: {
    score: number;
    status: 'PASS' | 'FAIL' | 'REVIEW';
    provider: string;
  };
  legalQualityResult: {
    status: 'PASS' | 'WARNING' | 'NEEDS_REVIEW';
    score: number;
    warningsCount: number;
  };
  preservationResult: {
    passed: boolean;
    score: number;
    restoredCount: number;
  };
  warnings: string[];
  processingTimeMs: number;
  numberOfAttempts: number;
  completedAt: string;
}

export interface LegalDocument {
  id: string;
  title: string;
  document_type: string;
  jurisdiction: string;
  status:
    | 'DRAFTING'
    | 'VALIDATING'
    | 'HUMANIZING'
    | 'CHECKING'
    | 'PRESERVING'
    | 'FIXING'
    | 'COMPLETED'
    | 'NEEDS_REVIEW'
    | 'FAILED';
  input_parameters: Record<string, unknown>;
  instructions: string;
  template_id?: string;
  template_version: string;
  knowledge_base_version: string;
  disclaimer_enabled: boolean;
  disclaimer_text: string;
  current_attempt: number;
  max_attempts: number;
  versions: LegalDocumentVersion[];
  final_version_id?: string;
  report?: DocumentGenerationReport;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export interface LegalAuditLog {
  id: string;
  user: string;
  action: string;
  documentId?: string;
  version?: string;
  timestamp: string;
  template?: string;
  knowledgeBaseVersion?: string;
  humanizerRun?: {
    provider: string;
    durationMs: number;
    intensity: string;
  };
  checkerRun?: {
    provider: string;
    score: number;
    status: string;
  };
  finalStatus?: string;
  metadata?: Record<string, unknown>;
}

export interface KnowledgeConflict {
  id: string;
  title: string;
  jurisdiction: string;
  document_type: string;
  entryA: { id: string; title: string; content: string; version: string; source: string };
  entryB: { id: string; title: string; content: string; version: string; source: string };
  reason: string;
  detected_at: string;
  resolved: boolean;
  resolution_notes?: string;
}

export interface KnowledgeSource {
  id: string;
  title: string;
  file_name: string;
  file_type: string;
  raw_text: string;
  extracted_metadata: {
    title?: string;
    jurisdiction?: string;
    document_type?: string;
    relevant_sections?: string[];
    clauses?: string[];
    definitions?: string[];
    sources?: string[];
    dates?: string[];
    version?: string;
  };
  status: KnowledgeStatus;
  uploaded_at: string;
  reviewed_by?: string;
  review_notes?: string;
}

export interface DocumentGenerationRun {
  id: string;
  document_id: string;
  document_type: string;
  jurisdiction: string;
  started_at: string;
  completed_at?: string;
  status: 'RUNNING' | 'COMPLETED' | 'FAILED' | 'NEEDS_REVIEW';
  attempts_count: number;
  duration_ms?: number;
  report?: DocumentGenerationReport;
}

export interface DocumentationSettings {
  maxAutomaticAttempts: number;
  legalDisclaimer: string;
  disclaimerEnabled: boolean;
  defaultJurisdiction: LegalJurisdiction | string;
  defaultHumanizationIntensity: 'LOW' | 'CONSERVATIVE' | 'NORMAL';
  legalClauseProtection: 'HIGH' | 'MAXIMUM' | 'NORMAL';
  requiredAdminApproval: boolean;
  automaticDeletionPeriodDays: number;
  documentRetentionDays: number;
}

export interface LegalAnalytics {
  documentsDrafted: number;
  documentsHumanized: number;
  legalChecks: number;
  documentsRequiringReview: number;
  mostUsedTemplates: { id: string; count: number }[];
  mostUsedJurisdictions: { jurisdiction: string; count: number }[];
  processingSuccessRate: number;
  averageProcessingTimeMs: number;
  totalApprovedKnowledge: number;
  pendingKnowledgeImports: number;
}

