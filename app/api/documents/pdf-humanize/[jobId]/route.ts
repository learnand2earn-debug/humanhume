import {NextRequest, NextResponse} from 'next/server';
import {getPdfJob} from '@/lib/document/pdf-native-humanizer';

/**
 * GET /api/documents/pdf-humanize/[jobId]
 * Returns the current status of a PDF humanization job.
 * Clients should poll this every 2-3 seconds until status is COMPLETED or FAILED.
 */
export async function GET(
  _req: NextRequest,
  context: {params: Promise<{jobId: string}>}
) {
  const {jobId} = await context.params;

  const job = getPdfJob(jobId);
  if (!job) {
    return NextResponse.json(
      {error: 'Job not found. It may have expired or the server restarted.'},
      {status: 404}
    );
  }

  const responsePayload = {
    jobId: job.jobId,
    traceId: job.traceId,
    originalFileName: job.originalFileName,
    status: job.status,
    totalPages: job.totalPages,
    processedPages: job.processedPages,
    failedPages: job.failedPages,
    progressPercent: job.progressPercent,
    errorMessage: job.errorMessage,
    startedAt: job.startedAt,
    completedAt: job.completedAt,
    downloadUrl: job.status === 'COMPLETED' ? `/api/documents/pdf-humanize/${jobId}/download` : undefined,
    pageResults: job.pageResults.map((r) => ({
      pageNumber: r.pageNumber,
      status: r.status,
      imageCount: r.imageCount,
      errorReason: r.errorReason,
      retryCount: r.retryCount,
      durationMs: r.durationMs,
    })),
  };

  return NextResponse.json(responsePayload, {
    headers: {
      'Cache-Control': 'no-store, no-cache',
    },
  });
}

export const runtime = 'nodejs';
