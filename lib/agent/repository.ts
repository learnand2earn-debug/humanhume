import fs from 'fs';
import path from 'path';
import { UniversalConversation, AgentMessage } from './types';

export class ConversationRepository {
  private static getDataFile(): string {
    const dataDir = process.env.DATA_DIR
      ? path.resolve(process.env.DATA_DIR)
      : path.resolve(process.cwd(), 'data');
    return path.resolve(dataDir, 'agent_conversations.json');
  }
  private static conversations: Map<string, UniversalConversation> = new Map();
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
        const list: UniversalConversation[] = JSON.parse(raw);
        list.forEach((c) => this.conversations.set(c.id, c));
      } catch (err) {
        console.error('Failed to read agent conversations:', err);
      }
    }
    this.initialized = true;
  }

  private static persist() {
    try {
      const dataFile = this.getDataFile();
      const list = Array.from(this.conversations.values());
      fs.writeFileSync(dataFile, JSON.stringify(list, null, 2), 'utf-8');
    } catch (err) {
      console.error('Failed to persist agent conversations:', err);
    }
  }

  static listConversations(): UniversalConversation[] {
    this.init();
    return Array.from(this.conversations.values()).sort(
      (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
    );
  }

  static getConversation(id: string): UniversalConversation | null {
    this.init();
    return this.conversations.get(id) || null;
  }

  static createConversation(title = 'New Conversation'): UniversalConversation {
    this.init();
    const id = `conv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const conv: UniversalConversation = {
      id,
      title,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    this.conversations.set(id, conv);
    this.persist();
    return conv;
  }

  static updateConversation(conv: UniversalConversation): UniversalConversation {
    this.init();
    conv.updatedAt = new Date().toISOString();
    this.conversations.set(conv.id, conv);
    this.persist();
    return conv;
  }

  static updateTitle(id: string, title: string): UniversalConversation | null {
    this.init();
    const conv = this.conversations.get(id);
    if (!conv) return null;
    conv.title = title;
    conv.updatedAt = new Date().toISOString();
    this.conversations.set(id, conv);
    this.persist();
    return conv;
  }

  static deleteConversation(id: string): boolean {
    this.init();
    const deleted = this.conversations.delete(id);
    if (deleted) this.persist();
    return deleted;
  }

  static addMessage(convId: string, message: AgentMessage): UniversalConversation {
    this.init();
    let conv = this.conversations.get(convId);
    if (!conv) {
      conv = this.createConversation();
    }
    conv.messages.push(message);
    if (conv.messages.length === 1 && message.role === 'user') {
      conv.title = message.text.slice(0, 42).trim() || 'New Conversation';
    }
    conv.updatedAt = new Date().toISOString();
    this.conversations.set(conv.id, conv);
    this.persist();
    return conv;
  }

  static updateMessage(convId: string, messageId: string, updates: Partial<AgentMessage>): UniversalConversation | null {
    this.init();
    const conv = this.conversations.get(convId);
    if (!conv) return null;
    const msg = conv.messages.find((m) => m.id === messageId);
    if (msg) {
      Object.assign(msg, updates);
      conv.updatedAt = new Date().toISOString();
      this.conversations.set(conv.id, conv);
      this.persist();
    }
    return conv;
  }
}
