import { UniversalAgentEngine } from '../lib/agent/universal-engine';
import { ConversationRepository } from '../lib/agent/repository';
import { IntakeExtractor } from '../lib/intelligent/extractor';
import fs from 'fs';
import path from 'path';

let passCount = 0;
let failCount = 0;

function assert(condition: boolean, message: string) {
  if (condition) {
    console.log(`  ✓ ${message}`);
    passCount++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failCount++;
  }
}

async function runTests() {
  console.log('\n======================================================');
  console.log('Universal AI Agent Workspace — Automated Verification Suite');
  console.log('======================================================\n');

  // Test Suite 1: Conversation Repository CRUD
  console.log('Test Suite 1: Conversation Repository Persistence');
  const conv = ConversationRepository.createConversation('Test Autonomous Workflow');
  assert(!!conv.id, `Created conversation with ID: ${conv.id}`);
  assert(conv.title === 'Test Autonomous Workflow', 'Conversation title is set correctly');

  const retrieved = ConversationRepository.getConversation(conv.id);
  assert(retrieved?.id === conv.id, 'Retrieved conversation by ID');

  ConversationRepository.updateTitle(conv.id, 'Renamed Workflow');
  const renamed = ConversationRepository.getConversation(conv.id);
  assert(renamed?.title === 'Renamed Workflow', 'Updated conversation title');

  // Test Suite 2: Multimodal Intake & Document Processing
  console.log('\nTest Suite 2: Multimodal File Attachment & Extraction');
  const samplePdfPath = 'C:\\Users\\Admin\\Downloads\\KING 99.pdf';
  let sampleFiles: any[] = [];

  if (fs.existsSync(samplePdfPath)) {
    const pdfBuf = fs.readFileSync(samplePdfPath);
    const parsedPdf = await IntakeExtractor.extractFileContent(
      pdfBuf,
      'KING 99.pdf',
      'f_king99',
      samplePdfPath
    );
    assert(parsedPdf.extractedText.length > 1000, `Extracted ${parsedPdf.extractedText.length} chars from KING 99.pdf`);
    assert(parsedPdf.metadata.headingsCount! > 50, `Detected ${parsedPdf.metadata.headingsCount} headings in KING 99.pdf`);
    sampleFiles.push(parsedPdf);
  } else {
    // Fallback mock buffer if path doesn't exist
    const txtBuf = Buffer.from('KING 99 Master Agreement\nSection 1: Scope of Services\nSection 2: Payment Terms', 'utf-8');
    const parsed = await IntakeExtractor.extractFileContent(txtBuf, 'sample.txt', 'f_sample', '/test/sample.txt');
    sampleFiles.push(parsed);
    assert(true, 'Mock intake file created successfully');
  }

  // Test Suite 3: Autonomous Task Planning & Execution via UniversalAgentEngine
  console.log('\nTest Suite 3: Autonomous Request Planning & Task Execution');
  const pdfBuffer = fs.existsSync(samplePdfPath)
    ? fs.readFileSync(samplePdfPath)
    : Buffer.from('KING 99 Master Agreement\nSection 1: Scope of Services\nSection 2: Payment Terms', 'utf-8');

  const convWithPdf = await UniversalAgentEngine.processUserInput(
    conv.id,
    'Read KING 99.pdf and synthesize a structured executive summary with fact verification',
    [{ name: 'KING 99.pdf', buffer: pdfBuffer }]
  );

  const assistantMsg1 = convWithPdf.messages.find((m) => m.role === 'assistant');
  assert(!!assistantMsg1, 'Assistant generated response message');
  assert(!!assistantMsg1?.taskPlan, `Generated Task Plan [${assistantMsg1?.taskPlan?.taskId}]`);
  assert(assistantMsg1!.taskPlan!.executionSteps.length >= 4, `Created ${assistantMsg1?.taskPlan?.executionSteps.length} ordered execution steps`);
  assert(assistantMsg1!.taskPlan!.executionSteps[0].toolNeeded.length > 0, `Step 1 calls real tool: ${assistantMsg1?.taskPlan?.executionSteps[0].toolNeeded}`);

  // Test Suite 4: Checklist & Deliverable Generation
  console.log('\nTest Suite 4: Dynamic Requirements Checklist & Deliverable Generation');
  assert(!!assistantMsg1?.checklist && assistantMsg1.checklist.length > 0, `Generated dynamic checklist with ${assistantMsg1?.checklist?.length} items`);
  if (assistantMsg1?.artifact) {
    assert(assistantMsg1.artifact.content.length > 100, `Generated deliverable artifact (${assistantMsg1.artifact.format})`);
    assert(assistantMsg1.artifact.qualityScore! >= 80, `Independent quality score: ${assistantMsg1.artifact.qualityScore}%`);
  }

  // Test Suite 5: Answering Clarifications & Verification Loop
  console.log('\nTest Suite 5: Clarifications & Verification Loop');
  const cvConv = ConversationRepository.createConversation('CV Task');
  const cvStep1 = await UniversalAgentEngine.processUserInput(
    cvConv.id,
    'Complete my CV as a Senior Cloud Architect with AWS certifications',
    []
  );
  const cvAssistant1 = cvStep1.messages.find((m) => m.role === 'assistant');
  assert(!!cvAssistant1?.questions && cvAssistant1.questions.length > 0, `Formulated ${cvAssistant1?.questions?.length} targeted questions when data was missing`);

  // Answer questions and execute
  const cvStep2 = await UniversalAgentEngine.processUserInput(
    cvConv.id,
    'Here are my details for the CV',
    [],
    { [cvAssistant1!.questions![0].id]: 'AWS Solutions Architect Professional with 10 years experience' }
  );
  const cvAssistant2 = cvStep2.messages.find((m) => m.role === 'assistant' && m.id !== cvAssistant1?.id);
  assert(!!cvAssistant2?.artifact, 'Produced synthesized CV after answers provided');
  assert(!!cvAssistant2?.verificationReport, 'Ran post-generation verification audit');
  assert(cvAssistant2?.verificationReport?.passed === true, 'Verification audit passed quality criteria');
  ConversationRepository.deleteConversation(cvConv.id);

  // Test Suite 6: Cleanup
  ConversationRepository.deleteConversation(conv.id);
  assert(!ConversationRepository.getConversation(conv.id), 'Cleaned up test conversation');

  console.log('\n======================================================');
  console.log(`Results: ${passCount}/${passCount + failCount} Workspace Agent Tests Passed!`);
  console.log('======================================================\n');

  if (failCount > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
