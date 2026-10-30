import fs from 'fs';
import {PDFDocument, PDFName, PDFRawStream} from 'pdf-lib';
import {runPdfHumanizationPipeline} from '../lib/document/pdf-native-humanizer';

const SOURCE = process.argv[2] || 'C:/Users/Admin/Desktop/Hunt.pdf';

async function main() {
  const originalBuffer = fs.readFileSync(SOURCE);
  const t0 = Date.now();
  const job = await runPdfHumanizationPipeline({
    jobId: `e2e-${Date.now()}`,
    traceId: 'e2e-trace',
    fileName: SOURCE.split('/').pop() || 'test.pdf',
    pdfBuffer: originalBuffer,
    intensity: 'NORMAL',
  });
  console.log('pipeline ms:', Date.now() - t0);
  console.log('status:', job.status, '| pages:', job.totalPages, '| processed:', job.processedPages, '| failed:', job.failedPages.length, '| error:', job.errorMessage || 'none');
  if (!job.outputBuffer) throw new Error('no output buffer');
  fs.writeFileSync('scripts/e2e_output.pdf', job.outputBuffer);
  console.log('output size:', job.outputBuffer.length);

  const srcDoc = await PDFDocument.load(originalBuffer, {ignoreEncryption: true});
  const srcImgs = new Set<string>();
  for (const [, obj] of srcDoc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
      srcImgs.add(Buffer.from(obj.contents).toString('base64'));
    }
  }
  const outDoc = await PDFDocument.load(job.outputBuffer);
  const outImgs = new Set<string>();
  for (const [, obj] of outDoc.context.enumerateIndirectObjects()) {
    if (obj instanceof PDFRawStream && obj.dict.get(PDFName.of('Subtype')) === PDFName.of('Image')) {
      outImgs.add(Buffer.from(obj.contents).toString('base64'));
    }
  }
  let identical = 0;
  for (const b of outImgs) if (srcImgs.has(b)) identical++;
  console.log(`images: source=${srcImgs.size} output=${outImgs.size} byte-identical=${identical}`);
  console.log('output pages:', outDoc.getPageCount());
  const p1 = job.pageResults[0];
  console.log('sample humanized text page1 (first 200):', (p1?.humanizedText || '').slice(0, 200));
  if (identical !== outImgs.size || outImgs.size === 0) throw new Error('IMAGE PRESERVATION FAILED');
  console.log('E2E SUCCESS');
  process.exit(0);
}

main().catch((e) => { console.error('E2E FAILED:', e); process.exit(1); });
