-- ==============================================================
-- HumanFlow AI — Automated Document Humanizer & Quality Control
-- Database Schema for Supabase PostgreSQL
-- ==============================================================

-- 1. Users
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Documents
CREATE TABLE IF NOT EXISTS documents (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'anonymous',
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  original_path TEXT NOT NULL,
  working_path TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  trace_id TEXT NOT NULL,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  readability_score FLOAT,
  preservation_score FLOAT,
  ai_check_score FLOAT,
  best_version_id TEXT,
  final_version_id TEXT,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 3. Document Versions
CREATE TABLE IF NOT EXISTS document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  label TEXT NOT NULL,
  file_path TEXT NOT NULL,
  raw_text TEXT,
  quality_score FLOAT DEFAULT 0,
  checker_score FLOAT DEFAULT 0,
  preservation_score FLOAT DEFAULT 100,
  readability_score FLOAT DEFAULT 0,
  detected_issues JSONB DEFAULT '[]'::jsonb,
  provider TEXT,
  duration_ms INT DEFAULT 0,
  is_best BOOLEAN DEFAULT FALSE,
  is_final BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Processing Jobs
CREATE TABLE IF NOT EXISTS processing_jobs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  trace_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  current_step TEXT NOT NULL DEFAULT 'QUEUED',
  progress_percent INT DEFAULT 0,
  retry_count INT DEFAULT 0,
  max_retries INT DEFAULT 3,
  steps JSONB DEFAULT '[]'::jsonb,
  error_message TEXT,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- 5. Quality Checks
CREATE TABLE IF NOT EXISTS quality_checks (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id TEXT REFERENCES document_versions(id) ON DELETE SET NULL,
  provider TEXT NOT NULL,
  score FLOAT NOT NULL,
  confidence FLOAT NOT NULL,
  status TEXT NOT NULL,
  detected_issues JSONB DEFAULT '[]'::jsonb,
  details JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. API Usage & Telemetry
CREATE TABLE IF NOT EXISTS api_usage (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL,
  duration_ms INT NOT NULL,
  input_tokens INT,
  output_tokens INT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Notifications
CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  document_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  status TEXT NOT NULL,
  channel TEXT NOT NULL DEFAULT 'discord',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. System Logs
CREATE TABLE IF NOT EXISTS system_logs (
  id TEXT PRIMARY KEY,
  trace_id TEXT NOT NULL,
  level TEXT NOT NULL,
  module TEXT NOT NULL,
  action TEXT NOT NULL,
  message TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Settings
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 10. Chat Messages
CREATE TABLE IF NOT EXISTS chat_messages (
  id TEXT PRIMARY KEY,
  sender TEXT NOT NULL,
  text TEXT NOT NULL,
  system_context JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for lightning queries
CREATE INDEX IF NOT EXISTS idx_documents_status ON documents(status);
CREATE INDEX IF NOT EXISTS idx_documents_created ON documents(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_id ON document_versions(document_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_trace ON system_logs(trace_id);
CREATE INDEX IF NOT EXISTS idx_api_usage_created ON api_usage(created_at DESC);

-- ==============================================================
-- ADD-ON: Documentation Drafting & Legal Knowledge Base Module
-- ==============================================================

-- 11. Legal Knowledge Base
CREATE TABLE IF NOT EXISTS legal_knowledge_base (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  document_type TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL DEFAULT 'INTERNAL_TEMPLATE',
  source_url TEXT,
  effective_date TEXT NOT NULL,
  review_date TEXT,
  version TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'Draft',
  tags JSONB DEFAULT '[]'::jsonb,
  approved_by TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Legal Templates
CREATE TABLE IF NOT EXISTS legal_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  purpose TEXT,
  required_sections JSONB DEFAULT '[]'::jsonb,
  optional_sections JSONB DEFAULT '[]'::jsonb,
  required_clauses JSONB DEFAULT '[]'::jsonb,
  optional_clauses JSONB DEFAULT '[]'::jsonb,
  variables JSONB DEFAULT '[]'::jsonb,
  legal_notes TEXT,
  humanization_rules JSONB DEFAULT '{"clause_protection":"HIGH","tone":"legal","intensity":"CONSERVATIVE"}'::jsonb,
  version TEXT NOT NULL DEFAULT 'v1.0',
  approval_status TEXT NOT NULL DEFAULT 'Approved',
  template_content TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Legal Clauses
CREATE TABLE IF NOT EXISTS legal_clauses (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  document_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  clause_text TEXT NOT NULL,
  approved_wording TEXT,
  prohibited_wording JSONB DEFAULT '[]'::jsonb,
  required BOOLEAN DEFAULT FALSE,
  dependencies JSONB DEFAULT '[]'::jsonb,
  version TEXT NOT NULL DEFAULT 'v1.0',
  status TEXT NOT NULL DEFAULT 'Approved',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Legal Document Types
CREATE TABLE IF NOT EXISTS legal_document_types (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  is_legal BOOLEAN NOT NULL DEFAULT TRUE,
  description TEXT,
  default_jurisdiction TEXT DEFAULT 'United States',
  default_instructions JSONB DEFAULT '[]'::jsonb,
  required_sections JSONB DEFAULT '[]'::jsonb,
  fields JSONB DEFAULT '[]'::jsonb
);

-- 15. Legal Documents
CREATE TABLE IF NOT EXISTS legal_documents (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  document_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'DRAFTING',
  input_parameters JSONB DEFAULT '{}'::jsonb,
  instructions TEXT,
  template_id TEXT REFERENCES legal_templates(id) ON DELETE SET NULL,
  template_version TEXT NOT NULL DEFAULT 'v1.0',
  knowledge_base_version TEXT NOT NULL DEFAULT 'v1.0',
  disclaimer_enabled BOOLEAN DEFAULT TRUE,
  disclaimer_text TEXT,
  current_attempt INT DEFAULT 1,
  max_attempts INT DEFAULT 3,
  versions JSONB DEFAULT '[]'::jsonb,
  final_version_id TEXT,
  report JSONB,
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Legal Document Versions
CREATE TABLE IF NOT EXISTS legal_document_versions (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  version_number INT NOT NULL,
  label TEXT NOT NULL,
  content TEXT NOT NULL,
  sections JSONB DEFAULT '[]'::jsonb,
  preservation_report JSONB,
  quality_report JSONB,
  checker_report JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 17. Legal Review Flags & Conflicts
CREATE TABLE IF NOT EXISTS legal_review_flags (
  id TEXT PRIMARY KEY,
  document_id TEXT REFERENCES legal_documents(id) ON DELETE CASCADE,
  section_title TEXT,
  flag_type TEXT NOT NULL,
  reason TEXT NOT NULL,
  resolved BOOLEAN DEFAULT FALSE,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 18. Legal Audit Logs
CREATE TABLE IF NOT EXISTS legal_audit_logs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'system_user',
  action TEXT NOT NULL,
  document_id TEXT,
  version TEXT,
  template TEXT,
  knowledge_base_version TEXT,
  humanizer_run JSONB,
  checker_run JSONB,
  final_status TEXT,
  metadata JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 19. Knowledge Sources (Ingestion)
CREATE TABLE IF NOT EXISTS knowledge_sources (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  file_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  raw_text TEXT NOT NULL,
  extracted_metadata JSONB DEFAULT '{}'::jsonb,
  status TEXT NOT NULL DEFAULT 'Draft',
  uploaded_at TIMESTAMPTZ DEFAULT NOW(),
  reviewed_by TEXT,
  review_notes TEXT
);

-- 20. Document Generation Runs
CREATE TABLE IF NOT EXISTS document_generation_runs (
  id TEXT PRIMARY KEY,
  document_id TEXT NOT NULL REFERENCES legal_documents(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'RUNNING',
  attempts_count INT DEFAULT 1,
  duration_ms INT,
  report JSONB,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

-- Legal Module Indexes
CREATE INDEX IF NOT EXISTS idx_legal_kb_status ON legal_knowledge_base(status);
CREATE INDEX IF NOT EXISTS idx_legal_kb_jurisdiction ON legal_knowledge_base(jurisdiction);
CREATE INDEX IF NOT EXISTS idx_legal_kb_doc_type ON legal_knowledge_base(document_type);
CREATE INDEX IF NOT EXISTS idx_legal_docs_status ON legal_documents(status);
CREATE INDEX IF NOT EXISTS idx_legal_audit_created ON legal_audit_logs(created_at DESC);

