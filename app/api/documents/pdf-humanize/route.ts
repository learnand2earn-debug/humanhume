import {NextRequest, NextResponse} from 'next/server';
import {checkRateLimit} from '@/lib/security';
import {generateTraceId} from '@/lib/security';
import {
  createPdfJob,
  runPdfHumanizationPipeline,
} from '@/lib/document/pdf-native-humanizer';
import {getRuntimeSecretsAndSettings} from '@/lib/db/store';

/**
 * POST /api/documents/pdf-humanize
 *
 * Accepts a multipart PDF upload and starts the full PDF humanization pipeline.
 * Returns the job ID immediately so the client can poll /api/documents/pdf-humanize/[jobId]
 * for status updates.
 *
 * For small PDFs (< 500KB), also accepts synchronous mode by passing ?sync=true,
 * which processes inline and returns the completed job + download URL.
 */
export async function POST(req: NextRequest) {
  if (!checkRateLimit('pdf-humanize-upload', 10)) {
    return NextResponse.json(
      {error: 'Rate limit exceeded. Please wait before uploading another PDF.'},
      {status: 429}
    );
  }

  try {
    const contentType = req.headers.get('content-type') || '';
    if (!contentType.includes('multipart/form-data')) {
      return NextResponse.json(
        {error: 'PDF upload must use multipart/form-data encoding.'},
        {status: 400}
      );
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const syncMode = formData.get('sync') === 'true';
    const intensityRaw = formData.get('intensity') as string | null;
    const intensity = intensityRaw === 'LOW' ? 'LOW' : 'NORMAL';

    if (!file) {
      return NextResponse.json({error: 'No PDF file provided.'}, {status: 400});
    }

    // Validate file type
    const fileName = file.name || 'document.pdf';
    const ext = fileName.split('.').pop()?.toLowerCase();
    if (ext !== 'pdf') {
      return NextResponse.json(
        {
          error: `Only PDF files are supported by the PDF Humanizer. Received: .${ext || 'unknown'}. For DOCX, TXT, MD, RTF, and XLSX use the standard upload.`,
        },
        {status: 400}
      );
    }

    // File size check
    const {settings} = getRuntimeSecretsAndSettings();
    const maxSizeMb = settings.maxFileSizeMb || 50;
    if (file.size > maxSizeMb * 1024 * 1024) {
      return NextResponse.json(
        {error: `PDF exceeds maximum allowed size of ${maxSizeMb} MB.`},
        {status: 400}
      );
    }

    if (file.size < 50) {
      return NextResponse.json(
        {error: 'Uploaded PDF is empty or too small to be valid.'},
        {status: 400}
      );
    }

    // Read PDF buffer
    const arrayBuffer = await file.arrayBuffer();
    const pdfBuffer = Buffer.from(arrayBuffer);

    // Validate PDF signature
    const sig = pdfBuffer.toString('latin1', 0, 4);
    if (sig !== '%PDF') {
      return NextResponse.json(
        {
          error: 'Uploaded file does not appear to be a valid PDF (invalid header). If this file is encrypted or password-protected, it cannot be processed.',
        },
        {status: 400}
      );
    }

    // Check for encryption
    const pdfStr = pdfBuffer.toString('latin1', 0, Math.min(pdfBuffer.length, 32 * 1024));
    if (pdfStr.includes('/Encrypt') && pdfStr.includes('/P ')) {
      return NextResponse.json(
        {
          error: 'This PDF is encrypted/password-protected and cannot be processed. Please provide an unencrypted version.',
        },
        {status: 400}
      );
    }

    const traceId = generateTraceId();
    const jobId = `pdfhum-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

    // Create job record
    createPdfJob({
      jobId,
      traceId,
      originalFileName: fileName,
      totalPages: 0, // Will be updated after extraction
    });

    // For small PDFs or sync mode, process inline (< 800KB or explicit sync)
    if (syncMode || pdfBuffer.length < 800 * 1024) {
      const job = await runPdfHumanizationPipeline({
        jobId,
        traceId,
        fileName,
        pdfBuffer,
        intensity,
      });

      if (job.status === 'FAILED') {
        return NextResponse.json(
          {
            error: job.errorMessage || 'PDF humanization failed.',
            jobId,
            traceId,
          },
          {status: 422}
        );
      }

      // Return job status + download URL (PDF stored in job, fetched via [jobId]/download)
      return NextResponse.json({
        success: true,
        jobId,
        traceId,
        status: job.status,
        totalPages: job.totalPages,
        processedPages: job.processedPages,
        failedPages: job.failedPages,
        progressPercent: job.progressPercent,
        downloadUrl: `/api/documents/pdf-humanize/${jobId}/download`,
        completedAt: job.completedAt,
        pageResults: job.pageResults.map((r) => ({
          pageNumber: r.pageNumber,
          status: r.status,
          imageCount: r.imageCount,
          errorReason: r.errorReason,
          retryCount: r.retryCount,
          durationMs: r.durationMs,
        })),
      });
    }

    // For larger PDFs, start async pipeline and return job ID for polling
    // (Next.js 15 App Router does not support background jobs natively,
    // so we run it in a non-blocking "fire and forget" pattern)
    runPdfHumanizationPipeline({
      jobId,
      traceId,
      fileName,
      pdfBuffer,
      intensity,
    }).catch((err) => {
      const {updatePdfJob} = require('@/lib/document/pdf-native-humanizer');
      updatePdfJob(jobId, {
        status: 'FAILED',
        errorMessage: err instanceof Error ? err.message : 'Pipeline error',
      });
    });

    return NextResponse.json({
      success: true,
      jobId,
      traceId,
      status: 'PENDING',
      totalPages: 0,
      processedPages: 0,
      progressPercent: 0,
      pollUrl: `/api/documents/pdf-humanize/${jobId}`,
      message: 'PDF humanization started. Poll the pollUrl for status updates.',
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unexpected server error during PDF upload.';
    console.error('[PDF Humanize Upload]', message);
    return NextResponse.json({error: message}, {status: 500});
  }
}

// Increase the default body size limit for PDF uploads in Next.js
export const runtime = 'nodejs';
export const maxDuration = 60; // 60s timeout for large PDFs
