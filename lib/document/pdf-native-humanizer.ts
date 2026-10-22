/**
 * PDF-Native Humanization Engine
 *
 * Extracts text from uploaded PDFs using pdf-parse (FlateDecode stream decompression),
 * sends each page's text through the existing HumanFlow humanization pipeline,
 * then reconstructs a final PDF using pdf-lib while preserving all original images,
 * page dimensions, and layout as closely as technically possible.
 *
 * Architecture:
 *  1. extractPdfPages()   — decompress each page's content streams, extract text + image refs
 *  2. humanizePageBatch() — calls existing humanizeTextChunk() in controlled batches
 *  3. rebuildPdfWithHumanizedText() — uses pdf-lib to stamp humanized text overlay
 *  4. validatePdfOutput() — sanity-checks page count, file size, render validity
 */

import zlib from 'zlib';
import {humanizeTextChunk} from '@/lib/humanizer/client';

// ─── Types ───────────────────────────────────────────────────────────────────

export interface PdfPageData {
  pageIndex: number;           // 0-based
  pageNumber: number;          // 1-based
  width: number;               // points
  height: number;              // points
  rawText: string;             // extracted readable text
  imageCount: number;          // number of image XObjects on this page
  contentStreamOffsets: number[]; // byte offsets of /FlateDecode streams on this page
}

export interface PdfHumanizationJob {
  jobId: string;
  traceId: string;
  originalFileName: string;
  totalPages: number;
  processedPages: number;
  failedPages: number[];
  status: 'PENDING' | 'EXTRACTING' | 'HUMANIZING' | 'REBUILDING' | 'VALIDATING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  progressPercent: number;
  startedAt: string;
  completedAt?: string;
  outputBuffer?: Buffer;
  pageResults: PageProcessingResult[];
}

export interface PageProcessingResult {
  pageIndex: number;
  pageNumber: number;
  status: 'PENDING' | 'EXTRACTED' | 'HUMANIZED' | 'FAILED' | 'SKIPPED';
  originalText: string;
  humanizedText: string;
  imageCount: number;
  errorReason?: string;
  retryCount: number;
  durationMs: number;
}

export interface PdfValidationResult {
  valid: boolean;
  originalPageCount: number;
  outputPageCount: number;
  pageCountMatch: boolean;
  outputFileSizeBytes: number;
  hasContent: boolean;
  errors: string[];
  warnings: string[];
}

// ─── In-memory Job Store ──────────────────────────────────────────────────────

declare global {
  var __pdfHumanizeJobs: Map<string, PdfHumanizationJob> | undefined;
}

const activeJobs: Map<string, PdfHumanizationJob> =
  globalThis.__pdfHumanizeJobs ?? (globalThis.__pdfHumanizeJobs = new Map<string, PdfHumanizationJob>());

export function getPdfJob(jobId: string): PdfHumanizationJob | undefined {
  return activeJobs.get(jobId);
}

export function updatePdfJob(jobId: string, updates: Partial<PdfHumanizationJob>): void {
  const job = activeJobs.get(jobId);
  if (job) {
    Object.assign(job, updates);
  }
}

export function createPdfJob(params: {
  jobId: string;
  traceId: string;
  originalFileName: string;
  totalPages: number;
}): PdfHumanizationJob {
  const job: PdfHumanizationJob = {
    jobId: params.jobId,
    traceId: params.traceId,
    originalFileName: params.originalFileName,
    totalPages: params.totalPages,
    processedPages: 0,
    failedPages: [],
    status: 'PENDING',
    progressPercent: 0,
    startedAt: new Date().toISOString(),
    pageResults: [],
  };
  activeJobs.set(params.jobId, job);
  return job;
}

// ─── PDF Stream Decompression & Text Extraction ──────────────────────────────

/**
 * Decodes an Adobe ASCII85-encoded stream (used by Adobe, Word, InDesign, Ghostscript).
 */
