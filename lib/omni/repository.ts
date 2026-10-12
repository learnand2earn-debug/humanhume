import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { OmniConversation, OmniMessage, OmniUserSettings } from './types';

const DATA_DIR = path.join(process.cwd(), 'data', 'omni');
const CONV_FILE = path.join(DATA_DIR, 'conversations.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

// In-memory conversation store initialized on boot
let conversationStore: Map<string, OmniConversation> = new Map();
let userSettingsStore: OmniUserSettings = {
  preferredModel: 'gpt-4o',
  temperature: 0.7,
  theme: 'dark',
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

function loadFromDisk() {
  ensureDir();
  try {
    if (fs.existsSync(CONV_FILE)) {
      const raw = fs.readFileSync(CONV_FILE, 'utf-8');
      const list: OmniConversation[] = JSON.parse(raw);
      conversationStore = new Map(list.map((c) => [c.id, c]));
    }
    if (fs.existsSync(SETTINGS_FILE)) {
      const raw = fs.readFileSync(SETTINGS_FILE, 'utf-8');
      userSettingsStore = JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Omni repository disk load warning:', e);
  }
}

function saveToDisk() {
  ensureDir();
  try {
    const list = Array.from(conversationStore.values());
    fs.writeFileSync(CONV_FILE, JSON.stringify(list, null, 2), 'utf-8');
    fs.writeFileSync(SETTINGS_FILE, JSON.stringify(userSettingsStore, null, 2), 'utf-8');
  } catch (e) {
    console.warn('Omni repository disk save warning:', e);
  }
}

loadFromDisk();

export class OmniRepository {
  static listConversations(): OmniConversation[] {
    const list = Array.from(conversationStore.values());
    return list.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  }

  static getConversation(id: string): OmniConversation | undefined {
    return conversationStore.get(id);
  }

  static createConversation(title = 'New Chat', model: OmniConversation['model'] = 'gpt-4o'): OmniConversation {
    const id = `conv_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;
    const now = new Date().toISOString();
    const conv: OmniConversation = {
      id,
      title,
      createdAt: now,
      updatedAt: now,
      model,
      messages: [],
    };
    conversationStore.set(id, conv);
    saveToDisk();
    return conv;
  }

  static addMessage(conversationId: string, message: OmniMessage): OmniConversation {
    let conv = conversationStore.get(conversationId);
    if (!conv) {
      conv = this.createConversation('New Chat');
    }

    conv.messages.push(message);
    conv.updatedAt = new Date().toISOString();

    // Auto-update conversation title from first user prompt if still default
    if (conv.messages.length === 2 && conv.title === 'New Chat') {
      const firstUserMsg = conv.messages.find((m) => m.role === 'user');
      if (firstUserMsg) {
        const clean = firstUserMsg.content.slice(0, 42).trim();
        conv.title = clean.length > 0 ? (clean.length < 42 ? clean : `${clean}...`) : 'Chat';
      }
    }

    conversationStore.set(conv.id, conv);
    saveToDisk();
    return conv;
  }

  static updateConversationTitle(id: string, title: string): boolean {
    const conv = conversationStore.get(id);
    if (!conv) return false;
    conv.title = title;
    conv.updatedAt = new Date().toISOString();
    saveToDisk();
    return true;
  }

  static deleteConversation(id: string): boolean {
    const deleted = conversationStore.delete(id);
    if (deleted) saveToDisk();
    return deleted;
  }

  static clearAll(): void {
    conversationStore.clear();
    saveToDisk();
  }

  static getSettings(): OmniUserSettings {
    return userSettingsStore;
  }

  static updateSettings(settings: Partial<OmniUserSettings>): OmniUserSettings {
    userSettingsStore = { ...userSettingsStore, ...settings };
    saveToDisk();
    return userSettingsStore;
  }
}
