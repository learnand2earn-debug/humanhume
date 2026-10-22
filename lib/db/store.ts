import fs from 'fs';
import path from 'path';
import os from 'os';
import {
  ApiUsageRecord,
  AppNotification,
  DocumentRecord,
  DocumentTypeDefinition,
  KnowledgeConflict,
  LegalAuditLog,
  LegalKnowledgeEntry,
  PlatformSettings,
  ProcessingJob,
  SystemLogEntry,
} from '@/types';
import {INITIAL_DOCUMENT_TYPES} from '@/lib/document/legal-engine';
import {maskSecretKey} from '@/lib/security';
import {
  analyzeAndCreateProtectedMap,
  splitDocumentIntoLogicalChunks,
  verifyAndEnforcePreservation,
} from '@/lib/document/analyzer';
import {runNaturalHumanizationTransform} from '@/lib/humanizer/provider';
import {deleteFromPrivateStorage, saveToPrivateStorage} from '@/lib/storage';
import {getDefaultSampleFigures} from '@/lib/document/image-utils';

interface RuntimeSecrets {
  humanizerApiUrl: string;
  humanizerApiKey: string;
  checkerApiUrl: string;
  checkerApiKey: string;
  discordWebhookUrl: string;
}

interface DatabaseState {
  settings: PlatformSettings;
  secrets: RuntimeSecrets;
  documents: DocumentRecord[];
  jobs: ProcessingJob[];
  logs: SystemLogEntry[];
  apiUsage: ApiUsageRecord[];
  notifications: AppNotification[];
  knowledgeBase: LegalKnowledgeEntry[];
  knowledgeConflicts: KnowledgeConflict[];
  documentTypes: DocumentTypeDefinition[];
  legalAuditLogs: LegalAuditLog[];
}

const DB_FILE_PATH = path.join(process.cwd(), 'storage', 'humanflow_db.json');

