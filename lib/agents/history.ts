import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { AgentHistoryItem, AgentType } from './types';

export class AgentHistoryStore {
  private static filePath = path.resolve(process.cwd(), 'data', 'agent_history.json');
  private static inMemoryStore: AgentHistoryItem[] = [];

  private static ensureFile(): void {
    const dir = path.dirname(this.filePath);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        // Ignore fallback
      }
    }
    if (!fs.existsSync(this.filePath)) {
      try {
        fs.writeFileSync(this.filePath, JSON.stringify([]), 'utf-8');
      } catch {
        // Fallback to memory
      }
    }
  }

  private static readItems(): AgentHistoryItem[] {
    try {
      this.ensureFile();
      if (fs.existsSync(this.filePath)) {
        const raw = fs.readFileSync(this.filePath, 'utf-8');
        return JSON.parse(raw);
      }
    } catch {
      // Memory fallback
    }
    return this.inMemoryStore;
  }

  private static writeItems(items: AgentHistoryItem[]): void {
    this.inMemoryStore = items;
    try {
      this.ensureFile();
      fs.writeFileSync(this.filePath, JSON.stringify(items.slice(0, 100), null, 2), 'utf-8');
    } catch (err) {
      console.warn('Failed to persist agent history to disk, kept in memory:', err);
    }
  }

  static getAll(agentType?: AgentType): AgentHistoryItem[] {
    const items = this.readItems();
    if (!agentType) return items;
    return items.filter((item) => item.agentType === agentType);
  }

  static add(
    agentType: AgentType,
    title: string,
    inputPreview: string,
    outputPreview: string,
    data: unknown,
    options: Record<string, unknown>
  ): AgentHistoryItem {
    const items = this.readItems();
    const newItem: AgentHistoryItem = {
      id: `hist_${crypto.randomUUID()}`,
      agentType,
      title: title || `${agentType.toUpperCase()} Task`,
      inputPreview: inputPreview.slice(0, 120),
      outputPreview: outputPreview.slice(0, 150),
      createdAt: new Date().toISOString(),
      data: data as any,
      options,
    };

    items.unshift(newItem);
    this.writeItems(items);
    return newItem;
  }

  static delete(id: string): boolean {
    const items = this.readItems();
    const filtered = items.filter((item) => item.id !== id);
    if (filtered.length !== items.length) {
      this.writeItems(filtered);
      return true;
    }
    return false;
  }

  static clear(): void {
    this.writeItems([]);
  }
}
