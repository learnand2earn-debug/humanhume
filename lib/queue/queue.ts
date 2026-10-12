import { repository } from '../db/repository';
import { PipelineOrchestrator } from './pipeline';

export class JobQueue {
  private static queue: string[] = [];
  private static processing: Set<string> = new Set();
  private static concurrency = 2;
  private static isLoopRunning = false;

  /**
   * Enqueues a document for automated background processing.
   */
  static enqueue(documentId: string): void {
    if (!this.queue.includes(documentId) && !this.processing.has(documentId)) {
      this.queue.push(documentId);
    }
    this.processNext();
  }

  /**
   * Main queue processing tick
   */
  private static async processNext(): Promise<void> {
    if (this.processing.size >= this.concurrency) {
      return;
    }

    const nextId = this.queue.shift();
    if (!nextId) {
      return;
    }

    this.processing.add(nextId);

    // Run asynchronously without blocking caller
    (async () => {
      try {
        await PipelineOrchestrator.processDocument(nextId);
      } catch (err) {
        console.error(`Job processing failed for document ${nextId}:`, err);
      } finally {
        this.processing.delete(nextId);
        // Continue queue draining
        this.processNext();
      }
    })();
  }

  /**
   * Pauses an active or queued job.
   */
  static pause(documentId: string): boolean {
    const queueIdx = this.queue.indexOf(documentId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
    }
    repository.updateDocument(documentId, { status: 'PAUSED' });
    repository.updateJob(documentId, { status: 'PAUSED' });
    return true;
  }

  /**
   * Resumes a paused job.
   */
  static resume(documentId: string): boolean {
    repository.updateDocument(documentId, { status: 'QUEUED' });
    repository.updateJob(documentId, { status: 'QUEUED' });
    this.enqueue(documentId);
    return true;
  }

  /**
   * Cancels a job.
   */
  static cancel(documentId: string): boolean {
    const queueIdx = this.queue.indexOf(documentId);
    if (queueIdx !== -1) {
      this.queue.splice(queueIdx, 1);
    }
    this.processing.delete(documentId);
    repository.updateDocument(documentId, { status: 'CANCELLED' });
    repository.updateJob(documentId, { status: 'CANCELLED' });
    return true;
  }

  /**
   * Retries a failed or completed job from scratch.
   */
  static retry(documentId: string): boolean {
    repository.updateDocument(documentId, {
      status: 'QUEUED',
      errorMessage: undefined,
      retryCount: 0,
    });
    repository.updateJob(documentId, {
      status: 'QUEUED',
      errorMessage: undefined,
      retryCount: 0,
      progressPercent: 0,
    });
    this.enqueue(documentId);
    return true;
  }

  /**
   * Returns current queue diagnostics.
   */
  static getQueueStatus() {
    return {
      queuedCount: this.queue.length,
      processingCount: this.processing.size,
      activeIds: Array.from(this.processing),
    };
  }
}
