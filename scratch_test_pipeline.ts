import fs from 'fs';
import path from 'path';
import { runPdfHumanizationPipeline } from './lib/document/pdf-native-humanizer';
import { executeAutonomousDocumentPipeline } from './lib/queue/pipeline';
import { generateRealPdfBinary } from './lib/document/pdf-exporter';

async function testPdfHumanizePipeline() {
  console.log('=== Testing runPdfHumanizationPipeline ===');
  const buf = fs.readFileSync('sample_test_with_image.pdf');
  const res = await runPdfHumanizationPipeline({
    jobId: 'test-job-1',
    traceId: 'test-trace-1',
    fileName: 'sample_test_with_image.pdf',
    pdfBuffer: buf,
    intensity: 'NORMAL',
  });

  console.log('Job status:', res.status);
  console.log('Total pages:', res.totalPages);
  console.log('Page results:', res.pageResults);

  if (res.outputBuffer) {
    fs.writeFileSync('output_test_humanized.pdf', res.outputBuffer);
    console.log('Saved output_test_humanized.pdf, size:', res.outputBuffer.length);
  }
}

async function testUploadPipeline() {
  console.log('\n=== Testing executeAutonomousDocumentPipeline ===');
  const buf = fs.readFileSync('sample_test_with_image.pdf');
  const doc = await executeAutonomousDocumentPipeline({
    fileName: 'sample_test_with_image.pdf',
    fileType: 'PDF',
    fileSize: buf.length,
    rawContent: buf.toString('latin1'),
    rawBuffer: buf,
  });

  console.log('Doc title:', doc.originalName);
  console.log('Original word count:', doc.wordCount);
  console.log('Final content length:', doc.finalContent?.length);
  console.log('Embedded images count:', doc.embeddedImages?.length);
  console.log('Document chunks:', doc.chunks.map(c => ({
    id: c.id,
    original: c.originalText.slice(0, 80),
    humanized: c.humanizedText.slice(0, 80)
  })));

  // Generate PDF from the document
  const pdfOut = generateRealPdfBinary({
    docRecord: doc,
    bodyText: doc.finalContent,
    versionPrefix: 'Humanized',
    includeImages: true,
  });
  fs.writeFileSync('output_test_exported.pdf', Buffer.from(pdfOut));
  console.log('Saved output_test_exported.pdf, size:', pdfOut.byteLength);
}

async function run() {
  await testPdfHumanizePipeline();
  await testUploadPipeline();
}

run().catch(console.error);