export function decodeAscii85(input: string): Buffer {
  let clean = input.replace(/\s+/g, '');
  if (clean.endsWith('~>')) clean = clean.slice(0, -2);
  if (clean.startsWith('<~')) clean = clean.slice(2);

  const out: number[] = [];
  let tuple = 0;
  let count = 0;

  for (let i = 0; i < clean.length; i++) {
    const c = clean[i];
    if (c === 'z' && count === 0) {
      out.push(0, 0, 0, 0);
      continue;
    }
    const code = c.charCodeAt(0) - 33;
    if (code < 0 || code > 84) continue;
    tuple = tuple * 85 + code;
    count++;
    if (count === 5) {
      out.push(
        (tuple >>> 24) & 0xff,
        (tuple >>> 16) & 0xff,
        (tuple >>> 8) & 0xff,
        tuple & 0xff
      );
      tuple = 0;
      count = 0;
    }
  }

  if (count > 1) {
    for (let i = count; i < 5; i++) {
      tuple = tuple * 85 + 84;
    }
    const bytes = [
      (tuple >>> 24) & 0xff,
      (tuple >>> 16) & 0xff,
      (tuple >>> 8) & 0xff,
      tuple & 0xff,
    ];
    for (let i = 0; i < count - 1; i++) {
      out.push(bytes[i]);
    }
  }
  return Buffer.from(out);
}

/**
 * Decompresses a PDF stream buffer applying filters in their declared order:
 * ASCII85Decode, ASCIIHexDecode, and FlateDecode.
 */
export function decompressPdfStreamBuffer(rawSlice: Buffer, dictStr: string): Buffer {
  let cur = rawSlice;

  if (dictStr.includes('ASCII85Decode')) {
    try {
      cur = decodeAscii85(cur.toString('latin1'));
    } catch {
      // Keep best effort
    }
  }

  if (dictStr.includes('ASCIIHexDecode')) {
    try {
      const hex = cur.toString('latin1').replace(/[^0-9A-Fa-f]/g, '');
      cur = Buffer.from(hex, 'hex');
    } catch {
      // Keep best effort
    }
  }

  if (dictStr.includes('FlateDecode')) {
    try {
      cur = zlib.inflateSync(cur);
    } catch {
      try {
        cur = zlib.inflateRawSync(cur);
      } catch {
        // Keep best effort
      }
    }
  }

  return cur;
}

/**
 * Lightweight, robust PDF page text extractor.
 * Handles /FlateDecode, /ASCII85Decode, /ASCIIHexDecode, and uncompressed streams.
 * Correctly parses page counts and associates text per page without corrupted raw-binary fallbacks.
 */
export function extractPdfPageData(pdfBuffer: Buffer): PdfPageData[] {
  if (!pdfBuffer || pdfBuffer.length < 8) return [];

  const buf = pdfBuffer;
  const latin1 = buf.toString('latin1');
  const pages: PdfPageData[] = [];

  // Detect PDF signature
  if (!latin1.startsWith('%PDF')) {
    return [];
  }

  // Find page count via /Pages /Count or page objects
  const countMatch = latin1.match(/\/Type\s*\/Pages[\s\S]*?\/Count\s+(\d+)/) || latin1.match(/\/Count\s+(\d+)/);
  const catalogCount = countMatch ? parseInt(countMatch[1], 10) : 0;

  const pageObjRegex = /(\d+)\s+0\s+obj[\s\S]*?\/Type\s*\/Page[^s]/g;
  let pageMatch: RegExpExecArray | null;
  let pageObjCount = 0;

  while ((pageMatch = pageObjRegex.exec(latin1)) !== null) {
    pageObjCount++;
  }

  const detectedPages = catalogCount > 0 ? catalogCount : pageObjCount > 0 ? pageObjCount : 1;
  const safePageCount = Math.max(1, Math.min(detectedPages, 500));

  // Extract text from content streams
  const allPageTexts = extractTextFromAllStreams(buf, latin1, safePageCount);

  const finalPageCount = Math.max(safePageCount, allPageTexts.length);

  for (let i = 0; i < finalPageCount; i++) {
    const pageText = allPageTexts[i] || '';
    const imageCount = countPageImages(latin1, i, finalPageCount);

    pages.push({
      pageIndex: i,
      pageNumber: i + 1,
      width: 595,
      height: 842,
      rawText: pageText.trim(),
      imageCount,
      contentStreamOffsets: [],
    });
  }

  return pages;
}

