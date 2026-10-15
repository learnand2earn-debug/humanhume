import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  DocumentationSettings,
  KnowledgeCategory,
  KnowledgeConflict,
  KnowledgeSource,
  KnowledgeStatus,
  LegalAuditLog,
  LegalClause,
  LegalDocument,
  LegalDocumentType,
  LegalDocumentVersion,
  LegalKnowledgeBaseEntry,
  LegalTemplate,
  DocumentGenerationRun,
} from './types';
import {
  DEFAULT_DOCUMENTATION_SETTINGS,
  INITIAL_DOCUMENT_TYPES,
  INITIAL_KNOWLEDGE_BASE,
  INITIAL_TEMPLATES,
} from './seed-data';

interface LegalStorageState {
  settings: DocumentationSettings;
  documentTypes: Record<string, LegalDocumentType>;
  knowledgeBase: Record<string, LegalKnowledgeBaseEntry>;
  templates: Record<string, LegalTemplate>;
  clauses: Record<string, LegalClause>;
  documents: Record<string, LegalDocument>;
  auditLogs: LegalAuditLog[];
  conflicts: Record<string, KnowledgeConflict>;
  sources: Record<string, KnowledgeSource>;
  runs: Record<string, DocumentGenerationRun>;
}

export class LegalRepository {
  private dataFile: string;
  private state: LegalStorageState;
  private lastSyncMtime = 0;

  constructor() {
    const dataDir = process.env.DATA_DIR
      ? path.resolve(process.env.DATA_DIR)
      : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dataFile = path.join(dataDir, 'legal_studio.json');
    this.state = this.loadState();
  }

  private loadState(): LegalStorageState {
    if (fs.existsSync(this.dataFile)) {
      try {
        const raw = fs.readFileSync(this.dataFile, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...DEFAULT_DOCUMENTATION_SETTINGS, ...(parsed.settings || {}) },
          documentTypes: parsed.documentTypes && Object.keys(parsed.documentTypes).length > 0
            ? parsed.documentTypes
            : this.buildInitialDocTypes(),
          knowledgeBase: parsed.knowledgeBase && Object.keys(parsed.knowledgeBase).length > 0
            ? parsed.knowledgeBase
            : this.buildInitialKB(),
          templates: parsed.templates && Object.keys(parsed.templates).length > 0
            ? parsed.templates
            : this.buildInitialTemplates(),
          clauses: parsed.clauses || {},
          documents: parsed.documents || {},
          auditLogs: parsed.auditLogs || [],
          conflicts: parsed.conflicts || {},
          sources: parsed.sources || {},
          runs: parsed.runs || {},
        };
      } catch (err) {
        console.error('Failed to parse legal_studio.json, initializing defaults:', err);
      }
    }

    const defaultState: LegalStorageState = {
      settings: DEFAULT_DOCUMENTATION_SETTINGS,
      documentTypes: this.buildInitialDocTypes(),
      knowledgeBase: this.buildInitialKB(),
      templates: this.buildInitialTemplates(),
      clauses: {},
      documents: {},
      auditLogs: [],
      conflicts: {},
      sources: {},
      runs: {},
    };

