import fs from 'fs';
import path from 'path';
import { extractPdfPageData, runPdfHumanizationPipeline } from '../lib/document/pdf-native-humanizer';
import { extractEmbeddedImagesFromUpload } from '../lib/document/image-utils';

async function main() {
  console.log('=== INPUT & OUTPUT DETAILED ACCURACY ANALYSIS ===\n');

  const samplePath = path.resolve(process.cwd(), 'sample_test_with_image.pdf');
  const rawBuffer = fs.readFileSync(samplePath);
  console.log(`[1] Input File: ${samplePath} (${rawBuffer.length} bytes)`);

  // 1. Extract input pages
  const inPages = await extractPdfPageData(rawBuffer);
  console.log(`\n[2] Input Pages Extracted: ${inPages.length}`);
  inPages.forEach((p, i) => {
    console.log(`\n--- Input Page ${i + 1} (${p.rawText.length} chars) ---`);
    console.log(p.rawText);
  });

  // 2. Extract input images
  const inImages = extractEmbeddedImagesFromUpload({
    docId: 'in-test',
    fileName: 'sample_test_with_image.pdf',
    rawBuffer,
    sectionCount: inPages.length,
  });
  console.log(`\n[3] Input Images Extracted: ${inImages.length}`);
  inImages.forEach((img, i) => {
    console.log(`   Image #${i + 1}: label="${img.label}", caption="${img.caption}"`);
  });

  // 3. Run pipeline
  console.log('\n[4] Running Humanization Pipeline...');
  const job = await runPdfHumanizationPipeline({
    jobId: 'accuracy-job-' + Date.now(),
    traceId: 'HF-ACCURACY-TEST',
    fileName: 'sample_test_with_image.pdf',
    pdfBuffer: rawBuffer,
    intensity: 'NORMAL',
  });

  console.log(`   Status: ${job.status}`);
  console.log(`   Processed Pages: ${job.processedPages}/${job.totalPages}`);

  if (job.outputBuffer) {
    const outBuffer = job.outputBuffer;
    console.log(`\n[5] Output PDF Size: ${outBuffer.length} bytes`);

    // Verify output pages
    const outPages = await extractPdfPageData(outBuffer);
    console.log(`   Output Pages Extracted: ${outPages.length}`);
    outPages.forEach((p, i) => {
      console.log(`\n--- Output Page ${i + 1} (${p.rawText.length} chars) ---`);
      console.log(p.rawText);
    });

    // Verify output images
    const outImages = extractEmbeddedImagesFromUpload({
      docId: 'out-test',
      fileName: 'out.pdf',
      rawBuffer: outBuffer,
      sectionCount: outPages.length,
    });
    console.log(`\n[6] Output Images Extracted: ${outImages.length}`);
    outImages.forEach((img, i) => {
      console.log(`   Output Image #${i + 1}: ${img.width}x${img.height}`);
    });
  } else {
    console.error('ERROR: No outputBuffer generated!', job.errorMessage);
  }
}

main().catch(console.error);