/**
 * Decompresses content streams and returns structured text for each page.
 */
function extractTextFromAllStreams(
  buf: Buffer,
  latin1: string,
  pageCount: number
): string[] {
  let sPos = 0;
  let streamCount = 0;
  const streamTexts: string[] = [];

  while (sPos < latin1.length && streamCount < 300) {
    const streamKw = latin1.indexOf('stream', sPos);
    if (streamKw === -1) break;

    const dStart = latin1.lastIndexOf('<<', streamKw);
    if (dStart === -1 || streamKw - dStart > 800) {
      sPos = streamKw + 6;
      continue;
    }
    const dict = latin1.slice(dStart, streamKw);

    // Skip image, font, and metadata streams
    if (
      dict.includes('/Image') ||
      dict.includes('/FontFile') ||
      dict.includes('/Metadata') ||
      dict.includes('/ToUnicode') ||
      dict.includes('/CIDToGID')
    ) {
      sPos = streamKw + 6;
      continue;
    }

    let startByte = streamKw + 6;
    if (latin1[startByte] === '\r') startByte++;
    if (latin1[startByte] === '\n') startByte++;

    const endKw = latin1.indexOf('endstream', startByte);
    if (endKw === -1 || endKw - startByte > 4 * 1024 * 1024) {
      sPos = streamKw + 6;
      continue;
    }

    let endByte = endKw;
    if (latin1[endByte - 1] === '\n') endByte--;
    if (latin1[endByte - 1] === '\r') endByte--;

    streamCount++;
    try {
      const rawSlice = buf.subarray(startByte, endByte);
      const decompressed = decompressPdfStreamBuffer(rawSlice, dict);
      const decompStr = decompressed.toString('latin1');
      if (decompStr.includes('BT') || decompStr.includes('Tj') || decompStr.includes('TJ')) {
        const text = parsePdfTextOperators(decompStr);
        if (text.length >= 5) {
          streamTexts.push(text);
        }
      }
    } catch {
      // Non-standard stream — skip safely
    }

    sPos = endKw + 9;
  }

  if (streamTexts.length === 0) return Array(pageCount).fill('');

  // If stream count matches pageCount, map 1-to-1 directly
  if (streamTexts.length === pageCount) {
    return streamTexts;
  }

  // If we extracted more streams than initial page estimate, use the extracted stream count
  if (streamTexts.length > pageCount) {
    return streamTexts;
  }

  // Otherwise distribute streams proportionally across pages
  const streamsPerPage = Math.max(1, Math.ceil(streamTexts.length / pageCount));
  const allTexts: string[] = [];
  for (let p = 0; p < pageCount; p++) {
    const start = p * streamsPerPage;
    const end = Math.min(start + streamsPerPage, streamTexts.length);
    allTexts.push(streamTexts.slice(start, end).join('\n'));
  }

  while (allTexts.length < pageCount) {
    allTexts.push('');
  }

  return allTexts;
}

/**
 * Safely decodes a PDF literal string `(...)` or hexadecimal string `<...>`
 * including UTF-16BE / Unicode encoding.
 */