    this.persistSync(defaultState);
    return defaultState;
  }

  private buildInitialDocTypes(): Record<string, LegalDocumentType> {
    const map: Record<string, LegalDocumentType> = {};
    for (const dt of INITIAL_DOCUMENT_TYPES) {
      map[dt.id] = dt;
    }
    return map;
  }

  private buildInitialKB(): Record<string, LegalKnowledgeBaseEntry> {
    const map: Record<string, LegalKnowledgeBaseEntry> = {};
    for (const entry of INITIAL_KNOWLEDGE_BASE) {
      map[entry.id] = entry;
    }
    return map;
  }

  private buildInitialTemplates(): Record<string, LegalTemplate> {
    const map: Record<string, LegalTemplate> = {};
    for (const tpl of INITIAL_TEMPLATES) {
      map[tpl.id] = tpl;
    }
    return map;
  }

  private persistSync(state: LegalStorageState) {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(state, null, 2), 'utf-8');
      if (fs.existsSync(this.dataFile)) {
        this.lastSyncMtime = fs.statSync(this.dataFile).mtimeMs;
      }
    } catch (err) {
      console.error('Failed to write legal_studio.json:', err);
    }
  }

  private persist() {
    this.persistSync(this.state);
  }

  private syncState() {
    try {
      if (fs.existsSync(this.dataFile)) {
        const stats = fs.statSync(this.dataFile);
        if (stats.mtimeMs > this.lastSyncMtime) {
          const raw = fs.readFileSync(this.dataFile, 'utf-8');
          const parsed = JSON.parse(raw);
          this.state = {
            settings: { ...DEFAULT_DOCUMENTATION_SETTINGS, ...(parsed.settings || {}) },
            documentTypes: parsed.documentTypes || this.buildInitialDocTypes(),
            knowledgeBase: parsed.knowledgeBase || this.buildInitialKB(),
            templates: parsed.templates || this.buildInitialTemplates(),
            clauses: parsed.clauses || {},
            documents: parsed.documents || {},
            auditLogs: parsed.auditLogs || [],
            conflicts: parsed.conflicts || {},
            sources: parsed.sources || {},
            runs: parsed.runs || {},
          };
          this.lastSyncMtime = stats.mtimeMs;
        }
      }
    } catch {
      // Fallback
    }
  }

  // ==========================================
  // SETTINGS
  // ==========================================
  getSettings(): DocumentationSettings {
    this.syncState();
    return { ...this.state.settings };
  }

  updateSettings(updates: Partial<DocumentationSettings>): DocumentationSettings {
    this.syncState();
    this.state.settings = {
      ...this.state.settings,
      ...updates,
    };
    this.persist();
    return this.getSettings();
  }

  // ==========================================
  // DOCUMENT TYPES
  // ==========================================
  listDocumentTypes(): LegalDocumentType[] {
    this.syncState();
    return Object.values(this.state.documentTypes);
  }

  getDocumentType(id: string): LegalDocumentType | null {
    this.syncState();
    return this.state.documentTypes[id] || null;
  }

  saveDocumentType(dt: LegalDocumentType): LegalDocumentType {
    this.syncState();
    this.state.documentTypes[dt.id] = dt;
    this.persist();
    return dt;
  }

  // ==========================================
  // KNOWLEDGE BASE
  // ==========================================
  listKnowledgeBase(filter?: {
    jurisdiction?: string;
    documentType?: string;
    category?: KnowledgeCategory;
    status?: KnowledgeStatus;
    search?: string;
  }): LegalKnowledgeBaseEntry[] {
    this.syncState();
    let entries = Object.values(this.state.knowledgeBase);

    if (filter?.jurisdiction && filter.jurisdiction !== 'All') {
      entries = entries.filter(
        (e) => e.jurisdiction === filter.jurisdiction || e.jurisdiction === 'All'
      );
    }

    if (filter?.documentType && filter.documentType !== 'All') {
      entries = entries.filter(
        (e) =>
          e.document_type.toLowerCase() === filter.documentType!.toLowerCase() ||
          e.document_type === 'All'
      );
    }

    if (filter?.category) {
      entries = entries.filter((e) => e.category === filter.category);
    }

    if (filter?.status) {
      entries = entries.filter((e) => e.status === filter.status);
    }

    if (filter?.search) {
      const q = filter.search.toLowerCase();
      entries = entries.filter(
        (e) =>
          e.title.toLowerCase().includes(q) ||
          e.content.toLowerCase().includes(q) ||
          e.summary.toLowerCase().includes(q) ||
          e.tags.some((t) => t.toLowerCase().includes(q))
      );
    }

    return entries.sort(
      (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    );
  }

  getKnowledgeBaseEntry(id: string): LegalKnowledgeBaseEntry | null {
    this.syncState();
    return this.state.knowledgeBase[id] || null;
  }

  saveKnowledgeBaseEntry(entry: LegalKnowledgeBaseEntry): LegalKnowledgeBaseEntry {
    this.syncState();
    const updated = {
      ...entry,
      updated_at: new Date().toISOString(),
    };
    this.state.knowledgeBase[entry.id] = updated;
    this.persist();
    return updated;
  }

  deleteKnowledgeBaseEntry(id: string): boolean {
    this.syncState();
    if (this.state.knowledgeBase[id]) {
      delete this.state.knowledgeBase[id];
      this.persist();
      return true;
    }
    return false;
  }

  approveKnowledgeBaseEntry(id: string, approvedBy: string): LegalKnowledgeBaseEntry | null {
    this.syncState();
    const entry = this.state.knowledgeBase[id];
    if (!entry) return null;
    entry.status = 'Approved';
    entry.approved_by = approvedBy;
    entry.updated_at = new Date().toISOString();
    this.persist();
    return entry;
  }

  // Conflict Detection
  detectConflicts(jurisdiction?: string, documentType?: string): KnowledgeConflict[] {
    this.syncState();
    const approved = this.listKnowledgeBase({
      jurisdiction,
      documentType,
      status: 'Approved',
    });

    const conflicts: KnowledgeConflict[] = [];

    // Inspect pairs of entries for contradictory directives
    for (let i = 0; i < approved.length; i++) {
      for (let j = i + 1; j < approved.length; j++) {
        const a = approved[i];
        const b = approved[j];

        // Check if both relate to the same category and doc type or jurisdiction
        if (
          a.category === b.category &&
          (a.jurisdiction === b.jurisdiction || a.jurisdiction === 'All' || b.jurisdiction === 'All') &&
          (a.document_type === b.document_type || a.document_type === 'All' || b.document_type === 'All')
        ) {
          // Detect contradictory terms like exclusive jurisdiction in diff courts or liability caps
          const aLower = a.content.toLowerCase();
          const bLower = b.content.toLowerCase();

          const hasForumConflict =
            (aLower.includes('delaware') && bLower.includes('england and wales')) ||
            (aLower.includes('pakistan') && bLower.includes('delaware')) ||
            (aLower.includes('dubai') && bLower.includes('delaware'));

          const hasLiabilityConflict =
            (aLower.includes('solely developer liability') && bLower.includes('mutual limitation of liability')) ||
            (aLower.includes('unlimited liability') && bLower.includes('total aggregate liability'));

          if (hasForumConflict || hasLiabilityConflict) {
            const conflictId = `conflict_${a.id}_${b.id}`;
            const conflict: KnowledgeConflict = {
              id: conflictId,
              title: `Jurisdiction/Wording Divergence: ${a.title} vs ${b.title}`,
              jurisdiction: a.jurisdiction,
              document_type: a.document_type,
              entryA: { id: a.id, title: a.title, content: a.content, version: a.version, source: a.source },
              entryB: { id: b.id, title: b.title, content: b.content, version: b.version, source: b.source },
              reason: hasForumConflict
                ? 'Discrepancy in governing law forum or court selection across approved entries'
                : 'Conflicting liability allocation provisions detected across approved guidance',
              detected_at: new Date().toISOString(),
              resolved: !!this.state.conflicts[conflictId]?.resolved,
            };
            conflicts.push(conflict);
            this.state.conflicts[conflictId] = conflict;
          }
        }
      }
    }

    this.persist();
    return conflicts;
  }

  resolveConflict(conflictId: string, resolutionNotes: string): boolean {
    this.syncState();
    if (this.state.conflicts[conflictId]) {
      this.state.conflicts[conflictId].resolved = true;
      this.state.conflicts[conflictId].resolution_notes = resolutionNotes;
      this.persist();
      return true;
    }
    return false;
  }

  // ==========================================
  // TEMPLATES
  // ==========================================
  listTemplates(filter?: {
    documentType?: string;
    jurisdiction?: string;
    status?: KnowledgeStatus;
  }): LegalTemplate[] {
    this.syncState();
    let templates = Object.values(this.state.templates);

    if (filter?.documentType && filter.documentType !== 'All') {
      templates = templates.filter(
        (t) => t.document_type.toLowerCase() === filter.documentType!.toLowerCase()
      );
    }

    if (filter?.jurisdiction && filter.jurisdiction !== 'All') {
      templates = templates.filter(
        (t) => t.jurisdiction === filter.jurisdiction || t.jurisdiction === 'All'
      );
    }

    if (filter?.status) {
      templates = templates.filter((t) => t.approval_status === filter.status);
    }

    return templates;
  }

  getTemplate(id: string): LegalTemplate | null {
    this.syncState();
    return this.state.templates[id] || null;
  }

  saveTemplate(tpl: LegalTemplate): LegalTemplate {
    this.syncState();
    const updated = {
      ...tpl,
      updated_at: new Date().toISOString(),
    };
    this.state.templates[tpl.id] = updated;
    this.persist();
    return updated;
  }

  deleteTemplate(id: string): boolean {
    this.syncState();
    if (this.state.templates[id]) {
      delete this.state.templates[id];
      this.persist();
      return true;
    }
    return false;
  }

  // ==========================================
  // LEGAL DOCUMENTS & VERSIONS
  // ==========================================
  saveDocument(doc: LegalDocument): LegalDocument {
    this.syncState();
    this.state.documents[doc.id] = doc;
    this.persist();
    return doc;
  }

  getDocument(id: string): LegalDocument | null {
    this.syncState();
    return this.state.documents[id] || null;
  }

  listDocuments(filter?: { status?: string; documentType?: string }): LegalDocument[] {
    this.syncState();
    let docs = Object.values(this.state.documents);

    if (filter?.status) {
      docs = docs.filter((d) => d.status === filter.status);
    }

    if (filter?.documentType) {
      docs = docs.filter(
        (d) => d.document_type.toLowerCase() === filter.documentType!.toLowerCase()
      );
    }

    return docs.sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  deleteDocument(id: string): boolean {
    this.syncState();
    if (this.state.documents[id]) {
      delete this.state.documents[id];
      this.persist();
      return true;
    }
    return false;
  }

  saveVersion(docId: string, version: LegalDocumentVersion): LegalDocumentVersion {
    this.syncState();
    const doc = this.state.documents[docId];
    if (doc) {
      const idx = doc.versions.findIndex((v) => v.id === version.id);
      if (idx >= 0) {
        doc.versions[idx] = version;
      } else {
        doc.versions.push(version);
      }
      doc.updated_at = new Date().toISOString();
      this.persist();
    }
    return version;
  }

  getVersions(docId: string): LegalDocumentVersion[] {
    this.syncState();
    const doc = this.state.documents[docId];
    return doc ? doc.versions.sort((a, b) => a.versionNumber - b.versionNumber) : [];
  }

  getVersion(docId: string, versionId: string): LegalDocumentVersion | null {
    this.syncState();
    const doc = this.state.documents[docId];
    if (!doc) return null;
    return doc.versions.find((v) => v.id === versionId) || null;
  }

  // ==========================================
  // AUDIT LOGS
  // ==========================================
  addAuditLog(log: Omit<LegalAuditLog, 'id' | 'timestamp'>): LegalAuditLog {
    this.syncState();
    const entry: LegalAuditLog = {
      ...log,
      id: `audit_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
      timestamp: new Date().toISOString(),
    };
    this.state.auditLogs.unshift(entry);
    if (this.state.auditLogs.length > 2000) {
      this.state.auditLogs = this.state.auditLogs.slice(0, 2000);
    }
    this.persist();
    return entry;
  }

  listAuditLogs(limit = 100, filter?: { documentId?: string; user?: string }): LegalAuditLog[] {
    this.syncState();
    let logs = this.state.auditLogs;
    if (filter?.documentId) {
      logs = logs.filter((l) => l.documentId === filter.documentId);
    }
    if (filter?.user) {
      logs = logs.filter((l) => l.user === filter.user);
    }
    return logs.slice(0, limit);
  }

  // ==========================================
  // KNOWLEDGE SOURCES (Ingestion)
  // ==========================================
  saveKnowledgeSource(src: KnowledgeSource): KnowledgeSource {
    this.syncState();
    this.state.sources[src.id] = src;
    this.persist();
    return src;
  }

  listKnowledgeSources(): KnowledgeSource[] {
    this.syncState();
    return Object.values(this.state.sources).sort(
      (a, b) => new Date(b.uploaded_at).getTime() - new Date(a.uploaded_at).getTime()
    );
  }

  getKnowledgeSource(id: string): KnowledgeSource | null {
    this.syncState();
    return this.state.sources[id] || null;
  }

  updateKnowledgeSourceStatus(
    id: string,
    status: KnowledgeStatus,
    notes?: string,
    reviewedBy?: string
  ): KnowledgeSource | null {
    this.syncState();
    const src = this.state.sources[id];
    if (!src) return null;
    src.status = status;
    if (notes) src.review_notes = notes;
    if (reviewedBy) src.reviewed_by = reviewedBy;
    this.persist();
    return src;
  }

  // ==========================================
  // GENERATION RUNS & ANALYTICS
  // ==========================================
  recordRun(run: DocumentGenerationRun): DocumentGenerationRun {
    this.syncState();
    this.state.runs[run.id] = run;
    this.persist();
    return run;
  }

  getAnalytics() {
    this.syncState();
    const docs = Object.values(this.state.documents);
    const totalDrafted = docs.length;
    const completed = docs.filter((d) => d.status === 'COMPLETED').length;
    const requiringReview = docs.filter((d) => d.status === 'NEEDS_REVIEW').length;
    const humanized = docs.filter((d) => d.versions.some((v) => v.label.includes('Humanized'))).length;
    const qualityChecks = docs.reduce((acc, d) => acc + (d.versions.some((v) => v.qualityReport) ? 1 : 0), 0);

    // Template usage counts
    const templateCounts: Record<string, number> = {};
    const jurisdictionCounts: Record<string, number> = {};

    let totalDurationMs = 0;
    let completedCount = 0;

    for (const d of docs) {
      if (d.template_id) {
        templateCounts[d.template_id] = (templateCounts[d.template_id] || 0) + 1;
      }
      if (d.jurisdiction) {
        jurisdictionCounts[d.jurisdiction] = (jurisdictionCounts[d.jurisdiction] || 0) + 1;
      }
      if (d.report?.processingTimeMs) {
        totalDurationMs += d.report.processingTimeMs;
        completedCount++;
      }
    }

    const mostUsedTemplates = Object.entries(templateCounts)
      .map(([id, count]) => ({ id, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const mostUsedJurisdictions = Object.entries(jurisdictionCounts)
      .map(([jurisdiction, count]) => ({ jurisdiction, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    return {
      documentsDrafted: totalDrafted,
      documentsHumanized: humanized,
      legalChecks: qualityChecks,
      documentsRequiringReview: requiringReview,
      mostUsedTemplates,
      mostUsedJurisdictions,
      processingSuccessRate: totalDrafted > 0 ? Math.round((completed / totalDrafted) * 100) : 100,
      averageProcessingTimeMs: completedCount > 0 ? Math.round(totalDurationMs / completedCount) : 1850,
      totalApprovedKnowledge: Object.values(this.state.knowledgeBase).filter((k) => k.status === 'Approved').length,
      pendingKnowledgeImports: Object.values(this.state.sources).filter((s) => s.status !== 'Approved').length,
    };
  }
}

export const legalRepository = new LegalRepository();
