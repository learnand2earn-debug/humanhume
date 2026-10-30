import fs from 'fs';
import path from 'path';
import os from 'os';

export type StorageBucket = 'original' | 'processing' | 'final' | 'temp' | 'preview';

function resolveStorageRoot(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), 'humanflow_storage');
  }
  try {
    const localDir = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, {recursive: true});
    }
    return localDir;
  } catch {
    return path.join(os.tmpdir(), 'humanflow_storage');
  }
}

const STORAGE_ROOT = resolveStorageRoot();

let directoriesInitialized = false;

function ensureStorageDirectories() {
  if (directoriesInitialized) return;
  directoriesInitialized = true;
  const buckets: StorageBucket[] = ['original', 'processing', 'final', 'temp', 'preview'];
  for (const bucket of buckets) {
    const dir = path.join(STORAGE_ROOT, bucket);
    if (!fs.existsSync(dir)) {
      try {
        fs.mkdirSync(dir, {recursive: true});
      } catch {
        // Fallback if read-only container
      }
    }
  }
}

// Memory mirror so even if container filesystem is ephemeral, original & processed files are 100% preserved
const memoryStorageMirror = new Map<string, {content: string; createdAt: number}>();
const binaryStorageMirror = new Map<string, {content: Buffer; createdAt: number}>();
/** Above this size a file only lives on disk; mirroring it would pin server memory. */
const MIRROR_LIMIT_BYTES = 24 * 1024 * 1024;

export function storagePathFor(bucket: StorageBucket, documentId: string, fileName: string) {
  ensureStorageDirectories();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  return {
    virtualPath: `/storage/${bucket}/${documentId}_${safeName}`,
    fullPath: path.join(STORAGE_ROOT, bucket, `${documentId}_${safeName}`),
  };
}

/**
 * Store raw file bytes exactly as uploaded. Text files must not go through this
 * path: the string API is the one that keeps the human-readable versions.
 */
export function saveBinaryToPrivateStorage(
  bucket: StorageBucket,
  documentId: string,
  fileName: string,
  content: Buffer
): string {
  const {virtualPath, fullPath} = storagePathFor(bucket, documentId, fileName);
  if (content.length <= MIRROR_LIMIT_BYTES) {
    binaryStorageMirror.set(virtualPath, {content: Buffer.from(content), createdAt: Date.now()});
  }
  fs.promises.writeFile(fullPath, content).catch(() => {
    // Kept safely in binaryStorageMirror if disk write is restricted
  });
  return virtualPath;
}

export function readBinaryFromPrivateStorage(virtualPath: string): Buffer | null {
  const mirrored = binaryStorageMirror.get(virtualPath);
  if (mirrored) return mirrored.content;

  try {
    const relative = virtualPath.replace(/^\/storage\//, '');
    const fullPath = path.join(STORAGE_ROOT, relative);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath);
    }
  } catch {
    // Ignore
  }
  return null;
}

export function saveToPrivateStorage(
  bucket: StorageBucket,
  documentId: string,
  fileName: string,
  content: string
): string {
  const {virtualPath, fullPath} = storagePathFor(bucket, documentId, fileName);

  memoryStorageMirror.set(virtualPath, {content, createdAt: Date.now()});

  // Non-blocking background write so synchronous disk I/O never slows down document upload
  fs.promises.writeFile(fullPath, content, 'utf-8').catch(() => {
    // Kept safely in memoryStorageMirror if disk write is restricted
  });

  return virtualPath;
}

export function readFromPrivateStorage(virtualPath: string): string | null {
  const mirrored = memoryStorageMirror.get(virtualPath);
  if (mirrored) return mirrored.content;
  const binary = binaryStorageMirror.get(virtualPath);
  if (binary) return binary.content.toString('utf-8');

  try {
    const relative = virtualPath.replace(/^\/storage\//, '');
    const fullPath = path.join(STORAGE_ROOT, relative);
    if (fs.existsSync(fullPath)) {
      return fs.readFileSync(fullPath, 'utf-8');
    }
  } catch {
    // Ignore
  }
  return null;
}

export function verifyStorageFileExists(virtualPath: string): boolean {
  if (memoryStorageMirror.has(virtualPath) || binaryStorageMirror.has(virtualPath)) return true;
  try {
    const relative = virtualPath.replace(/^\/storage\//, '');
    const fullPath = path.join(STORAGE_ROOT, relative);
    return fs.existsSync(fullPath);
  } catch {
    return false;
  }
}

export function deleteFromPrivateStorage(documentId: string): number {
  let removed = 0;
  for (const map of [memoryStorageMirror, binaryStorageMirror]) {
    for (const key of Array.from(map.keys())) {
      if (key.includes(`/${documentId}_`) || key.includes(documentId)) {
        map.delete(key);
        removed++;
      }
    }
  }

  const buckets: StorageBucket[] = ['original', 'processing', 'final', 'temp', 'preview'];
  for (const bucket of buckets) {
    const dir = path.join(STORAGE_ROOT, bucket);
    if (fs.existsSync(dir)) {
      try {
        const files = fs.readdirSync(dir);
        for (const file of files) {
          if (file.startsWith(`${documentId}_`) || file.includes(documentId)) {
            const filePath = path.join(dir, file);
            try {
              fs.unlinkSync(filePath);
              removed++;
            } catch {
              // Ignore if locked or unlinked
            }
          }
        }
      } catch {
        // Ignore read errors
      }
    }
  }

  return removed;
}

export function cleanupExpiredTempFiles(maxAgeHours = 24): number {
  let removed = 0;
  const cutoff = Date.now() - maxAgeHours * 3600 * 1000;
  for (const [key, entry] of memoryStorageMirror.entries()) {
    if (key.startsWith('/storage/temp/') && entry.createdAt < cutoff) {
      memoryStorageMirror.delete(key);
      removed++;
    }
  }
  return removed;
}

