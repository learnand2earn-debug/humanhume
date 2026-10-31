/**
 * Optical Character Recognition (OCR) Engine for Scanned PDFs
 *
 * Detects scanned/image-only PDF documents and extracts readable text
 * using Tesseract.js (local OCR) and Google Gemini Vision (when configured).
 */

import {createWorker} from 'tesseract.js';
import {GoogleGenAI} from '@google/genai';
import {extractEmbeddedImagesFromUpload} from './image-utils';

export interface PageOcrResult {
  pageNumber: number;
  text: string;
  confidence: number;
  isScanned: boolean;
}

/**
 * Checks if a PDF page appears to be a scanned image rather than having selectable text.
 */
export function isPageScannedOrImageOnly(
  pageText: string,
  imageCount: number,
  charThreshold = 25
): boolean {
  const cleanText = pageText.replace(/[\s\r\n\t]+/g, '').trim();
  // If text is very short or nonexistent and page contains at least one image
  return cleanText.length < charThreshold && imageCount > 0;
}

/**
 * Runs OCR on a raw image buffer using Tesseract.js
 */
export async function runLocalOcrOnImageBuffer(
  imageBuffer: Buffer,
  language = 'eng'
): Promise<{text: string; confidence: number}> {
  try {
    const worker = await createWorker(language);
    const result = await worker.recognize(imageBuffer);
    const text = result.data.text.trim();
    const confidence = result.data.confidence || 85;
    await worker.terminate();
    return {text, confidence};
  } catch (err) {
    console.warn('[PDF-OCR] Tesseract.js OCR failed:', err);
    return {text: '', confidence: 0};
  }
}

/**
 * Runs OCR using Gemini Vision when an API key is available
 */
export async function runGeminiVisionOcr(
  imageBuffer: Buffer,
  mimeType: 'image/png' | 'image/jpeg' = 'image/png'
): Promise<string | null> {
  const apiKey =
    process.env.GEMINI_API_KEY ||
    process.env.GOOGLE_API_KEY ||
    (typeof globalThis !== 'undefined' && (globalThis as any).__GEMINI_API_KEY);

  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY' || apiKey.length < 10) {
    return null;
  }

  try {
    const ai = new GoogleGenAI({apiKey});
    const base64Data = imageBuffer.toString('base64');

    const prompt = `Perform high-precision Optical Character Recognition (OCR) on this scanned document page.
Extract all readable text, preserving paragraphs, headings, bullet points, numbers, tables, and document structure.
Do NOT summarize or omit anything.
Output ONLY the extracted text.`;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {text: prompt},
            {
              inlineData: {
                data: base64Data,
                mimeType,
              },
            },
          ],
        },
      ],
    });

    const text =
      response.text || response.candidates?.[0]?.content?.parts?.[0]?.text;
    return text ? text.trim() : null;
  } catch (err) {
    console.warn('[PDF-OCR] Gemini Vision OCR failed:', err);
    return null;
  }
}

/**
 * Performs OCR on scanned pages of a PDF document
 */
export async function ocrScannedPdfPages(params: {
  pdfBuffer: Buffer;
  scannedPageNumbers: number[];
}): Promise<Map<number, string>> {
  const {pdfBuffer, scannedPageNumbers} = params;
  const ocrResults = new Map<number, string>();

  if (scannedPageNumbers.length === 0) {
    return ocrResults;
  }

  // Extract embedded images from the PDF buffer
  const embeddedImages = extractEmbeddedImagesFromUpload({
    docId: 'ocr-temp',
    fileName: 'document.pdf',
    rawBuffer: pdfBuffer,
    rawText: '',
    sectionCount: scannedPageNumbers.length,
  });

  for (const pageNum of scannedPageNumbers) {
    // Find image corresponding to this page
    const pageImage =
      embeddedImages.find((img) => img.sectionIndex === pageNum) ||
      embeddedImages[pageNum - 1] ||
      embeddedImages[0];

    if (!pageImage || !pageImage.dataUrl) {
      continue;
    }

    try {
      // Decode data URL to buffer
      const base64Part = pageImage.dataUrl.split(',')[1];
      if (!base64Part) continue;
      const imgBuffer = Buffer.from(base64Part, 'base64');
      const isJpeg = pageImage.mimeType === 'image/jpeg';

      // 1. Try Gemini Vision first if available
      let extracted = await runGeminiVisionOcr(
        imgBuffer,
        isJpeg ? 'image/jpeg' : 'image/png'
      );

      // 2. Fall back to local Tesseract.js OCR
      if (!extracted || extracted.length < 10) {
        const localRes = await runLocalOcrOnImageBuffer(imgBuffer, 'eng');
        if (localRes.text && localRes.text.length > 5) {
          extracted = localRes.text;
        }
      }

      if (extracted && extracted.trim().length > 0) {
        ocrResults.set(pageNum, extracted.trim());
      }
    } catch (err) {
      console.warn(`[PDF-OCR] Failed to OCR page ${pageNum}:`, err);
    }
  }

  return ocrResults;
}
