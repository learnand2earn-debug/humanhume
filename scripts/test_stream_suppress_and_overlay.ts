import fs from 'fs';
import { PDFDocument, StandardFonts, rgb, PDFName, PDFRawStream } from 'pdf-lib';
import { compareMediaPreservation } from '../lib/document/native-verify';
import { extractPdfPageData } from '../lib/document/pdf-native-humanizer';

async function test() {
  const buf = fs.readFileSync('sample_test_with_image.pdf');
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  
  const page = doc.getPage(0);
  const font = await doc.embedFont(StandardFonts.Helvetica);

  // Draw replacement text right where a block was
  page.drawText('REPLACED: In-place text replacement test without moving images.', {
    x: 50,
    y: 700,
    size: 11,
    font,
    color: rgb(0, 0, 0),
  });

  const outBytes = await doc.save();
  const outBuf = Buffer.from(outBytes);

  // Check 1: Media preservation
  const media = await compareMediaPreservation(buf, outBuf, 'PDF');
  console.log('Media preservation identical:', media.identical);
  console.log('Media notes:', media.notes);

  // Check 2: Text extraction
  const pages = await extractPdfPageData(outBuf);
  console.log('Extracted pages count:', pages.length);
  console.log('Page 1 extracted text contains replacement:', pages[0].rawText.includes('REPLACED: In-place text replacement'));
}

test().catch(console.error);