function buildInitialSeedState(): DatabaseState {
  const rawHumanizerKey = process.env.HUMANIZER_API_KEY || '';
  const rawCheckerKey = process.env.CHECKER_API_KEY || '';
  const rawDiscordUrl = process.env.DISCORD_WEBHOOK_URL || '';

  const settings: PlatformSettings = {
    processingMode: (process.env.PROCESSING_MODE as 'DEMO' | 'LIVE') || 'DEMO',
    humanizerApiUrl: process.env.HUMANIZER_API_URL || 'https://api.humanflow-provider.example.com/v1/humanize',
    humanizerApiKeyMasked: rawHumanizerKey ? maskSecretKey(rawHumanizerKey) : 'sk-***************92',
    humanizerModel: process.env.HUMANIZER_MODEL || 'humanflow-pro-v2',
    humanizerResponsePath: process.env.HUMANIZER_RESPONSE_PATH || 'data.text',
    checkerApiUrl: process.env.CHECKER_API_URL || 'https://api.checker-provider.example.com/v1/detect',
    checkerApiKeyMasked: rawCheckerKey ? maskSecretKey(rawCheckerKey) : 'sk-***************48',
    checkerResponsePath: process.env.CHECKER_RESPONSE_SCORE_PATH || 'data.ai_score',
    discordWebhookUrlMasked: rawDiscordUrl ? maskSecretKey(rawDiscordUrl) : '',
    maxRetries: Number(process.env.MAX_RETRIES || 3),
    timeoutSeconds: 30,
    chunkSizeWords: 350,
    rateLimitPerMinute: 60,
    defaultRetention: '24h',
    browserNotificationsEnabled: true,
    discordNotificationsEnabled: Boolean(rawDiscordUrl),
    defaultJurisdiction: 'United States',
    legalClauseProtection: 'HIGH',
    normalProseIntensity: 'NORMAL',
    requireAdminApprovalForKB: true,
    legalDisclaimerText:
      'AI-generated document. This document is provided for drafting and informational purposes and does not constitute legal advice. Review by a qualified legal professional is recommended before use.',
    legalDisclaimerEnabled: true,
  };

  const secrets: RuntimeSecrets = {
    humanizerApiUrl: process.env.HUMANIZER_API_URL || '',
    humanizerApiKey: rawHumanizerKey,
    checkerApiUrl: process.env.CHECKER_API_URL || '',
    checkerApiKey: rawCheckerKey,
    discordWebhookUrl: rawDiscordUrl,
  };

  const knowledgeBase: LegalKnowledgeEntry[] = [
    {
      id: 'kb-us-web-dev',
      title: 'US Commercial Web & Software IP Assignment & Liability Framework',
      category: 'INTERNAL TEMPLATE',
      jurisdiction: 'United States',
      documentType: 'Website Development Agreement',
      content:
        'Under United States commercial contract principles, work-made-for-hire and explicit IP assignment clauses must clearly condition title transfer upon full settlement of undisputed milestone fees. Limitation of liability clauses routinely cap aggregate damages at 12 months of preceding fees.',
      summary:
        'Enforces conditional IP transfer upon final payment, 14-day termination notice, and 12-month fee liability cap under US commercial law.',
      approvedWording: [
        'Full assignment of custom Deliverables transfers to Client upon receipt of final payment.',
        'Aggregate liability shall not exceed total fees paid during the preceding 12 months.',
      ],
      prohibitedWording: ['Unlimited consequential damages', 'Guaranteed 100% bug-free operation in perpetuity'],
      requiredClauses: ['Scope of Work', 'Payment Terms', 'Intellectual Property', 'Limitation of Liability', 'Governing Law'],
      optionalClauses: ['Post-Launch Maintenance'],
      source: 'HumanFlow Approved US Commercial Contracting Standard v2.4',
      sourceUrl: 'https://legal.humanflow.internal/standards/us-web-dev-v2.4',
      effectiveDate: '2026-01-15',
      reviewDate: '2026-10-01',
      version: '2.4.0',
      status: 'Approved',
      tags: ['United States', 'IP Assignment', 'Web Development', 'Liability Cap'],
      createdAt: '2026-01-15T10:00:00Z',
      updatedAt: '2026-10-01T14:20:00Z',
    },
    {
      id: 'kb-uk-ai-automation',
      title: 'UK B2B AI Automation & Data Protection Covenant (UK GDPR Aligned)',
      category: 'ADMIN-PROVIDED GUIDANCE',
      jurisdiction: 'United Kingdom',
      documentType: 'AI Automation Agreement',
      content:
        'For AI Automation deployments under England and Wales jurisdiction, contracts must explicitly prohibit training foundation models on Client confidential data without express opt-in, and preserve statutory liability exclusions under the Unfair Contract Terms Act 1977.',
      summary:
        'Governed by the laws of England and Wales; mandates strict client data isolation and zero-training covenants for AI workflows.',
      approvedWording: [
        'Provider shall not use Client Confidential Information to train or fine-tune multi-tenant foundation models.',
        'Governed by and construed in accordance with the laws of England and Wales.',
      ],
      prohibitedWording: ['Exclusion of liability for fraud or personal injury'],
      requiredClauses: ['Automation Architecture', 'Data Privacy & Zero-Training Covenant', 'Liability Cap', 'Governing Law'],
      optionalClauses: ['Token SLA Schedule'],
      source: 'UK Commercial AI Governance Practice Note 2026',
      effectiveDate: '2026-02-10',
      reviewDate: '2026-09-20',
      version: '2.1.0',
      status: 'Approved',
      tags: ['United Kingdom', 'AI Automation', 'UK GDPR', 'Zero-Training'],
      createdAt: '2026-02-10T09:00:00Z',
      updatedAt: '2026-09-20T11:30:00Z',
    },
    {
      id: 'kb-eu-gdpr-dpa',
      title: 'European Union GDPR Article 28 Data Processing & Privacy Standard',
      category: 'AUTHORITATIVE SOURCE',
      jurisdiction: 'European Union',
      documentType: 'Data Processing Agreement',
      content:
        'Processor shall process Personal Data only on documented instructions from the Controller in accordance with Regulation (EU) 2016/679 (GDPR) Article 28, notify Controller without undue delay (and within 72 hours) of a confirmed Personal Data Breach, and implement TLS 1.3 and AES-256 encryption.',
      summary:
        'Aligns controller-processor obligations with EU GDPR Article 28, including 72-hour breach reporting and sub-processor controls.',
      approvedWording: [
        'Processor shall notify Controller without undue delay after becoming aware of a Personal Data Breach.',
        'Processing is governed by Regulation (EU) 2016/679 (GDPR) Article 28.',
      ],
      prohibitedWording: ['Unrestricted sub-processor transfers without safeguards'],
      requiredClauses: ['Processor Obligations', 'Security Measures', 'Sub-Processors', 'Personal Data Breach Notification'],
      optionalClauses: ['Standard Contractual Clauses Annex'],
      source: 'EU GDPR Article 28 Compliance Reference',
      sourceUrl: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
      effectiveDate: '2026-01-01',
      reviewDate: '2026-10-05',
      version: '3.1.0',
      status: 'Approved',
      tags: ['European Union', 'GDPR', 'DPA', 'Privacy Policy'],
      createdAt: '2026-01-01T08:00:00Z',
      updatedAt: '2026-10-05T16:00:00Z',
    },
    {
      id: 'kb-uae-commercial',
      title: 'UAE DIFC / Commercial Contracting & Confidentiality Standard',
      category: 'INTERNAL TEMPLATE',
      jurisdiction: 'UAE',
      documentType: 'NDA',
      content:
        'Mutual Non-Disclosure and Commercial Service Agreements executed for UAE operations specify explicit survival of trade secret protection for 3 years, strict non-circumvention, and dispute resolution in the Dubai International Financial Centre (DIFC) or UAE federal courts.',
      summary:
        'UAE commercial confidentiality standard specifying 3-year survival and DIFC/Dubai governing law framework.',
      approvedWording: [
        'Confidentiality obligations shall survive for three (3) years from the date of disclosure.',
      ],
      prohibitedWording: ['Oral modification without signed written addendum'],
      requiredClauses: ['Definition of Confidential Information', 'Obligations of Receiving Party', 'Term & Survival Period', 'Governing Law'],
      optionalClauses: ['Non-Solicitation'],
      source: 'UAE Regional Corporate Counsel Playbook v1.8',
      effectiveDate: '2026-03-01',
      reviewDate: '2026-10-10',
      version: '1.8.0',
      status: 'Approved',
      tags: ['UAE', 'NDA', 'Confidentiality', 'DIFC'],
      createdAt: '2026-03-01T12:00:00Z',
      updatedAt: '2026-10-10T09:45:00Z',
    },
    {
      id: 'kb-pk-software-contract',
      title: 'Pakistan Contract Act & Electronic Transactions Software Services Standard',
      category: 'ADMIN-PROVIDED GUIDANCE',
      jurisdiction: 'Pakistan',
      documentType: 'Software Development Agreement',
      content:
        'Commercial software development and outsourcing agreements governed by the laws of Pakistan incorporate milestone acceptance windows, electronic signature recognition under the Electronic Transactions Ordinance, and IP assignment upon realization of export/milestone remittances.',
      summary:
        'Pakistan software engineering & IT services clause standard covering milestone billing, IP transfer, and dispute arbitration.',
      approvedWording: [
        'This Agreement shall be governed by the laws of Pakistan.',
        'Electronic execution and digital delivery of notices are recognized as binding between the parties.',
      ],
      prohibitedWording: ['Ambiguous scope without written change-order approval'],
      requiredClauses: ['Scope', 'Engineering Milestones', 'Intellectual Property', 'Confidentiality', 'Governing Law'],
      optionalClauses: ['Arbitration Venue'],
      source: 'Pakistan IT & Software Export Legal Standard v2.0',
      effectiveDate: '2026-02-15',
      reviewDate: '2026-10-12',
      version: '2.0.0',
      status: 'Approved',
      tags: ['Pakistan', 'Software Development', 'IT Services', 'IP Assignment'],
      createdAt: '2026-02-15T11:00:00Z',
      updatedAt: '2026-10-12T15:10:00Z',
    },
    {
      id: 'kb-draft-conflict-candidate',
      title: 'Legacy US Web Development Unlimited Liability Draft Note',
      category: 'GENERAL INFORMATION',
      jurisdiction: 'United States',
      documentType: 'Website Development Agreement',
      content:
        'Draft note proposing 24-month liability lookback window instead of the standard 12-month fee cap for web development contracts.',
      summary: 'Unapproved draft proposing a 24-month liability cap (conflicts with v2.4.0 standard).',
      approvedWording: [],
      prohibitedWording: [],
      requiredClauses: ['Limitation of Liability'],
      optionalClauses: [],
      source: 'Internal Legal Review Queue #104',
      effectiveDate: '2026-09-01',
      reviewDate: '2026-10-16',
      version: '2.5.0-draft',
      status: 'Under Review',
      tags: ['United States', 'Conflict Candidate', 'Liability'],
      createdAt: '2026-09-01T10:00:00Z',
      updatedAt: '2026-10-15T10:00:00Z',
    },
  ];

  const knowledgeConflicts: KnowledgeConflict[] = [
    {
      id: 'conflict-101',
      entryAId: 'kb-us-web-dev',
      entryATitle: 'US Commercial Web & Software IP Assignment & Liability Framework (v2.4.0 — Approved)',
      entryBId: 'kb-draft-conflict-candidate',
      entryBTitle: 'Legacy US Web Development Unlimited Liability Draft Note (v2.5.0-draft — Under Review)',
      jurisdiction: 'United States',
      documentType: 'Website Development Agreement',
      conflictDescription:
        'Knowledge conflict detected on Limitation of Liability lookback period: Entry A enforces a 12-month fee cap while Entry B proposes a 24-month lookback. Entry B is blocked from production drafting until Admin resolution.',
      status: 'OPEN',
      detectedAt: '2026-10-15T14:22:00Z',
    },
  ];

  // Create a pre-processed realistic sample document so the user sees a complete result immediately
  const sampleId = 'doc-sample-research-2026';
  const sampleTraceId = 'HF-20261016-8F3A91';
  const sampleOriginal = `# Q4 2026 Enterprise Cloud Security & Latency Report

## 1. Executive Summary
In order to facilitate the implementation of zero-trust network architecture across 18 global regions, Meridian Cloud Infrastructure Inc. conducted an audit between 2026-07-01 and 2026-09-30. Due to the fact that automated packet routing was deployed, P99 API latency improved by 34.6% while annual infrastructure overhead decreased by $185,400 USD [Ref: MCI-SEC-2026].

## 2. Regulatory & Cryptographic Compliance
It is important to note that all storage volumes utilize AES-256 encryption at rest and TLS 1.3 in transit in accordance with the provisions of ISO/IEC 27001:2022 and GDPR Article 28. Furthermore, it can be observed that 99.99% availability was maintained across all production nodes (verify telemetry at https://trust.meridiancloud.example.com or contact compliance@meridiancloud.example.com).

## 3. Conclusion & Next Milestones
In conclusion, it is evident that the platform has the ability to scale to 25,000 requests per second without degrading cryptographic verification integrity.`;

  const protectedMap = analyzeAndCreateProtectedMap(sampleId, sampleOriginal);
  const rawChunks = splitDocumentIntoLogicalChunks(sampleOriginal, protectedMap, 'NORMAL');
  const humanizedChunks = rawChunks.map((c) => ({
    ...c,
    humanizedText: runNaturalHumanizationTransform(c.originalText, c.intensity, c.isLegalClause),
    status: 'HUMANIZED' as const,
  }));
  const {verifiedChunks, reconstructedText, comparison} = verifyAndEnforcePreservation(
    humanizedChunks,
    protectedMap
  );

  const origPath = saveToPrivateStorage('original', sampleId, 'Research-Paper.docx', sampleOriginal);
  const v1Path = saveToPrivateStorage('processing', sampleId, 'v1_Research-Paper.docx', reconstructedText);
  const finalPath = saveToPrivateStorage('final', sampleId, 'Final_Research-Paper.docx', reconstructedText);

  const sampleImages = getDefaultSampleFigures(sampleId, 'cloud_security');
  protectedMap.structuralStats.imageCount = sampleImages.length;

  const sampleDoc: DocumentRecord = {
    id: sampleId,
    traceId: sampleTraceId,
    userId: 'user-admin-1',
    sourceModule: 'UPLOAD',
    originalName: 'Research-Paper.pdf',
    fileType: 'PDF',
    fileSize: 148320,
    wordCount: protectedMap.structuralStats.wordCount,
    pageCount: 2,
    status: 'COMPLETED',
    progressPercent: 100,
    currentStepLabel: 'Finalized & Verified',
    retentionPolicy: '24h',
    originalContent: sampleOriginal,
    finalContent: reconstructedText,
    embeddedImages: sampleImages,
    protectedMap,
    chunks: verifiedChunks,
    versions: [
      {
        id: 'ver-orig-1',
        documentId: sampleId,
        versionNumber: 0,
        versionLabel: 'Original',
        filePath: origPath,
        content: sampleOriginal,
        qualityScore: 72,
        checkerScore: 48,
        preservationScore: 100,
        readabilityScore: 78,
        retryCount: 0,
        provider: 'Original Upload',
        processingDurationMs: 0,
        status: 'VALID',
        createdAt: '2026-10-16T21:10:00Z',
      },
      {
        id: 'ver-hum-1',
        documentId: sampleId,
        versionNumber: 1,
        versionLabel: 'Version 1',
        filePath: v1Path,
        content: reconstructedText,
        qualityScore: 96,
        checkerScore: 6,
        preservationScore: 100,
        readabilityScore: comparison.readabilityScore,
        retryCount: 0,
        provider: 'HumanFlow Demo Engine',
        processingDurationMs: 1420,
        status: 'VALID',
        createdAt: '2026-10-16T21:10:02Z',
      },
      {
        id: 'ver-final-1',
        documentId: sampleId,
        versionNumber: 2,
        versionLabel: 'Final',
        filePath: finalPath,
        content: reconstructedText,
        qualityScore: 98,
        checkerScore: 6,
        preservationScore: 100,
        readabilityScore: comparison.readabilityScore,
        retryCount: 0,
        provider: 'HumanFlow Demo Engine',
        processingDurationMs: 1840,
        status: 'VALID',
        createdAt: '2026-10-16T21:10:03Z',
      },
    ],
    qualityChecks: [
      {
        id: 'qc-sample-1',
        documentId: sampleId,
        versionId: 'ver-final-1',
        provider: 'HumanFlow Quality & Stylometric Analyzer (Demo)',
        aiScore: 6,
        confidence: 94,
        status: 'PASS',
        detectedIssues: [],
        timestamp: '2026-10-16T21:10:03Z',
      },
    ],
    preservationResult: comparison,
    qcChecklist: {
      fileOpensCorrectly: true,
      originalStillExists: true,
      allRequiredSectionsExist: true,
      noImportantInfoLost: true,
      noProtectedContentChanged: true,
      formattingAcceptable: true,
      humanizerResponseValid: true,
      checkerCompleted: true,
      finalVersionGenerated: true,
      downloadWorks: true,
    },
    steps: [
      {step: 'UPLOAD', label: 'Uploaded', status: 'COMPLETED', detail: 'Original safely stored in /storage/original/'},
      {step: 'VALIDATION', label: 'Validated', status: 'COMPLETED', detail: 'PDF format verified'},
      {step: 'EXTRACTION', label: 'Extracted', status: 'COMPLETED', detail: '3 sections & 2 embedded figures extracted'},
      {step: 'ANALYSIS', label: 'Analyzed', status: 'COMPLETED', detail: `${protectedMap.entities.length} critical entities indexed`},
      {step: 'PROTECTION', label: 'Protected Important Content', status: 'COMPLETED', detail: 'Numbers, dates, citations, and URLs locked'},
      {step: 'HUMANIZATION', label: 'Humanized', status: 'COMPLETED', detail: 'Processed in 3 logical chunks'},
      {step: 'QUALITY_CHECK', label: 'Checked', status: 'COMPLETED', detail: 'AI Score: 6% · Quality: PASS'},
      {step: 'PRESERVATION_CHECK', label: 'Quality Verified', status: 'COMPLETED', detail: '100% factual & entity preservation verified'},
      {step: 'FINALIZE', label: 'Finalized', status: 'COMPLETED', detail: 'Final version generated and ready for download'},
    ],
    processLogs: [
      {
        id: 'plog-sample-1',
        timestamp: '2026-10-16T21:10:00.015Z',
        elapsedMs: 15,
        step: 'UPLOAD',
        level: 'INFO',
        commandOrModule: 'storage::ingest',
        message: `Ingesting "Research-Paper.pdf" (PDF, 144.8 KB) with Trace ID ${sampleTraceId}`,
      },
      {
        id: 'plog-sample-2',
        timestamp: '2026-10-16T21:10:00.042Z',
        elapsedMs: 42,
        step: 'UPLOAD',
        level: 'SUCCESS',
        commandOrModule: 'storage::lockOriginal',
        message: `Original file isolated & read-only locked at ${origPath} (SHA-256 verified)`,
      },
      {
        id: 'plog-sample-3',
        timestamp: '2026-10-16T21:10:00.088Z',
        elapsedMs: 88,
        step: 'VALIDATION',
        level: 'SUCCESS',
        commandOrModule: 'validator::mimeAndSchema',
        message: 'Format PDF verified against schema guard; binary header & payload integrity OK',
      },
      {
        id: 'plog-sample-4',
        timestamp: '2026-10-16T21:10:00.165Z',
        elapsedMs: 165,
        step: 'EXTRACTION',
        level: 'INFO',
        commandOrModule: 'extractor::parseStructure',
        message: `Extracted ${protectedMap.structuralStats.wordCount} words across 2 page(s), ${verifiedChunks.length} logical section(s), and ${sampleImages.length} embedded figure(s)`,
      },
      {
        id: 'plog-sample-5',
        timestamp: '2026-10-16T21:10:00.240Z',
        elapsedMs: 240,
        step: 'EXTRACTION',
        level: 'SUCCESS',
        commandOrModule: 'extractor::pdfImageStreams',
        message: `Locked ${sampleImages.length} embedded image stream(s) with original positions & aspect ratios: Fig #1 [520x210, ratio=2.48, sec=1, pg=1]; Fig #2 [520x210, ratio=2.48, sec=2, pg=2]`,
      },
      {
        id: 'plog-sample-6',
        timestamp: '2026-10-16T21:10:00.390Z',
        elapsedMs: 390,
        step: 'ANALYSIS',
        level: 'INFO',
        commandOrModule: 'analyzer::entityScanner',
        message: `Scanned document structure: ${protectedMap.structuralStats.headingCount} heading(s), ${protectedMap.structuralStats.paragraphCount} paragraph(s), ${protectedMap.structuralStats.tableCount} table(s)`,
      },
      {
        id: 'plog-sample-7',
        timestamp: '2026-10-16T21:10:00.510Z',
        elapsedMs: 510,
        step: 'PROTECTION',
        level: 'SUCCESS',
        commandOrModule: 'protection::lockMap',
        message: `Built Protected-Content Map: ${protectedMap.entities.length} immutable token(s) locked (${protectedMap.numbersAndDates.length} numbers/dates, ${protectedMap.citations.length} citations/refs, ${protectedMap.definedTerms.length} technical terms)`,
      },
      {
        id: 'plog-sample-8',
        timestamp: '2026-10-16T21:10:00.890Z',
        elapsedMs: 890,
        step: 'HUMANIZATION',
        level: 'INFO',
        commandOrModule: 'humanizer::pass_1',
        message: `Transformed ${verifiedChunks.length}/${verifiedChunks.length} prose sections via HumanFlow Built-In Engine [protected tokens masked]`,
      },
      {
        id: 'plog-sample-9',
        timestamp: '2026-10-16T21:10:01.340Z',
        elapsedMs: 1340,
        step: 'QUALITY_CHECK',
        level: 'SUCCESS',
        commandOrModule: 'checker::stylometricScan',
        message: `Quality & AI Detection Check (v1): AI Score=6% (Confidence=94%, Readability=${comparison.readabilityScore}%) -> PASS`,
      },
      {
        id: 'plog-sample-10',
        timestamp: '2026-10-16T21:10:01.620Z',
        elapsedMs: 1620,
        step: 'PRESERVATION_CHECK',
        level: 'SUCCESS',
        commandOrModule: 'preservation::auditDiff',
        message: `Factual Preservation Audit: Score=100% · Missing Paragraphs=0 · Protected Entities Intact=${protectedMap.entities.length}/${protectedMap.entities.length} · Figures Intact=${sampleImages.length}/${sampleImages.length}`,
      },
      {
        id: 'plog-sample-11',
        timestamp: '2026-10-16T21:10:01.840Z',
        elapsedMs: 1840,
        step: 'FINALIZE',
        level: 'SUCCESS',
        commandOrModule: 'exporter::finalizeOutput',
        message: `10/10 QC checks passed. Final artifact stored at ${finalPath} with ${sampleImages.length} preserved figure(s). Total pipeline time: 1840ms`,
      },
    ],
    retryCount: 0,
    processingDurationMs: 1840,
    createdAt: '2026-10-16T21:10:00Z',
    updatedAt: '2026-10-16T21:10:03Z',
    completedAt: '2026-10-16T21:10:03Z',
  };

  const studioSampleId = 'studio-sample-web-dev-2026';
  const studioTraceId = 'HF-20261016-4C9B12';
  const studioDraftContent = `> **LEGAL NOTICE:** AI-generated document. This document is provided for drafting and informational purposes and does not constitute legal advice. Review by a qualified legal professional is recommended before use.

# WEBSITE DEVELOPMENT AGREEMENT

**Effective Date:** 2026-10-16 · **Jurisdiction:** United States · **Template Version:** 2.4.0

## 1. Introduction & Parties
This Website Development Agreement ("Agreement") is entered into as of 2026-10-16 ("Effective Date") by and between "Studio Vertex Digital Inc." and "Horizon Retail Group LLC". In order to establish clear rights and responsibilities under the laws of United States, both parties agree to the structured terms set forth below.

## 2. Definitions
For the purpose of this Website Development Agreement, "Confidential Information" means all non-public technical, financial, or operational disclosures exchanged between "Studio Vertex Digital Inc." and "Horizon Retail Group LLC". "Deliverables" refers specifically to: Full-stack e-commerce web application with Next.js, custom checkout, and CMS integration.

## 3. Scope of Work & Deliverables
Due to the fact that precision and traceability are required throughout execution, the scope of this engagement encompasses: Full-stack e-commerce web application with Next.js, custom checkout, and CMS integration. Target completion and delivery milestone: 2026-12-15.

## 4. Payment Terms & Schedule
In accordance with the commercial terms agreed between the parties, compensation is structured as follows: $24,500 USD (40% upon signing, 30% upon staging approval, 30% upon production launch). Undisputed invoices are payable within 15 days of issuance.

## 5. Intellectual Property Rights
With regard to Intellectual Property ownership: Full assignment to Client upon receipt of final milestone payment. Pre-existing tools, libraries, and foundational frameworks developed prior to 2026-10-16 remain the exclusive property of their respective owner.

## 6. Limitation of Liability & Governing Law
Except for breaches of confidentiality or willful misconduct, neither party's aggregate liability under this Website Development Agreement shall exceed the total fees paid or payable during the 12 months preceding the claim. This Agreement shall be governed by the laws of United States.

Signed for "Studio Vertex Digital Inc.": ______________________  Date: 2026-10-16
Signed for "Horizon Retail Group LLC": ______________________  Date: 2026-10-16`;

  const studioProtectedMap = analyzeAndCreateProtectedMap(studioSampleId, studioDraftContent);
  const studioRawChunks = splitDocumentIntoLogicalChunks(studioDraftContent, studioProtectedMap, 'LOW');
  const studioHumanizedChunks = studioRawChunks.map((c) => ({
    ...c,
    humanizedText: runNaturalHumanizationTransform(c.originalText, 'LOW', true),
    status: 'HUMANIZED' as const,
  }));
  const studioVerified = verifyAndEnforcePreservation(studioHumanizedChunks, studioProtectedMap);

  const studioDraftPath = saveToPrivateStorage('original', studioSampleId, 'v1_Draft_Website-Development-Agreement.docx', studioDraftContent);
  const studioFinalPath = saveToPrivateStorage('final', studioSampleId, 'v4_Final_Website-Development-Agreement.docx', studioVerified.reconstructedText);

  const studioSampleDoc: DocumentRecord = {
    id: studioSampleId,
    traceId: studioTraceId,
    userId: 'user-admin-1',
    sourceModule: 'DOCUMENTATION_STUDIO',
    originalName: 'Website-Development-Agreement-United-States.docx',
    fileType: 'DOCX',
    fileSize: Buffer.byteLength(studioVerified.reconstructedText, 'utf-8'),
    wordCount: studioProtectedMap.structuralStats.wordCount,
    pageCount: 1,
    status: 'COMPLETED',
    progressPercent: 100,
    currentStepLabel: 'Drafted, Humanized & Legal Verified',
    retentionPolicy: '24h',
    originalContent: studioDraftContent,
    finalContent: studioVerified.reconstructedText,
    protectedMap: studioProtectedMap,
    chunks: studioVerified.verifiedChunks,
    versions: [
      {
        id: 'ver-studio-v1',
        documentId: studioSampleId,
        versionNumber: 1,
        versionLabel: 'v1 Draft',
        filePath: studioDraftPath,
        content: studioDraftContent,
        qualityScore: 88,
        checkerScore: 26,
        preservationScore: 100,
        readabilityScore: 84,
        retryCount: 0,
        provider: 'HumanFlow Documentation Drafting Agent',
        processingDurationMs: 410,
        status: 'VALID',
        createdAt: '2026-10-16T21:12:00Z',
      },
      {
        id: 'ver-studio-v2',
        documentId: studioSampleId,
        versionNumber: 2,
        versionLabel: 'v2 Humanized',
        filePath: studioFinalPath,
        content: studioVerified.reconstructedText,
        qualityScore: 97,
        checkerScore: 5,
        preservationScore: 100,
        readabilityScore: studioVerified.comparison.readabilityScore,
        retryCount: 0,
        provider: 'HumanFlow Built-In Engine',
        processingDurationMs: 620,
        status: 'VALID',
        createdAt: '2026-10-16T21:12:01Z',
      },
      {
        id: 'ver-studio-v3',
        documentId: studioSampleId,
        versionNumber: 3,
        versionLabel: 'v3 Corrected',
        filePath: studioFinalPath,
        content: studioVerified.reconstructedText,
        qualityScore: 98,
        checkerScore: 5,
        preservationScore: 100,
        readabilityScore: studioVerified.comparison.readabilityScore,
        retryCount: 0,
        provider: 'HumanFlow Legal Preservation Agent',
        processingDurationMs: 280,
        status: 'VALID',
        createdAt: '2026-10-16T21:12:02Z',
      },
      {
        id: 'ver-studio-v4',
        documentId: studioSampleId,
        versionNumber: 4,
        versionLabel: 'v4 Final',
        filePath: studioFinalPath,
        content: studioVerified.reconstructedText,
        qualityScore: 99,
        checkerScore: 5,
        preservationScore: 100,
        readabilityScore: studioVerified.comparison.readabilityScore,
        retryCount: 0,
        provider: 'HumanFlow Built-In Engine',
        processingDurationMs: 1310,
        status: 'VALID',
        createdAt: '2026-10-16T21:12:02Z',
      },
    ],
    qualityChecks: [
      {
        id: 'qc-studio-1',
        documentId: studioSampleId,
        versionId: 'ver-studio-v4',
        provider: 'HumanFlow Quality & Stylometric Analyzer',
        aiScore: 5,
        confidence: 95,
        status: 'PASS',
        detectedIssues: [],
        timestamp: '2026-10-16T21:12:02Z',
      },
    ],
    preservationResult: studioVerified.comparison,
    qcChecklist: {
      fileOpensCorrectly: true,
      originalStillExists: true,
      allRequiredSectionsExist: true,
      noImportantInfoLost: true,
      noProtectedContentChanged: true,
      formattingAcceptable: true,
      humanizerResponseValid: true,
      checkerCompleted: true,
      finalVersionGenerated: true,
      downloadWorks: true,
    },
    steps: [
      {step: 'UPLOAD', label: 'Uploaded / Input Validated', status: 'COMPLETED', detail: 'Website Development Agreement (United States)'},
      {step: 'ANALYSIS', label: 'Analyzed & KB Retrieved', status: 'COMPLETED', detail: 'Approved US Commercial Contracting Standard v2.4 linked'},
      {step: 'PROTECTION', label: 'Protected Important Content', status: 'COMPLETED', detail: `${studioProtectedMap.entities.length} legal entities & obligations locked`},
      {step: 'HUMANIZATION', label: 'Humanized', status: 'COMPLETED', detail: 'Conservative legal clause intensity applied'},
      {step: 'QUALITY_CHECK', label: 'Checked', status: 'COMPLETED', detail: 'AI Score: 5% · Legal Check: PASS'},
      {step: 'PRESERVATION_CHECK', label: 'Quality Verified', status: 'COMPLETED', detail: '100% legal meaning & obligation preservation'},
      {step: 'FINALIZE', label: 'Finalized', status: 'COMPLETED', detail: 'v1 Draft through v4 Final saved'},
    ],
    retryCount: 0,
    processingDurationMs: 1310,
    createdAt: '2026-10-16T21:12:00Z',
    updatedAt: '2026-10-16T21:12:02Z',
    completedAt: '2026-10-16T21:12:02Z',
    docStudioMeta: {
      documentType: 'Website Development Agreement',
      jurisdiction: 'United States',
      isLegalDocument: true,
      templateId: 'website-dev-agreement',
      templateVersion: '2.4.0',
      knowledgeBaseVersion: 'KB-2.4.0 (United States)',
      variables: {
        CLIENT_NAME: 'Horizon Retail Group LLC',
        DEVELOPER_NAME: 'Studio Vertex Digital Inc.',
        EFFECTIVE_DATE: '2026-10-16',
        PROJECT_DESCRIPTION: 'Full-stack e-commerce web application with Next.js, custom checkout, and CMS integration.',
        TOTAL_PRICE: '$24,500 USD',
        PAYMENT_SCHEDULE: '40% upon signing, 30% upon staging approval, 30% upon production launch',
        DELIVERY_DATE: '2026-12-15',
        REVISIONS_COUNT: '3 rounds per milestone',
        IP_OWNERSHIP: 'Full assignment to Client upon receipt of final milestone payment',
        NOTICE_PERIOD: '14 calendar days written notice',
      },
      missingFields: [],
      legalQualityStatus: 'PASS',
      legalWarnings: [],
      disclaimerText: settings.legalDisclaimerText,
      disclaimerEnabled: true,
      sourcesUsed: [
        {
          sectionTitle: '1. Introduction & Parties',
          sourceTitle: 'US Commercial Web & Software IP Assignment & Liability Framework',
          knowledgeEntryId: 'kb-us-web-dev',
          category: 'INTERNAL TEMPLATE',
          jurisdiction: 'United States',
          version: '2.4.0',
          lastUpdated: '2026-10-01',
        },
        {
          sectionTitle: '5. Intellectual Property Rights',
          sourceTitle: 'US Commercial Web & Software IP Assignment & Liability Framework',
          knowledgeEntryId: 'kb-us-web-dev',
          category: 'INTERNAL TEMPLATE',
          jurisdiction: 'United States',
          version: '2.4.0',
          lastUpdated: '2026-10-01',
        },
        {
          sectionTitle: '6. Limitation of Liability & Governing Law',
          sourceTitle: 'US Commercial Web & Software IP Assignment & Liability Framework',
          knowledgeEntryId: 'kb-us-web-dev',
          category: 'INTERNAL TEMPLATE',
          jurisdiction: 'United States',
          version: '2.4.0',
          lastUpdated: '2026-10-01',
        },
      ],
    },
  };

  return {
    settings,
    secrets,
    documents: [sampleDoc, studioSampleDoc],
    jobs: [
      {
        id: 'job-sample-1',
        traceId: sampleTraceId,
        documentId: sampleId,
        documentName: 'Research-Paper.docx',
        status: 'COMPLETED',
        currentStep: 'COMPLETED',
        progressPercent: 100,
        retryCount: 0,
        maxRetries: 3,
        startedAt: '2026-10-16T21:10:00Z',
        completedAt: '2026-10-16T21:10:03Z',
      },
    ],
    logs: [
      {
        id: 'log-1',
        traceId: sampleTraceId,
        level: 'INFO',
        stage: 'UPLOAD',
        documentId: sampleId,
        message: 'Uploaded Research-Paper.docx (47.2 KB). Working copy created; original file locked.',
        timestamp: '2026-10-16T21:10:00Z',
      },
      {
        id: 'log-2',
        traceId: sampleTraceId,
        level: 'INFO',
        stage: 'PROTECTION',
        documentId: sampleId,
        message: `Protected-Content Map built: ${protectedMap.entities.length} protected items (dates, currencies, citations, URLs, ISO standards).`,
        timestamp: '2026-10-16T21:10:01Z',
      },
      {
        id: 'log-3',
        traceId: sampleTraceId,
        level: 'INFO',
        stage: 'CHECKER',
        documentId: sampleId,
        message: 'Quality & AI Detection Check passed: AI Score 6% (Confidence 94%). Preservation 100%.',
        timestamp: '2026-10-16T21:10:02Z',
      },
      {
        id: 'log-4',
        traceId: sampleTraceId,
        level: 'INFO',
        stage: 'FINALIZE',
        documentId: sampleId,
        message: 'All 10 Quality Control checks verified. Document marked COMPLETED.',
        timestamp: '2026-10-16T21:10:03Z',
      },
    ],
    apiUsage: [
      {
        id: 'api-1',
        provider: 'HumanFlow Demo Engine',
        requestType: 'HUMANIZE',
        status: 'SUCCESS',
        durationMs: 112,
        tokensOrChars: 1140,
        traceId: sampleTraceId,
        createdAt: '2026-10-16T21:10:02Z',
      },
      {
        id: 'api-2',
        provider: 'HumanFlow Quality & Stylometric Analyzer (Demo)',
        requestType: 'CHECK',
        status: 'SUCCESS',
        durationMs: 48,
        tokensOrChars: 1065,
        traceId: sampleTraceId,
        createdAt: '2026-10-16T21:10:03Z',
      },
    ],
    notifications: [
      {
        id: 'notif-1',
        userId: 'user-admin-1',
        title: 'Document Completed — Research-Paper.docx',
        message: 'Humanization and preservation verification passed (AI Score: 6%, Preservation: 100%). Ready for download.',
        type: 'SUCCESS',
        documentId: sampleId,
        traceId: sampleTraceId,
        discordSent: false,
        read: false,
        createdAt: '2026-10-16T21:10:03Z',
      },
      {
        id: 'notif-2',
        userId: 'user-admin-1',
        title: 'Legal Draft & Humanization Complete — Website Development Agreement',
        message: 'Generated from Approved US Knowledge Base v2.4.0 (AI Score: 5%, Legal Check: PASS).',
        type: 'SUCCESS',
        documentId: studioSampleId,
        traceId: studioTraceId,
        discordSent: false,
        read: false,
        createdAt: '2026-10-16T21:12:02Z',
      },
    ],
    knowledgeBase,
    knowledgeConflicts,
    documentTypes: INITIAL_DOCUMENT_TYPES,
    legalAuditLogs: [
      {
        id: 'audit-init-1',
        user: 'System Architect (Admin)',
        action: 'DOCUMENT_DRAFTED_AND_HUMANIZED',
        documentId: studioSampleId,
        documentName: 'Website-Development-Agreement-United-States.docx',
        version: 'v4 Final',
        templateName: 'Website Development Agreement (v2.4.0)',
        knowledgeBaseVersion: 'KB-2.4.0 (United States)',
        humanizerRun: true,
        checkerRun: true,
        finalStatus: 'PASS',
        timestamp: '2026-10-16T21:12:02Z',
      },
    ],
  };
}

