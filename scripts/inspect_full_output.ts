import fs from 'fs';
import path from 'path';
import url from 'url';
import { PDFDocument } from 'pdf-lib';
import { ensureNodeDomPolyfills } from '../lib/document/pdf-native-humanizer';

async function inspectPdfFile(filePath: string) {
  console.log(`\n======================================================`);
  console.log(`INSPECTING: ${path.basename(filePath)}`);
  console.log(`======================================================`);

  if (!fs.existsSync(filePath)) {
    console.error(`ERROR: File does not exist: ${filePath}`);
    return false;
  }

  const buf = fs.readFileSync(filePath);
  console.log(`- File Size: ${buf.length.toLocaleString()} bytes`);

  // Check 1: Valid PDF Header
  const header = buf.slice(0, 10).toString('latin1');
  if (!header.startsWith('%PDF-')) {
    console.error(`- ERROR: Invalid PDF header: "${header}"`);
    return false;
  }
  console.log(`- PDF Header: ${header.trim()} (Valid)`);

  // Check 2: Valid PDF EOF
  const tail = buf.slice(Math.max(0, buf.length - 128)).toString('latin1');
  if (!tail.includes('%%EOF')) {
    console.warn(`- WARNING: %%EOF marker not found in trailing 128 bytes`);
  } else {
    console.log(`- PDF EOF marker: Found (Valid)`);
  }

  // Check 3: Load with pdf-lib
  let pdfLibDoc: PDFDocument;
  try {
    pdfLibDoc = await PDFDocument.load(buf, { ignoreEncryption: true });
    const pageCount = pdfLibDoc.getPageCount();
    console.log(`- pdf-lib load: SUCCESS (Page Count: ${pageCount})`);
    for (let i = 0; i < pageCount; i++) {
      const page = pdfLibDoc.getPage(i);
      const { width, height } = page.getSize();
      console.log(`  Page ${i + 1}: ${width} x ${height} pt`);
    }
  } catch (err: any) {
    console.error(`- ERROR: pdf-lib failed to load PDF: ${err?.message || err}`);
    return false;
  }

  // Check 4: Extract text using PDFParse (pdfjs-dist)
  ensureNodeDomPolyfills();
  try {
    const { PDFParse } = await import('pdf-parse');
    let standardFontDataUrl: string | undefined;
    try {
      const fontPath = path.resolve(process.cwd(), 'node_modules/pdfjs-dist/standard_fonts/');
      if (fs.existsSync(fontPath)) {
        standardFontDataUrl = url.pathToFileURL(fontPath).href + '/';
      }
    } catch {}

    const parser = new PDFParse(
      standardFontDataUrl
        ? { data: new Uint8Array(buf), standardFontDataUrl }
        : new Uint8Array(buf)
    );
    const textResult = await parser.getText();
    console.log(`- PDFParse text extraction: SUCCESS`);
    console.log(`- Total Extracted Pages: ${textResult.pages?.length || textResult.total || 1}`);
    console.log(`- Total Text Length: ${textResult.text?.length || 0} characters`);

    // Anomaly checks on text:
    const text = textResult.text || '';
    const anomalies: string[] = [];
    if (text.includes('undefined')) anomalies.push('Contains literal "undefined"');
    if (text.includes('null')) anomalies.push('Contains literal "null"');
    if (text.includes('[object Object]')) anomalies.push('Contains "[object Object]"');
    if (text.includes('NaN')) anomalies.push('Contains "NaN"');
    if (/\b(?:Furthermore|Moreover),\s*Notably,/i.test(text)) anomalies.push('Awkward double transition: "Furthermore, Notably,"');

    if (anomalies.length > 0) {
      console.warn(`- WARNING: Text anomalies detected:`, anomalies);
    } else {
      console.log(`- Text quality check: Clean (no undefined, null, NaN, or [object Object])`);
    }

    console.log(`\n--- Extracted Text Sample ---`);
    console.log(text.slice(0, 450) + (text.length > 450 ? '...' : ''));
  } catch (err: any) {
    console.error(`- ERROR: PDFParse failed: ${err?.message || err}`);
    return false;
  }

  // Check 5: Embedded Images
  const latin1 = buf.toString('latin1');
  const imageMatches = (latin1.match(/\/Subtype\s*\/Image/g) || []).length;
  console.log(`- Embedded Image XObjects count: ${imageMatches}`);

  return true;
}

async function run() {
  const files = [
    'output_test_humanized.pdf',
    'output_test_exported.pdf',
  ];

  for (const f of files) {
    const fullPath = path.join(process.cwd(), f);
    await inspectPdfFile(fullPath);
  }
}

run().catch(console.error);
