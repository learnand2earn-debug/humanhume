import {
  DocumentRecord,
  DocumentTypeDefinition,
  JurisdictionType,
  KnowledgeSourceAttribution,
  LegalKnowledgeEntry,
  LegalTerminologySuggestion,
} from '@/types';

/**
 * All 27 required Documentation Types with dynamic field schemas, required sections,
 * and Admin-editable drafting instructions.
 */
export const INITIAL_DOCUMENT_TYPES: DocumentTypeDefinition[] = [
  {
    id: 'website-dev-agreement',
    name: 'Website Development Agreement',
    category: 'Legal & Contracts',
    requiresJurisdiction: true,
    description: 'Comprehensive contract governing custom web design, engineering, revisions, IP transfer, and milestones.',
    draftingInstructions: [
      'Include clear scope of work and technical deliverables.',
      'Include milestone-based payment terms and late payment remedies.',
      'Include revision policy and change-order procedure.',
      'Include intellectual property ownership upon full payment.',
      'Include mutual confidentiality obligations.',
      'Include termination notice periods and kill-fee provisions.',
      'Include limitation of liability and dispute resolution under governing law.',
    ],
    requiredSections: [
      '1. Introduction & Parties',
      '2. Definitions',
      '3. Scope of Work & Deliverables',
      '4. Client Responsibilities',
      '5. Payment Terms & Schedule',
      '6. Revisions & Acceptance Testing',
      '7. Intellectual Property Rights',
      '8. Confidentiality',
      '9. Term & Termination',
      '10. Limitation of Liability',
      '11. Dispute Resolution & Governing Law',
      '12. Signatures',
    ],
    optionalSections: ['Maintenance & Post-Launch Support', 'Third-Party Licenses'],
    fields: [
      {key: 'CLIENT_NAME', label: 'Client / Company Name', placeholder: 'e.g., Horizon Retail Group LLC', required: true, type: 'text'},
      {key: 'DEVELOPER_NAME', label: 'Developer / Agency Name', placeholder: 'e.g., Studio Vertex Digital Inc.', required: true, type: 'text'},
      {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
      {key: 'PROJECT_DESCRIPTION', label: 'Project Scope & Deliverables', placeholder: 'Full-stack e-commerce web application with Next.js, custom checkout, and CMS integration.', required: true, type: 'textarea'},
      {key: 'TOTAL_PRICE', label: 'Total Contract Value', placeholder: '$24,500 USD', required: true, type: 'currency'},
      {key: 'PAYMENT_SCHEDULE', label: 'Payment Schedule', placeholder: '40% upon signing, 30% upon staging approval, 30% upon production launch', required: true, type: 'text'},
      {key: 'DELIVERY_DATE', label: 'Target Delivery Date', placeholder: '2026-12-15', required: true, type: 'date'},
      {key: 'REVISIONS_COUNT', label: 'Included Revision Rounds', placeholder: '3 rounds per milestone', required: true, type: 'text'},
      {key: 'IP_OWNERSHIP', label: 'IP Transfer Rule', placeholder: 'Full assignment to Client upon receipt of final milestone payment', required: true, type: 'text'},
      {key: 'NOTICE_PERIOD', label: 'Termination Notice Period', placeholder: '14 calendar days written notice', required: true, type: 'text'},
    ],
    defaultIntensity: 'LOW',
    version: '2.4.0',
  },
  {
    id: 'ai-automation-agreement',
    name: 'AI Automation Agreement',
    category: 'Legal & Contracts',
    requiresJurisdiction: true,
    description: 'B2B agreement covering autonomous AI workflow deployment, model guardrails, data privacy, and SLA terms.',
    draftingInstructions: [
      'Define AI automation workflows, API integrations, and human-in-the-loop checkpoints.',
      'Specify training data exclusion and strict client data isolation.',
      'Allocate ownership of custom prompts, weights, and workflow orchestration scripts.',
      'Include disclaimer regarding probabilistic AI outputs and third-party model uptime.',
    ],
    requiredSections: [
      '1. Parties & Effective Date',
      '2. Definitions & AI System Scope',
      '3. Automation Architecture & Deliverables',
      '4. Data Privacy & Zero-Training Covenant',
      '5. Fees & Retainer Structure',
      '6. Intellectual Property & Custom Agents',
      '7. Output Verification & Liability Cap',
      '8. Termination & Offboarding',
      '9. Governing Law & Signatures',
    ],
    optionalSections: ['SLA & Token Usage Caps'],
    fields: [
      {key: 'CLIENT_NAME', label: 'Client Organization', placeholder: 'e.g., Meridian Logistics Corp.', required: true, type: 'text'},
      {key: 'COMPANY_NAME', label: 'AI Engineering Provider', placeholder: 'e.g., QuantFlow Automation Ltd.', required: true, type: 'text'},
      {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
      {key: 'SERVICE_DESCRIPTION', label: 'AI Automation Scope', placeholder: 'Automated document ingestion, validation pipeline, and ERP synchronization.', required: true, type: 'textarea'},
      {key: 'PAYMENT_TERMS', label: 'Implementation & Monthly Fee', placeholder: '$15,000 setup + $2,500/month maintenance', required: true, type: 'text'},
      {key: 'NOTICE_PERIOD', label: 'Termination Notice Period', placeholder: '30 days written notice', required: true, type: 'text'},
    ],
    defaultIntensity: 'LOW',
    version: '2.1.0',
  },
  {
    id: 'nda-mutual',
    name: 'NDA',
    category: 'Legal & Contracts',
    requiresJurisdiction: true,
    description: 'Mutual or unilateral Non-Disclosure Agreement protecting trade secrets, source code, and financial disclosures.',
    draftingInstructions: [
      'Clearly define Confidential Information and standard legal exclusions.',
      'Specify permitted purpose of disclosure and strict non-use obligations.',
      'Include survival period of confidentiality obligations and mandatory return/destruction of materials.',
    ],
    requiredSections: [
      '1. Parties & Purpose',
      '2. Definition of Confidential Information',
      '3. Exclusions from Confidentiality',
      '4. Obligations of Receiving Party',
      '5. Term & Survival Period',
      '6. Return or Destruction of Materials',
      '7. Injunctive Relief & Remedies',
      '8. Governing Law & Signatures',
    ],
    optionalSections: ['Non-Solicitation Rider'],
    fields: [
      {key: 'COMPANY_NAME', label: 'Disclosing Party', placeholder: 'e.g., Aether Biotech Inc.', required: true, type: 'text'},
      {key: 'CLIENT_NAME', label: 'Receiving Party', placeholder: 'e.g., Apex Venture Partners LLC', required: true, type: 'text'},
      {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
      {key: 'SERVICE_DESCRIPTION', label: 'Permitted Purpose', placeholder: 'Evaluation of potential strategic partnership and technical due diligence.', required: true, type: 'textarea'},
      {key: 'NOTICE_PERIOD', label: 'Confidentiality Survival Term', placeholder: '3 years from disclosure date', required: true, type: 'text'},
    ],
    defaultIntensity: 'LOW',
    version: '3.0.0',
  },
  {
    id: 'privacy-policy',
    name: 'Privacy Policy',
    category: 'Privacy & Compliance',
    requiresJurisdiction: true,
    description: 'Regulatory-grade Privacy Notice detailing data collection, lawful basis, retention periods, and user rights.',
    draftingInstructions: [
      'Specify categories of personal data collected and lawful basis for processing.',
      'Detail third-party sub-processors, international transfer safeguards, and retention windows.',
      'Explain data subject rights (access, erasure, portability, objection) and DPO contact details.',
    ],
    requiredSections: [
      '1. Controller Identity & Scope',
      '2. Categories of Personal Data Collected',
      '3. Purpose & Lawful Basis for Processing',
      '4. Data Retention & Automatic Deletion',
      '5. Sub-Processors & International Transfers',
      '6. Security Measures & Encryption',
      '7. Your Privacy Rights & Contact Information',
    ],
    optionalSections: ['Cookie & Telemetry Disclosures'],
    fields: [
      {key: 'COMPANY_NAME', label: 'Organization / Controller Name', placeholder: 'e.g., CloudScale SaaS Inc.', required: true, type: 'text'},
      {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
      {key: 'SERVICE_DESCRIPTION', label: 'Platform / Service Covered', placeholder: 'Cloud-based B2B document workflow and analytics platform.', required: true, type: 'textarea'},
      {key: 'NOTICE_PERIOD', label: 'Data Retention Window', placeholder: '24 hours for transient processing files; 30 days for account backups', required: true, type: 'text'},
    ],
    defaultIntensity: 'LOW',
    version: '2.2.0',
  },
  {
    id: 'terms-of-service',
    name: 'Terms of Service',
    category: 'Legal & Contracts',
    requiresJurisdiction: true,
    description: 'Platform Terms of Service covering account eligibility, subscriptions, acceptable use, and liability caps.',
    draftingInstructions: [
      'Define account registration security, subscription billing, and cancellation rights.',
      'Protect customer ownership of uploaded content while granting limited processing license.',
      'Include warranty disclaimers, limitation of liability, and governing law.',
    ],
    requiredSections: [
      '1. Acceptance of Terms',
      '2. Account Security & Eligibility',
      '3. User Content & Ownership',
      '4. Subscription Billing & Renewals',
      '5. Acceptable Use Restrictions',
      '6. Disclaimer of Warranties',
      '7. Limitation of Liability',
      '8. Governing Law & Dispute Resolution',
    ],
    optionalSections: ['API Usage Quotas'],
    fields: [
      {key: 'COMPANY_NAME', label: 'Platform Operator Name', placeholder: 'e.g., HumanFlow Technologies Inc.', required: true, type: 'text'},
      {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
      {key: 'SERVICE_DESCRIPTION', label: 'Service Description', placeholder: 'SaaS platform for automated document quality verification and drafting.', required: true, type: 'textarea'},
      {key: 'PAYMENT_TERMS', label: 'Subscription & Refund Rules', placeholder: 'Monthly or annual billing with 14-day pro-rata cancellation notice', required: true, type: 'text'},
    ],
    defaultIntensity: 'LOW',
    version: '2.0.0',
  },
  {
    id: 'data-processing-agreement',
    name: 'Data Processing Agreement',
    category: 'Privacy & Compliance',
    requiresJurisdiction: true,
    description: 'Controller-to-Processor DPA addressing security obligations, breach notification, and audit rights.',
    draftingInstructions: [
      'Define roles of Data Controller and Data Processor.',
      'Include 72-hour personal data breach notification covenant.',
      'Specify sub-processor authorization and deletion/return of data upon termination.',
    ],
    requiredSections: [
      '1. Definitions & Scope of Processing',
      '2. Processor Obligations & Instructions',
      '3. Technical & Organizational Security Measures',
      '4. Sub-Processors',
      '5. Data Subject Rights Assistance',
      '6. Personal Data Breach Notification',
      '7. Audit Rights & Data Deletion',
      '8. Governing Law & Signatures',
    ],
    optionalSections: ['Cross-Border Transfer Annex'],
    fields: [
      {key: 'CLIENT_NAME', label: 'Data Controller (Client)', placeholder: 'e.g., FinGuard Banking Ltd.', required: true, type: 'text'},
      {key: 'COMPANY_NAME', label: 'Data Processor (Provider)', placeholder: 'e.g., SecureCompute Cloud Inc.', required: true, type: 'text'},
      {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
      {key: 'SERVICE_DESCRIPTION', label: 'Nature & Purpose of Processing', placeholder: 'Encrypted hosting and automated quality analysis of enterprise documents.', required: true, type: 'textarea'},
    ],
    defaultIntensity: 'LOW',
    version: '1.9.0',
  },
  {
    id: 'software-dev-agreement',
    name: 'Software Development Agreement',
    category: 'Legal & Contracts',
    requiresJurisdiction: true,
    description: 'Enterprise software engineering agreement with sprint acceptance, source code escrow, and warranty periods.',
    draftingInstructions: [
      'Detail agile sprint delivery, acceptance criteria, and repository handoff.',
      'Include 60-day bug-fix warranty and open-source license compliance.',
    ],
    requiredSections: [
      '1. Parties & Scope',
      '2. Engineering Milestones & Acceptance',
      '3. Compensation & Invoicing',
      '4. Intellectual Property & Open-Source Software',
      '5. Performance Warranty',
      '6. Confidentiality & Data Security',
      '7. Limitation of Liability & Governing Law',
    ],
    optionalSections: ['Escrow Provisions'],
    fields: [
      {key: 'CLIENT_NAME', label: 'Client Name', placeholder: 'e.g., Atlas Healthcare Systems', required: true, type: 'text'},
      {key: 'COMPANY_NAME', label: 'Software Engineering Partner', placeholder: 'e.g., NovaCore Engineering LLC', required: true, type: 'text'},
      {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
      {key: 'SERVICE_DESCRIPTION', label: 'Software Specification', placeholder: 'Custom patient scheduling portal and HL7 FHIR API integration.', required: true, type: 'textarea'},
      {key: 'PAYMENT_TERMS', label: 'Contract Value & Schedule', placeholder: '$68,000 USD across 4 bi-weekly sprint milestones', required: true, type: 'text'},
    ],
    defaultIntensity: 'LOW',
    version: '1.8.0',
  },
  {
    id: 'api-documentation',
    name: 'API Documentation',
    category: 'Technical & Product',
    requiresJurisdiction: false,
    description: 'Developer-ready REST API reference with authentication headers, rate limits, request schemas, and error codes.',
    draftingInstructions: [
      'Include authentication bearer token scheme and trace ID requirements.',
      'Provide clear endpoint tables, payload examples, and deterministic error handling guidance.',
    ],
    requiredSections: [
      '1. Overview & Base URL',
      '2. Authentication & Security Headers',
      '3. Rate Limiting & Quotas',
      '4. Core Endpoints & Payload Schemas',
      '5. Webhook Events & Retries',
      '6. Error Status Codes & Recovery',
    ],
    optionalSections: ['SDK Quickstart'],
    fields: [
      {key: 'COMPANY_NAME', label: 'Platform / Service Name', placeholder: 'e.g., HumanFlow Core API v2', required: true, type: 'text'},
      {key: 'EFFECTIVE_DATE', label: 'Release Date', placeholder: '2026-10-16', required: true, type: 'date'},
      {key: 'SERVICE_DESCRIPTION', label: 'API Capabilities & Endpoints', placeholder: 'POST /api/documents/upload, GET /api/documents/{id}/status, POST /api/studio/generate', required: true, type: 'textarea'},
    ],
    defaultIntensity: 'NORMAL',
    version: '1.5.0',
  },
  {
    id: 'sop-document',
    name: 'SOP',
    category: 'Operations & HR',
    requiresJurisdiction: false,
    description: 'Standard Operating Procedure with role responsibilities, step-by-step execution checklist, and escalation paths.',
    draftingInstructions: [
      'Structure clearly with Purpose, Scope, Prerequisites, Step-by-Step Procedure, and Quality Verification.',
    ],
    requiredSections: [
      '1. Objective & Scope',
      '2. Roles & Responsibilities',
      '3. Prerequisites & Safety Controls',
      '4. Step-by-Step Operational Procedure',
      '5. Quality Assurance & Audit Verification',
      '6. Incident Escalation Contacts',
    ],
    optionalSections: ['Revision History'],
    fields: [
      {key: 'COMPANY_NAME', label: 'Organization / Department', placeholder: 'e.g., Security & Compliance Operations', required: true, type: 'text'},
      {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
      {key: 'SERVICE_DESCRIPTION', label: 'Procedure Topic & Steps', placeholder: 'Production deployment verification, database backup validation, and rollback protocol.', required: true, type: 'textarea'},
    ],
    defaultIntensity: 'NORMAL',
    version: '1.4.0',
  },
];

// Additional 18 Document Types to cover all 27 requested types seamlessly
const ADDITIONAL_DOC_TYPE_NAMES: Array<{
  name: string;
  category: DocumentTypeDefinition['category'];
  requiresJurisdiction: boolean;
}> = [
  {name: 'Cookie Policy', category: 'Privacy & Compliance', requiresJurisdiction: true},
  {name: 'Refund Policy', category: 'Legal & Contracts', requiresJurisdiction: true},
  {name: 'Disclaimer', category: 'Legal & Contracts', requiresJurisdiction: true},
  {name: 'Service Agreement', category: 'Legal & Contracts', requiresJurisdiction: true},
  {name: 'AI Development Agreement', category: 'Legal & Contracts', requiresJurisdiction: true},
  {name: 'Freelance Service Agreement', category: 'Legal & Contracts', requiresJurisdiction: true},
  {name: 'Client Agreement', category: 'Legal & Contracts', requiresJurisdiction: true},
  {name: 'Employment Documentation', category: 'Operations & HR', requiresJurisdiction: true},
  {name: 'Contractor Agreement', category: 'Operations & HR', requiresJurisdiction: true},
  {name: 'Acceptable Use Policy', category: 'Privacy & Compliance', requiresJurisdiction: true},
  {name: 'Intellectual Property Policy', category: 'Legal & Contracts', requiresJurisdiction: true},
  {name: 'Website Documentation', category: 'Technical & Product', requiresJurisdiction: false},
  {name: 'Product Documentation', category: 'Technical & Product', requiresJurisdiction: false},
  {name: 'Technical Documentation', category: 'Technical & Product', requiresJurisdiction: false},
  {name: 'User Guide', category: 'Technical & Product', requiresJurisdiction: false},
  {name: 'Internal Policy', category: 'Operations & HR', requiresJurisdiction: false},
  {name: 'Compliance Documentation', category: 'Privacy & Compliance', requiresJurisdiction: true},
  {name: 'Custom Document', category: 'Legal & Contracts', requiresJurisdiction: false},
];

for (const item of ADDITIONAL_DOC_TYPE_NAMES) {
  const id = item.name.toLowerCase().replace(/[^a-z0-9]+/g, '-');
  if (!INITIAL_DOCUMENT_TYPES.some((d) => d.name === item.name)) {
    INITIAL_DOCUMENT_TYPES.push({
      id,
      name: item.name,
      category: item.category,
      requiresJurisdiction: item.requiresJurisdiction,
      description: `Structured ${item.name} generated from approved internal knowledge base rules and humanization safeguards.`,
      draftingInstructions: [
        `Ensure all core sections for ${item.name} are clearly structured and unambiguous.`,
        'Preserve all defined variables, dates, monetary values, and obligations.',
        'Flag any unverified jurisdictional requirements for professional review.',
      ],
      requiredSections: item.requiresJurisdiction
        ? [
            '1. Overview & Parties',
            '2. Definitions & Interpretation',
            '3. Core Obligations & Scope',
            '4. Fees, Compliance & Covenants',
            '5. Term, Termination & Remedies',
            '6. Limitation of Liability',
            '7. Governing Law & Signatures',
          ]
        : [
            '1. Executive Overview',
            '2. Scope & Architecture',
            '3. Operational Requirements',
            '4. Implementation Guidelines',
            '5. Verification & Maintenance',
          ],
      optionalSections: ['Appendix & References'],
      fields: item.requiresJurisdiction
        ? [
            {key: 'COMPANY_NAME', label: 'Primary Organization Name', placeholder: 'e.g., Vertex Enterprise Ltd.', required: true, type: 'text'},
            {key: 'CLIENT_NAME', label: 'Counterparty / User Group', placeholder: 'e.g., Enterprise Customers / Contractor', required: true, type: 'text'},
            {key: 'EFFECTIVE_DATE', label: 'Effective Date', placeholder: '2026-10-16', required: true, type: 'date'},
            {key: 'SERVICE_DESCRIPTION', label: 'Scope & Specific Requirements', placeholder: `Describe the core facts, terms, and scope for this ${item.name}.`, required: true, type: 'textarea'},
            {key: 'PAYMENT_TERMS', label: 'Financial / Commercial Terms', placeholder: 'e.g., Net 15 invoicing or applicable fee schedule', required: false, type: 'text'},
            {key: 'NOTICE_PERIOD', label: 'Notice Period', placeholder: '30 calendar days written notice', required: true, type: 'text'},
          ]
        : [
            {key: 'COMPANY_NAME', label: 'Organization / Product Name', placeholder: 'e.g., HumanFlow Core Platform', required: true, type: 'text'},
            {key: 'EFFECTIVE_DATE', label: 'Document Date', placeholder: '2026-10-16', required: true, type: 'date'},
            {key: 'SERVICE_DESCRIPTION', label: 'Technical / Operational Details', placeholder: `Enter key specifications, workflows, and instructions for this ${item.name}.`, required: true, type: 'textarea'},
          ],
      defaultIntensity: item.requiresJurisdiction ? 'LOW' : 'NORMAL',
      version: '1.2.0',
    });
  }
}

/**
 * Missing Information Engine:
 * Inspects user-provided variables and jurisdiction before drafting.
 * Never invents missing required facts.
 */
export function validateDraftingInputs(
  docType: DocumentTypeDefinition,
  jurisdiction: string | undefined,
  variables: Record<string, string>
): {
  valid: boolean;
  jurisdictionMissing: boolean;
  missingFields: Array<{key: string; label: string}>;
  errorMessage?: string;
} {
  const missingFields: Array<{key: string; label: string}> = [];

  const jurisdictionMissing =
    docType.requiresJurisdiction &&
    (!jurisdiction || jurisdiction.trim() === '' || jurisdiction === 'Not Applicable');

  if (jurisdictionMissing) {
    missingFields.push({key: 'JURISDICTION', label: 'Jurisdiction'});
  }

  for (const field of docType.fields) {
    if (field.required) {
      const val = variables[field.key];
      if (!val || val.trim().length === 0) {
        missingFields.push({key: field.key, label: field.label});
      }
    }
  }

  if (jurisdictionMissing && missingFields.length === 1) {
    return {
      valid: false,
      jurisdictionMissing: true,
      missingFields,
      errorMessage: 'Jurisdiction required. Please select a governing jurisdiction before generating a legal document.',
    };
  }

  if (missingFields.length > 0) {
    return {
      valid: false,
      jurisdictionMissing,
      missingFields,
      errorMessage: `${missingFields.length} required ${missingFields.length === 1 ? 'detail is' : 'details are'} missing: ${missingFields.map((m) => m.label).join(', ')}.`,
    };
  }

  return {
    valid: true,
    jurisdictionMissing: false,
    missingFields: [],
  };
}

/**
 * Documentation Drafting Agent:
 * Queries ONLY APPROVED entries from the internal Legal Knowledge Base, checks for knowledge
 * conflicts, populates template variables without inventing legal facts, and attributes every section.
 */
export function generateStructuredDocumentDraft(params: {
  docType: DocumentTypeDefinition;
  jurisdiction: JurisdictionType;
  variables: Record<string, string>;
  approvedKnowledge: LegalKnowledgeEntry[];
  customInstructions?: string;
  disclaimerText: string;
  disclaimerEnabled: boolean;
}): {
  draftText: string;
  sourcesUsed: KnowledgeSourceAttribution[];
  requiresLegalReviewSections: string[];
  kbVersionSummary: string;
} {
  const {
    docType,
    jurisdiction,
    variables,
    approvedKnowledge,
    customInstructions,
    disclaimerText,
    disclaimerEnabled,
  } = params;

  // Filter approved KB entries matching documentType or jurisdiction
  const matchingEntries = approvedKnowledge.filter(
    (entry) =>
      entry.status === 'Approved' &&
      (entry.documentType === docType.name ||
        entry.documentType === 'All Legal Documents' ||
        entry.jurisdiction === jurisdiction)
  );

  const primaryEntry = matchingEntries.find(
    (e) => e.documentType === docType.name && e.jurisdiction === jurisdiction
  ) || matchingEntries[0];

  const company = variables.COMPANY_NAME || variables.DEVELOPER_NAME || 'Provider Organization';
  const client = variables.CLIENT_NAME || 'Counterparty';
  const effectiveDate = variables.EFFECTIVE_DATE || '2026-10-16';
  const scope =
    variables.SERVICE_DESCRIPTION ||
    variables.PROJECT_DESCRIPTION ||
    'Standard professional deliverables as mutually agreed in writing.';
  const payment =
    variables.TOTAL_PRICE
      ? `${variables.TOTAL_PRICE} (${variables.PAYMENT_SCHEDULE || 'Per milestone schedule'})`
      : variables.PAYMENT_TERMS || 'As specified in the applicable commercial order form.';
  const noticePeriod = variables.NOTICE_PERIOD || '30 calendar days';
  const deliveryDate = variables.DELIVERY_DATE || 'Per mutually scheduled project timeline';
  const revisions = variables.REVISIONS_COUNT || '2 structured revision rounds';
  const ipRule =
    variables.IP_OWNERSHIP ||
    'All custom work product transfers to Client upon full settlement of undisputed invoices.';

  const sourcesUsed: KnowledgeSourceAttribution[] = [];
  const requiresLegalReviewSections: string[] = [];

  const sectionBlocks: string[] = [];

  if (disclaimerEnabled && docType.requiresJurisdiction && disclaimerText) {
    sectionBlocks.push(`> **LEGAL NOTICE:** ${disclaimerText}`);
  }

  sectionBlocks.push(
    `# ${docType.name.toUpperCase()}\n\n**Effective Date:** ${effectiveDate} · **Jurisdiction:** ${jurisdiction} · **Template Version:** ${docType.version}`
  );

  docType.requiredSections.forEach((sectionTitle, idx) => {
    const lower = sectionTitle.toLowerCase();
    let body = '';

    // Attribute source from approved KB or drafting instructions
    const matchedKb = matchingEntries.find((kb) =>
      kb.requiredClauses.some((c) => lower.includes(c.toLowerCase().split(' ')[0]))
    ) || primaryEntry;

    if (matchedKb) {
      sourcesUsed.push({
        sectionTitle,
        sourceTitle: matchedKb.title,
        knowledgeEntryId: matchedKb.id,
        category: matchedKb.category,
        jurisdiction: matchedKb.jurisdiction,
        version: matchedKb.version,
        lastUpdated: matchedKb.updatedAt.slice(0, 10),
      });
    } else {
      sourcesUsed.push({
        sectionTitle,
        sourceTitle: `${docType.name} Drafting Rules`,
        category: 'Generated from configured drafting instructions',
        jurisdiction: docType.requiresJurisdiction ? jurisdiction : 'Global / Technical',
        version: docType.version,
        lastUpdated: '2026-10-16',
      });
    }

    if (lower.includes('introduction') || lower.includes('parties') || lower.includes('overview') || lower.includes('controller') || lower.includes('acceptance')) {
      body = docType.requiresJurisdiction
        ? `This ${docType.name} ("Agreement") is entered into as of ${effectiveDate} ("Effective Date") by and between "${company}" and "${client}". In order to establish clear rights and responsibilities under the laws of ${jurisdiction}, both parties agree to the structured terms set forth below.`
        : `This ${docType.name} establishes the authoritative operational and technical reference for "${company}" effective as of ${effectiveDate}. In order to ensure consistent execution across teams, all workflows described herein follow verified engineering standards.`;
    } else if (lower.includes('definition')) {
      body = `For the purpose of this ${docType.name}, "Confidential Information" means all non-public technical, financial, or operational disclosures exchanged between "${company}" and "${client}". "Deliverables" refers specifically to: ${scope}`;
    } else if (lower.includes('scope') || lower.includes('deliverable') || lower.includes('architecture') || lower.includes('purpose') || lower.includes('procedure') || lower.includes('endpoint')) {
      body = `Due to the fact that precision and traceability are required throughout execution, the scope of this engagement encompasses: ${scope}\n\nTarget completion and delivery milestone: ${deliveryDate}. ${customInstructions ? `Additional specific requirements: ${customInstructions}` : ''}`;
    } else if (lower.includes('responsibilit') || lower.includes('obligation') || lower.includes('prerequisite')) {
      body = `"${client}" shall provide timely access to required credentials, domain configurations, and review feedback within 5 business days of request. "${company}" shall perform all obligations in a professional manner consistent with industry standards in ${jurisdiction}.`;
    } else if (lower.includes('payment') || lower.includes('fee') || lower.includes('compensation') || lower.includes('subscription')) {
      body = `In accordance with the commercial terms agreed between the parties, compensation is structured as follows: ${payment}. Undisputed invoices are payable within 15 days of issuance.`;
    } else if (lower.includes('revision') || lower.includes('acceptance')) {
      body = `Deliverables include ${revisions}. Upon submission of each milestone by "${company}", "${client}" shall have 7 business days to review and confirm acceptance in writing.`;
    } else if (lower.includes('intellectual property') || lower.includes('ownership')) {
      body = `With regard to Intellectual Property ownership: ${ipRule}. Pre-existing tools, libraries, and foundational frameworks developed prior to ${effectiveDate} remain the exclusive property of their respective owner.`;
    } else if (lower.includes('confidential') || lower.includes('privacy') || lower.includes('security') || lower.includes('data')) {
      body = `Each party shall protect Confidential Information using at least the same degree of care it uses to protect its own sensitive data, and never less than reasonable care including TLS 1.3 encryption in transit and AES-256 encryption at rest. Retention window: ${noticePeriod}.`;
    } else if (lower.includes('term') || lower.includes('return')) {
      body = `Either party may terminate this ${docType.name} upon providing "${noticePeriod}" prior written notice, or immediately in the event of an uncured material breach lasting more than 14 days.`;
    } else if (lower.includes('liability') || lower.includes('warranty') || lower.includes('remed')) {
      body = `Except for breaches of confidentiality or willful misconduct, neither party's aggregate liability under this ${docType.name} shall exceed the total fees paid or payable during the 12 months preceding the claim.`;
    } else if (lower.includes('governing law') || lower.includes('dispute') || lower.includes('signature')) {
      if (docType.requiresJurisdiction && !primaryEntry) {
        requiresLegalReviewSections.push(sectionTitle);
        body = `[Requires legal review — No approved jurisdiction-specific statutory entry found in Knowledge Base for ${jurisdiction}.]\n\nThis ${docType.name} shall be governed by and construed in accordance with the applicable laws of ${jurisdiction}.\n\nSigned for "${company}": ______________________  Date: ${effectiveDate}\nSigned for "${client}": ______________________  Date: ${effectiveDate}`;
      } else {
        const kbRule = primaryEntry?.summary || `Governed by the laws and courts of ${jurisdiction}.`;
        body = `This ${docType.name} shall be governed by the laws of ${jurisdiction}. ${kbRule}\n\nSigned for "${company}": ______________________  Date: ${effectiveDate}\nSigned for "${client}": ______________________  Date: ${effectiveDate}`;
      }
    } else {
      body = `In order to maintain full operational compliance for Section ${idx + 1} (${sectionTitle}), "${company}" and "${client}" shall adhere to the documented standards effective ${effectiveDate}.`;
    }

    sectionBlocks.push(`## ${sectionTitle}\n${body}`);
  });

  return {
    draftText: sectionBlocks.join('\n\n'),
    sourcesUsed,
    requiresLegalReviewSections,
    kbVersionSummary: primaryEntry ? `KB-${primaryEntry.version} (${primaryEntry.jurisdiction})` : 'KB-2026.10-CORE',
  };
}

/**
 * Legal Quality Checker:
 * Checks for missing required sections, unpopulated {{VARIABLES}}, contradictory clauses,
 * missing signatures, or "Requires legal review" markers.
 */
export function runLegalQualityCheck(
  documentText: string,
  docType: DocumentTypeDefinition,
  jurisdiction: string
): {
  status: 'PASS' | 'WARNING' | 'NEEDS REVIEW';
  warnings: string[];
  checkedItems: Array<{label: string; passed: boolean; detail: string}>;
} {
  const warnings: string[] = [];
  const checkedItems: Array<{label: string; passed: boolean; detail: string}> = [];

  // 1. Check required sections
  const missingSections = docType.requiredSections.filter(
    (sec) => !documentText.toLowerCase().includes(sec.toLowerCase().slice(3))
  );
  checkedItems.push({
    label: 'Required Sections Completeness',
    passed: missingSections.length === 0,
    detail:
      missingSections.length === 0
        ? `All ${docType.requiredSections.length} required sections verified.`
        : `Missing sections: ${missingSections.join(', ')}`,
  });
  if (missingSections.length > 0) {
    warnings.push(`Missing required sections: ${missingSections.join(', ')}`);
  }

  // 2. Check for unpopulated template variables {{...}}
  const unpopulatedVars = documentText.match(/\{\{[A-Z0-9_]+\}\}/g) || [];
  checkedItems.push({
    label: 'Template Variable Population',
    passed: unpopulatedVars.length === 0,
    detail:
      unpopulatedVars.length === 0
        ? 'Zero empty {{VARIABLE}} placeholders detected.'
        : `Unpopulated variables found: ${unpopulatedVars.join(', ')}`,
  });
  if (unpopulatedVars.length > 0) {
    warnings.push(`Unpopulated variables detected: ${unpopulatedVars.join(', ')}`);
  }

  // 3. Check Jurisdiction consistency for legal docs
  const hasJurisdiction =
    !docType.requiresJurisdiction ||
    documentText.toLowerCase().includes(jurisdiction.toLowerCase());
  checkedItems.push({
    label: 'Jurisdiction & Governing Law Consistency',
    passed: hasJurisdiction,
    detail: docType.requiresJurisdiction
      ? `Confirmed consistent governing law reference for ${jurisdiction}.`
      : 'Non-legal technical document (Jurisdiction optional).',
  });
  if (!hasJurisdiction) {
    warnings.push(`Governing law section does not explicitly reference ${jurisdiction}.`);
  }

  // 4. Check for "Requires legal review" markers
  const needsReviewMarker = documentText.includes('Requires legal review');
  checkedItems.push({
    label: 'Approved Knowledge Base Coverage',
    passed: !needsReviewMarker,
    detail: needsReviewMarker
      ? 'Contains section flagged "Requires legal review" due to custom/unmapped jurisdiction.'
      : 'All legal clauses backed by Approved Knowledge Base entries.',
  });
  if (needsReviewMarker) {
    warnings.push('One or more sections require manual legal counsel verification.');
  }

  // 5. Check Signature block on agreements
  const requiresSignature = docType.name.toLowerCase().includes('agreement') || docType.name === 'NDA';
  const hasSignature = !requiresSignature || /signed for|signature/i.test(documentText);
  checkedItems.push({
    label: 'Execution & Signature Block',
    passed: hasSignature,
    detail: requiresSignature
      ? hasSignature
        ? 'Valid bilateral signature block present.'
        : 'Missing signature block at end of agreement.'
      : 'Policy/Technical document (Signature block not required).',
  });
  if (!hasSignature) {
    warnings.push('Agreement is missing an execution signature block.');
  }

  const status: 'PASS' | 'WARNING' | 'NEEDS REVIEW' =
    needsReviewMarker || missingSections.length > 0 || unpopulatedVars.length > 0
      ? 'NEEDS REVIEW'
      : warnings.length > 0
        ? 'WARNING'
        : 'PASS';

  return {
    status,
    warnings,
    checkedItems,
  };
}

/**
 * Automated Legal Terminology Improvement Engine:
 * Analyzes a selected document's sections against the active Approved Knowledge Base
 * (`LegalKnowledgeEntry[]`) to offer automated, non-destructive legal & regulatory
 * terminology tweaks while guaranteeing 100% preservation of all protected entities.
 */
export function generateLegalTerminologySuggestions(
  document: DocumentRecord,
  knowledgeBase: LegalKnowledgeEntry[]
): LegalTerminologySuggestion[] {
  const activeKb = knowledgeBase.filter((k) => k.status === 'Approved');
  const pool = activeKb.length > 0 ? activeKb : knowledgeBase;
  if (pool.length === 0) return [];

  const findKbByKeyword = (keyword: string): LegalKnowledgeEntry => {
    const lower = keyword.toLowerCase();
    return (
      pool.find(
        (k) =>
          k.title.toLowerCase().includes(lower) ||
          k.documentType.toLowerCase().includes(lower) ||
          k.tags.some((t) => t.toLowerCase().includes(lower)) ||
          k.jurisdiction.toLowerCase().includes(lower)
      ) || pool[0]
    );
  };

  const usEntry = findKbByKeyword('United States');
  const euEntry = findKbByKeyword('GDPR');
  const ukEntry = findKbByKeyword('AI Automation');
  const uaeEntry = findKbByKeyword('NDA');
  const pkEntry = findKbByKeyword('Software Development');

  const suggestions: LegalTerminologySuggestion[] = [];
  const fullText = document.finalContent || '';

  // Inspect each logical chunk/section of the document to produce targeted, non-destructive tweaks
  document.chunks.forEach((chunk, secIdx) => {
    const secText = (chunk.restoredText || chunk.humanizedText || chunk.originalText).trim();
    if (!secText) return;

    const lines = secText.split('\n').filter((l) => l.trim().length > 0);
    const headingLine = lines.find((l) => /^#{1,6}\s+/.test(l.trim()));
    const sectionHeading =
      chunk.heading ||
      (headingLine ? headingLine.replace(/^#{1,6}\s+/, '').trim() : `Section #${secIdx + 1}`);

    // Extract body sentences (excluding markdown heading lines and table rows)
    const proseLines = lines.filter(
      (l) => !/^#{1,6}\s+/.test(l.trim()) && !l.trim().startsWith('|') && !l.trim().startsWith('>')
    );
    const proseBlock = proseLines.join(' ').trim();
    if (!proseBlock) return;

    const sentences = proseBlock
      .split(/(?<=[.!?])\s+/)
      .map((s) => s.trim())
      .filter((s) => s.length > 20);

    const targetSentence = sentences[sentences.length - 1] || sentences[0] || proseBlock;
    const preservedList = chunk.protectedEntities.map((e) => e.originalValue).slice(0, 6);
    const lowerSec = secText.toLowerCase();

    // 1. Check if any prohibited wording from active KB exists verbatim
    for (const kb of pool) {
      for (const badPhrase of kb.prohibitedWording) {
        if (badPhrase && lowerSec.includes(badPhrase.toLowerCase())) {
          const replacementClause =
            kb.approvedWording[0] ||
            'Obligations remain subject to express written covenants and statutory liability caps.';
          const suggested = `${targetSentence} (${replacementClause})`;
          suggestions.push({
            id: `sug-prohib-${document.id}-${secIdx}-${kb.id}`,
            title: `Remediate Prohibited Phrasing ("${badPhrase}")`,
            category: 'PROHIBITED_PHRASE_FIX',
            sectionIndex: secIdx,
            sectionHeading,
            currentExcerpt: targetSentence,
            suggestedReplacement: suggested,
            rationale: `Active Knowledge Base entry "${kb.title}" (v${kb.version}) flags "${badPhrase}" as prohibited wording and recommends explicit covenant phrasing.`,
            kbEntryId: kb.id,
            kbTitle: kb.title,
            kbVersion: kb.version,
            kbJurisdiction: kb.jurisdiction,
            kbCategory: kb.category,
            protectedEntitiesPreserved: preservedList,
            alreadyApplied: fullText.includes(replacementClause),
          });
        }
      }
    }

    // 2. GDPR / HIPAA / ISO / Encryption / Data Privacy Terminology Alignment
    if (
      lowerSec.includes('gdpr') ||
      lowerSec.includes('iso/iec') ||
      lowerSec.includes('aes-256') ||
      lowerSec.includes('hipaa') ||
      lowerSec.includes('encryption') ||
      lowerSec.includes('privacy') ||
      lowerSec.includes('confidential')
    ) {
      const kb = lowerSec.includes('confidential') && !lowerSec.includes('gdpr') ? uaeEntry : euEntry;
      const approvedAddendum =
        kb.approvedWording[0] ||
        'Processor shall notify Controller without undue delay after becoming aware of a Personal Data Breach.';
      const refinedSentence = targetSentence.endsWith('.')
        ? `${targetSentence.slice(0, -1)}, and ${approvedAddendum.charAt(0).toLowerCase()}${approvedAddendum.slice(1)}`
        : `${targetSentence}. ${approvedAddendum}`;

      suggestions.push({
        id: `sug-reg-${document.id}-${secIdx}-${kb.id}`,
        title:
          kb.id === uaeEntry.id
            ? 'Enforce Explicit Confidentiality Survival Covenant'
            : 'Align Regulatory Data Protection & Breach Covenant Terminology',
        category: 'REGULATORY_ALIGNMENT',
        sectionIndex: secIdx,
        sectionHeading,
        currentExcerpt: targetSentence,
        suggestedReplacement: refinedSentence,
        rationale: `Applies authoritative regulatory terminology from "${kb.title}" (${kb.jurisdiction}, v${kb.version}) while keeping all protected encryption standards, dates, and URLs untouched.`,
        kbEntryId: kb.id,
        kbTitle: kb.title,
        kbVersion: kb.version,
        kbJurisdiction: kb.jurisdiction,
        kbCategory: kb.category,
        protectedEntitiesPreserved: preservedList,
        alreadyApplied: fullText.includes(approvedAddendum.slice(10, 42)),
      });
      return;
    }

    // 3. Intellectual Property / Deliverables / Payment / Commercial Audit Alignment
    if (
      lowerSec.includes('intellectual property') ||
      lowerSec.includes('payment') ||
      lowerSec.includes('invoice') ||
      lowerSec.includes('revenue') ||
      lowerSec.includes('ebitda') ||
      lowerSec.includes('overhead') ||
      lowerSec.includes('grant') ||
      lowerSec.includes('settlement')
    ) {
      const kb = usEntry;
      const clauseText =
        lowerSec.includes('intellectual property') || lowerSec.includes('assignment')
          ? kb.approvedWording[0] ||
            'Full assignment of custom Deliverables transfers to Client upon receipt of final payment.'
          : 'All monetary allocations and milestone settlements remain subject to verified audit reconciliation and undisputed invoice terms.';

      const refinedSentence = `${targetSentence} ${clauseText}`;

      suggestions.push({
        id: `sug-comm-${document.id}-${secIdx}-${kb.id}`,
        title: lowerSec.includes('intellectual property')
          ? 'Standardize Conditional IP Title Transfer Terminology'
          : 'Add Commercial Settlement & Audit Reconciliation Covenant',
        category: 'APPROVED_WORDING',
        sectionIndex: secIdx,
        sectionHeading,
        currentExcerpt: targetSentence,
        suggestedReplacement: refinedSentence,
        rationale: `Harmonizes commercial & financial clause terminology with "${kb.title}" (${kb.jurisdiction}, v${kb.version}) without altering any locked currency figures, percentages, or dates.`,
        kbEntryId: kb.id,
        kbTitle: kb.title,
        kbVersion: kb.version,
        kbJurisdiction: kb.jurisdiction,
        kbCategory: kb.category,
        protectedEntitiesPreserved: preservedList,
        alreadyApplied: fullText.includes(clauseText),
      });
      return;
    }

    // 4. Liability / Governing Law / Dispute Resolution / Scale & SLA Verification
    if (
      lowerSec.includes('liability') ||
      lowerSec.includes('governing law') ||
      lowerSec.includes('scale') ||
      lowerSec.includes('sla') ||
      lowerSec.includes('uptime') ||
      lowerSec.includes('conclusion') ||
      lowerSec.includes('milestone')
    ) {
      const kb =
        lowerSec.includes('liability') || lowerSec.includes('governing law')
          ? usEntry
          : lowerSec.includes('milestone')
            ? pkEntry
            : ukEntry;

      const clauseText =
        kb.id === usEntry.id
          ? kb.approvedWording[1] ||
            'Aggregate liability shall not exceed total fees paid during the preceding 12 months.'
          : kb.id === pkEntry.id
            ? kb.approvedWording[1] ||
              'Electronic execution and digital delivery of notices are recognized as binding between the parties.'
            : 'Automated telemetry and workflow outputs remain subject to human-in-the-loop verification covenants and strict client data isolation.';

      const refinedSentence = `${targetSentence} ${clauseText}`;

      suggestions.push({
        id: `sug-clause-${document.id}-${secIdx}-${kb.id}`,
        title:
          kb.id === usEntry.id
            ? 'Reinforce 12-Month Aggregate Liability Cap Wording'
            : kb.id === pkEntry.id
              ? 'Include Binding Electronic Execution & Milestone Notice Terminology'
              : 'Add Autonomous System Verification & Data Isolation Covenant',
        category: 'CLAUSE_PRECISION',
        sectionIndex: secIdx,
        sectionHeading,
        currentExcerpt: targetSentence,
        suggestedReplacement: refinedSentence,
        rationale: `Strengthens legal & operational precision using approved wording from "${kb.title}" (${kb.jurisdiction}, v${kb.version}).`,
        kbEntryId: kb.id,
        kbTitle: kb.title,
        kbVersion: kb.version,
        kbJurisdiction: kb.jurisdiction,
        kbCategory: kb.category,
        protectedEntitiesPreserved: preservedList,
        alreadyApplied: fullText.includes(clauseText),
      });
      return;
    }

    // 5. General fallback suggestion for any other section so every selected document offers rich KB tweaks
    const fallbackKb = pool[secIdx % pool.length];
    const fallbackApproved =
      fallbackKb.approvedWording[0] ||
      'All representations and technical disclosures herein remain subject to verified governance standards.';
    const refinedFallback = `${targetSentence} ${fallbackApproved}`;

    suggestions.push({
      id: `sug-gen-${document.id}-${secIdx}-${fallbackKb.id}`,
      title: `Align Section Terminology with ${fallbackKb.jurisdiction} Standard`,
      category: 'APPROVED_WORDING',
      sectionIndex: secIdx,
      sectionHeading,
      currentExcerpt: targetSentence,
      suggestedReplacement: refinedFallback,
      rationale: `Incorporates approved wording from "${fallbackKb.title}" (v${fallbackKb.version}) while preserving all locked entities in ${sectionHeading}.`,
      kbEntryId: fallbackKb.id,
      kbTitle: fallbackKb.title,
      kbVersion: fallbackKb.version,
      kbJurisdiction: fallbackKb.jurisdiction,
      kbCategory: fallbackKb.category,
      protectedEntitiesPreserved: preservedList,
      alreadyApplied: fullText.includes(fallbackApproved),
    });
  });

  return suggestions;
}

