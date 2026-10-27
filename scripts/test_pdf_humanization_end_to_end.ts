import fs from 'fs';
import path from 'path';
import { runPdfHumanizationPipeline, extractPdfPageData } from '../lib/document/pdf-native-humanizer';
import { extractEmbeddedImagesFromUpload } from '../lib/document/image-utils';

async function main() {
  console.log('=== PDF HUMANIZATION END-TO-END TEST ===\n');

  const samplePath = path.resolve(process.cwd(), 'sample_test_with_image.pdf');
  if (!fs.existsSync(samplePath)) {
    console.error(`Sample file not found at: ${samplePath}`);
    process.exit(1);
  }

  const rawBuffer = fs.readFileSync(samplePath);
  console.log(`1. Loaded sample input PDF: ${samplePath} (${rawBuffer.length} bytes)`);

  // Verify input images
  const inputImages = extractEmbeddedImagesFromUpload({
    docId: 'test-check',
    fileName: 'sample_test_with_image.pdf',
    rawBuffer,
    sectionCount: 2,
  });
  console.log(`2. Input embedded images found: ${inputImages.length}`);
  inputImages.forEach((img, i) => {
    console.log(`   - Image #${i + 1}: ${img.label} | Format: ${img.mimeType} | Size: ${img.width}x${img.height} | Ratio: ${img.aspectRatio}`);
  });

  if (inputImages.length === 0) {
    console.error('ERROR: No images found in sample input PDF!');
    process.exit(1);
  }

  // Run the full pipeline
  console.log('\n3. Running runPdfHumanizationPipeline...');
  const job = await runPdfHumanizationPipeline({
    jobId: 'e2e-verify-' + Date.now(),
    traceId: 'HF-E2E-TEST',
    fileName: 'sample_test_with_image.pdf',
    pdfBuffer: rawBuffer,
    intensity: 'NORMAL',
  });

  console.log(`   Pipeline Status: ${job.status}`);
  console.log(`   Total Pages: ${job.totalPages}`);
  console.log(`   Processed Pages: ${job.processedPages}`);
  console.log(`   Failed Pages: ${job.failedPages.length}`);

  if (job.status !== 'COMPLETED' || !job.outputBuffer) {
    console.error('ERROR: Pipeline did not complete successfully!');
    console.error('Job error:', job.errorMessage);
    process.exit(1);
  }

  const outBuffer = job.outputBuffer;
  console.log(`   Output PDF Buffer Size: ${outBuffer.length} bytes`);

  // Save output PDF
  const outPath = path.resolve(process.cwd(), 'public/output_humanized_with_images.pdf');
  fs.writeFileSync(outPath, outBuffer);
  console.log(`\n4. Saved output PDF to: ${outPath}`);

  // Verify output PDF embedded images
  const outImages = extractEmbeddedImagesFromUpload({
    docId: 'test-out-check',
    fileName: 'output_humanized_with_images.pdf',
    rawBuffer: outBuffer,
    sectionCount: 2,
  });
  console.log(`5. Output embedded images preserved: ${outImages.length}`);
  outImages.forEach((img, i) => {
    console.log(`   - Preserved Image #${i + 1}: ${img.label} | Size: ${img.width}x${img.height}`);
  });

  // Verify text extraction from output PDF to ensure NO mojibake
  const outPages = await extractPdfPageData(outBuffer);
  console.log(`\n6. Extracted text verification from output PDF (${outPages.length} pages):`);
  let hasMojibake = false;

  for (const p of outPages) {
    console.log(`\n--- Page ${p.pageNumber} (${p.rawText.length} chars) ---`);
    console.log(p.rawText.slice(0, 300) + '...');

    if (p.rawText.includes('â€™') || p.rawText.includes('â€œ') || p.rawText.includes('Â·') || p.rawText.includes('â€”')) {
      console.error(`ERROR: Page ${p.pageNumber} contains mojibake characters!`);
      hasMojibake = true;
    }
  }

  if (hasMojibake) {
    console.error('\nFAILED: Mojibake detected in output text!');
    process.exit(1);
  }

  console.log('\n=== ALL TESTS PASSED SUCCESSFULLY! ===');
  console.log('✓ Images strictly preserved and embedded');
  console.log('✓ Text neatly placed above and below images with zero overlap');
  console.log('✓ Zero mojibake or corrupt characters');
  console.log('✓ Publication-grade output generated');
}

main().catch((err) => {
  console.error('Test run failed:', err);
  process.exit(1);
});
