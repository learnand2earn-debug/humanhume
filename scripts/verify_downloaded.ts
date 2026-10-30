import fs from 'fs';
import crypto from 'crypto';
import {PDFDocument, PDFName, PDFRawStream} from 'pdf-lib';

async function digests(file: string) {
  const doc = await PDFDocument.load(fs.readFileSync(file), {ignoreEncryption: true, throwOnInvalidObject: false});
  const imgs: string[] = [];
  for (const [, obj] of doc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
      imgs.push(crypto.createHash('sha256').update(obj.dict.toString()).update(Buffer.from(obj.contents)).digest('hex'));
    }
  }
  const sizes = doc.getPages().map(p => `${Math.round(p.getWidth())}x${Math.round(p.getHeight())}`);
  return {imgs: imgs.sort(), sizes, pages: doc.getPageCount()};
}

async function main() {
  const a = await digests('C:/Users/Admin/Desktop/Hunt.pdf');
  const b = await digests(process.argv[2] || 'dl_native.pdf');
  console.log('pages:', a.pages, '->', b.pages, '| images:', a.imgs.length, '->', b.imgs.length);
  console.log('images byte-identical:', a.imgs.length === b.imgs.length && a.imgs.every((d, i) => d === b.imgs[i]));
  console.log('page geometry identical:', JSON.stringify(a.sizes) === JSON.stringify(b.sizes));
}
main().catch(e => {console.error(e); process.exit(1);});
