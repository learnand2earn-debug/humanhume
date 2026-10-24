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
  res.pages.forEach((p: any, i: number) => {
    console.log(`Page ${i + 1} (num=${p.num}):`, JSON.stringify(p.text));
  });
}

testMultiPage().catch(console.error);