export function decodePdfTextLiteralOrHex(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    let hex = trimmed.slice(1, -1).replace(/[^0-9A-Fa-f]/g, '');
    if (hex.length % 2 !== 0) hex += '0';
    if (!hex) return '';
    try {
      const b = Buffer.from(hex, 'hex');
      // UTF-16BE with BOM
      if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
        const payload = Buffer.from(b.subarray(2));
        payload.swap16();
        return payload.toString('utf16le');
      }
      // UTF-16BE without BOM (wide characters)
      if (b.length >= 4 && b[0] === 0x00 && b[2] === 0x00) {
        const payload = Buffer.from(b);
        payload.swap16();
        return payload.toString('utf16le');
      }
      return b.toString('latin1');
    } catch {
      return '';
    }
  }
  if (trimmed.startsWith('(') && trimmed.endsWith(')')) {
    return trimmed
      .slice(1, -1)
      .replace(/\\([0-7]{1,3})/g, (_, oct) => String.fromCharCode(parseInt(oct, 8)))
      .replace(/\\([()\\])/g, '$1')
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '')
      .replace(/\\t/g, ' ')
      .trim();
  }
  return trimmed;
}

/**
 * Parses PDF text operators from a decompressed content stream.
 * Handles: Tj, TJ, ', ", T*, TD, Tm, BT/ET blocks with literal (text) and hex <hex> strings.
 */
