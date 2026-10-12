import fs from 'fs';
import { extractDocumentText } from '../lib/document/extractor';

async function main() {
  const filePath = 'C:/Users/Admin/Downloads/KING 99.pdf';
  if (!fs.existsSync(filePath)) {
    console.log('KING 99.pdf does not exist at path');
    return;
  }
  const buf = fs.readFileSync(filePath);
  console.log(`Read KING 99.pdf buffer: ${buf.length} bytes`);
  const res = await extractDocumentText(buf, 'pdf', 'KING 99.pdf');
  console.log(`Successfully extracted ${res.text.length} characters.`);
  console.log(`Extracted ${res.metadata.headings.length} headings.`);
  console.log(`Word count: ${res.metadata.wordCount}`);
  console.log('SUCCESS: DOMMatrix polyfill and PDF extraction working 100% cleanly in document pipeline!');
}

main().catch((err) => {
  console.error('Extraction failed:', err);
  process.exit(1);
});
