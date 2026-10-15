import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  AdminSettings,
  ApiUsageRecord,
  ChatMessage,
  DocumentRecord,
  DocumentVersion,
  ProcessingJob,
  QualityCheckResult,
  SystemLog,
} from '../types';

interface DatabaseState {
  settings: AdminSettings;
  documents: Record<string, DocumentRecord>;
  versions: Record<string, DocumentVersion[]>;
  jobs: Record<string, ProcessingJob>;
  qualityChecks: Record<string, QualityCheckResult[]>;
  apiUsage: ApiUsageRecord[];
  logs: SystemLog[];
  chatMessages: ChatMessage[];
}

export class Repository {
  private dataFile: string;
  private state: DatabaseState;
  private writeTimer: NodeJS.Timeout | null = null;

  constructor() {
    const dataDir = process.env.DATA_DIR
      ? path.resolve(process.env.DATA_DIR)
      : path.resolve(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }
    this.dataFile = path.join(dataDir, 'humanflow.json');
    this.state = this.loadState();
  }

  private getDefaultSettings(): AdminSettings {
    return {
      mode: (process.env.APP_MODE as 'demo' | 'live') || 'demo',
      humanizer: {
        apiUrl: process.env.HUMANIZER_API_URL || 'https://api.openai.com/v1/chat/completions',
        apiKey: process.env.HUMANIZER_API_KEY || '',
        model: process.env.HUMANIZER_MODEL || 'gpt-4o-mini',
        responsePath: process.env.HUMANIZER_RESPONSE_PATH || 'choices[0].message.content',
        authHeader: process.env.HUMANIZER_AUTH_HEADER || 'Authorization',
        authPrefix: process.env.HUMANIZER_AUTH_PREFIX || 'Bearer',
        timeoutMs: 60000,
        chunkSize: 1200,
      },
      checker: {
        apiUrl: process.env.CHECKER_API_URL || '',
        apiKey: process.env.CHECKER_API_KEY || '',
        providerName: process.env.CHECKER_PROVIDER_NAME || 'QualityGuard AI Check',
        passThreshold: Number(process.env.AI_SCORE_PASS_THRESHOLD) || 20,
        timeoutMs: 30000,
      },
      discordWebhookUrl: process.env.DISCORD_WEBHOOK_URL || '',
      maxRetries: Number(process.env.MAX_RETRIES) || 3,
      maxFileSizeMb: Number(process.env.MAX_FILE_SIZE_MB) || 50,
      retentionHours: Number(process.env.DOCUMENT_RETENTION_HOURS) || 24,
      autoFixEnabled: true,
      passThresholdScore: Number(process.env.AI_SCORE_PASS_THRESHOLD) || 20,
      chunkSizeWords: 600,
    };
  }

  private loadState(): DatabaseState {
    if (fs.existsSync(this.dataFile)) {
      try {
        const raw = fs.readFileSync(this.dataFile, 'utf-8');
        const parsed = JSON.parse(raw);
        return {
          settings: { ...this.getDefaultSettings(), ...(parsed.settings || {}) },
          documents: parsed.documents || {},
          versions: parsed.versions || {},
          jobs: parsed.jobs || {},
          qualityChecks: parsed.qualityChecks || {},
          apiUsage: parsed.apiUsage || [],
          logs: parsed.logs || [],
          chatMessages: parsed.chatMessages || [],
        };
      } catch (err) {
        console.error('Failed to parse database file, initializing defaults:', err);
      }
    }

    const defaultState: DatabaseState = {
      settings: this.getDefaultSettings(),
      documents: {},
      versions: {},
      jobs: {},
      qualityChecks: {},
      apiUsage: [],
      logs: [],
      chatMessages: [],
    };
    this.persistSync(defaultState);
    return defaultState;
  }

  private lastSyncMtime = 0;

  private persistSync(state: DatabaseState) {
    try {
      fs.writeFileSync(this.dataFile, JSON.stringify(state, null, 2), 'utf-8');
      if (fs.existsSync(this.dataFile)) {
        this.lastSyncMtime = fs.statSync(this.dataFile).mtimeMs;
      }
    } catch (err) {
      console.error('Failed to write database file:', err);
    }
  }

  private persist() {
    this.persistSync(this.state);
  }

