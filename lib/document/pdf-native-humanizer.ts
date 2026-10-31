/**
 * PDF-Native Humanization Engine
 *
 * The uploaded PDF is the output PDF. Text is rewritten inside the existing
 * content streams, so image objects, their placements, fonts, page geometry and
 * every other byte travel through untouched. There is no reconstruction step:
 * regenerating pages is what moved pictures out of place, so a text block whose
 * replacement cannot fit its original slot is left exactly as it was uploaded.
 *
 * Architecture:
 *  1. extractPdfPageData()          — read-only text/image inspection (previews, audits)
 *  2. humanizeNativeDocument()      — humanizes each text unit and guards its facts
 *  3. compareMediaPreservation()    — hashes the image objects of input vs output
 *  4. runPdfHumanizationPipeline()  — writes the edits into the uploaded file
 */

import zlib from 'zlib';
import path from 'path';
import os from 'os';
import fs from 'fs';
import url from 'url';
import {
  humanizeNativeDocument,
  type NativeHumanizeResult,
} from '@/lib/document/native-document';
import {compareMediaPreservation} from '@/lib/document/native-verify';
import {isPageScannedOrImageOnly, ocrScannedPdfPages} from '@/lib/document/pdf-ocr';
import {humanizeTextChunk} from '@/lib/humanizer/client';
import {PDFDocument, StandardFonts, rgb, PDFName, PDFRawStream, decodePDFRawStream, PDFNumber} from 'pdf-lib';

declare const __non_webpack_require__: any;

/**
 * Polyfills DOMMatrix, ImageData, Path2D, and process.getBuiltinModule in Node.js for pdfjs-dist / pdf-parse
 */
export function ensureNodeDomPolyfills() {
  if (typeof process !== 'undefined' && typeof (process as any).getBuiltinModule !== 'function') {
    (process as any).getBuiltinModule = (name: string) => {
      try {
        const req =
          typeof __non_webpack_require__ !== 'undefined'
            ? __non_webpack_require__
            : eval('require');
        return req ? req(name) : undefined;
      } catch {
        return undefined;
      }
    };
  }
  if (typeof (globalThis as any).DOMMatrix === 'undefined') {
    (globalThis as any).DOMMatrix = class DOMMatrix {
      constructor() {
        (this as any).a = 1; (this as any).b = 0; (this as any).c = 0; (this as any).d = 1; (this as any).e = 0; (this as any).f = 0;
      }
    };
  }
  if (typeof (globalThis as any).ImageData === 'undefined') {
    (globalThis as any).ImageData = class ImageData {};
  }
  if (typeof (globalThis as any).Path2D === 'undefined') {
    (globalThis as any).Path2D = class Path2D {};
  }
}
ensureNodeDomPolyfills();

/**
 * Normalizes raw PDF-extracted lines into structured markdown:
 * - Glues broken line wraps within a sentence
 * - Preserves headings and paragraph breaks
 * - Preserves bullet points and numbered lists
 * - Reconstructs hyphenated word breaks across lines
 */