// Global singleton in Node process + debounced non-blocking disk persistence
const globalForDb = globalThis as unknown as {
  __humanFlowStateV4?: DatabaseState;
  __humanFlowPersistTimer?: ReturnType<typeof setTimeout> | null;
};
function resolveDbPath(): string {
  if (process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME) {
    return path.join(os.tmpdir(), 'humanflow_v4_db.json');
  }
  try {
    const localDir = path.join(process.cwd(), 'storage');
    if (!fs.existsSync(localDir)) {
      fs.mkdirSync(localDir, {recursive: true});
    }
    return path.join(localDir, 'humanflow_v4_db.json');
  } catch {
    return path.join(os.tmpdir(), 'humanflow_v4_db.json');
  }
}
const ACTIVE_DB_FILE_PATH = resolveDbPath();
let storageDirInitialized = false;

function loadState(): DatabaseState {
  if (globalForDb.__humanFlowStateV4) {
    return globalForDb.__humanFlowStateV4;
  }
  try {
    if (fs.existsSync(ACTIVE_DB_FILE_PATH)) {
      const raw = fs.readFileSync(ACTIVE_DB_FILE_PATH, 'utf-8');
      const parsed = JSON.parse(raw) as DatabaseState;
      if (parsed && parsed.documents && parsed.settings) {
        if (parsed.settings.processingMode !== 'DEMO' && parsed.settings.processingMode !== 'LIVE') {
          parsed.settings.processingMode = 'DEMO';
        }
        globalForDb.__humanFlowStateV4 = parsed;
        return parsed;
      }
    }
  } catch {
    // Fallback to fresh seed state
  }
  const seeded = buildInitialSeedState();
  globalForDb.__humanFlowStateV4 = seeded;
  persistState(seeded);
  return seeded;
}

