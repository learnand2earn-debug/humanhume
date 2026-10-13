export type OmniModelId =
  | 'gpt-4o'
  | 'claude-3-5-sonnet'
  | 'o3-mini'
  | 'dalle-3'
  | 'claude-code-fixer';

export type OmniToolMode =
  | 'auto'
  | 'image'
  | 'create_file'
  | 'fix_file'
  | 'web_search'
  | 'deep_think';

export interface OmniAttachment {
  id: string;
  name: string;
  size: number;
  type: string; // 'code' | 'document' | 'image' | 'data' | 'other'
  content?: string; // text or base64
  extractedSummary?: string;
  url?: string;
  previewUrl?: string;
}

export interface OmniThought {
  title: string;
  steps: string[];
  durationSeconds?: number;
}

export interface GeneratedFileMeta {
  id: string;
  fileName: string;
  fileType: 'docx' | 'xlsx' | 'pdf' | 'html' | 'py' | 'tsx' | 'ts' | 'js' | 'json' | 'md' | 'csv' | 'txt';
  sizeBytes: number;
  downloadUrl: string;
  contentSnippet?: string;
  summary: string;
}

export type TopImageModelId =
  | 'flux-1-pro'
  | 'midjourney-v6'
  | 'dalle-3-hd'
  | 'sd-3-5-large'
  | 'ideogram-v2'
  | 'imagen-3';

export interface GeneratedImageMeta {
  id: string;
  prompt: string;
  modelName: string;
  style: string;
  aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '21:9';
  imageUrl: string;
  thumbnailUrl?: string;
  width: number;
  height: number;
  quality?: 'standard' | 'hd' | 'ultra-4k';
  seed?: number;
  negativePrompt?: string;
}

export interface FileFixMeta {
  id: string;
  originalFileName: string;
  fixedFileName: string;
  language: string;
  detectedIssues: Array<{
    line?: number;
    severity: 'error' | 'warning' | 'info';
    description: string;
    fixApplied: string;
  }>;
  summary: string;
  originalContent: string;
  fixedContent: string;
  downloadUrl: string;
}

export interface OmniArtifact {
  id: string;
  title: string;
  type: 'code' | 'html_preview' | 'document' | 'diff' | 'image' | 'spreadsheet';
  language?: string;
  content: string;
  meta?: Record<string, unknown>;
}

export interface OmniWebCitation {
  title: string;
  url: string;
  snippet: string;
}

export interface OmniMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  model?: OmniModelId;
  attachments?: OmniAttachment[];
  thought?: OmniThought;
  artifact?: OmniArtifact;
  generatedFiles?: GeneratedFileMeta[];
  generatedImages?: GeneratedImageMeta[];
  fileFixResult?: FileFixMeta;
  citations?: OmniWebCitation[];
  isStreaming?: boolean;
}

export interface OmniConversation {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  model: OmniModelId;
  messages: OmniMessage[];
  pinned?: boolean;
}

export interface OmniUserSettings {
  openaiApiKey?: string;
  anthropicApiKey?: string;
  geminiApiKey?: string;
  preferredModel: OmniModelId;
  temperature: number;
  systemPrompt?: string;
  theme: 'dark' | 'light' | 'system';
}
