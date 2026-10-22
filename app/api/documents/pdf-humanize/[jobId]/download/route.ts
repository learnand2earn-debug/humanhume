import {NextRequest, NextResponse} from 'next/server';
import {getPdfJob} from '@/lib/document/pdf-native-humanizer';

/**
 * GET /api/documents/pdf-humanize/[jobId]/download
 *
 * Downloads the humanized PDF output for a completed job.
 * Returns 404 if job not found, 422 if job failed, 425 if still processing.
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

  if (job.status === 'FAILED') {
    return NextResponse.json(
      {
        error: job.errorMessage || 'PDF humanization failed.',
        jobId,
        failedPages: job.failedPages,
      },
      {status: 422}
    );
  }

  if (job.status !== 'COMPLETED') {
    return NextResponse.json(
      {
        error: 'PDF is not ready for download yet.',
        status: job.status,
        progressPercent: job.progressPercent,
        jobId,
      },
      {status: 425} // Too Early
    );
  }

  if (!job.outputBuffer || job.outputBuffer.length === 0) {
    return NextResponse.json(
      {error: 'Output PDF buffer is missing. The job may have encountered an internal error.'},
      {status: 500}
    );
  }

  // Build a unique, safe filename
  const baseName = job.originalFileName.replace(/\.pdf$/i, '').replace(/[^a-zA-Z0-9._-]/g, '_');
  const downloadFileName = `Humanized_${baseName}_${job.traceId}.pdf`;

  return new NextResponse(new Uint8Array(job.outputBuffer), {
    status: 200,
    headers: {
      'Content-Type': 'application/pdf',
      'Content-Length': String(job.outputBuffer.length),
      'Content-Disposition': `attachment; filename="${downloadFileName}"`,
      'Cache-Control': 'no-store, no-cache',
      'X-HumanFlow-TraceId': job.traceId,
      'X-HumanFlow-Pages': String(job.totalPages),
      'X-HumanFlow-ProcessedPages': String(job.processedPages),
    },
  });
}

export const runtime = 'nodejs';
export const maxDuration = 60;