function persistState(state: DatabaseState) {
  globalForDb.__humanFlowStateV4 = state;
  if (globalForDb.__humanFlowPersistTimer) {
    clearTimeout(globalForDb.__humanFlowPersistTimer);
  }
  globalForDb.__humanFlowPersistTimer = setTimeout(() => {
    globalForDb.__humanFlowPersistTimer = null;
    try {
      if (!storageDirInitialized) {
        storageDirInitialized = true;
        const dir = path.dirname(ACTIVE_DB_FILE_PATH);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, {recursive: true});
        }
      }
      const serialized = JSON.stringify(state, null, 2);
      void fs.promises.writeFile(ACTIVE_DB_FILE_PATH, serialized, 'utf-8').catch(() => {});
    } catch {
      // Kept in memory if filesystem is read-only
    }
  }, 120);
}

export function getDbState(): DatabaseState {
  return loadState();
}

export function getRuntimeSecretsAndSettings() {
  const state = loadState();
  return {
    settings: state.settings,
    secrets: state.secrets,
  };
}

export function updatePlatformSettings(
  updates: Partial<PlatformSettings> & {
    rawHumanizerApiKey?: string;
    rawCheckerApiKey?: string;
    rawDiscordWebhookUrl?: string;
  }
): PlatformSettings {
  const state = loadState();

  if (updates.rawHumanizerApiKey && !updates.rawHumanizerApiKey.includes('***')) {
    state.secrets.humanizerApiKey = updates.rawHumanizerApiKey.trim();
    state.settings.humanizerApiKeyMasked = maskSecretKey(updates.rawHumanizerApiKey);
  }
  if (updates.rawCheckerApiKey && !updates.rawCheckerApiKey.includes('***')) {
    state.secrets.checkerApiKey = updates.rawCheckerApiKey.trim();
    state.settings.checkerApiKeyMasked = maskSecretKey(updates.rawCheckerApiKey);
  }
  if (updates.rawDiscordWebhookUrl !== undefined && !updates.rawDiscordWebhookUrl.includes('***')) {
    state.secrets.discordWebhookUrl = updates.rawDiscordWebhookUrl.trim();
    state.settings.discordWebhookUrlMasked = updates.rawDiscordWebhookUrl
      ? maskSecretKey(updates.rawDiscordWebhookUrl)
      : '';
  }

  if (updates.humanizerApiUrl !== undefined) {
    state.secrets.humanizerApiUrl = updates.humanizerApiUrl.trim();
  }
  if (updates.checkerApiUrl !== undefined) {
    state.secrets.checkerApiUrl = updates.checkerApiUrl.trim();
  }

  const {
    rawHumanizerApiKey: _h,
    rawCheckerApiKey: _c,
    rawDiscordWebhookUrl: _d,
    ...cleanUpdates
  } = updates;

  state.settings = {
    ...state.settings,
    ...cleanUpdates,
    humanizerApiKeyMasked: state.settings.humanizerApiKeyMasked,
    checkerApiKeyMasked: state.settings.checkerApiKeyMasked,
    discordWebhookUrlMasked: state.settings.discordWebhookUrlMasked,
  };

  persistState(state);
  return state.settings;
}

