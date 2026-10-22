import assert from 'assert';
import {validateUploadedFile, maskSecretKey, generateTraceId} from '../lib/security';
import {
  analyzeAndCreateProtectedMap,
  extractTextFromUploadedBuffer,
  verifyAndEnforcePreservation,
  splitDocumentIntoLogicalChunks,
} from '../lib/document/analyzer';
import {parseHumanizerApiResponse} from '../lib/humanizer/parser';
import {runNaturalHumanizationTransform} from '../lib/humanizer/provider';
import {evaluateTextNaturalnessHeuristic} from '../lib/checker/provider';
import {
  INITIAL_DOCUMENT_TYPES,
  validateDraftingInputs,
  generateStructuredDocumentDraft,
  runLegalQualityCheck,
} from '../lib/document/legal-engine';

/**
 * Automated Verification Suite for HumanFlow AI (Section 41)
 * Tests:
 * 1. File upload validation & invalid file rejection
 * 2. Text extraction
 * 3. Protected-content detection (numbers, currencies, dates, citations, URLs)
 * 4. Humanizer API response parser & natural transform
 * 5. Checker adapter heuristics
 * 6. Preservation validation & automatic section restoration when numbers/citations change
 * 7. Key masking & Trace ID generation
 * 8. Documentation Studio Missing Information Engine & Jurisdiction enforcement
 * 9. Legal Knowledge Base drafting & Legal Quality Checker
 */
export function runAllAutomatedTests() {
  // 1. Valid & Invalid File Validation
  const validDocx = validateUploadedFile('Contract-2026.docx', 24000, 50);
  assert.strictEqual(validDocx.valid, true);
  assert.strictEqual(validDocx.fileType, 'DOCX');

  const invalidExe = validateUploadedFile('Malicious.exe', 1024, 50);
  assert.strictEqual(invalidExe.valid, false);
  assert.ok(invalidExe.error?.includes('Unsupported file format'));

  // 2. Key Masking & Trace IDs
  const masked = maskSecretKey('sk-live-9876543210abcdef92');
  assert.strictEqual(masked, 'sk-***************92');
  const trace = generateTraceId();
  assert.ok(trace.startsWith('HF-'));

  // 3. Extraction & Protected-Content Detection
  const sampleText = `In order to facilitate the implementation of ISO/IEC 27001:2022, Acme Corp. invested $142,500 USD on 2026-10-16 [Ref: AC-99] (see https://acme.example.com).`;
  const extracted = extractTextFromUploadedBuffer(sampleText, 'TXT', 'Sample.txt');
  assert.ok(extracted.wordCount > 10);

  const protMap = analyzeAndCreateProtectedMap('doc-test-1', extracted.extractedText);
  assert.ok(protMap.entities.some((e) => e.originalValue.includes('$142,500')));
  assert.ok(protMap.entities.some((e) => e.originalValue === '2026-10-16'));
  assert.ok(protMap.entities.some((e) => e.originalValue === '[Ref: AC-99]'));

  // 4. Configurable Humanizer Parser
  const customParsed = parseHumanizerApiResponse(
    {result: {nested: {humanized: 'Clean natural sentence.'}}},
    'result.nested.humanized'
  );
  assert.strictEqual(customParsed, 'Clean natural sentence.');

  // 5. Natural Humanizer + Preservation Restoration Guardrail
  const chunks = splitDocumentIntoLogicalChunks(sampleText, protMap, 'NORMAL');
  const humanized = runNaturalHumanizationTransform(chunks[0].originalText, 'NORMAL', false);
  assert.ok(!humanized.includes('In order to facilitate the implementation of'));
  assert.ok(humanized.includes('$142,500'));

  // Simulate a corrupted humanizer response that altered "$142,500" -> "$999,999"
  const corruptedChunk = {
    ...chunks[0],
    humanizedText: humanized.replace('$142,500', '$999,999'),
  };
  const verified = verifyAndEnforcePreservation([corruptedChunk], protMap);
  assert.strictEqual(verified.comparison.restoredSectionsCount, 1);
  assert.ok(verified.reconstructedText.includes('$142,500'));

  // 6. Checker Heuristics
  const checkRes = evaluateTextNaturalnessHeuristic(humanized, 1);
  assert.ok(checkRes.score <= 15);
  assert.strictEqual(checkRes.status, 'PASS');

  // 7. Documentation Studio Jurisdiction & Missing Information Engine
  const webDevType = INITIAL_DOCUMENT_TYPES[0];
  const missingJur = validateDraftingInputs(webDevType, '', {});
  assert.strictEqual(missingJur.valid, false);
  assert.strictEqual(missingJur.jurisdictionMissing, true);

  // 8. Legal Drafting & Quality Check
  const draftOut = generateStructuredDocumentDraft({
    docType: webDevType,
    jurisdiction: 'United States',
    variables: {
      CLIENT_NAME: 'Horizon LLC',
      DEVELOPER_NAME: 'Vertex Inc.',
      EFFECTIVE_DATE: '2026-10-16',
      PROJECT_DESCRIPTION: 'Next.js SaaS Portal',
      TOTAL_PRICE: '$25,000 USD',
      PAYMENT_SCHEDULE: '50/50',
      DELIVERY_DATE: '2026-12-01',
      REVISIONS_COUNT: '3',
      IP_OWNERSHIP: 'Client upon final payment',
      NOTICE_PERIOD: '14 days',
    },
    approvedKnowledge: [],
    disclaimerText: 'AI-generated draft — professional legal review recommended.',
    disclaimerEnabled: true,
  });

  assert.ok(draftOut.draftText.includes('Horizon LLC'));
  const legalQc = runLegalQualityCheck(draftOut.draftText, webDevType, 'United States');
  assert.ok(['PASS', 'WARNING', 'NEEDS REVIEW'].includes(legalQc.status));

  return {passed: true, testsExecuted: 9};
}
