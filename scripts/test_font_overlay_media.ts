import fs from 'fs';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { compareMediaPreservation } from '../lib/document/native-verify';

async function test() {
  const buf = fs.readFileSync('sample_test_with_image.pdf');
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  
  // Embed standard font
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const page = doc.getPage(0);
  
  // Draw sample text
  page.drawText('Test In-Place Text Replacement', {
    x: 100,
    y: 500,
    size: 14,
    font,
    color: rgb(0, 0, 0),
  });

  const saved = await doc.save();
  const savedBuf = Buffer.from(saved);
  
  const cmp = await compareMediaPreservation(buf, savedBuf, 'PDF');
  console.log('Media preservation result:');
  console.log('- checked:', cmp.checked);
  console.log('- identical:', cmp.identical);
  console.log('- inputImages:', cmp.inputImages);
  console.log('- outputImages:', cmp.outputImages);
  console.log('- notes:', cmp.notes);
}

test().catch(console.error);
