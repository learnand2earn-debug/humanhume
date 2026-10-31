import fs from 'fs';
import { PDFDocument, StandardFonts, rgb, PDFDict, PDFName } from 'pdf-lib';
import { preparePdfDocument } from '../lib/document/native-pdf';
import { runNaturalHumanizationTransform } from '../lib/humanizer/provider';
import { compareMediaPreservation } from '../lib/document/native-verify';

async function test() {
  const filePath = 'C:/Users/Admin/Desktop/Hunt.pdf';
  const buf = fs.readFileSync(filePath);
  console.log(`Original PDF: ${buf.length} bytes`);

  const doc = await preparePdfDocument(buf);
  console.log(`Total extracted units: ${doc.units.length}, images: ${doc.imageCount}, pages: ${doc.pageCount}`);

  // Humanize each unit using our natural transform
  const replacements = doc.units.map((u) => {
    // If it's running header or page number, preserve it
    if (/^HumanFlow AI|Trace:|Page \d+|Verified & Humanized|Figure \d+/i.test(u.text.trim())) {
      return u.text;
    }
    return runNaturalHumanizationTransform(u.text, 'NORMAL', false, []);
  });

  const res = await doc.apply(replacements);
  console.log(`Rewritten units: ${res.changedUnits} / ${doc.units.length}`);
  console.log(`Warnings count: ${res.warnings.length}`);
  if (res.warnings.length > 0) {
    console.log('Sample warnings:', res.warnings.slice(0, 5));
  }

  const media = await compareMediaPreservation(buf, res.buffer, 'PDF');
  console.log(`Media identical: ${media.identical}`);
  console.log(`Media notes:`, media.notes);
}

test().catch(console.error);