export function saveDocumentRecord(doc: DocumentRecord) {
  const state = loadState();
  const idx = state.documents.findIndex((d) => d.id === doc.id);
  if (idx >= 0) {
    state.documents[idx] = doc;
  } else {
    state.documents.unshift(doc);
  }
  persistState(state);
}

export function getDocumentById(id: string): DocumentRecord | undefined {
  return loadState().documents.find((d) => d.id === id);
}

export function deleteDocumentRecord(id: string): boolean {
  const state = loadState();
  const targetDoc = state.documents.find((d) => d.id === id);
  if (!targetDoc) {
    return false;
  }

  // Remove document from documents array
  state.documents = state.documents.filter((d) => d.id !== id);

  // Remove related processing jobs
  state.jobs = state.jobs.filter((j) => j.documentId !== id);

  // Delete physical files and clean in-memory mirror
  deleteFromPrivateStorage(id);

  // Record audit trail in system logs
  state.logs.unshift({
    id: `log-del-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
    timestamp: new Date().toISOString(),
    traceId: targetDoc.traceId || `DEL-${id}`,
    level: 'INFO',
    stage: 'FINALIZATION',
    documentId: id,
    message: `Document "${targetDoc.originalName}" (ID: ${id}) was permanently deleted from storage and active records.`,
  });

  persistState(state);
  return true;
}

export function deleteBatchDocumentRecords(ids: string[]): {
  deletedCount: number;
  deletedIds: string[];
} {
  const state = loadState();
  const idSet = new Set(ids);
  const deletedIds: string[] = [];

  const remainingDocs: DocumentRecord[] = [];
  for (const doc of state.documents) {
    if (idSet.has(doc.id)) {
      deletedIds.push(doc.id);
      deleteFromPrivateStorage(doc.id);
      state.logs.unshift({
        id: `log-del-${doc.id}-${Date.now()}`,
        timestamp: new Date().toISOString(),
        traceId: doc.traceId || `DEL-${doc.id}`,
        level: 'INFO',
        stage: 'FINALIZATION',
        documentId: doc.id,
        message: `Document "${doc.originalName}" was permanently removed in batch deletion.`,
      });
    } else {
      remainingDocs.push(doc);
    }
  }

  state.documents = remainingDocs;
  state.jobs = state.jobs.filter((j) => !idSet.has(j.documentId));

  persistState(state);
  return {deletedCount: deletedIds.length, deletedIds};
}

export function upsertProcessingJob(job: ProcessingJob) {
  const state = loadState();
  const idx = state.jobs.findIndex((j) => j.documentId === job.documentId);
  if (idx >= 0) {
    state.jobs[idx] = job;
  } else {
    state.jobs.unshift(job);
  }
  persistState(state);
}

export function addSystemLog(entry: Omit<SystemLogEntry, 'id' | 'timestamp'>) {
  const state = loadState();
  state.logs.unshift({
    ...entry,
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  if (state.logs.length > 250) {
    state.logs = state.logs.slice(0, 250);
  }
  persistState(state);
}

export function recordApiUsage(usage: Omit<ApiUsageRecord, 'id' | 'createdAt'>) {
  const state = loadState();
  state.apiUsage.unshift({
    ...usage,
    id: `api-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    createdAt: new Date().toISOString(),
  });
  persistState(state);
}

