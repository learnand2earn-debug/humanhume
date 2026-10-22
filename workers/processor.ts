import {executeAutonomousDocumentPipeline} from '@/lib/queue/pipeline';
import {getDocumentById} from '@/lib/db/store';

export async function processQueuedDocumentById(documentId: string) {
  const doc = getDocumentById(documentId);
  if (!doc) {
    throw new Error(`Document ${documentId} not found in store`);
  }
  return executeAutonomousDocumentPipeline({
    fileName: doc.originalName,
    fileType: doc.fileType,
    fileSize: doc.fileSize,
    rawContent: doc.originalContent,
    existingDocId: doc.id,
  });
}