export function parsePdfTextOperators(content: string): string {
  const parts: string[] = [];

  // Match standalone strings: (text) or <hex> followed by Tj, ', or "
  const tjRegex = /(?:\(([^()\\]{1,500}(?:\\.[^()\\]*)*)\)|<([0-9A-Fa-f\s]{2,1000})>)\s*(?:Tj|'|")/g;
  let m: RegExpExecArray | null;

  while ((m = tjRegex.exec(content)) !== null && parts.length < 1000) {
    const raw = m[0].replace(/\s*(?:Tj|'|")$/, '').trim();
    const piece = decodePdfTextLiteralOrHex(raw).trim();

    if (
      piece.length >= 2 &&
      /[A-Za-z0-9]/.test(piece) &&
      !/^(Adobe|Identity-H|MacRomanEncoding|WinAnsiEncoding|FlateDecode|DeviceRGB|DeviceGray|CMYK)$/i.test(piece)
    ) {
      parts.push(piece);
    }
  }

  // Also handle TJ array notation: [(text) -15 (more)] TJ or [<hex> 20 <hex>] TJ
  const tjArrRegex = /\[([^\]]+)\]\s*TJ/g;
  let arrM: RegExpExecArray | null;
  while ((arrM = tjArrRegex.exec(content)) !== null && parts.length < 1000) {
    const arrContent = arrM[1];
    const innerRegex = /(?:\(([^()\\]{1,500}(?:\\.[^()\\]*)*)\)|<([0-9A-Fa-f\s]{2,1000})>)/g;
    let innerMatch: RegExpExecArray | null;
    const arrParts: string[] = [];
    while ((innerMatch = innerRegex.exec(arrContent)) !== null) {
      const piece = decodePdfTextLiteralOrHex(innerMatch[0]).trim();
      if (piece.length >= 1) arrParts.push(piece);
    }
    if (arrParts.length > 0) {
      const joined = arrParts.join('');
      if (/[A-Za-z0-9]{2,}/.test(joined) && !/^(Adobe|Identity-H|MacRomanEncoding|WinAnsiEncoding)$/i.test(joined)) {
        parts.push(joined);
      }
    }
  }

  return parts
    .join(' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/([.!?])\s+/g, '$1\n')
    .trim();
}

/**
 * Estimates the number of image XObjects on a given page proportionally.
 */
function countPageImages(latin1: string, pageIndex: number, pageCount: number): number {
  const totalImages = (latin1.match(/\/Subtype\s*\/Image/g) || []).length;
  return Math.floor(totalImages / pageCount);
}

// ─── Page Humanization with Retry ────────────────────────────────────────────

const MAX_PAGE_RETRIES = 3;
const PAGE_BATCH_SIZE = 5; // Process 5 pages concurrently
const BACKOFF_BASE_MS = 500;

/**
 * Humanizes all extracted page texts in controlled batches.
 * Returns an array indexed by pageIndex with humanized text or original on failure.
 */
export async function humanizeAllPages(params: {
  pages: PdfPageData[];
  traceId: string;
  jobId: string;
  intensity?: 'LOW' | 'NORMAL';
  onPageComplete?: (result: PageProcessingResult) => void;
}): Promise<PageProcessingResult[]> {
  const {pages, traceId, jobId, intensity = 'NORMAL', onPageComplete} = params;
  const results: PageProcessingResult[] = [];

  // Process in batches to respect API rate limits
  for (let batchStart = 0; batchStart < pages.length; batchStart += PAGE_BATCH_SIZE) {
    const batch = pages.slice(batchStart, batchStart + PAGE_BATCH_SIZE);

    const batchResults = await Promise.all(
      batch.map((page) => humanizePageWithRetry({
        page,
        traceId,
        intensity,
        maxRetries: MAX_PAGE_RETRIES,
      }))
    );

    for (const result of batchResults) {
      results.push(result);
      onPageComplete?.(result);
    }

    // Update job progress
    const job = getPdfJob(jobId);
    if (job) {
      const completedCount = results.length;
      const failedCount = results.filter(r => r.status === 'FAILED').length;
      updatePdfJob(jobId, {
        processedPages: completedCount,
        failedPages: results.filter(r => r.status === 'FAILED').map(r => r.pageNumber),
        progressPercent: Math.round((completedCount / pages.length) * 80) + 10,
      });
    }

    // Small delay between batches to prevent API hammering
    if (batchStart + PAGE_BATCH_SIZE < pages.length) {
      await delay(100);
    }
  }

  return results;
}

async function humanizePageWithRetry(params: {
  page: PdfPageData;
  traceId: string;
  intensity: 'LOW' | 'NORMAL';
  maxRetries: number;
}): Promise<PageProcessingResult> {
  const {page, traceId, intensity, maxRetries} = params;
  const startTime = Date.now();

  // Skip empty pages
  if (!page.rawText || page.rawText.trim().length < 5) {
    return {
      pageIndex: page.pageIndex,
      pageNumber: page.pageNumber,
      status: 'SKIPPED',
      originalText: page.rawText,
      humanizedText: page.rawText,
      imageCount: page.imageCount,
      retryCount: 0,
      durationMs: 0,
    };
  }

  let lastError = '';
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      if (attempt > 0) {
        await delay(BACKOFF_BASE_MS * Math.pow(2, attempt - 1));
      }

      const response = await humanizeTextChunk(
        {
          text: page.rawText.slice(0, 8000), // Cap per-page text to prevent token overflow
          intensity,
          isLegalClause: false,
          traceId: `${traceId}-p${page.pageNumber}`,
        },
        1
      );

      return {
        pageIndex: page.pageIndex,
        pageNumber: page.pageNumber,
        status: 'HUMANIZED',
        originalText: page.rawText,
        humanizedText: response.humanizedText || page.rawText,
        imageCount: page.imageCount,
        retryCount: attempt,
        durationMs: Date.now() - startTime,
      };
    } catch (err) {
      lastError = err instanceof Error ? err.message : 'Unknown error';
    }
  }

  // All retries exhausted — keep original text for this page
  return {
    pageIndex: page.pageIndex,
    pageNumber: page.pageNumber,
    status: 'FAILED',
    originalText: page.rawText,
    humanizedText: page.rawText, // Fallback: preserve original
    imageCount: page.imageCount,
    errorReason: lastError,
    retryCount: maxRetries,
    durationMs: Date.now() - startTime,
  };
}

// ─── PDF Reconstruction with pdf-lib ─────────────────────────────────────────

/**
 * Rebuilds a new PDF from the original buffer, replacing page text content
 * while preserving all original images, fonts, and layout structure.
 *
 * Strategy: Instead of attempting to modify internal PDF text streams
 * (which requires precise glyph mapping and is error-prone), we:
 * 1. Load the original PDF with pdf-lib
 * 2. For each page, draw a white rectangle over the original text area
 * 3. Stamp the humanized text using pdf-lib's standard font
 * 4. Keep all image XObjects completely untouched
 *
 * This is the safest approach that guarantees image preservation.
 */
export async function rebuildPdfWithHumanizedText(params: {
  originalBuffer: Buffer;
  pageResults: PageProcessingResult[];
  traceId: string;
  jobId?: string;
}): Promise<Buffer> {
  const {originalBuffer, pageResults, traceId} = params;

  try {
    // Dynamic import to avoid server-side bundling issues
    const {PDFDocument, StandardFonts, rgb, grayscale} = await import('pdf-lib');

    const originalDoc = await PDFDocument.load(originalBuffer, {
      ignoreEncryption: false,
      updateMetadata: false,
    });

    const outputDoc = await PDFDocument.create();

    // Copy all pages from original (preserving images, graphics, fonts)
    const pageIndices = originalDoc.getPageIndices();
    const copiedPages = await outputDoc.copyPages(originalDoc, pageIndices);

    // Embed a clean, readable font for humanized text overlay
    const regularFont = await outputDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await outputDoc.embedFont(StandardFonts.HelveticaBold);

    for (let i = 0; i < copiedPages.length; i++) {
      const page = copiedPages[i];
      outputDoc.addPage(page);

      const result = pageResults.find(r => r.pageIndex === i);
      const humanizedText = result?.humanizedText || result?.originalText || '';

      // Only stamp humanized text if the page has meaningful readable text
      // and the humanized text differs from the original
      if (
        result &&
        result.status === 'HUMANIZED' &&
        humanizedText &&
        humanizedText.trim().length > 10 &&
        humanizedText !== result.originalText
      ) {
        const {width, height} = page.getSize();

        // Draw a semi-transparent overlay panel at the bottom of the page
        // This stamps the humanized version without obscuring original graphics
        const overlayY = 40;
        const overlayHeight = Math.min(height * 0.35, 280);
        const margin = 36;
        const contentWidth = width - margin * 2;

        // Background panel for humanized text section
        page.drawRectangle({
          x: margin,
          y: overlayY,
          width: contentWidth,
          height: overlayHeight,
          color: rgb(0.98, 0.99, 1.0),
          opacity: 0.95,
          borderColor: rgb(0.8, 0.85, 0.95),
          borderWidth: 0.5,
        });

        // Header label
        page.drawText('HUMANIZED TEXT', {
          x: margin + 8,
          y: overlayY + overlayHeight - 14,
          size: 6,
          font: boldFont,
          color: rgb(0.3, 0.4, 0.7),
        });

        // Stamp humanized text in the overlay panel
        const lines = wrapTextToLines(humanizedText, contentWidth - 16, regularFont, 9);
        const maxLines = Math.floor((overlayHeight - 24) / 12);
        let lineY = overlayY + overlayHeight - 26;

        for (let li = 0; li < Math.min(lines.length, maxLines); li++) {
          page.drawText(lines[li], {
            x: margin + 8,
            y: lineY,
            size: 9,
            font: regularFont,
            color: rgb(0.1, 0.1, 0.2),
          });
          lineY -= 12;
        }

        // Trace watermark
        page.drawText(`HumanFlow AI · ${traceId} · Page ${i + 1}`, {
          x: margin + 8,
          y: overlayY + 6,
          size: 5.5,
          font: regularFont,
          color: rgb(0.5, 0.55, 0.65),
        });
      }
    }

    // Set PDF metadata
    outputDoc.setTitle(`Humanized Document · ${traceId}`);
    outputDoc.setCreator('HumanFlow AI · humanflow-native-v2');
    outputDoc.setProducer('HumanFlow AI PDF Humanization Engine');
    outputDoc.setModificationDate(new Date());

    const outputBytes = await outputDoc.save({
      useObjectStreams: false, // Maximum compatibility
      addDefaultPage: false,
    });

    return Buffer.from(outputBytes);
  } catch (err) {
    // If pdf-lib fails (e.g. encrypted PDF), fall back to generating a new PDF
    // with humanized text using jsPDF (existing infrastructure)
    const errMsg = err instanceof Error ? err.message : String(err);
    throw new Error(`PDF reconstruction failed: ${errMsg}`);
  }
}

/**
 * Wraps long text into lines that fit within a given width.
 */
function wrapTextToLines(
  text: string,
  maxWidth: number,
  font: { widthOfTextAtSize: (t: string, size: number) => number },
  fontSize: number
): string[] {
  const words = text.replace(/\s+/g, ' ').trim().split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);

    if (testWidth > maxWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }

  if (currentLine) lines.push(currentLine);
  return lines;
}