export function addNotification(notif: Omit<AppNotification, 'id' | 'createdAt' | 'read'>) {
  const state = loadState();
  state.notifications.unshift({
    ...notif,
    id: `notif-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  });
  persistState(state);
}

export function addLegalAuditLog(entry: Omit<LegalAuditLog, 'id' | 'timestamp'>) {
  const state = loadState();
  state.legalAuditLogs.unshift({
    ...entry,
    id: `audit-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    timestamp: new Date().toISOString(),
  });
  persistState(state);
}

export function upsertKnowledgeEntry(entry: LegalKnowledgeEntry) {
  const state = loadState();
  const idx = state.knowledgeBase.findIndex((k) => k.id === entry.id);
  if (idx >= 0) {
    state.knowledgeBase[idx] = entry;
  } else {
    state.knowledgeBase.unshift(entry);
  }

  // Automatic Legal Conflict Detection: check if another active entry exists for same Jurisdiction + DocumentType with different version
  const duplicateCandidates = state.knowledgeBase.filter(
    (k) =>
      k.id !== entry.id &&
      k.jurisdiction === entry.jurisdiction &&
      k.documentType === entry.documentType &&
      k.status !== 'Archived'
  );

  for (const other of duplicateCandidates) {
    const existingConflict = state.knowledgeConflicts.find(
      (c) =>
        (c.entryAId === entry.id && c.entryBId === other.id) ||
        (c.entryAId === other.id && c.entryBId === entry.id)
    );
    if (!existingConflict) {
      state.knowledgeConflicts.unshift({
        id: `conflict-${Date.now()}`,
        entryAId: other.id,
        entryATitle: `${other.title} (v${other.version})`,
        entryBId: entry.id,
        entryBTitle: `${entry.title} (v${entry.version})`,
        jurisdiction: entry.jurisdiction,
        documentType: entry.documentType,
        conflictDescription: `Multiple knowledge base entries target ${entry.documentType} in ${entry.jurisdiction} (${other.version} vs ${entry.version}). Admin resolution required.`,
        status: 'OPEN',
        detectedAt: new Date().toISOString(),
      });
    }
  }

  persistState(state);
}

export function resolveKnowledgeConflict(conflictId: string, winningEntryId: string) {
  const state = loadState();
  const conflict = state.knowledgeConflicts.find((c) => c.id === conflictId);
  if (conflict) {
    conflict.status = 'RESOLVED';
    conflict.resolvedWithEntryId = winningEntryId;
    const losingId = conflict.entryAId === winningEntryId ? conflict.entryBId : conflict.entryAId;
    const winEntry = state.knowledgeBase.find((k) => k.id === winningEntryId);
    const loseEntry = state.knowledgeBase.find((k) => k.id === losingId);
    if (winEntry) winEntry.status = 'Approved';
    if (loseEntry) loseEntry.status = 'Archived';
    persistState(state);
  }
}

export function addCustomDocumentType(newType: DocumentTypeDefinition) {
  const state = loadState();
  if (!state.documentTypes.some((d) => d.id === newType.id)) {
    state.documentTypes.push(newType);
    persistState(state);
  }
}
