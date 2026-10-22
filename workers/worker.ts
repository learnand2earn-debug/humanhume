import {listQueueJobs} from './queue';
import {processQueuedDocumentById} from './processor';
import {cleanupExpiredTempFiles} from '@/lib/storage';

/**
 * Self-hostable background worker loop for Docker / VPS deployments.
 * Polls for QUEUED jobs and executes automatic temporary file cleanup.
 */
export async function runWorkerTick() {
  const jobs = listQueueJobs();
  const queued = jobs.filter((j) => j.status === 'QUEUED');

  for (const job of queued) {
    await processQueuedDocumentById(job.documentId);
  }

  cleanupExpiredTempFiles(24);
}
