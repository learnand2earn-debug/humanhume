import { legalRepository } from '../lib/legal/repository';
import { DocumentationDraftingAgent } from '../lib/legal/drafting-agent';
import { LegalContentProtector } from '../lib/legal/content-protector';
import { LegalPreservationAgent } from '../lib/legal/preservation-agent';
import { LegalQualityChecker } from '../lib/legal/quality-checker';
import { DocumentationPipelineOrchestrator } from '../lib/legal/pipeline';
import { KnowledgeIngestionEngine } from '../lib/legal/ingestion';
import { DocumentGenerator } from '../lib/document/generator';
import { ChatbotAssistant } from '../lib/chatbot/assistant';
import { INITIAL_DOCUMENT_TYPES } from '../lib/legal/seed-data';

let passed = 0;
let total = 0;

function assert(condition: boolean, testName: string) {
  total++;
  if (condition) {
    console.log(`  ✓ ${testName}`);
    passed++;
  } else {
    console.error(`  ✗ FAILED: ${testName}`);
    process.exitCode = 1;
  }
}

async function runLegalSuite() {
  console.log('\n======================================================');
  console.log('Documentation Studio & Legal Knowledge Base Test Suite');
  console.log('======================================================\n');

  // Test Suite 1: Document Types Catalog
  console.log('Test Suite 1: Document Types & Admin Customization');
  {
    const types = legalRepository.listDocumentTypes();
    assert(types.length >= 27, `Catalog contains all 27 initial document types (found: ${types.length})`);

    const websiteDev = legalRepository.getDocumentType('website-development-agreement');
    assert(!!websiteDev, 'Contains Website Development Agreement');
    assert(websiteDev?.is_legal === true, 'Website Development Agreement marked as legal');

    // Admin creates new document type
    const customType = legalRepository.saveDocumentType({
      id: 'custom-ai-service-agreement',
      name: 'Custom AI Service Agreement',
      category: 'legal',
      is_legal: true,
      description: 'Test custom agreement created by Admin',
      default_instructions: ['Include AI uptime SLA', 'Include data confidentiality'],
      required_sections: ['1. Scope', '2. SLA', '3. Confidentiality'],
      fields: [{ name: 'SERVICE_FEE', label: 'Service Fee', type: 'text', required: true }],
    });
    const retrieved = legalRepository.getDocumentType('custom-ai-service-agreement');
    assert(!!retrieved && retrieved.name === 'Custom AI Service Agreement', 'Admin can register new document types');
  }

  // Test Suite 2: Jurisdiction Enforcement
  console.log('\nTest Suite 2: Jurisdiction Enforcement');
  {
    const docType = legalRepository.getDocumentType('website-development-agreement')!;
    const checkMissing = DocumentationDraftingAgent.validateJurisdiction(docType, '');
    assert(!checkMissing.valid, 'Rejects legal document creation when jurisdiction is missing');
    assert(checkMissing.error?.includes('Jurisdiction required') ?? false, 'Returns "Jurisdiction required" notice');

    const checkValid = DocumentationDraftingAgent.validateJurisdiction(docType, 'Pakistan');
    assert(checkValid.valid, 'Accepts valid designated jurisdiction (Pakistan)');

    const nonLegalType = legalRepository.getDocumentType('website-documentation')!;
    const checkNonLegal = DocumentationDraftingAgent.validateJurisdiction(nonLegalType, '');
    assert(checkNonLegal.valid, 'Allows optional jurisdiction for non-legal documentation');
  }

  // Test Suite 3: Missing Information Engine
  console.log('\nTest Suite 3: Missing Information Engine');
  {
    const websiteDev = legalRepository.getDocumentType('website-development-agreement')!;
    const missingResult = DocumentationDraftingAgent.checkMissingInformation(websiteDev, {
      COMPANY_NAME: 'Acme',
      // Missing CLIENT_NAME, TOTAL_PRICE, etc.
    });
    assert(missingResult.hasMissing, 'Detects missing required variables before drafting');
    assert(missingResult.missingCount > 0, `Identifies ${missingResult.missingCount} missing required fields`);

    const completeResult = DocumentationDraftingAgent.checkMissingInformation(websiteDev, {
      CLIENT_NAME: 'Acme LLC',
      DEVELOPER_NAME: 'DevCraft Inc',
      PROJECT_DESCRIPTION: 'Modern e-commerce platform',
      TOTAL_PRICE: '$15,000 USD',
      PAYMENT_SCHEDULE: '50% deposit, 50% on completion',
      DELIVERY_DATE: '2026-11-30',
      NUMBER_OF_REVISIONS: '2',
      TERMINATION_NOTICE: '14',
    });
    assert(!completeResult.hasMissing, 'Validates cleanly when all required fields are supplied');
  }

  // Test Suite 4: Knowledge Base Approval & Safety
  console.log('\nTest Suite 4: Knowledge Base Approval & Safety');
  {
    // Production drafting retrieves only Approved entries
    const approvedEntries = legalRepository.listKnowledgeBase({ status: 'Approved' });
    assert(approvedEntries.length > 0, 'Contains approved legal knowledge base entries');
    assert(approvedEntries.every((e) => e.status === 'Approved'), 'Only Approved entries returned when status=Approved');

    // Create a draft entry
    const draftEntry = legalRepository.saveKnowledgeBaseEntry({
      id: 'kb_test_unapproved_clause',
      title: 'Unapproved Test Clause',
      category: 'clause',
      jurisdiction: 'United States',
      document_type: 'All',
      content: 'Sample test clause without formal approval.',
      summary: 'Test clause',
      source: 'ADMIN_GUIDANCE',
      effective_date: '2026-01-01',
      version: 'v1.0',
      status: 'Draft',
      tags: ['test'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    const prodSearch = legalRepository.listKnowledgeBase({
      search: 'Unapproved Test Clause',
      status: 'Approved',
    });
    assert(prodSearch.length === 0, 'Unapproved draft entries are NEVER used for production drafting');

    // Admin approves entry
    const approved = legalRepository.approveKnowledgeBaseEntry(draftEntry.id, 'Admin');
    assert(approved?.status === 'Approved', 'Admin can review and approve draft knowledge entries');

    // Clean up
    legalRepository.deleteKnowledgeBaseEntry(draftEntry.id);
  }

  // Test Suite 5: Knowledge Ingestion Safety
  console.log('\nTest Suite 5: Knowledge Ingestion Safety');
  {
    const sampleText = Buffer.from(
      `# MASTER SERVICES AGREEMENT (PAKISTAN)\nSection 1. Governing Law: This contract is governed by Contract Act, 1872 of Pakistan.\nSection 2. Fees: $5,000 USD payable upon delivery.`,
      'utf-8'
    );
    const ingestResult = await KnowledgeIngestionEngine.ingestDocument(sampleText, 'Sample_Agreement.md', 'md');

    assert(ingestResult.source.status === 'Draft', 'Ingested files start in Draft status');
    assert(ingestResult.draftKnowledgeEntry.status === 'Draft', 'Uploaded knowledge is NOT auto-approved for production');
    assert(ingestResult.draftKnowledgeEntry.jurisdiction === 'Pakistan', 'Correctly parsed jurisdiction from uploaded content');

    // Clean up
    legalRepository.deleteKnowledgeBaseEntry(ingestResult.draftKnowledgeEntry.id);
  }

  // Test Suite 6: Conflict Detection
  console.log('\nTest Suite 6: Legal Conflict Detection');
  {
    const conflicts = legalRepository.detectConflicts('United States', 'All');
    assert(Array.isArray(conflicts), 'Conflict detection runs across approved knowledge entries');
  }

  // Test Suite 7: Legal Content Protection & Restoration
  console.log('\nTest Suite 7: Legal Content Protection & Restoration');
  {
    const rawLegalText =
      'Client Acme Corporation shall pay Developer $25,000 USD within fourteen (14) days pursuant to GDPR Article 28 and Delaware General Corporation Law. Interest: 1.5%.';

    const protectedResult = LegalContentProtector.protect(rawLegalText, {
      COMPANY_NAME: 'Acme Corporation',
    });

    assert(protectedResult.tokens.length >= 4, `Protected ${protectedResult.tokens.length} legal entities and tokens`);
    assert(protectedResult.protectedText.includes('{{LEGAL_PROT_'), 'Replaced entities with safe protected placeholders');

    const restored = LegalContentProtector.restore(
      protectedResult.protectedText,
      protectedResult.tokenMap
    );
    assert(restored === rawLegalText, 'Restored protected legal text 100% verbatim');
  }

  // Test Suite 8: Legal Preservation Agent & Auto-Restoration
  console.log('\nTest Suite 8: Legal Preservation Agent');
  {
    const draftSections = [
      {
        id: 'sec_1',
        title: '1. Payment Terms',
        content: 'Client shall pay Developer $15,000 USD within fourteen (14) days. Client must not withhold fees.',
        isLegalClause: true,
      },
    ];

    // Altered humanized section dropping prohibition and changing amount
    const alteredSections = [
      {
        id: 'sec_1',
        title: '1. Payment Terms',
        content: 'Client may pay Developer $5,000 whenever convenient.',
        isLegalClause: true,
      },
    ];

    const outcome = LegalPreservationAgent.verifyAndReconcile(draftSections, alteredSections);
    assert(outcome.preservationResult.restoredCount === 1, 'Auto-restored section where obligations and amounts were altered');
    assert(outcome.reconciledSections[0].content === draftSections[0].content, 'Restored original draft wording verbatim');
  }

  // Test Suite 9: Legal Quality Checker
  console.log('\nTest Suite 9: Legal Quality Checker');
  {
    const websiteDev = legalRepository.getDocumentType('website-development-agreement')!;
    const mockSections = [
      {
        id: 'sec_1',
        title: '1. Engagement',
        content: 'Developer shall perform web development services for {{CLIENT_NAME}}.',
        isLegalClause: true,
      },
    ];

    const qc = LegalQualityChecker.evaluate(
      mockSections,
      mockSections[0].content,
      websiteDev,
      null,
      'United States'
    );

    assert(qc.emptyVariables.length > 0, 'Detected unreplaced empty variable {{CLIENT_NAME}}');
    assert(qc.status === 'NEEDS_REVIEW' || qc.warnings.length > 0, 'Flagged missing required sections and empty variables');
  }

  // Test Suite 10: Autonomous Pipeline Execution & Version History
  console.log('\nTest Suite 10: End-to-End Autonomous Pipeline & Version History');
  {
    const doc = await DocumentationPipelineOrchestrator.run({
      documentTypeId: 'website-development-agreement',
      jurisdiction: 'United States',
      fieldValues: {
        CLIENT_NAME: 'Horizon Retail LLC',
        DEVELOPER_NAME: 'DevCraft Labs Inc',
        PROJECT_DESCRIPTION: 'Modern responsive marketing web app with Stripe payments',
        TOTAL_PRICE: '$12,500 USD',
        PAYMENT_SCHEDULE: '50% deposit, 50% upon launch',
        DELIVERY_DATE: '2026-11-15',
        NUMBER_OF_REVISIONS: '2',
        TERMINATION_NOTICE: '14',
      },
      instructions: 'Include portfolio attribution clause.',
      userId: 'test_user',
    });

    assert(!!doc.id, 'Generated document record with unique ID');
    assert(doc.versions.length >= 2, `Maintained version history (generated ${doc.versions.length} versions)`);

    const v1 = doc.versions.find((v) => v.versionNumber === 1);
    const v4 = doc.versions.find((v) => v.versionNumber === 4);
    assert(!!v1, 'Created and permanently preserved v1 Draft');
    assert(!!v4, 'Created v4 Final version');
    assert(doc.status === 'COMPLETED' || doc.status === 'NEEDS_REVIEW', `Pipeline reached terminal state: ${doc.status}`);
    assert(!!doc.report, 'Generated comprehensive Document Generation Report');
    assert(doc.report?.preservationResult.score !== undefined, 'Report includes preservation score');

    // Test Suite 11: Single Section Regeneration (Section 20)
    console.log('\nTest Suite 11: Single Section Regeneration (Section 20)');
    const initialVersionsCount = doc.versions.length;
    const regenResult = await DocumentationPipelineOrchestrator.regenerateSection(
      doc.id,
      '3. Revisions & Acceptance Testing',
      'Extend revision window to 30 days.'
    );

    assert(regenResult.updatedSection.title.includes('Revisions'), 'Regenerated specific target section');
    assert(regenResult.updatedDocument.versions.length === initialVersionsCount + 1, 'Appended new version without overwriting past drafts');
  }

  // Test Suite 12: File Generator Formats
  console.log('\nTest Suite 12: File Export Formats');
  {
    const sampleDoc = '# SAMPLE LEGAL CONTRACT\n\n### 1. Obligations\nThe Parties shall perform all covenants.';
    const docxBuf = await DocumentGenerator.generate(sampleDoc, 'docx', 'Sample_Contract');
    const pdfBuf = await DocumentGenerator.generate(sampleDoc, 'pdf', 'Sample_Contract');
    const mdBuf = await DocumentGenerator.generate(sampleDoc, 'md', 'Sample_Contract');
    const txtBuf = await DocumentGenerator.generate(sampleDoc, 'txt', 'Sample_Contract');

    assert(docxBuf.length > 500, `Generated valid Word DOCX (${docxBuf.length} bytes)`);
    assert(pdfBuf.length > 500, `Generated valid PDF document (${pdfBuf.length} bytes)`);
    assert(mdBuf.length > 0, `Generated Markdown file (${mdBuf.length} bytes)`);
    assert(txtBuf.length > 0, `Generated Plain Text file (${txtBuf.length} bytes)`);
  }

  // Test Suite 13: Chatbot Legal Commands & Safety
  console.log('\nTest Suite 13: Chatbot Legal Commands & Safety');
  {
    const ndaReply = await ChatbotAssistant.handleMessage('Draft an NDA.');
    assert(ndaReply.includes('Mutual Non-Disclosure Agreement'), 'Chatbot responds to "Draft an NDA." command');
    assert(ndaReply.includes('not provide binding legal advice'), 'Chatbot includes mandatory legal safety notice');

    const clauseReply = await ChatbotAssistant.handleMessage('Explain this clause.');
    assert(clauseReply.includes('Knowledge Base'), 'Chatbot references internal knowledge base for legal clauses');

    const warningReply = await ChatbotAssistant.handleMessage('Show legal warnings.');
    assert(warningReply.includes('Legal Quality Checker') || warningReply.includes('Warnings'), 'Chatbot handles "Show legal warnings." command');
  }

  // Summary
  console.log('\n======================================================');
  console.log(`Results: ${passed}/${total} Documentation Studio Tests Passed!`);
  console.log('======================================================\n');
}

runLegalSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
