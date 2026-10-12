import { repository } from '../lib/db/repository';
import { JobQueue } from '../lib/queue/queue';

console.log('----------------------------------------------------');
console.log('HumanFlow AI — Dedicated Autonomous Background Worker');
console.log('----------------------------------------------------');
console.log('Starting polling loop for queued documents...');

let isRunning = true;

async function workerLoop() {
  while (isRunning) {
    try {
      const documents = repository.listDocuments();
      const queuedDocs = documents.filter((d) => d.status === 'QUEUED');

      for (const doc of queuedDocs) {
        console.log(`[Worker] Enqueuing document ${doc.id} (${doc.originalName})...`);
        JobQueue.enqueue(doc.id);
      }
    } catch (err) {
      console.error('[Worker] Polling loop error:', err);
    }

    // Sleep 3 seconds before next queue scan
    await new Promise((resolve) => setTimeout(resolve, 3000));
  }
}

workerLoop();

process.on('SIGINT', () => {
  console.log('\n[Worker] Shutting down gracefully...');
  isRunning = false;
  process.exit(0);
});
