import fs from 'fs';
import { PDFDocument, PDFName, PDFDict, PDFArray, PDFNumber, PDFRef, StandardFonts } from 'pdf-lib';
import { preparePdfDocument } from '../lib/document/native-pdf';

async function test() {
  const buf = fs.readFileSync('C:/Users/Admin/Desktop/Hunt.pdf');
  const doc = await PDFDocument.load(buf, { ignoreEncryption: true });
  console.log('Pages count:', doc.getPageCount());

  // Let's inspect the fonts in Hunt.pdf page 1
  const p1 = doc.getPage(0) as unknown as { node: PDFDict };
  const res = p1.node.lookupMaybe(PDFName.of('Resources'), PDFDict);
  const fonts = res?.lookupMaybe(PDFName.of('Font'), PDFDict);
  if (fonts) {
    for (const [k, v] of fonts.entries()) {
      const dict = v instanceof PDFRef ? doc.context.lookup(v) : v;
      if (dict instanceof PDFDict) {
        const subtype = dict.get(PDFName.of('Subtype'));
        const baseFont = dict.get(PDFName.of('BaseFont'));
        const encoding = dict.get(PDFName.of('Encoding'));
        console.log(`Font ${k}: Subtype=${subtype}, BaseFont=${baseFont}, Encoding=${encoding}`);
      }
    }
  }
}

test().catch(console.error);