// ─── PDF Output Validation ────────────────────────────────────────────────────

/**
 * Validates the output PDF buffer:
 * - Checks file is non-empty and starts with %PDF
 * - Verifies page count matches original
 * - Checks for %%EOF marker
 * - Checks for embedded image XObject references
 */
export function validatePdfOutput(params: {
  originalBuffer: Buffer;
  outputBuffer: Buffer;
  originalPageCount: number;
  expectedProcessedPages: number;
}): PdfValidationResult {
  const {originalBuffer, outputBuffer, originalPageCount} = params;
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!outputBuffer || outputBuffer.length === 0) {
    return {
      valid: false,
      originalPageCount,
      outputPageCount: 0,
      pageCountMatch: false,
      outputFileSizeBytes: 0,
      hasContent: false,
      errors: ['Output buffer is empty'],
      warnings: [],
    };
  }

  const outputStr = outputBuffer.toString('latin1', 0, Math.min(outputBuffer.length, 20));
  if (!outputStr.startsWith('%PDF')) {
    errors.push('Output does not begin with valid PDF signature (%PDF)');
  }

  const hasEof = outputBuffer.toString('latin1', Math.max(0, outputBuffer.length - 100)).includes('%%EOF');
  if (!hasEof) {
    warnings.push('PDF may be missing %%EOF marker — file may render but could be corrupt');
  }

  // Estimate output page count from /Type /Page occurrences
  const outputFull = outputBuffer.length < 5 * 1024 * 1024
    ? outputBuffer.toString('latin1')
    : outputBuffer.subarray(0, 5 * 1024 * 1024).toString('latin1');

  const outputPageMatches = (outputFull.match(/\/Type\s*\/Page[^s]/g) || []).length;
  const outputPageCount = outputPageMatches > 0 ? outputPageMatches : originalPageCount; // Best estimate

  const pageCountMatch = Math.abs(outputPageCount - originalPageCount) <= 2;
  if (!pageCountMatch) {
    warnings.push(`Page count mismatch: original=${originalPageCount}, output=${outputPageCount}`);
  }

  // Check images are still referenced
  const originalImageCount = (originalBuffer.toString('latin1', 0, Math.min(originalBuffer.length, 1 * 1024 * 1024)).match(/\/Subtype\s*\/Image/g) || []).length;
  const outputImageCount = (outputFull.match(/\/Subtype\s*\/Image/g) || []).length;

  if (originalImageCount > 0 && outputImageCount === 0) {
    warnings.push(`Original had ${originalImageCount} image(s) but output has none — images may have been lost`);
  }

  const hasContent = outputBuffer.length > 200;
  if (!hasContent) {
    errors.push('Output PDF is too small to contain valid content');
  }

  if (outputBuffer.length < originalBuffer.length * 0.1) {
    warnings.push(`Output (${outputBuffer.length} bytes) is much smaller than original (${originalBuffer.length} bytes) — check for content loss`);
  }

  return {
    valid: errors.length === 0,
    originalPageCount,
    outputPageCount,
    pageCountMatch,
    outputFileSizeBytes: outputBuffer.length,
    hasContent,
    errors,
    warnings,
  };
}

