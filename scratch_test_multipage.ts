import fs from 'fs';
import path from 'path';
import url from 'url';
import { PDFDocument, StandardFonts } from 'pdf-lib';

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

async function testMultiPage() {
  ensureNodeDomPolyfills();

  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const p1 = doc.addPage([595, 842]);
  p1.drawText('Page 1: Executive Overview\nIn order to facilitate operations, the company will utilize AI.', { x: 50, y: 750, font, size: 12 });

  // Page 2
  const p2 = doc.addPage([595, 842]);
  p2.drawText('Page 2: Financial Metrics\nDue to the fact that revenue increased, total profits reached $500,000 USD on 2026-10-24.', { x: 50, y: 750, font, size: 12 });

  // Page 3
  const p3 = doc.addPage([595, 842]);
  p3.drawText('Page 3: Conclusion & Next Steps\nSubsequent to the audit, both parties endeavor to sign by 2026-11-01.', { x: 50, y: 750, font, size: 12 });

  const bytes = await doc.save();

  const { PDFParse } = await import('pdf-parse');
  const fontDir = url.pathToFileURL(path.resolve('./node_modules/pdfjs-dist/standard_fonts/')).href + '/';
  const parser = new PDFParse({
    data: new Uint8Array(bytes),
    standardFontDataUrl: fontDir,
  });
  const res = await parser.getText();
  console.log('Total extracted pages:', res.total);
  console.log('\n--- Running runPdfHumanizationPipeline on 3-page PDF ---');
  const { runPdfHumanizationPipeline } = await import('./lib/document/pdf-native-humanizer');
  const job = await runPdfHumanizationPipeline({
    jobId: 'multipage-job-1',
    traceId: 'multipage-trace-1',
    fileName: 'multipage-test.pdf',
    pdfBuffer: Buffer.from(bytes),
    intensity: 'NORMAL',
  });

  console.log('Job status:', job.status);
  console.log('Total pages:', job.totalPages);
  console.log('Processed pages:', job.processedPages);
  console.log('Humanized units:', job.humanizedUnits);
  console.log('Total units:', job.totalUnits);
  console.log('Page results count:', job.pageResults.length);
  job.pageResults.forEach((r, idx) => {
    console.log(`Page ${idx + 1}: status=${r.status}, orig="${r.originalText}", hum="${r.humanizedText}"`);
  });

  if (job.outputBuffer) {
    fs.writeFileSync('output_test_multipage.pdf', job.outputBuffer);
    console.log('Saved output_test_multipage.pdf, size:', job.outputBuffer.length);

    const outParser = new PDFParse({
      data: new Uint8Array(job.outputBuffer),
      standardFontDataUrl: fontDir,
    });
    const outRes = await outParser.getText();
    console.log('\n--- VERIFIED TEXT IN OUTPUT PDF ---');
    outRes.pages.forEach((p: any, i: number) => {
      console.log(`Verified Page ${i + 1}:`, JSON.stringify(p.text));
    });
  }
}

testMultiPage().catch(console.error);