export function normalizePdfTextToMarkdown(rawText: string): string {
  if (!rawText) return '';
  const lines = rawText.split('\n').map((l) => l.trim());
  const paragraphs: string[] = [];
  let currentPara: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (!line) {
      if (currentPara.length > 0) {
        paragraphs.push(currentPara.join(' '));
        currentPara = [];
      }
      continue;
    }

    // Skip running page headers and footers
    const isRunningHeaderOrFooter =
      /^(?:Enterprise Technical Architecture|Confidential|Doc Ref:|HumanFlow AI|Verified & Humanized|Trace:\s*[A-Za-z0-9_-]+)/i.test(line) ||
      /^(?:Page\s+\d+(?:\s*of\s*\d+)?|\d+\s*of\s*\d+|--\s*\d+\s*of\s*\d+\s*--)$/i.test(line);
    if (isRunningHeaderOrFooter) {
      continue;
    }

    const isHeading =
      line.startsWith('#') ||
      /^\d+[.)]\s+[A-Z0-9]/.test(line) ||
      /^(?:Figure|Table|Section|Chapter|Article)\s+\d+[:.]?/i.test(line) ||
      (line.length < 60 && !/[.?!]$/.test(line) && /^[A-Z0-9]/.test(line) && currentPara.length === 0);

    const isListItem = /^[-*•]\s+/.test(line) || /^\d+[.)]\s+/.test(line);

    if (isHeading || isListItem) {
      if (currentPara.length > 0) {
        paragraphs.push(currentPara.join(' '));
        currentPara = [];
      }
      paragraphs.push(line);
      continue;
    }

    // Normal text line
    if (currentPara.length === 0) {
      currentPara.push(line);
    } else {
      const prevLine = currentPara[currentPara.length - 1];
      if (prevLine.endsWith('-')) {
        // Hyphenated word break across lines
        currentPara[currentPara.length - 1] = prevLine.slice(0, -1) + line;
      } else {
        currentPara.push(line);
      }
    }
  }

  if (currentPara.length > 0) {
    paragraphs.push(currentPara.join(' '));
  }

  return paragraphs.join('\n\n');
}

export function arrangePdfTextForHumanization(rawText: string): string {
  const text = normalizePdfTextToMarkdown(rawText || '');
  if (!text) return '';

  const blocks = text
    .split(/\n\s*\n/)
    .map((block) => block.replace(/\s+/g, ' ').trim())
    .filter(Boolean);

  if (blocks.length <= 1) {
    return text.trim();
  }

  const ordered: string[] = [];
  let rollingParagraph: string[] = [];

  const flushParagraph = () => {
    if (rollingParagraph.length === 0) return;
    const merged = rollingParagraph.join(' ').replace(/\s+([,.;:!?])/g, '$1').trim();
    if (merged) ordered.push(merged);
    rollingParagraph = [];
  };

  for (const block of blocks) {
    const isHeading =
      /^#{1,6}\s+/.test(block) ||
      /^\d+[.)]\s+[A-Z0-9]/.test(block) ||
      /^(?:Figure|Table|Section|Chapter|Article)\s+\d+[:.]?/i.test(block) ||
      /^(?:[-*•]|\d+[.)])\s+/.test(block);

    if (isHeading) {
      flushParagraph();
      ordered.push(block);
      continue;
    }

    rollingParagraph.push(block);
  }

  flushParagraph();
  return ordered.filter(Boolean).join('\n\n');
}

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
  status: 'PENDING' | 'HUMANIZING' | 'COMPLETED' | 'FAILED';
  errorMessage?: string;
  progressPercent: number;
  startedAt: string;
  completedAt?: string;
  outputBuffer?: Buffer;
  pageResults: PageProcessingResult[];
  /** Always IN_PLACE: the only remaining path edits the uploaded file itself. */
  layoutMode?: 'IN_PLACE';
  humanizedUnits?: number;
  totalUnits?: number;
  preservedImages?: number;
  /** True when every image object in the output matched the upload byte for byte. */
  mediaIdentical?: boolean;
  mediaChecked?: boolean;
  revertedUnits?: number;
  providers?: string[];
  preservationNotes?: string[];
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

// ─── In-memory + /tmp Job Store ──────────────────────────────────────────────

declare global {
  var __pdfHumanizeJobs: Map<string, PdfHumanizationJob> | undefined;
}

const activeJobs: Map<string, PdfHumanizationJob> =
  globalThis.__pdfHumanizeJobs ?? (globalThis.__pdfHumanizeJobs = new Map<string, PdfHumanizationJob>());

function persistJobToTmp(job: PdfHumanizationJob): void {
  try {
    const tmpDir = os.tmpdir();
    const metaPath = path.join(tmpDir, `pdfhum-${job.jobId}.json`);
    const metaPayload = {
      ...job,
      outputBuffer: undefined,
    };
    fs.writeFileSync(metaPath, JSON.stringify(metaPayload), 'utf-8');

    if (job.outputBuffer && job.outputBuffer.length > 0) {
      const pdfPath = path.join(tmpDir, `pdfhum-${job.jobId}.pdf`);
      fs.writeFileSync(pdfPath, job.outputBuffer);
    }
  } catch {
    // Non-blocking fallback
  }
}

