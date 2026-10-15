import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

export class StorageManager {
  private baseDir: string;
  private originalDir: string;
  private processingDir: string;
  private finalDir: string;
  private tempDir: string;

  constructor() {
    this.baseDir = process.env.STORAGE_DIR
      ? path.resolve(process.env.STORAGE_DIR)
      : path.resolve(process.cwd(), 'storage');
    this.originalDir = path.join(this.baseDir, 'original');
    this.processingDir = path.join(this.baseDir, 'processing');
    this.finalDir = path.join(this.baseDir, 'final');
    this.tempDir = path.join(this.baseDir, 'temp');

    this.ensureDirs();
  }

  private ensureDirs() {
    [this.baseDir, this.originalDir, this.processingDir, this.finalDir, this.tempDir].forEach(
      (dir) => {
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
      }
    );
  }

  /**
   * Saves the original uploaded file untouched.
   */
  async saveOriginalFile(
    fileBuffer: Buffer,
    originalName: string,
    fileId: string
  ): Promise<{ originalPath: string; workingPath: string }> {
    this.ensureDirs();
    const safeExt = path.extname(originalName).toLowerCase();
    const safeBase = path.basename(originalName, safeExt).replace(/[^a-zA-Z0-9_-]/g, '_');
    const storageFileName = `${fileId}_${safeBase}${safeExt}`;

    const originalPath = path.join(this.originalDir, storageFileName);
    const workingPath = path.join(this.processingDir, `working_${storageFileName}`);

    // Write original copy
    await fs.promises.writeFile(originalPath, fileBuffer);

    // Make an identical working copy for all pipeline manipulations
    await fs.promises.copyFile(originalPath, workingPath);

    return {
      originalPath,
      workingPath,
    };
  }

  /**
   * Saves an intermediate or final version file.
   */
  async saveVersionFile(
    content: Buffer | string,
    documentId: string,
    versionNumber: number,
    extension: string,
    isFinal = false
  ): Promise<string> {
    this.ensureDirs();
    const dir = isFinal ? this.finalDir : this.processingDir;
    const cleanExt = extension.startsWith('.') ? extension : `.${extension}`;
    const filename = `${documentId}_v${versionNumber}${isFinal ? '_final' : ''}${cleanExt}`;
    const targetPath = path.join(dir, filename);

    if (typeof content === 'string') {
      await fs.promises.writeFile(targetPath, content, 'utf-8');
    } else {
      await fs.promises.writeFile(targetPath, content);
    }

    return targetPath;
  }

  private isSafePath(filePath: string): boolean {
    const resolvedPath = path.resolve(filePath);
    const resolvedBase = path.resolve(this.baseDir);
    if (process.platform === 'win32') {
      return (
        resolvedPath.toLowerCase().startsWith(resolvedBase.toLowerCase()) ||
        resolvedPath.toLowerCase() === resolvedBase.toLowerCase()
      );
    }
    return resolvedPath.startsWith(resolvedBase);
  }

  /**
   * Retrieves a file buffer safely ensuring no path traversal.
   */
  async readFile(filePath: string): Promise<Buffer> {
    const resolvedPath = path.resolve(filePath);
    if (!this.isSafePath(resolvedPath)) {
      throw new Error('Access denied: File outside permitted storage root');
    }

    if (!fs.existsSync(resolvedPath)) {
      throw new Error(`File not found: ${path.basename(resolvedPath)}`);
    }

    return await fs.promises.readFile(resolvedPath);
  }

  /**
   * Checks if file exists.
   */
  fileExists(filePath: string): boolean {
    try {
      const resolvedPath = path.resolve(filePath);
      return this.isSafePath(resolvedPath) && fs.existsSync(resolvedPath);
    } catch {
      return false;
    }
  }

  /**
   * Returns storage stats for the admin health monitor.
   */
  async getStorageStats(): Promise<{
    originalCount: number;
    processingCount: number;
    finalCount: number;
    totalSizeBytes: number;
  }> {
    let totalSizeBytes = 0;

    const countAndSum = (dir: string) => {
      if (!fs.existsSync(dir)) return 0;
      const files = fs.readdirSync(dir).filter((f) => !f.startsWith('.'));
      for (const file of files) {
        try {
          const stat = fs.statSync(path.join(dir, file));
          totalSizeBytes += stat.size;
        } catch {
          // ignore transient reads
        }
      }
      return files.length;
    };

    const originalCount = countAndSum(this.originalDir);
    const processingCount = countAndSum(this.processingDir);
    const finalCount = countAndSum(this.finalDir);

    return {
      originalCount,
      processingCount,
      finalCount,
      totalSizeBytes,
    };
  }

  /**
   * Automatic cleanup of files older than specified retention hours.
   */
  async cleanupExpired(retentionHours = 24): Promise<number> {
    const now = Date.now();
    const thresholdMs = retentionHours * 60 * 60 * 1000;
    let deletedCount = 0;

    const cleanDir = async (dir: string) => {
      if (!fs.existsSync(dir)) return;
      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        if (file.startsWith('.')) continue;
        const filePath = path.join(dir, file);
        try {
          const stats = await fs.promises.stat(filePath);
          if (now - stats.mtimeMs > thresholdMs) {
            await fs.promises.unlink(filePath);
            deletedCount++;
          }
        } catch {
          // ignore
        }
      }
    };

    // Clean processing and temp files
    await cleanDir(this.tempDir);
    await cleanDir(this.processingDir);

    return deletedCount;
  }

  /**
   * Deletes all storage copies associated with a document ID.
   */
  async deleteDocumentFiles(documentId: string): Promise<void> {
    const dirs = [this.originalDir, this.processingDir, this.finalDir, this.tempDir];
    for (const dir of dirs) {
      if (!fs.existsSync(dir)) continue;
      try {
        const files = await fs.promises.readdir(dir);
        for (const file of files) {
          if (file.includes(documentId)) {
            await fs.promises.unlink(path.join(dir, file));
          }
        }
      } catch {
        // ignore transient errors
      }
    }
  }
}

export const storageManager = new StorageManager();
