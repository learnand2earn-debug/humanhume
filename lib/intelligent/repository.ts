import fs from 'fs';
import path from 'path';
import { WorkflowSession, WorkflowStage } from './types';

export class IntelligentSessionRepository {
  private static getDataFile(): string {
    const dataDir = process.env.DATA_DIR
      ? path.resolve(process.env.DATA_DIR)
      : path.resolve(process.cwd(), 'data');
    return path.resolve(dataDir, 'intelligent_sessions.json');
  }
  private static sessions: Map<string, WorkflowSession> = new Map();
  private static initialized = false;

  private static init() {
    if (this.initialized) return;
    const dataFile = this.getDataFile();
    const dataDir = path.dirname(dataFile);
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    if (fs.existsSync(dataFile)) {
      try {
        const raw = fs.readFileSync(dataFile, 'utf-8');
        const list: WorkflowSession[] = JSON.parse(raw);
        list.forEach((s) => this.sessions.set(s.id, s));
      } catch (err) {
        console.error('Failed to load intelligent sessions from disk:', err);
      }
    }
    this.initialized = true;
  }

  private static persist() {
    try {
      const dataFile = this.getDataFile();
      const list = Array.from(this.sessions.values());
      fs.writeFileSync(dataFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist intelligent sessions to disk:', err);
    }
  }

  static createSession(session: WorkflowSession): WorkflowSession {
    this.init();
    this.sessions.set(session.id, session);
    this.persist();
    return session;
  }

  static getSession(id: string): WorkflowSession | null {
    this.init();
    return this.sessions.get(id) || null;
  }

  static listSessions(): WorkflowSession[] {
    this.init();
    return Array.from(this.sessions.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  static updateSession(session: WorkflowSession): WorkflowSession {
    this.init();
    session.updatedAt = new Date().toISOString();
    this.sessions.set(session.id, session);
    this.persist();
    return session;
  }

  static deleteSession(id: string): boolean {
    this.init();
    const deleted = this.sessions.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  static appendLog(
    sessionId: string,
    stage: WorkflowStage,
    action: string,
    details: string
  ): void {
    const session = this.getSession(sessionId);
    if (session) {
      session.executionLog.push({
        stage,
        action,
        timestamp: new Date().toISOString(),
        details,
      });
      session.currentStage = stage;
      this.updateSession(session);
    }
  }
}
