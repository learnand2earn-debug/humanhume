import assert from 'assert';
import { validateFileType, isSupportedFile, extractDocumentText } from '../lib/document/extractor';
import { ContentProtector } from '../lib/document/protector';
import { PreservationAgent } from '../lib/document/preservation';
import { ReadabilityCalculator } from '../lib/document/readability';
import { DocumentChunker } from '../lib/document/chunker';
import { HumanizerResponseParser } from '../lib/humanizer/parser';
import { MockHumanizer } from '../lib/humanizer/mock';
import { MockChecker } from '../lib/checker/mock';
import { AutoFixAgent } from '../lib/queue/autofix';
import { ErrorRecoveryAgent } from '../lib/queue/recovery';
import { DiffEngine } from '../lib/document/diff';
import { storageManager } from '../lib/storage';
import { repository } from '../lib/db/repository';
import { DocumentGenerator } from '../lib/document/generator';
import { DiscordNotifier } from '../lib/notifications/discord';

let totalTests = 0;
let passedTests = 0;

function runTest(name: string, fn: () => void | Promise<void>) {
  totalTests++;
  try {
    const result = fn();
    if (result && typeof (result as any).then === 'function') {
      return (result as Promise<void>)
        .then(() => {
          passedTests++;
          console.log(`  ✓ ${name}`);
        })
        .catch((err) => {
          console.error(`  ✗ ${name}`);
          console.error(`    Error:`, err.message || err);
        });
    } else {
      passedTests++;
      console.log(`  ✓ ${name}`);
    }
  } catch (err: any) {
    console.error(`  ✗ ${name}`);
    console.error(`    Error:`, err.message || err);
  }
}