  public flush() {
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
            settings: { ...this.getDefaultSettings(), ...(parsed.settings || {}) },
            documents: parsed.documents || {},
            versions: parsed.versions || {},
            jobs: parsed.jobs || {},
            qualityChecks: parsed.qualityChecks || {},
            apiUsage: parsed.apiUsage || [],
            logs: parsed.logs || [],
            chatMessages: parsed.chatMessages || [],
          };
          this.lastSyncMtime = stats.mtimeMs;
        }
      }
    } catch {
      // Fallback
    }
  }

  // --- Settings ---
  getSettings(): AdminSettings {
    return { ...this.state.settings };
  }

  getMaskedSettings(): AdminSettings {
    const s = { ...this.state.settings };
    const mask = (key: string) => {
      if (!key || key.length < 8) return key ? '******' : '';
      return `${key.slice(0, 3)}****************${key.slice(-3)}`;
    };

    return {
      ...s,
      humanizer: {
        ...s.humanizer,
        apiKey: mask(s.humanizer.apiKey || ''),
      },
      checker: {
        ...s.checker,
        apiKey: mask(s.checker.apiKey || ''),
      },
    };
  }

  updateSettings(updates: Partial<AdminSettings>): AdminSettings {
    // If masked apiKey was submitted back, retain existing stored raw key
    if (updates.humanizer && updates.humanizer.apiKey && updates.humanizer.apiKey.includes('****')) {
      updates.humanizer.apiKey = this.state.settings.humanizer.apiKey;
    }
    if (updates.checker && updates.checker.apiKey && updates.checker.apiKey.includes('****')) {
      updates.checker.apiKey = this.state.settings.checker.apiKey;
    }

    this.state.settings = {
      ...this.state.settings,
      ...updates,
      humanizer: {
        ...this.state.settings.humanizer,
        ...(updates.humanizer || {}),
      },
      checker: {
        ...this.state.settings.checker,
        ...(updates.checker || {}),
      },
    };
    this.persist();
    return this.getSettings();
  }

  // --- Documents ---
  saveDocument(doc: DocumentRecord): DocumentRecord {
    this.state.documents[doc.id] = doc;
    this.persist();
    return doc;
  }

  getDocument(id: string): DocumentRecord | null {
    this.syncState();
    return this.state.documents[id] || null;
  }

  listDocuments(): DocumentRecord[] {
    this.syncState();
    return Object.values(this.state.documents).sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  updateDocument(id: string, updates: Partial<DocumentRecord>): DocumentRecord | null {
    this.syncState();
    const doc = this.state.documents[id];
    if (!doc) return null;
    const updated = {
      ...doc,
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.state.documents[id] = updated;
    this.persist();
    return updated;
  }

  deleteDocument(id: string): boolean {
    this.syncState();
    if (this.state.documents[id]) {
      delete this.state.documents[id];
      delete this.state.versions[id];
      delete this.state.jobs[id];
      delete this.state.qualityChecks[id];
      this.persist();
      return true;
    }
    return false;
  }

  // --- Versions ---
  saveVersion(version: DocumentVersion): DocumentVersion {
    this.syncState();
    if (!this.state.versions[version.documentId]) {
      this.state.versions[version.documentId] = [];
    }
    this.state.versions[version.documentId].push(version);
    this.persist();
    return version;
  }

  listVersions(documentId: string): DocumentVersion[] {
    this.syncState();
    return (this.state.versions[documentId] || []).sort(
      (a, b) => a.versionNumber - b.versionNumber
    );
  }

  getVersion(documentId: string, versionId: string): DocumentVersion | null {
    this.syncState();
    const versions = this.state.versions[documentId] || [];
    return versions.find((v) => v.id === versionId) || null;
  }

  // --- Processing Jobs ---
  saveJob(job: ProcessingJob): ProcessingJob {
    this.syncState();
    this.state.jobs[job.documentId] = job;
    this.persist();
    return job;
  }

  getJob(documentId: string): ProcessingJob | null {
    this.syncState();
    return this.state.jobs[documentId] || null;
  }

  listJobs(): ProcessingJob[] {
    return Object.values(this.state.jobs).sort(
      (a, b) => new Date(b.startedAt).getTime() - new Date(a.startedAt).getTime()
    );
  }

  updateJob(documentId: string, updates: Partial<ProcessingJob>): ProcessingJob | null {
    const job = this.state.jobs[documentId];
    if (!job) return null;
    const updated = {
      ...job,
      ...updates,
    };
    this.state.jobs[documentId] = updated;
    this.persist();
    return updated;
  }

  // --- Quality Checks ---
  saveQualityCheck(check: QualityCheckResult): QualityCheckResult {
    if (!this.state.qualityChecks[check.documentId]) {
      this.state.qualityChecks[check.documentId] = [];
    }
    this.state.qualityChecks[check.documentId].push(check);
    this.persist();
    return check;
  }

  listQualityChecks(documentId: string): QualityCheckResult[] {
    return this.state.qualityChecks[documentId] || [];
  }

  // --- API Usage & Telemetry ---
  recordApiUsage(usage: Omit<ApiUsageRecord, 'id' | 'createdAt'>): ApiUsageRecord {
    const record: ApiUsageRecord = {
      ...usage,
      id: `api_${crypto.randomUUID().slice(0, 8)}`,
      createdAt: new Date().toISOString(),
    };
    this.state.apiUsage.unshift(record);
    // Keep last 1000 records
    if (this.state.apiUsage.length > 1000) {
      this.state.apiUsage = this.state.apiUsage.slice(0, 1000);
    }
    this.persist();
    return record;
  }

  listApiUsage(limit = 100): ApiUsageRecord[] {
    return this.state.apiUsage.slice(0, limit);
  }

  // --- System Logs ---
  addLog(
    entry: Omit<SystemLog, 'id' | 'timestamp'> & { timestamp?: string }
  ): SystemLog {
    const log: SystemLog = {
      id: `log_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`,
      timestamp: entry.timestamp || new Date().toISOString(),
      traceId: entry.traceId,
      level: entry.level,
      module: entry.module,
      action: entry.action,
      message: entry.message,
      metadata: entry.metadata,
    };
    this.state.logs.unshift(log);
    if (this.state.logs.length > 2000) {
      this.state.logs = this.state.logs.slice(0, 2000);
    }
    this.persist();
    return log;
  }

  listLogs(filter?: { level?: string; module?: string; traceId?: string; limit?: number }): SystemLog[] {
    let result = this.state.logs;
    if (filter?.level) {
      result = result.filter((l) => l.level === filter.level);
    }
    if (filter?.module) {
      result = result.filter((l) => l.module === filter.module);
    }
    if (filter?.traceId) {
      result = result.filter((l) => l.traceId === filter.traceId);
    }
    return result.slice(0, filter?.limit || 150);
  }

  // --- Chat Messages ---
  addChatMessage(msg: Omit<ChatMessage, 'id' | 'timestamp'>): ChatMessage {
    const chat: ChatMessage = {
      id: `msg_${crypto.randomUUID().slice(0, 8)}`,
      timestamp: new Date().toISOString(),
      sender: msg.sender,
      text: msg.text,
      systemContext: msg.systemContext,
    };
    this.state.chatMessages.push(chat);
    if (this.state.chatMessages.length > 500) {
      this.state.chatMessages = this.state.chatMessages.slice(-500);
    }
    this.persist();
    return chat;
  }

  listChatMessages(limit = 50): ChatMessage[] {
    return this.state.chatMessages.slice(-limit);
  }

  // --- Analytics Stats ---
  getAnalytics() {
    const docs = Object.values(this.state.documents);
    const totalDocs = docs.length;
    const processing = docs.filter(
      (d) =>
        ![
          'COMPLETED',
          'FAILED',
          'NEEDS_REVIEW',
          'PAUSED',
          'CANCELLED',
        ].includes(d.status)
    ).length;
    const completed = docs.filter((d) => d.status === 'COMPLETED').length;
    const failed = docs.filter((d) => d.status === 'FAILED').length;
    const needsReview = docs.filter((d) => d.status === 'NEEDS_REVIEW').length;

    // Today's documents
    const today = new Date().toISOString().slice(0, 10);
    const todayDocs = docs.filter((d) => d.createdAt.startsWith(today)).length;

    // Average processing time
    const completedDocs = docs.filter((d) => d.completedAt && d.createdAt);
    let avgDurationMs = 0;
    if (completedDocs.length > 0) {
      const totalMs = completedDocs.reduce((acc, d) => {
        const ms =
          new Date(d.completedAt!).getTime() - new Date(d.createdAt).getTime();
        return acc + (ms > 0 ? ms : 0);
      }, 0);
      avgDurationMs = Math.round(totalMs / completedDocs.length);
    }

    // Average quality score
    const scoredDocs = docs.filter((d) => typeof d.preservationScore === 'number');
    const avgPreservationScore = scoredDocs.length
      ? Math.round(
          scoredDocs.reduce((acc, d) => acc + (d.preservationScore || 0), 0) /
            scoredDocs.length
        )
      : 98;

    const avgAiScore = scoredDocs.filter((d) => typeof d.aiCheckScore === 'number').length
      ? Math.round(
          scoredDocs.reduce((acc, d) => acc + (d.aiCheckScore || 0), 0) /
            scoredDocs.length
        )
      : 8;

    // API usage stats
    const apiCalls = this.state.apiUsage.length;
    const apiErrors = this.state.apiUsage.filter((a) => a.status === 'ERROR').length;

    return {
      totalDocuments: totalDocs,
      processing,
      completed,
      failed,
      needsReview,
      todayDocuments: todayDocs,
      avgProcessingTimeMs: avgDurationMs,
      avgQualityScore: avgPreservationScore,
      avgAiScore,
      apiCalls,
      apiErrors,
      successRate: totalDocs > 0 ? Math.round((completed / totalDocs) * 100) : 100,
    };
  }
}

export const repository = new Repository();