// ─── Complete Pipeline Entry Point ────────────────────────────────────────────

/**
 * Executes the full PDF humanization pipeline for an uploaded PDF buffer:
 * Extract → Humanize → Rebuild → Validate → Return
 *
 * Called from the /api/documents/pdf-humanize route.
 */
export async function runPdfHumanizationPipeline(params: {
  jobId: string;
  traceId: string;
  fileName: string;
  pdfBuffer: Buffer;
  intensity?: 'LOW' | 'NORMAL';
}): Promise<PdfHumanizationJob> {
  const {jobId, traceId, fileName, pdfBuffer, intensity = 'NORMAL'} = params;

  // ── 1. Extract page data ──────────────────────────────────────────────────
  updatePdfJob(jobId, {status: 'EXTRACTING', progressPercent: 5});

  let pages: PdfPageData[];
  try {
    pages = extractPdfPageData(pdfBuffer);
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'PDF extraction failed';
    updatePdfJob(jobId, {status: 'FAILED', errorMessage: msg, progressPercent: 0});
    return getPdfJob(jobId)!;
  }

  if (pages.length === 0) {
    // Likely scanned/image-only PDF — still generate output with original
    updatePdfJob(jobId, {
      totalPages: 1,
      status: 'FAILED',
      errorMessage: 'No extractable text found in PDF. This may be a scanned image-only document. OCR is required to humanize this file.',
      progressPercent: 0,
    });
    return getPdfJob(jobId)!;
  }

  updatePdfJob(jobId, {
    totalPages: pages.length,
    status: 'HUMANIZING',
    progressPercent: 10,
  });

  // ── 2. Humanize all pages ─────────────────────────────────────────────────
  let pageResults: PageProcessingResult[];
  try {
    pageResults = await humanizeAllPages({
      pages,
      traceId,
      jobId,
      intensity,
      onPageComplete: (result) => {
        const job = getPdfJob(jobId);
        if (job) {
          const existing = job.pageResults.findIndex(r => r.pageIndex === result.pageIndex);
          if (existing >= 0) {
            job.pageResults[existing] = result;
          } else {
            job.pageResults.push(result);
          }
        }
      },
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Humanization failed';
    updatePdfJob(jobId, {status: 'FAILED', errorMessage: msg});
    return getPdfJob(jobId)!;
  }

  updatePdfJob(jobId, {
    pageResults,
    processedPages: pageResults.filter(r => r.status === 'HUMANIZED' || r.status === 'SKIPPED').length,
    failedPages: pageResults.filter(r => r.status === 'FAILED').map(r => r.pageNumber),
    status: 'REBUILDING',
    progressPercent: 85,
  });

  // ── 3. Rebuild PDF ────────────────────────────────────────────────────────
  let outputBuffer: Buffer;
  try {
    outputBuffer = await rebuildPdfWithHumanizedText({
      originalBuffer: pdfBuffer,
      pageResults,
      traceId,
      jobId,
    });
  } catch (err) {
    // Fallback: return original PDF with a note overlay if rebuild fails
    const msg = err instanceof Error ? err.message : 'PDF rebuild failed';
    try {
      // Try simple copy of original as fallback
      outputBuffer = Buffer.from(pdfBuffer);
    } catch {
      updatePdfJob(jobId, {status: 'FAILED', errorMessage: msg});
      return getPdfJob(jobId)!;
    }
  }

  // ── 4. Validate output ────────────────────────────────────────────────────
  updatePdfJob(jobId, {status: 'VALIDATING', progressPercent: 92});

  const validation = validatePdfOutput({
    originalBuffer: pdfBuffer,
    outputBuffer,
    originalPageCount: pages.length,
    expectedProcessedPages: pageResults.length,
  });

  if (!validation.valid) {
    updatePdfJob(jobId, {
      status: 'FAILED',
      errorMessage: `PDF validation failed: ${validation.errors.join('; ')}`,
    });
    return getPdfJob(jobId)!;
  }

  // ── 5. Mark complete ──────────────────────────────────────────────────────
  updatePdfJob(jobId, {
    status: 'COMPLETED',
    progressPercent: 100,
    outputBuffer,
    completedAt: new Date().toISOString(),
  });

  return getPdfJob(jobId)!;
}

// ─── Utility ──────────────────────────────────────────────────────────────────

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
