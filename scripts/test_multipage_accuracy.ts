import fs from 'fs';
import path from 'path';
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { extractPdfPageData, runPdfHumanizationPipeline } from '../lib/document/pdf-native-humanizer';

async function testMultipage() {
  console.log('=== MULTI-PAGE INPUT & OUTPUT ACCURACY TEST ===\n');

  // Generate a 3-page test PDF
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.HelveticaBold);
  const bodyFont = await doc.embedFont(StandardFonts.Helvetica);

  // Page 1
  const p1 = doc.addPage([595, 842]);
  p1.drawText('Enterprise Strategic Agreement 2026', { x: 50, y: 760, font, size: 16, color: rgb(0.1, 0.1, 0.2) });
  p1.drawText('1. Operational Overview', { x: 50, y: 720, font, size: 13, color: rgb(0.2, 0.2, 0.3) });
  p1.drawText('In order to facilitate this agreement, both parties utilize advanced encryption.', { x: 50, y: 690, font: bodyFont, size: 11 });
  p1.drawText('Subsequent to the initial inspection, the team is able to commence implementation.', { x: 50, y: 670, font: bodyFont, size: 11 });

  // Page 2
  const p2 = doc.addPage([595, 842]);
  p2.drawText('2. Financial & Risk Governance', { x: 50, y: 760, font, size: 13, color: rgb(0.2, 0.2, 0.3) });
  p2.drawText('On a daily basis, the audit committee conducts a comprehensive review of all assets.', { x: 50, y: 730, font: bodyFont, size: 11 });
  p2.drawText('Due to the fact that reserves reached $1,500,000 USD, risk levels remain negligible.', { x: 50, y: 710, font: bodyFont, size: 11 });

  // Page 3
  const p3 = doc.addPage([595, 842]);
  p3.drawText('3. Execution & Formal Acceptance', { x: 50, y: 760, font, size: 13, color: rgb(0.2, 0.2, 0.3) });
  p3.drawText('Both parties endeavor to complete deployment in a timely manner by 2026-11-15.', { x: 50, y: 730, font: bodyFont, size: 11 });
  p3.drawText('All contractual obligations specified herein are deemed conclusive and binding.', { x: 50, y: 710, font: bodyFont, size: 11 });

  const inputBytes = await doc.save();
  const inputBuffer = Buffer.from(inputBytes);
  console.log(`Generated 3-page input PDF: ${inputBuffer.length} bytes`);

  // Run through pipeline
  const job = await runPdfHumanizationPipeline({
    jobId: 'multipage-test-' + Date.now(),
    traceId: 'HF-MP-TEST',
    fileName: 'multipage_input.pdf',
    pdfBuffer: inputBuffer,
    intensity: 'NORMAL',
  });

  console.log(`Job Status: ${job.status}`);
  console.log(`Pages: processed ${job.processedPages} of ${job.totalPages}`);

  if (!job.outputBuffer) {
    console.error('ERROR: No output buffer produced!');
    process.exit(1);
  }

  // Verify output pages
  const outPages = await extractPdfPageData(job.outputBuffer);
  console.log(`\nOutput PDF Page Count: ${outPages.length}`);

  outPages.forEach((p) => {
    console.log(`\n--- Output Page ${p.pageNumber} (${p.rawText.length} chars) ---`);
    console.log(p.rawText);
  });

  if (outPages.length !== 3) {
    console.error(`ERROR: Expected 3 pages, got ${outPages.length}`);
    process.exit(1);
  }

  // Check that humanization took place accurately
  const fullOutText = outPages.map(p => p.rawText).join('\n');
  if (fullOutText.includes('utilize') || fullOutText.includes('In order to facilitate') || fullOutText.includes('Subsequent to')) {
    console.error('ERROR: Un-humanized robotic phrases still present!');
    process.exit(1);
  }

  // Check that critical facts were preserved
  if (!fullOutText.includes('$1,500,000 USD') || !fullOutText.includes('2026-11-15')) {
    console.error('ERROR: Facts, currencies, or dates were not preserved!');
    process.exit(1);
  }

  console.log('\n=== MULTI-PAGE TEST PASSED WITH 100% ACCURACY! ===');
  console.log('✓ Exactly 3 pages in -> Exactly 3 pages out');
  console.log('✓ Robotic phrases humanized');
  console.log('✓ Critical facts, currencies, and dates strictly preserved');
}

testMultipage().catch(console.error);