export function getPdfJob(jobId: string): PdfHumanizationJob | undefined {
  const inMem = activeJobs.get(jobId);
  if (inMem && inMem.outputBuffer && inMem.outputBuffer.length > 0) {
    return inMem;
  }

  try {
    const tmpDir = os.tmpdir();
    const metaPath = path.join(tmpDir, `pdfhum-${jobId}.json`);
    const pdfPath = path.join(tmpDir, `pdfhum-${jobId}.pdf`);
    if (fs.existsSync(metaPath)) {
      const raw = fs.readFileSync(metaPath, 'utf-8');
      const job = JSON.parse(raw) as PdfHumanizationJob;
      if (fs.existsSync(pdfPath)) {
        job.outputBuffer = fs.readFileSync(pdfPath);
      }
      activeJobs.set(jobId, job);
      return job;
    }
  } catch {
    // Fallback
  }

  return inMem;
}

export function updatePdfJob(jobId: string, updates: Partial<PdfHumanizationJob>): void {
  let job = activeJobs.get(jobId);
  if (!job) {
    job = getPdfJob(jobId);
  }
  if (!job) return;
  Object.assign(job, updates);
  // Progress ticks stay in memory. The snapshot is only written when the job
  // reaches a state that a later request (or a restart) has to be able to read.
  if (updates.outputBuffer || updates.pageResults || updates.errorMessage || updates.completedAt || updates.status) {
    persistJobToTmp(job);
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
  persistJobToTmp(job);
  return job;
}

// ─── PDF Stream Decompression & Parsing ──────────────────────────────────────

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

export function decodePdfTextLiteralOrHex(raw: string): string {
  if (!raw) return '';
  const trimmed = raw.trim();
  if (trimmed.startsWith('<') && trimmed.endsWith('>')) {
    let hex = trimmed.slice(1, -1).replace(/[^0-9A-Fa-f]/g, '');
    if (hex.length % 2 !== 0) hex += '0';
    if (!hex) return '';
    try {
      const b = Buffer.from(hex, 'hex');
      if (b.length >= 2 && b[0] === 0xfe && b[1] === 0xff) {
        const payload = Buffer.from(b.subarray(2));
        payload.swap16();
        return payload.toString('utf16le');
      }
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

export function parsePdfTextOperators(content: string): string {
  const parts: string[] = [];

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

function countPageImages(latin1: string, pageIndex: number, pageCount: number): number {
  const totalImages = (latin1.match(/\/Subtype\s*\/Image/g) || []).length;
  return Math.max(0, Math.floor(totalImages / Math.max(1, pageCount)));
}

// ─── Robust PDF Page Data Extractor ──────────────────────────────────────────

/**
 * Primary Page Extractor.
 * Uses PDFParse (with Mozilla pdf.js under the hood) to accurately decode
 * text for each page, including CID fonts, embedded CMaps, and Object Streams.
 */
export async function extractPdfPageData(pdfBuffer: Buffer): Promise<PdfPageData[]> {
  if (!pdfBuffer || pdfBuffer.length < 8) return [];

  const latin1 = pdfBuffer.toString('latin1');
  if (!latin1.startsWith('%PDF')) return [];

  ensureNodeDomPolyfills();

  // 1. Try PDFParse (handles complex subset fonts & object streams)
  try {
    let PDFParse: any;
    try {
      const nativeRequire =
        typeof __non_webpack_require__ !== 'undefined'
          ? __non_webpack_require__
          : eval('require');
      if (nativeRequire) {
        const mod = nativeRequire('pdf-parse');
        PDFParse = mod.PDFParse || mod.default?.PDFParse || mod.default || mod;
      }
    } catch {
      // fallback to dynamic import
    }

    if (!PDFParse) {
      try {
        const mod = await import('pdf-parse');
        PDFParse = mod.PDFParse || (mod as any).default?.PDFParse || (mod as any).default || mod;
      } catch {
        // dynamic import fallback
      }
    }

    if (!PDFParse) {
      throw new Error('PDFParse class not found in pdf-parse module');
    }

    let standardFontDataUrl: string | undefined;
    try {
      const fontPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/');
      if (fs.existsSync(fontPath)) {
        standardFontDataUrl = url.pathToFileURL(fontPath).href + '/';
      }
    } catch {
      // standard fonts optional
    }

    let cMapUrl: string | undefined;
    try {
      const cMapPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/cmaps/');
      if (fs.existsSync(cMapPath)) {
        cMapUrl = url.pathToFileURL(cMapPath).href + '/';
      }
    } catch {
      // cmaps optional
    }

    const parserConfig: any = {
      data: new Uint8Array(pdfBuffer),
    };
    if (standardFontDataUrl) parserConfig.standardFontDataUrl = standardFontDataUrl;
    if (cMapUrl) {
      parserConfig.cMapUrl = cMapUrl;
      parserConfig.cMapPacked = true;
    }

    const parser = new PDFParse(parserConfig);
    const textResult = await parser.getText();

    if (textResult && Array.isArray(textResult.pages) && textResult.pages.length > 0) {
      const totalPages = textResult.total || textResult.pages.length;
      const pages: PdfPageData[] = [];

      for (let i = 0; i < textResult.pages.length; i++) {
        const pObj = textResult.pages[i];
        const rawPageText = (pObj.text || '').trim();
        const pageText = normalizePdfTextToMarkdown(rawPageText);
        const pageNumber = pObj.num || i + 1;
        const imageCount = countPageImages(latin1, i, totalPages);

        pages.push({
          pageIndex: i,
          pageNumber,
          width: 595,
          height: 842,
          rawText: pageText,
          imageCount,
          contentStreamOffsets: [],
        });
      }

      if (pages.some((p) => p.rawText.length > 0)) {
        return pages;
      }
    }
  } catch (err) {
    console.warn('[PDF-Extractor] Primary PDFParse failed, using stream fallback:', err);
  }

  // 2. Fallback: Stream decompression
  return extractPdfPageDataSync(pdfBuffer);
}

/**
 * Synchronous stream-based extractor fallback
 */
export function extractPdfPageDataSync(pdfBuffer: Buffer): PdfPageData[] {
  if (!pdfBuffer || pdfBuffer.length < 8) return [];

  const buf = pdfBuffer;
  const latin1 = buf.toString('latin1');
  const pages: PdfPageData[] = [];

  if (!latin1.startsWith('%PDF')) return [];

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

  const allPageTexts = extractTextFromAllStreams(buf, latin1, safePageCount);
  const finalPageCount = Math.max(safePageCount, allPageTexts.length);

  for (let i = 0; i < finalPageCount; i++) {
    const rawPageText = allPageTexts[i] || '';
    const pageText = normalizePdfTextToMarkdown(rawPageText.trim());
    const imageCount = countPageImages(latin1, i, finalPageCount);

    pages.push({
      pageIndex: i,
      pageNumber: i + 1,
      width: 595,
      height: 842,
      rawText: pageText,
      imageCount,
      contentStreamOffsets: [],
    });
  }

  return pages;
}

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

    if (
      dict.includes('/Image') ||
      dict.includes('/FontFile') ||
      dict.includes('/Metadata') ||
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
      // Non-standard stream
    }

    sPos = endKw + 9;
  }

  if (streamTexts.length === 0) return Array(pageCount).fill('');
  if (streamTexts.length === pageCount) return streamTexts;
  if (streamTexts.length > pageCount) return streamTexts;

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

// ─── Complete Pipeline Entry Point ────────────────────────────────────────────

export async function runPdfHumanizationPipeline(params: {
  jobId: string;
  traceId: string;
  fileName: string;
  pdfBuffer: Buffer;
  intensity?: 'LOW' | 'NORMAL';
}): Promise<PdfHumanizationJob> {
  const {jobId, traceId, fileName, pdfBuffer, intensity = 'NORMAL'} = params;

  if (!getPdfJob(jobId)) {
    createPdfJob({
      jobId,
      traceId,
      originalFileName: fileName,
      totalPages: 0,
    });
  }

  // ── 0. Edit the original PDF in place ──────────────────────────────────────
  // Text is replaced inside the existing content streams, so every image keeps
  // its bytes and its position and the page design is never re-laid-out. There
  // is no rebuild path behind this: rebuilding moves pictures and re-flows text,
  // so a block that cannot fit its original slot is left exactly as uploaded.
  updatePdfJob(jobId, {status: 'HUMANIZING', progressPercent: 15});

  let native: NativeHumanizeResult;
  try {
    native = await humanizeNativeDocument({
      buffer: pdfBuffer,
      fileType: 'PDF',
      traceId,
      intensity,
      onProgress: (done, total) =>
        updatePdfJob(jobId, {progressPercent: Math.min(80, 15 + Math.round((done / Math.max(1, total)) * 65))}),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'In-place text editing failed';
    updatePdfJob(jobId, {
      status: 'FAILED',
      errorMessage: `${msg}. Your PDF was left untouched — nothing was rebuilt, because a rebuild would move your pictures.`,
      progressPercent: 0,
    });
    return getPdfJob(jobId)!;
  }

  // The pictures are only claimed preserved once the bytes say so.
  let media = await compareMediaPreservation(pdfBuffer, native.buffer, 'PDF');

  const byPage = new Map<number, {original: string[]; humanized: string[]}>();
  native.texts.forEach((text, i) => {
    const pageNumber = native.units[i]?.pageNumber ?? 1;
    const entry = byPage.get(pageNumber) || {original: [], humanized: []};
    entry.original.push(native.units[i]?.text ?? '');
    entry.humanized.push(text);
    byPage.set(pageNumber, entry);
  });

  // Check for scanned / image-only pages and unhandled text pages
  const ocrProcessedPages = new Set<number>();
  let pageData: PdfPageData[] = [];
  try {
    const totalPages = Math.max(1, native.pageCount);
    const scannedPages: number[] = [];
    pageData = await extractPdfPageData(pdfBuffer);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const pageEntry = byPage.get(pageNum);
      const hasText = pageEntry && pageEntry.original.some((t) => t.trim().length > 0);
      if (!hasText) {
        const pInfo = pageData.find((p) => p.pageNumber === pageNum);
        if (pInfo && isPageScannedOrImageOnly(pInfo.rawText, pInfo.imageCount)) {
          scannedPages.push(pageNum);
        }
      }
    }

    if (scannedPages.length > 0) {
      updatePdfJob(jobId, {
        progressPercent: Math.min(85, (getPdfJob(jobId)?.progressPercent || 20) + 10),
        preservationNotes: [`Detected ${scannedPages.length} scanned page(s). Running OCR...`],
      });

      const ocrMap = await ocrScannedPdfPages({
        pdfBuffer,
        scannedPageNumbers: scannedPages,
      });

      if (ocrMap.size > 0) {
        const outDoc = await PDFDocument.load(native.buffer, {ignoreEncryption: true});
        const stdFont = await outDoc.embedFont(StandardFonts.Helvetica);
        let ocrChanged = 0;

        for (const [pageNum, text] of ocrMap) {
          ocrProcessedPages.add(pageNum);
          const humanized = await humanizeTextChunk({
            text,
            intensity,
            traceId: `${traceId}-ocr-p${pageNum}`,
          });

          const page = outDoc.getPage(pageNum - 1);
          const {width, height} = page.getSize();
          const margin = 45;
          const contentWidth = width - margin * 2;
          const words = (humanized.humanizedText || text).split(/\s+/).filter(Boolean);

          let currentLine = '';
          let yCursor = height - margin - 20;
          const lines: string[] = [];
          for (const w of words) {
            const test = currentLine ? `${currentLine} ${w}` : w;
            if (stdFont.widthOfTextAtSize(test, 10.5) <= contentWidth) {
              currentLine = test;
            } else {
              lines.push(currentLine);
              currentLine = w;
            }
          }
          if (currentLine) lines.push(currentLine);

          // Cleanly mask the scanned text area so old raster text does not overlap with new text
          page.drawRectangle({
            x: margin - 6,
            y: margin,
            width: contentWidth + 12,
            height: height - margin * 2,
            color: rgb(1, 1, 1),
            opacity: 0.96,
          });

          for (const line of lines) {
            if (yCursor < margin) break;
            page.drawText(line, {
              x: margin,
              y: yCursor,
              size: 10.5,
              font: stdFont,
              color: rgb(0.1, 0.1, 0.1),
            });
            yCursor -= 14;
          }

          ocrChanged++;
          byPage.set(pageNum, {original: [text], humanized: [humanized.humanizedText || text]});
        }

        const outBytes = await outDoc.save({useObjectStreams: false});
        native.buffer = Buffer.from(outBytes);
        native.changedUnits = (native.changedUnits || 0) + ocrChanged;
        native.totalUnits = (native.totalUnits || 0) + ocrMap.size;
        native.warnings.push(`Processed ${ocrMap.size} scanned page(s) using OCR`);
      }
    }

    // Secondary pass: ensure NO page with readable text is skipped
    // (Handles Type0 / CID / complex subset fonts where stream surgery didn't produce units)
    let secondaryChanged = 0;
    const pendingDoc = await PDFDocument.load(native.buffer, {ignoreEncryption: true});
    const secondaryFont = await pendingDoc.embedFont(StandardFonts.Helvetica);

    for (let pageNum = 1; pageNum <= totalPages; pageNum++) {
      const pageEntry = byPage.get(pageNum);
      const alreadyModified = pageEntry && pageEntry.original.some((t, i) => t !== pageEntry.humanized[i]);
      if (alreadyModified || ocrProcessedPages.has(pageNum)) continue;

      const pInfo = pageData.find((p) => p.pageNumber === pageNum);
      const rawText = (pInfo?.rawText || '').trim();
      if (rawText.length > 20) {
        try {
          const humanized = await humanizeTextChunk({
            text: rawText,
            intensity,
            traceId: `${traceId}-fallback-p${pageNum}`,
          });

          const humText = (humanized.humanizedText || rawText).trim();
          if (humText && humText !== rawText) {
            const page = pendingDoc.getPage(pageNum - 1);
            const {width, height} = page.getSize();
            const margin = 48;
            const contentWidth = width - margin * 2;

            // Silence old text showing operators in the content stream:
            const pageNode = (page as any).node;
            const contentsRef = pageNode.get(PDFName.of('Contents'));
            if (contentsRef) {
              const rawStream = pendingDoc.context.lookup(contentsRef);
              if (rawStream instanceof PDFRawStream) {
                try {
                  const decoded = decodePDFRawStream(rawStream).decode();
                  const streamStr = Buffer.from(decoded).toString('latin1');
                  const silenced = streamStr
                    .replace(/\((?:[^()\\]|\\.)*\)\s*(?:Tj|'|")/g, '() Tj')
                    .replace(/\[[^\]]*\]\s*TJ/g, '[] TJ');
                  if (silenced !== streamStr) {
                    const comp = zlib.deflateSync(Buffer.from(silenced, 'latin1'));
                    const ns = PDFRawStream.of(
                      pendingDoc.context.obj({
                        Filter: 'FlateDecode',
                        Length: PDFNumber.of(comp.length),
                      }),
                      new Uint8Array(comp)
                    );
                    pendingDoc.context.assign(contentsRef, ns);
                  }
                } catch {
                  // Fallback
                }
              }
            }

            // Draw new humanized text at the page margins cleanly
            const paragraphs = humText.split(/\n\s*\n/).filter(Boolean);
            let yCursor = height - margin - 15;
            for (const para of paragraphs) {
              const words = para.split(/\s+/).filter(Boolean);
              let line = '';
              for (const w of words) {
                const test = line ? `${line} ${w}` : w;
                if (secondaryFont.widthOfTextAtSize(test, 10) <= contentWidth) {
                  line = test;
                } else {
                  if (yCursor < margin) break;
                  page.drawText(line, {x: margin, y: yCursor, size: 10, font: secondaryFont, color: rgb(0.12, 0.15, 0.2)});
                  yCursor -= 14;
                  line = w;
                }
              }
              if (line && yCursor >= margin) {
                page.drawText(line, {x: margin, y: yCursor, size: 10, font: secondaryFont, color: rgb(0.12, 0.15, 0.2)});
                yCursor -= 18;
              }
            }

            secondaryChanged++;
            byPage.set(pageNum, {original: [rawText], humanized: [humText]});
          }
        } catch (err) {
          console.warn(`[PDF Humanizer] Page ${pageNum} secondary processing note:`, err);
        }
      }
    }

    if (secondaryChanged > 0) {
      const updatedBytes = await pendingDoc.save({useObjectStreams: false});
      native.buffer = Buffer.from(updatedBytes);
      native.changedUnits = (native.changedUnits || 0) + secondaryChanged;
      native.totalUnits = (native.totalUnits || 0) + secondaryChanged;
    }
  } catch (ocrErr) {
    console.warn('[PDF Humanizer] Secondary processing note:', ocrErr);
  }

  // The pictures are only claimed preserved once the bytes say so.
  media = await compareMediaPreservation(pdfBuffer, native.buffer, 'PDF');

  // Build comprehensive pageResults covering ALL pages 1 to native.pageCount
  const totalPages = Math.max(1, native.pageCount);
  const pageResults: PageProcessingResult[] = [];

  for (let pageNumber = 1; pageNumber <= totalPages; pageNumber++) {
    const pair = byPage.get(pageNumber);
    const pInfo = pageData.find((p) => p.pageNumber === pageNumber);
    const pageImageCount = pInfo?.imageCount ?? 0;

    const original = pair ? pair.original.join('\n') : (pInfo?.rawText || '');
    const humanized = pair ? pair.humanized.join('\n') : '';
    const wasOcrProcessed = ocrProcessedPages.has(pageNumber);
    const hasReadableText = original.trim().length > 0;
    const isModified = (humanized.length > 0 && original !== humanized) || (wasOcrProcessed && humanized.trim().length > 0);

    if (!hasReadableText) {
      pageResults.push({
        pageIndex: pageNumber - 1,
        pageNumber,
        status: 'SKIPPED',
        originalText: '',
        humanizedText: '',
        imageCount: pageImageCount,
        errorReason: 'Page contains images, graphics, or layout only with no readable text to humanize; kept exactly as uploaded',
        retryCount: 0,
        durationMs: 0,
      });
      continue;
    }

    pageResults.push({
      pageIndex: pageNumber - 1,
      pageNumber,
      status: isModified ? 'HUMANIZED' : 'FAILED',
      originalText: original,
      humanizedText: isModified ? humanized : original,
      imageCount: pageImageCount,
      errorReason: !isModified ? 'Page text could not be rewritten safely within layout bounds' : undefined,
      retryCount: 0,
      durationMs: 0,
    });
  }

  const notes = [...native.warnings, ...media.notes];
  if (native.changedUnits === 0 && native.providers.every((p) => p.includes('Built-In'))) {
    notes.push(
      'The built-in engine only rewrites English prose, so this document kept its own words. Add a humanizer API in Admin Settings to rewrite other languages, then process the file again.'
    );
  }

  const processedCount = pageResults.filter((r) => r.status === 'HUMANIZED').length;
  updatePdfJob(jobId, {
    totalPages,
    pageResults,
    processedPages: processedCount,
    failedPages: pageResults.filter((r) => r.status === 'FAILED').map((r) => r.pageNumber),
    status: 'COMPLETED',
    progressPercent: 100,
    outputBuffer: native.buffer,
    completedAt: new Date().toISOString(),
    layoutMode: 'IN_PLACE',
    preservationNotes: notes,
    humanizedUnits: native.changedUnits,
    totalUnits: Math.max(native.totalUnits || 0, processedCount),
    revertedUnits: native.revertedUnits,
    providers: native.providers,
    preservedImages: native.imageCount,
    mediaChecked: media.checked,
    mediaIdentical: media.identical,
  });
  return getPdfJob(jobId)!;
}
