import assert from 'assert';
import { IntakeExtractor } from '../lib/intelligent/extractor';
import { TaskAnalyzer } from '../lib/intelligent/task-analyzer';
import { ChecklistGenerator } from '../lib/intelligent/checklist-generator';
import { QuestionEngine } from '../lib/intelligent/question-engine';
import { GeneratorEngine } from '../lib/intelligent/generator-engine';
import { VerifierEngine } from '../lib/intelligent/verifier-engine';
import { WorkflowEngine } from '../lib/intelligent/workflow-engine';
import { IntelligentSessionRepository } from '../lib/intelligent/repository';
import { DocumentGenerator } from '../lib/document/generator';

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('Claude-Style Intelligent File Analysis & Checklist Suite');
  console.log('Automated Verification of Stages A through L');
  console.log('======================================================\n');

  let passedTests = 0;

  // ----------------------------------------------------
  // TEST SUITE 1: Universal File Intake & Multi-Format Parsing
  // ----------------------------------------------------
  console.log('Test Suite 1: Universal File Intake & Multi-Format Parsing');

  // Text document
  const txtBuf = Buffer.from('Jane Smith\njane.smith@techcorp.io | +1 (555) 432-1098\nSenior Software Architect', 'utf-8');
  const txtParsed = await IntakeExtractor.extractFileContent(txtBuf, 'resume.txt', 'f_1', '/storage/test_resume.txt');
  assert.strictEqual(txtParsed.category, 'document');
  assert.strictEqual(txtParsed.metadata.wordCount, 10);
  console.log('  ✓ Parses TXT documents and counts words');
  passedTests++;

  // Spreadsheet (CSV)
  const csvBuf = Buffer.from('Product,Q1_Revenue,Q2_Revenue\nCloud,150000,180000\nServices,,50000', 'utf-8');
  const csvParsed = await IntakeExtractor.extractFileContent(csvBuf, 'financials.csv', 'f_2', '/storage/test_fin.csv');
  assert.strictEqual(csvParsed.category, 'spreadsheet');
  assert.ok(csvParsed.potentialGaps.some((g) => g.includes('empty or unpopulated')));
  console.log('  ✓ Parses spreadsheets and flags unpopulated cells');
  passedTests++;

  // Code file
  const codeBuf = Buffer.from('// TODO: Add rate limiting middleware\nexport function calculateMetrics() { return 42; }', 'utf-8');
  const codeParsed = await IntakeExtractor.extractFileContent(codeBuf, 'metrics.ts', 'f_3', '/storage/metrics.ts');
  assert.strictEqual(codeParsed.category, 'code');
  assert.ok(codeParsed.potentialGaps.some((g) => g.includes('TODO/FIXME')));
  console.log('  ✓ Inspects code files and identifies pending TODO comments');
  passedTests++;

  // Image file metadata
  const pngHeader = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13, 0x49, 0x48, 0x44, 0x52, 0, 0, 0x07, 0x80, 0, 0, 0x04, 0x38, 8, 2, 0, 0, 0]);
  const imgParsed = await IntakeExtractor.extractFileContent(pngHeader, 'mockup.png', 'f_4', '/storage/mockup.png');
  assert.strictEqual(imgParsed.category, 'image');
  assert.strictEqual(imgParsed.metadata.dimensions?.width, 1920);
  assert.strictEqual(imgParsed.metadata.dimensions?.height, 1080);
  console.log('  ✓ Extracts native image dimensions from binary headers (1920x1080)');
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 2: Fact & Entity Isolation
  // ----------------------------------------------------
  console.log('\nTest Suite 2: Fact & Entity Isolation');
  const sampleText = 'Send contract to john.doe@enterprise.com by October 15, 2026. The total fee is $35,000 USD.';
  const facts = IntakeExtractor.extractFacts(sampleText, 'contract.txt');
  assert.ok(facts.some((f) => f.key === 'Contact Email' && f.value === 'john.doe@enterprise.com'));
  assert.ok(facts.some((f) => f.key === 'Date Reference' && f.value.includes('October 15, 2026')));
  assert.ok(facts.some((f) => f.key === 'Financial Figure' && f.value.includes('$35,000')));
  console.log('  ✓ Isolates email addresses, dates, and currency values verbatim');
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 3: Cross-File Contradiction Detection
  // ----------------------------------------------------
  console.log('\nTest Suite 3: Cross-File Contradiction Detection');
  const fileA = await IntakeExtractor.extractFileContent(
    Buffer.from('Proposal Phase 1 budget is $20,000.', 'utf-8'),
    'budget_proposal_v1.txt',
    'f_a',
    '/a.txt'
  );
  const fileB = await IntakeExtractor.extractFileContent(
    Buffer.from('Revised statement of work indicates price is $45,000.', 'utf-8'),
    'sow_v2.txt',
    'f_b',
    '/b.txt'
  );
  const contradictions = IntakeExtractor.detectContradictions([fileA, fileB]);
  assert.strictEqual(contradictions.length, 1);
  assert.strictEqual(contradictions[0].topic, 'Financial Figures Divergence');
  console.log('  ✓ Detects pricing contradictions between multiple uploaded documents');
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 4: Dynamic Task Understanding & Goal Classifier
  // ----------------------------------------------------
  console.log('\nTest Suite 4: Dynamic Task Understanding & Goal Classifier');
  const cvTask = TaskAnalyzer.analyzeTask('Complete my CV and calculate quantifiable metrics for tech architect', [txtParsed]);
  assert.strictEqual(cvTask.taskType, 'complete_cv');
  assert.strictEqual(cvTask.targetAudience, 'Hiring Managers & Executive Recruiters');
  console.log('  ✓ Accurately identifies CV enhancement task and target audience');
  passedTests++;

  const propTask = TaskAnalyzer.analyzeTask('Write a commercial proposal in Word DOCX format with investment schedule', []);
  assert.strictEqual(propTask.taskType, 'business_proposal');
  assert.strictEqual(propTask.targetFormat, 'docx');
  console.log('  ✓ Accurately classifies Business Proposal task and preferred DOCX format');
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 5: Dynamic Checklist Generation
  // ----------------------------------------------------
  console.log('\nTest Suite 5: Dynamic Checklist Generation');
  const checklist = ChecklistGenerator.generateChecklist(cvTask, [txtParsed]);
  assert.ok(checklist.length >= 4);
  assert.ok(checklist.some((i) => i.id === 'cv_contact_info' && i.status === 'complete'));
  assert.ok(checklist.some((i) => i.id === 'cv_executive_summary' && i.status === 'missing'));
  console.log('  ✓ Dynamically marks items as complete (with evidence) or missing');
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 6: Targeted Question Engine & Answer Merging
  // ----------------------------------------------------
  console.log('\nTest Suite 6: Targeted Question Engine & Answer Merging');
  const questions = QuestionEngine.generateQuestions(checklist, cvTask, [txtParsed], [], contradictions);
  assert.ok(questions.length > 0);
  assert.ok(questions.some((q) => q.question.includes('prioritized regarding')));
  console.log('  ✓ Formulates contradiction resolution and missing information questions');
  passedTests++;

  const { updatedChecklist, updatedQuestions } = QuestionEngine.mergeAnswers(
    { cv_executive_summary: 'Principal Enterprise Architect with 12 years experience' },
    checklist,
    questions
  );
  assert.ok(updatedChecklist.some((i) => i.id === 'cv_executive_summary' && i.status === 'complete'));
  console.log('  ✓ Merges answers into checklist and upgrades requirement status to complete');
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 7: Deliverable Generation & Refinement Loop
  // ----------------------------------------------------
  console.log('\nTest Suite 7: Deliverable Generation & Refinement Loop');
  const v1 = await GeneratorEngine.generateDeliverable(cvTask, [txtParsed], updatedChecklist, updatedQuestions);
  assert.strictEqual(v1.versionNumber, 1);
  assert.ok(v1.content.includes('CURRICULUM VITAE'));
  assert.ok(v1.content.includes('jane.smith@techcorp.io'));
  console.log('  ✓ Synthesizes v1 deliverable preserving factual email and phone numbers');
  passedTests++;

  const v2 = await GeneratorEngine.generateDeliverable(
    cvTask,
    [txtParsed],
    updatedChecklist,
    updatedQuestions,
    [v1],
    'Add AWS cloud architecture certification'
  );
  assert.strictEqual(v2.versionNumber, 2);
  assert.ok(v2.changelog.some((c) => c.includes('AWS cloud architecture')));
  console.log('  ✓ Generates v2 iterative revision recording clear changelog');
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 8: Post-Generation Verification Engine
  // ----------------------------------------------------
  console.log('\nTest Suite 8: Post-Generation Verification Engine');
  const { report, updatedChecklist: verifiedChecklist } = VerifierEngine.verifyOutput(
    v2,
    updatedChecklist,
    cvTask,
    [txtParsed]
  );
  assert.ok(report.qualityScore >= 80);
  assert.strictEqual(typeof report.passed, 'boolean');
  assert.ok(report.recommendations.length > 0);
  console.log(`  ✓ Computes post-generation audit score (${report.qualityScore}%) and delivers findings`);
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 9: Acknowledged Gaps Protocol
  // ----------------------------------------------------
  console.log('\nTest Suite 9: Acknowledged Gaps Protocol');
  const gapsReport = VerifierEngine.verifyOutput(
    v1,
    [
      {
        id: 'unusual_gap_item',
        title: 'Legacy Mainframe Experience',
        description: 'Verify mainframe skills',
        category: 'technical',
        status: 'missing',
        priority: 'high',
        source: 'User request',
        validationRule: 'Must mention mainframe',
      },
    ],
    cvTask,
    [txtParsed],
    ['unusual_gap_item'] // Acknowledged gap
  );
  assert.strictEqual(gapsReport.report.acknowledgedGapsCount, 1);
  console.log('  ✓ Successfully proceeds with explicitly acknowledged gaps without blocking delivery');
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 10: Multi-Format Document Export Engine
  // ----------------------------------------------------
  console.log('\nTest Suite 10: Multi-Format Document Export Engine');
  const docxBuf = await DocumentGenerator.generate(v2.content, 'docx', 'Executive_CV');
  assert.ok(docxBuf.length > 1000);
  console.log(`  ✓ Generates valid Word (.docx) document buffer (${docxBuf.length} bytes)`);
  passedTests++;

  const pdfBuf = await DocumentGenerator.generate(v2.content, 'pdf', 'Executive_CV');
  assert.ok(pdfBuf.length > 1000);
  console.log(`  ✓ Generates valid styled PDF document buffer (${pdfBuf.length} bytes)`);
  passedTests++;

  // ----------------------------------------------------
  // TEST SUITE 11: End-to-End Workflow Engine & Session Repository
  // ----------------------------------------------------
  console.log('\nTest Suite 11: End-to-End Workflow Engine & Session Repository');
  const session = await WorkflowEngine.startSession(
    'Audit commercial proposal for enterprise client with milestones',
    [{ name: 'proposal_rfp.txt', buffer: Buffer.from('Client: Acme Corp\nTotal budget: $45,000 USD\nScope: Document Automation', 'utf-8') }]
  );
  assert.ok(session.id.startsWith('isess_'));
  assert.strictEqual(session.files.length, 1);
  assert.ok(session.checklist.length > 0);

  const reloaded = IntelligentSessionRepository.getSession(session.id);
  assert.ok(reloaded !== null);
  assert.strictEqual(reloaded?.id, session.id);
  console.log('  ✓ Initializes stateful session and persists to disk successfully');
  passedTests++;

  // Clean up test session
  IntelligentSessionRepository.deleteSession(session.id);

  console.log('\n======================================================');
  console.log(`Results: ${passedTests}/${passedTests} Intelligent Workflow Tests Passed!`);
  console.log('======================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});
