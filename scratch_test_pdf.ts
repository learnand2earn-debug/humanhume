import fs from 'fs';
import path from 'path';
import { extractPdfPageDataSync, extractPdfPageData } from './lib/document/pdf-native-humanizer';
import { extractReadableTextFromBinaryBuffer } from './lib/document/image-utils';

async function main() {
  const filePath = path.join(process.cwd(), 'sample_test_with_image.pdf');
  const buf = fs.readFileSync(filePath);
  console.log('PDF File Size:', buf.length);

  console.log('\n--- 1. Testing extractReadableTextFromBinaryBuffer ---');
  try {
    const text = extractReadableTextFromBinaryBuffer(buf, 'PDF');
    console.log('extractReadableTextFromBinaryBuffer length:', text ? text.length : 0);
    console.log('Content:\n', text);
  } catch (err) {
    console.error('extractReadableTextFromBinaryBuffer error:', err);
  }

  console.log('\n--- 2. Testing extractPdfPageDataSync ---');
  try {
    const pages = extractPdfPageDataSync(buf);
    console.log('Page count:', pages.length);
    pages.forEach((p, i) => {
      console.log(`Page ${i + 1} rawText length: ${p.rawText.length}`);
      console.log(`Page ${i + 1} text: "${p.rawText}"`);
    });
  } catch (err) {
    console.error('extractPdfPageDataSync error:', err);
  }

  console.log('\n--- 3. Testing extractPdfPageData (async) ---');
  try {
    const pages = await extractPdfPageData(buf);
    console.log('Async page count:', pages.length);
    pages.forEach((p, i) => {
      console.log(`Async Page ${i + 1} rawText length: ${p.rawText.length}`);
      console.log(`Async Page ${i + 1} text: "${p.rawText}"`);
    });
  } catch (err) {
    console.error('extractPdfPageData error:', err);
  }
}

main().catch(console.error);
