import {SupportedFileType} from '@/types';

/**
 * Masks sensitive API keys or webhook URLs so full secrets are never sent to the browser.
 * Example output: sk-***************92
 */
export function maskSecretKey(secret?: string): string {
  if (!secret || secret.trim().length === 0) return '';
  const clean = secret.trim();
  if (clean.length <= 6) {
    return 'sk-***************' + clean.slice(-1);
  }
  const prefix = clean.startsWith('sk-') ? 'sk-' : clean.slice(0, 3);
  const suffix = clean.slice(-2);
  return `${prefix}***************${suffix}`;
}

/**
 * Generates an auditable trace ID for every job and log entry.
 * Example: HF-20261016-8F3A91
 */
export function generateTraceId(): string {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const hex = Math.random().toString(16).substring(2, 8).toUpperCase().padEnd(6, 'A');
  return `HF-${yyyy}${mm}${dd}-${hex}`;
}

const ALLOWED_EXTENSIONS: Record<string, SupportedFileType> = {
  docx: 'DOCX',
  pdf: 'PDF',
  txt: 'TXT',
  md: 'MD',
  markdown: 'MD',
  rtf: 'RTF',
  xlsx: 'XLSX',
};

export interface FileValidationOutcome {
  valid: boolean;
  fileType?: SupportedFileType;
  error?: string;
  sanitizedFileName: string;
}

export function validateUploadedFile(
  fileName: string,
  fileSizeBytes: number,
  maxSizeMb = 50
): FileValidationOutcome {
  const sanitizedFileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const parts = fileName.toLowerCase().split('.');
  const ext = parts.length > 1 ? parts[parts.length - 1] : '';

  if (!ext || !ALLOWED_EXTENSIONS[ext]) {
    return {
      valid: false,
      sanitizedFileName,
      error: `Unsupported file format (.${ext || 'unknown'}). Supported formats: DOCX, PDF, TXT, MD, RTF, XLSX. Your original file was not modified.`,
    };
  }

  if (fileSizeBytes <= 0) {
    return {
      valid: false,
      sanitizedFileName,
      error: 'Uploaded file is empty (0 bytes). Please upload a valid document.',
    };
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (fileSizeBytes > maxBytes) {
    return {
      valid: false,
      sanitizedFileName,
      error: `File exceeds the maximum size limit of ${maxSizeMb} MB.`,
    };
  }

  return {
    valid: true,
    fileType: ALLOWED_EXTENSIONS[ext],
    sanitizedFileName,
  };
}

// Simple in-memory rate limiter per user/IP window
const rateBuckets = new Map<string, {count: number; resetAt: number}>();

export function checkRateLimit(identifier: string, maxRequestsPerMinute = 60): boolean {
  const now = Date.now();
  const bucket = rateBuckets.get(identifier);
  if (!bucket || now > bucket.resetAt) {
    rateBuckets.set(identifier, {count: 1, resetAt: now + 60_000});
    return true;
  }
  if (bucket.count >= maxRequestsPerMinute) {
    return false;
  }
  bucket.count += 1;
  return true;
}
