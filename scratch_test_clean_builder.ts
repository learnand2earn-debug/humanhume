import fs from 'fs';
import path from 'path';
import url from 'url';
import { jsPDF } from 'jspdf';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { extractEmbeddedImagesFromUpload } from './lib/document/image-utils';
import { runNaturalHumanizationTransform } from './lib/humanizer/provider';

function ensureNodeDomPolyfills() {
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

/**
 * Normalizes raw PDF-extracted lines into structured markdown:
 * - Glues broken line wraps within a sentence
 * - Preserves headings and paragraph breaks
 * - Preserves bullet points and numbered lists
 */
function normalizePdfTextToMarkdown(rawText: string): string {
  if (!rawText) return '';
  const lines = rawText.split('\n').map(l => l.trim());
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

    const isHeading =
      line.startsWith('#') ||
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

async function testExtractionAndRebuild() {
  ensureNodeDomPolyfills();

  const buf = fs.readFileSync('sample_test_with_image.pdf');
  console.log('Original PDF size:', buf.length);

  // 1. Extract text using PDFParse
  const { PDFParse } = await import('pdf-parse');
  const fontDir = url.pathToFileURL(path.resolve('./node_modules/pdfjs-dist/standard_fonts/')).href + '/';
  const parser = new PDFParse({
    data: new Uint8Array(buf),
    standardFontDataUrl: fontDir,
  });
  const textResult = await parser.getText();
  console.log('Extracted pages count:', textResult.pages.length);

  // 2. Extract embedded images
  const images = extractEmbeddedImagesFromUpload({
    docId: 'test-doc',
    fileName: 'sample_test_with_image.pdf',
    rawBuffer: buf,
    rawText: textResult.text,
    sectionCount: textResult.pages.length,
  });
  console.log('Extracted images count:', images.length);

  // 3. Humanize each page's text
  const humanizedPages = textResult.pages.map((p: any, idx: number) => {
    const md = normalizePdfTextToMarkdown(p.text);
    const humanized = runNaturalHumanizationTransform(md, 'NORMAL', false);
    return {
      pageIndex: idx,
      pageNumber: idx + 1,
      originalText: md,
      humanizedText: humanized,
    };
  });

  console.log('\n--- Humanized Page 1 Text Preview ---');
  console.log(humanizedPages[0].humanizedText);

  // 4. Build high-quality PDF with jsPDF
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'pt',
    format: 'a4',
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();
  const marginX = 48;
  const contentWidth = pageWidth - marginX * 2;
  let cursorY = 54;
  let pageNumber = 1;

  const drawHeaderAndFooter = (pageNum: number) => {
    // Header
    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(8.5);
    pdf.setTextColor(100, 116, 139);
    pdf.text('HumanFlow AI · Humanized Document', marginX, 36);
    pdf.text(`Trace: HF-TEST-1 · Page ${pageNum}`, pageWidth - marginX, 36, { align: 'right' });

    pdf.setDrawColor(226, 232, 240);
    pdf.setLineWidth(0.75);
    pdf.line(marginX, 42, pageWidth - marginX, 42);

    // Footer
    pdf.line(marginX, pageHeight - 34, pageWidth - marginX, pageHeight - 34);
    pdf.setFontSize(8);
    pdf.setTextColor(148, 163, 184);
    pdf.text('Verified & Humanized · 100% Entity Preservation Guardrail', marginX, pageHeight - 22);
    pdf.text(`Page ${pageNum}`, pageWidth - marginX, pageHeight - 22, { align: 'right' });
  };

  const ensureSpace = (neededPt: number) => {
    if (cursorY + neededPt > pageHeight - 48) {
      pdf.addPage();
      pageNumber++;
      cursorY = 54;
      drawHeaderAndFooter(pageNumber);
    }
  };

  drawHeaderAndFooter(1);

  // Render each page's content
  for (const pageData of humanizedPages) {
    const blocks = pageData.humanizedText.split('\n\n').map((b: string) => b.trim()).filter(Boolean);

    for (const block of blocks) {
      const isTitle = block.startsWith('# ') || (!block.startsWith('#') && block.length < 50 && cursorY === 54);
      const isHeading = block.startsWith('## ') || block.startsWith('### ') || /^(?:Figure|Table)\s+\d+/i.test(block);
      const isListItem = /^[-*•]\s+/.test(block) || /^\d+[.)]\s+/.test(block);

      if (isTitle) {
        const text = block.replace(/^#+\s*/, '');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        pdf.setTextColor(15, 23, 42);
        const wrapped = pdf.splitTextToSize(text, contentWidth);
        ensureSpace(wrapped.length * 20 + 16);
        pdf.text(wrapped, marginX, cursorY);
        cursorY += wrapped.length * 20 + 8;
        continue;
      }

      if (isHeading) {
        const text = block.replace(/^#+\s*/, '');
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        pdf.setTextColor(30, 41, 59);
        const wrapped = pdf.splitTextToSize(text, contentWidth);
        ensureSpace(wrapped.length * 16 + 14);
        cursorY += 4;
        pdf.text(wrapped, marginX, cursorY);
        cursorY += wrapped.length * 16 + 6;

        // If this heading is a Figure caption, check if we have a matching image to render
        if (/^Figure\s+\d+/i.test(text) && images.length > 0) {
          const img = images[0];
          const imgW = Math.min(contentWidth - 40, 360);
          const ratio = img.aspectRatio || (img.width / img.height) || 1.5;
          const imgH = Math.min(220, imgW / ratio);
          ensureSpace(imgH + 20);

          try {
            const format = img.mimeType === 'image/jpeg' ? 'JPEG' : 'PNG';
            pdf.addImage(img.dataUrl, format, marginX + (contentWidth - imgW) / 2, cursorY, imgW, imgH);
            cursorY += imgH + 12;
          } catch {
            // non-fatal
          }
        }
        continue;
      }

      // Normal paragraph or list item
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(10);
      pdf.setTextColor(30, 41, 59);
      const wrapped = pdf.splitTextToSize(block, isListItem ? contentWidth - 14 : contentWidth);
      ensureSpace(wrapped.length * 14.5 + 8);
      pdf.text(wrapped, isListItem ? marginX + 14 : marginX, cursorY);
      cursorY += wrapped.length * 14.5 + 8;
    }
  }

  const outBytes = Buffer.from(pdf.output('arraybuffer'));
  fs.writeFileSync('output_clean_rebuilt.pdf', outBytes);
  console.log('\nSaved output_clean_rebuilt.pdf, size:', outBytes.length);

  // Validate output with PDFParse
  const verifyParser = new PDFParse({
    data: new Uint8Array(outBytes),
    standardFontDataUrl: fontDir,
  });
  const verifyResult = await verifyParser.getText();
  console.log('\n--- Verified Text from output_clean_rebuilt.pdf ---');
  console.log(verifyResult.text);
}

testExtractionAndRebuild().catch(console.error);
