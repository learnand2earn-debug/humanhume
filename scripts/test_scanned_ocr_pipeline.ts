import fs from 'fs';
import { PDFDocument } from 'pdf-lib';
import { runPdfHumanizationPipeline } from '../lib/document/pdf-native-humanizer';
import { compareMediaPreservation } from '../lib/document/native-verify';

async function test() {
  console.log('=== TEST SCANNED / IMAGE-ONLY PDF OCR PIPELINE ===');

  // Load a real image
  const imgPath = 'storage/preview/doc-1793430277709-vo60_img-pdf-dct-doc-1793430277709-vo60-11.jpg';
  if (!fs.existsSync(imgPath)) {
    console.log(`Image not found at ${imgPath}`);
    return;
  }
  const imgBytes = fs.readFileSync(imgPath);

  // Create an image-only PDF with NO text operators (pure scanned document)
  const doc = await PDFDocument.create();
  const jpg = await doc.embedJpg(imgBytes);
  const page = doc.addPage([595, 842]);
  page.drawImage(jpg, {
    x: 50,
    y: 100,
    width: 495,
    height: 642,
  });

  const scannedPdfBuf = Buffer.from(await doc.save());
  console.log(`Created scanned PDF: ${scannedPdfBuf.length} bytes`);

  const jobId = `test-scanned-${Date.now()}`;
  const res = await runPdfHumanizationPipeline({
    jobId,
    traceId: `trace-ocr-${Date.now()}`,
    fileName: 'scanned_doc.pdf',
    pdfBuffer: scannedPdfBuf,
    intensity: 'NORMAL',
  });

  console.log(`Job status: ${res.status}`);
  console.log(`Total pages: ${res.totalPages}`);
  console.log(`Processed pages: ${res.processedPages}`);
  console.log(`Changed units: ${res.humanizedUnits}`);
  console.log(`Preserved images: ${res.preservedImages}`);
  console.log(`Media identical: ${res.mediaIdentical}`);
  console.log(`Preservation notes:`, res.preservationNotes);
  console.log(`Output PDF size: ${res.outputBuffer?.length ?? 0} bytes`);

  if (res.outputBuffer && res.outputBuffer.length > 0) {
    const media = await compareMediaPreservation(scannedPdfBuf, res.outputBuffer, 'PDF');
    console.log(`Media check: identical=${media.identical}`);
  }

  console.log('=== SCANNED PDF TEST FINISHED ===');
}

test().catch(console.error);