async function main() {
  console.log('\n======================================================');
  console.log('HumanFlow AI — Comprehensive Automated Test Suite');
  console.log('======================================================\n');

  // 1. File Type Validation
  console.log('Test Suite 1: File Type Validation & Rejection');
  runTest('Supports valid formats (.docx, .pdf, .txt, .md, .rtf, .xlsx)', () => {
    assert.strictEqual(isSupportedFile('report.docx'), true);
    assert.strictEqual(isSupportedFile('paper.pdf'), true);
    assert.strictEqual(isSupportedFile('notes.txt'), true);
    assert.strictEqual(isSupportedFile('readme.md'), true);
    assert.strictEqual(isSupportedFile('document.rtf'), true);
    assert.strictEqual(isSupportedFile('data.xlsx'), true);
    assert.strictEqual(validateFileType('file.docx'), 'docx');
  });

  runTest('Rejects unsupported formats with descriptive error', () => {
    assert.strictEqual(isSupportedFile('malware.exe'), false);
    assert.strictEqual(isSupportedFile('photo.png'), false);
    assert.throws(() => validateFileType('script.py'), /Unsupported file type/);
  });

  // 2. Text Extraction
  console.log('\nTest Suite 2: Text Extraction & Structure Detection');
  await runTest('Extracts TXT & Markdown content with word counts', async () => {
    const sample = '# Title\n\nThis is a sample paragraph with 9 words.';
    const res = await extractDocumentText(Buffer.from(sample), 'md', 'test.md');
    assert.strictEqual(res.metadata.headings.length, 1);
    assert.strictEqual(res.metadata.headings[0], 'Title');
    assert.strictEqual(res.metadata.paragraphCount, 2);
  });

  // 3. Content Protection Agent
  console.log('\nTest Suite 3: Content Protection Agent');
  runTest('Protects citations, numbers, dates, URLs, code, and headings', () => {
    const text =
      '# Introduction\n\n' +
      'In a study by (Johnson et al., 2023), exactly 48.7% of respondents reported $12,500 in savings ' +
      'as of 2024-05-18. Further details at https://example.com or email info@test.org. ' +
      'Formula: $E = mc^2$. Code: `const x = 10;`.';

    const { protectedText, map } = ContentProtector.protect(text, 'test_doc');
    assert.ok(protectedText.includes('{{HF_PROT_'));
    assert.ok(!protectedText.includes('https://example.com'));
    assert.ok(map.items.length >= 5);

    // Verify token restoration restores exact original text
    const restored = ContentProtector.restore(protectedText, map.tokenMap);
    assert.strictEqual(restored, text);
  });

  // 4. Preservation Agent
  console.log('\nTest Suite 4: Preservation Agent & Auto-Restoration');
  runTest('Detects and flags altered numbers or omitted citations', () => {
    const orig = 'The revenue was $50,000 according to [1].';
    const altered = 'The revenue was high according to recent studies.';
    const { result } = PreservationAgent.verifyAndRestore(orig, altered);
    assert.strictEqual(result.passed, false);
    assert.ok(result.issuesDetected.length > 0);
  });

  runTest('Preserves verified text when numbers and citations match', () => {
    const orig = 'Total count is 42 items as noted in [1].';
    const humanized = 'We recorded a total of 42 items as noted in [1].';
    const { result } = PreservationAgent.verifyAndRestore(orig, humanized);
    assert.strictEqual(result.passed, true);
    assert.strictEqual(result.preservationScore, 100);
  });

  // 5. Readability Calculator
  console.log('\nTest Suite 5: Readability Calculator');
  runTest('Computes Flesch Reading Ease and Grade Level', () => {
    const text =
      'The cat sat on the mat. It was a sunny morning and the birds were singing in the trees.';
    const metrics = ReadabilityCalculator.compute(text);
    assert.ok(metrics.fleschReadingEase > 60);
    assert.ok(metrics.fleschKincaidGradeLevel <= 8);
    assert.ok(metrics.lexicalDiversity > 0);
  });

  // 6. Chunker Processing
  console.log('\nTest Suite 6: Chunk Processing & Reconstruction');
  runTest('Splits and seamlessly reassembles multi-paragraph text', () => {
    const text = 'Paragraph 1.\n\nParagraph 2.\n\nParagraph 3.';
    const chunks = DocumentChunker.splitIntoChunks(text, 3);
    assert.ok(chunks.length >= 2);
    const reassembled = DocumentChunker.reassemble(chunks);
    assert.strictEqual(reassembled, text);
  });

  // 7. Humanizer Response Parser
  console.log('\nTest Suite 7: Humanizer API Response Parser');
  runTest('Parses OpenAI style responses', () => {
    const mockRes = {
      choices: [{ message: { content: 'Humanized text sample.' } }],
    };
    const extracted = HumanizerResponseParser.extractByPath(
      mockRes,
      'choices[0].message.content'
    );
    assert.strictEqual(extracted, 'Humanized text sample.');
  });

  runTest('Auto-discovers text in arbitrary API JSON shapes', () => {
    const customRes = {
      data: {
        humanized_text: 'This is custom provider output format.',
      },
    };
    const autoExtracted = HumanizerResponseParser.autoParse(customRes);
    assert.strictEqual(autoExtracted, 'This is custom provider output format.');
  });

  // 8. Mock Humanizer & Checker
  console.log('\nTest Suite 8: Humanizer & Checker Engines');
  await runTest('MockHumanizer generates humanized text preserving tokens', async () => {
    const req = {
      text: 'Furthermore, it is crucial to note {{HF_PROT_NUM_0001}}.',
      documentId: 'doc_test',
    };
    const res = await MockHumanizer.humanize(req);
    assert.ok(res.humanizedText.includes('{{HF_PROT_NUM_0001}}'));
    assert.ok(!res.humanizedText.includes('it is crucial to note that'));
  });

  runTest('MockChecker scores humanized text and detects flagged markers', () => {
    const res = MockChecker.evaluate({
      text: 'Furthermore, we must delve into the tapestry of solutions.',
      documentId: 'doc_test',
      versionId: 'v1',
    });
    assert.ok(res.detectedIssues.length > 0);
    assert.ok(res.score > 5);
  });

  // 9. AutoFix Agent
  console.log('\nTest Suite 9: Auto-Fix Agent');
  runTest('Softens algorithmic sentences and restores missing entities', () => {
    const orig = '# Overview\n\nStudy conducted in 2024.';
    const current = 'Furthermore, study was done.';
    const fixReport = AutoFixAgent.fix(orig, current, undefined, ['Furthermore, study was done.']);
    assert.ok(fixReport.fixedText.includes('also') || fixReport.fixedText.includes('addition'));
  });

  // 10. Diff Engine
  console.log('\nTest Suite 10: Side-by-Side Diff Engine');
  runTest('Identifies additions, deletions, and protected entity counts', () => {
    const orig = 'The quick brown fox jumps over {{HF_PROT_REF_01}}.';
    const hum = 'A fast brown fox easily leaps across {{HF_PROT_REF_01}}.';
    const diff = DiffEngine.compare(orig, hum);
    assert.ok(diff.addedCount > 0);
    assert.ok(diff.removedCount > 0);
    assert.strictEqual(diff.protectedCount, 1);
  });

  // 11. Storage & File Versioning
  console.log('\nTest Suite 11: Storage & Version Isolation');
  await runTest('Stores original file and keeps original untouched', async () => {
    const dummy = Buffer.from('Original file untouched content');
    const { originalPath, workingPath } = await storageManager.saveOriginalFile(
      dummy,
      'test_paper.txt',
      'unit_test_id'
    );
    assert.ok(storageManager.fileExists(originalPath));
    assert.ok(storageManager.fileExists(workingPath));
    const read = await storageManager.readFile(originalPath);
    assert.strictEqual(read.toString(), 'Original file untouched content');
  });

  // 12. Document Generator
  console.log('\nTest Suite 12: Document Format Preservation Generator');
  await runTest('Generates valid DOCX, PDF, and RTF documents', async () => {
    const docxBuf = await DocumentGenerator.generate('# Header\n\nParagraph text.', 'docx', 'test');
    assert.ok(docxBuf.length > 500);

    const pdfBuf = await DocumentGenerator.generate('# Header\n\nParagraph text.', 'pdf', 'test');
    assert.ok(pdfBuf.length > 500);

    const rtfBuf = await DocumentGenerator.generate('Sample text', 'rtf', 'test');
    assert.ok(rtfBuf.toString().includes('{\\rtf1'));
  });

  // 13. Error Recovery
  console.log('\nTest Suite 13: Error Recovery Agent');
  runTest('Identifies retryable timeout and rate limit errors', () => {
    assert.strictEqual(ErrorRecoveryAgent.isRetryable(new Error('Rate limit exceeded 429')), true);
    assert.strictEqual(ErrorRecoveryAgent.isRetryable(new Error('Request timed out')), true);
    assert.strictEqual(ErrorRecoveryAgent.isRetryable(new Error('Invalid password')), false);
  });

  // 14. Repository & Settings
  console.log('\nTest Suite 14: Repository Layer & Key Masking');
  runTest('Masks secret API keys and persists settings safely', () => {
    repository.updateSettings({
      humanizer: {
        apiUrl: 'https://api.openai.com/v1/chat/completions',
        apiKey: 'sk-1234567890abcdef99',
        model: 'gpt-4o-mini',
        responsePath: 'choices[0].message.content',
      },
    });
    const masked = repository.getMaskedSettings();
    assert.ok(masked.humanizer.apiKey?.includes('****'));
    assert.strictEqual(masked.humanizer.apiKey?.startsWith('sk-'), true);
  });

  console.log('\n======================================================');
  console.log(`Results: ${passedTests}/${totalTests} Tests Passed Successfully!`);
  console.log('======================================================\n');
}

main().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
