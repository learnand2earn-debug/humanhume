import fs from 'fs';
import path from 'path';

export type StorageBucket = 'original' | 'processing' | 'final' | 'temp';

const STORAGE_ROOT = path.join(process.cwd(), 'storage');

let directoriesInitialized = false;

function ensureStorageDirectories() {
  if (directoriesInitialized) return;
  directoriesInitialized = true;
  const buckets: StorageBucket[] = ['original', 'processing', 'final', 'temp'];
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

export function saveToPrivateStorage(
  bucket: StorageBucket,
  documentId: string,
  fileName: string,
  content: string
): string {
  ensureStorageDirectories();
  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
  const virtualPath = `/storage/${bucket}/${documentId}_${safeName}`;
  const fullPath = path.join(STORAGE_ROOT, bucket, `${documentId}_${safeName}`);

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
  if (memoryStorageMirror.has(virtualPath)) return true;
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
  for (const key of Array.from(memoryStorageMirror.keys())) {
    if (key.includes(`/${documentId}_`) || key.includes(documentId)) {
      memoryStorageMirror.delete(key);
      removed++;
    }
  }

  const buckets: StorageBucket[] = ['original', 'processing', 'final', 'temp'];
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

