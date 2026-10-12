import { SupportedFileType } from '../types';
import { ensurePdfPolyfills } from '../pdf/polyfill';

export interface ExtractedDocument {
  text: string;
  metadata: {
    wordCount: number;
    characterCount: number;
    paragraphCount: number;
    fileType: SupportedFileType;
    headings: string[];
    pagesEstimate?: number;
  };
}

const SUPPORTED_EXTENSIONS: Record<string, SupportedFileType> = {
  '.docx': 'docx',
  '.pdf': 'pdf',
  '.txt': 'txt',
  '.md': 'md',
  '.rtf': 'rtf',
  '.xlsx': 'xlsx',
};

export function validateFileType(fileName: string): SupportedFileType {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  const fileType = SUPPORTED_EXTENSIONS[ext];
  if (!fileType) {
    throw new Error(
      `Unsupported file type "${ext}". Supported formats are: DOCX, PDF, TXT, MD, RTF, and XLSX.`
    );
  }
  return fileType;
}

export function isSupportedFile(fileName: string): boolean {
  const ext = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();
  return Boolean(SUPPORTED_EXTENSIONS[ext]);
}

/**
 * Extracts plain text cleanly from RTF.
 */
function extractRtfText(rtfContent: string): string {
  // Strip RTF control words, groups, and font tables
  return rtfContent
    .replace(/\\fonttbl[\s\S]*?;/g, '')
    .replace(/\\colortbl[\s\S]*?;/g, '')
    .replace(/\{\\*?\\[^{}]+(?:[\s\S]*?)\}/g, '')
    .replace(/\\par[d]?\b/g, '\n')
    .replace(/\\tab\b/g, '\t')
    .replace(/\\[a-z0-9-]+ ?/gi, '')
    .replace(/[{}]/g, '')
    .replace(/\r\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/**
 * Extracts text and structure from supported document formats.
 */
export async function extractDocumentText(
  buffer: Buffer,
  fileType: SupportedFileType,
  fileName: string
): Promise<ExtractedDocument> {
  let rawText = '';

  switch (fileType) {
    case 'txt':
    case 'md': {
      rawText = buffer.toString('utf-8');
      break;
    }

    case 'rtf': {
      const rtfRaw = buffer.toString('utf-8');
      rawText = extractRtfText(rtfRaw);
      if (!rawText.trim()) {
        rawText = rtfRaw.replace(/[{}]/g, '').replace(/\\[a-z0-9-]+/gi, ' ').trim();
      }
      break;
    }

    case 'docx': {
      try {
        const mammoth = await import('mammoth');
        const result = await mammoth.extractRawText({ buffer });
        rawText = result.value;
      } catch (err: unknown) {
        throw new Error(`DOCX extraction failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      break;
    }

    case 'pdf': {
      ensurePdfPolyfills();
      try {
        const pdfModule: any = await import('pdf-parse');
        if (typeof pdfModule.PDFParse === 'function') {
          const parser = new pdfModule.PDFParse({ data: buffer });
          const textResult = await parser.getText();
          rawText = typeof textResult === 'string' ? textResult : (textResult?.text || '');
        } else if (typeof pdfModule.default === 'function') {
          const res = await pdfModule.default(buffer);
          rawText = typeof res === 'string' ? res : (res?.text || '');
        } else if (typeof pdfModule === 'function') {
          const res = await pdfModule(buffer);
          rawText = typeof res === 'string' ? res : (res?.text || '');
        } else {
          const raw = buffer.toString('binary');
          const matches = raw.match(/\(([^)]+)\)\s*Tj/g) || [];
          rawText = matches.map((m) => m.replace(/^\(|\)\s*Tj$/g, '')).join(' ');
        }
      } catch (err: unknown) {
        // Fallback: extract plain text strings from PDF stream
        const raw = buffer.toString('latin1');
        const textParts = raw.match(/\(([^)]+)\)\s*Tj/g);
        if (textParts && textParts.length > 0) {
          rawText = textParts.map((t) => t.replace(/^\(|\)\s*Tj$/, '')).join(' ');
        } else {
          // Additional fallback: decode uncompressed text blocks
          const blocks = raw.match(/BT[\s\S]*?ET/g);
          if (blocks && blocks.length > 0) {
            rawText = blocks.map((b) => b.replace(/[^\x20-\x7E\n\r\t]/g, ' ')).join('\n');
          } else {
            throw new Error(`PDF text extraction error: ${err instanceof Error ? err.message : String(err)}`);
          }
        }
      }
      break;
    }

    case 'xlsx': {
      try {
        const xlsx = await import('xlsx');
        const workbook = xlsx.read(buffer, { type: 'buffer' });
        const sheetTexts: string[] = [];

        workbook.SheetNames.forEach((sheetName) => {
          const sheet = workbook.Sheets[sheetName];
          const csv = xlsx.utils.sheet_to_csv(sheet);
          if (csv && csv.trim()) {
            sheetTexts.push(`--- Sheet: ${sheetName} ---\n${csv}`);
          }
        });
        rawText = sheetTexts.join('\n\n');
      } catch (err: unknown) {
        throw new Error(`XLSX extraction failed: ${err instanceof Error ? err.message : String(err)}`);
      }
      break;
    }

    default:
      throw new Error(`Unsupported file type: ${fileType}`);
  }

  // Normalize line breaks
  const cleanedText = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();

  if (!cleanedText) {
    throw new Error(`No readable text could be extracted from "${fileName}". The file may be empty or encrypted.`);
  }

  // Extract headings
  const headings: string[] = [];
  const lines = cleanedText.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (trimmed.startsWith('#')) {
      headings.push(trimmed.replace(/^#+\s*/, ''));
    } else if (
      trimmed.length > 3 &&
      trimmed.length < 80 &&
      /^[A-Z0-9\s:.-]+$/.test(trimmed) &&
      !trimmed.endsWith('.')
    ) {
      headings.push(trimmed);
    }
  }

  const words = cleanedText.split(/\s+/).filter(Boolean);
  const paragraphs = cleanedText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  return {
    text: cleanedText,
    metadata: {
      wordCount: words.length,
      characterCount: cleanedText.length,
      paragraphCount: paragraphs.length,
      fileType,
      headings,
      pagesEstimate: Math.max(1, Math.ceil(words.length / 450)),
    },
  };
}
