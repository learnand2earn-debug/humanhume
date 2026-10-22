-- ============================================================================
-- HUMANFLOW AI — COMPLETE POSTGRESQL / SUPABASE DATABASE SCHEMA & MIGRATIONS
-- Includes Core Document Humanization Tables + Documentation Studio & Legal KB
-- ============================================================================

CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  full_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'admin',
  notifications_enabled BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT UNIQUE NOT NULL,
  user_id UUID REFERENCES users(id),
  source_module TEXT NOT NULL DEFAULT 'UPLOAD',
  original_name TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size BIGINT NOT NULL,
  word_count INTEGER NOT NULL DEFAULT 0,
  page_count INTEGER NOT NULL DEFAULT 1,
  status TEXT NOT NULL DEFAULT 'QUEUED',
  retention_policy TEXT NOT NULL DEFAULT '24h',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_number INTEGER NOT NULL,
  version_label TEXT NOT NULL,
  file_path TEXT NOT NULL,
  quality_score NUMERIC(5,2) NOT NULL DEFAULT 100.0,
  checker_score NUMERIC(5,2) NOT NULL DEFAULT 0.0,
  preservation_score NUMERIC(5,2) NOT NULL DEFAULT 100.0,
  readability_score NUMERIC(5,2) NOT NULL DEFAULT 90.0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  provider TEXT NOT NULL,
  processing_duration_ms INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS processing_jobs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  status TEXT NOT NULL,
  current_step TEXT NOT NULL,
  progress_percent INTEGER NOT NULL DEFAULT 0,
  retry_count INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  error_message TEXT
);

CREATE TABLE IF NOT EXISTS processing_steps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  job_id UUID NOT NULL REFERENCES processing_jobs(id) ON DELETE CASCADE,
  step_name TEXT NOT NULL,
  status TEXT NOT NULL,
  detail TEXT,
  started_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS quality_checks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  version_id UUID NOT NULL REFERENCES document_versions(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,
  score NUMERIC(5,2) NOT NULL,
  confidence NUMERIC(5,2) NOT NULL DEFAULT 94.0,
  status TEXT NOT NULL,
  details JSONB NOT NULL DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS api_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  provider TEXT NOT NULL,
  request_type TEXT NOT NULL,
  status TEXT NOT NULL,
  duration INTEGER NOT NULL,
  trace_id TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT NOT NULL DEFAULT 'INFO',
  document_id UUID REFERENCES documents(id) ON DELETE SET NULL,
  discord_sent BOOLEAN NOT NULL DEFAULT FALSE,
  read BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS system_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  trace_id TEXT NOT NULL,
  level TEXT NOT NULL,
  stage TEXT NOT NULL,
  message TEXT NOT NULL,
  document_id UUID,
  metadata JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  role TEXT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================================
-- ADD-ON MODULE: DOCUMENTATION STUDIO & LEGAL KNOWLEDGE BASE TABLES
-- ============================================================================

CREATE TABLE IF NOT EXISTS legal_knowledge_base (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  category TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  document_type TEXT NOT NULL,
  content TEXT NOT NULL,
  summary TEXT NOT NULL,
  source TEXT NOT NULL,
  source_url TEXT,
  effective_date DATE NOT NULL,
  review_date DATE NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'Draft',
  tags TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_name TEXT NOT NULL,
  document_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  purpose TEXT NOT NULL,
  required_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  optional_sections JSONB NOT NULL DEFAULT '[]'::jsonb,
  variables JSONB NOT NULL DEFAULT '[]'::jsonb,
  humanization_rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  version TEXT NOT NULL,
  approval_status TEXT NOT NULL DEFAULT 'Approved',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_clauses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  clause_title TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  document_type TEXT NOT NULL,
  clause_body TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  humanization_intensity TEXT NOT NULL DEFAULT 'LOW',
  version TEXT NOT NULL DEFAULT '1.0.0'
);

CREATE TABLE IF NOT EXISTS legal_document_types (
  id TEXT PRIMARY KEY,
  name TEXT UNIQUE NOT NULL,
  category TEXT NOT NULL,
  requires_jurisdiction BOOLEAN NOT NULL DEFAULT TRUE,
  drafting_instructions JSONB NOT NULL DEFAULT '[]'::jsonb,
  version TEXT NOT NULL DEFAULT '1.0.0'
);

CREATE TABLE IF NOT EXISTS legal_document_fields (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_type_id TEXT NOT NULL REFERENCES legal_document_types(id) ON DELETE CASCADE,
  field_key TEXT NOT NULL,
  field_label TEXT NOT NULL,
  is_required BOOLEAN NOT NULL DEFAULT TRUE,
  field_type TEXT NOT NULL DEFAULT 'text'
);

CREATE TABLE IF NOT EXISTS legal_document_versions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  stage_label TEXT NOT NULL, -- 'v1 Draft', 'v2 Humanized', 'v3 Corrected', 'v4 Final'
  content TEXT NOT NULL,
  knowledge_base_version TEXT NOT NULL,
  template_version TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_review_flags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  section_title TEXT NOT NULL,
  flag_reason TEXT NOT NULL,
  resolved BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS legal_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_name TEXT NOT NULL,
  action TEXT NOT NULL,
  document_id UUID,
  version TEXT NOT NULL,
  template_name TEXT NOT NULL,
  knowledge_base_version TEXT NOT NULL,
  humanizer_run BOOLEAN NOT NULL DEFAULT TRUE,
  checker_run BOOLEAN NOT NULL DEFAULT TRUE,
  final_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS knowledge_sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  section_title TEXT NOT NULL,
  knowledge_entry_id UUID REFERENCES legal_knowledge_base(id),
  jurisdiction TEXT NOT NULL,
  version TEXT NOT NULL,
  last_updated DATE NOT NULL
);

CREATE TABLE IF NOT EXISTS document_generation_runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  document_type TEXT NOT NULL,
  jurisdiction TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 1,
  processing_time_ms INTEGER NOT NULL DEFAULT 0,
  final_status TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
