import {getDbState, upsertProcessingJob} from '@/lib/db/store';
import {JobStatus} from '@/types';

export function listQueueJobs() {
  return getDbState().jobs;
}

export function updateJobStatusControl(
  documentId: string,
  action: 'PAUSE' | 'RESUME' | 'CANCEL'
): {success: boolean; newStatus: JobStatus} {
  const state = getDbState();
  const job = state.jobs.find((j) => j.documentId === documentId || j.id === documentId);
  const doc = state.documents.find((d) => d.id === documentId);

  const statusMap: Record<'PAUSE' | 'RESUME' | 'CANCEL', JobStatus> = {
    PAUSE: 'PAUSED',
    RESUME: 'COMPLETED',
    CANCEL: 'CANCELLED',
  };

  const newStatus = statusMap[action];
  if (job) {
    job.status = newStatus;
    job.currentStep = newStatus;
    upsertProcessingJob(job);
  }
  if (doc) {
    doc.status = newStatus;
    doc.currentStepLabel =
      action === 'PAUSE'
        ? 'Paused by Administrator'
        : action === 'CANCEL'
          ? 'Cancelled by Administrator'
          : 'Finalized & Verified';
  }

  return {success: true, newStatus};
}
