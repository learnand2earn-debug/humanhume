import {
  DocumentationSettings,
  LegalDocumentType,
  LegalKnowledgeBaseEntry,
  LegalTemplate,
} from './types';

export const DEFAULT_DOCUMENTATION_SETTINGS: DocumentationSettings = {
  maxAutomaticAttempts: 3,
  legalDisclaimer:
    'AI-generated document. This document is provided for drafting and informational purposes and does not constitute legal advice. Review by a qualified legal professional is recommended before use.',
  disclaimerEnabled: true,
  defaultJurisdiction: 'United States',
  defaultHumanizationIntensity: 'CONSERVATIVE',
  legalClauseProtection: 'HIGH',
  requiredAdminApproval: true,
  automaticDeletionPeriodDays: 30,
  documentRetentionDays: 90,
};

export const INITIAL_DOCUMENT_TYPES: LegalDocumentType[] = [
  {
    id: 'terms-of-service',
    name: 'Terms of Service',
    category: 'legal',
    is_legal: true,
    description: 'Master agreement governing user rights, responsibilities, accounts, acceptable use, and platform disclaimers.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Define user eligibility and account registration requirements.',
      'Specify user code of conduct and acceptable use prohibitions.',
      'Detail intellectual property rights, licenses, and ownership.',
      'Include clear disclaimers of warranties and limitation of liability caps.',
      'Set out governing law and dispute resolution mechanism (arbitration/court).',
      'Detail termination rights and changes to terms notification policy.',
    ],
    required_sections: [
      '1. Introduction & Acceptance of Terms',
      '2. Definitions & Eligibility',
      '3. Account Registration & Security',
      '4. Permitted Use & Prohibited Conduct',
      '5. Intellectual Property Rights',
      '6. Disclaimers of Warranties',
      '7. Limitation of Liability',
      '8. Indemnification',
      '9. Termination',
      '10. Governing Law & Dispute Resolution',
      '11. Contact & Miscellaneous',
    ],
    fields: [
      { name: 'COMPANY_NAME', label: 'Company / Platform Name', type: 'text', required: true, placeholder: 'e.g. Acme Cloud Inc.' },
      { name: 'PLATFORM_URL', label: 'Platform Website / URL', type: 'text', required: true, placeholder: 'e.g. https://acme.com' },
      { name: 'MINIMUM_AGE', label: 'Minimum User Age', type: 'number', required: true, defaultValue: '18', placeholder: '18' },
      { name: 'LIABILITY_CAP', label: 'Limitation of Liability Cap', type: 'text', required: true, placeholder: 'e.g. $100 USD or amounts paid in the last 12 months' },
      { name: 'DISPUTE_FORUM', label: 'Dispute Forum / Arbitration Court', type: 'text', required: true, placeholder: 'e.g. State of Delaware Courts or AAA Arbitration' },
      { name: 'SUPPORT_EMAIL', label: 'Support / Legal Email', type: 'text', required: true, placeholder: 'legal@acme.com' },
    ],
  },
  {
    id: 'privacy-policy',
    name: 'Privacy Policy',
    category: 'compliance',
    is_legal: true,
    description: 'Comprehensive privacy policy compliant with GDPR, CCPA/CPRA, and global data privacy standards.',
    default_jurisdiction: 'European Union',
    default_instructions: [
      'Identify data controller and data protection officer (DPO) contact details.',
      'Enumerate all categories of personal data collected (identifiers, usage, cookies).',
      'Specify legal basis for processing under applicable privacy law (GDPR/CCPA).',
      'Detail third-party data sharing, sub-processors, and international transfers.',
      'State data retention periods and deletion schedules.',
      'List user rights (access, rectification, erasure, data portability, opt-out).',
      'Provide mechanism for filing privacy complaints and exercising rights.',
    ],
    required_sections: [
      '1. Introduction & Data Controller Identity',
      '2. Categories of Information Collected',
      '3. Legal Basis for Processing',
      '4. How We Use Collected Data',
      '5. Third-Party Sharing & Sub-processors',
      '6. International Data Transfers',
      '7. Data Retention & Security Measures',
      '8. Data Subject Rights & Opt-Out Choices',
      '9. Children Privacy',
      '10. Privacy Contact & Complaints',
    ],
    fields: [
      { name: 'COMPANY_NAME', label: 'Company Name', type: 'text', required: true, placeholder: 'e.g. Synthetix Global Ltd.' },
      { name: 'DPO_EMAIL', label: 'Data Protection Officer / Privacy Email', type: 'text', required: true, placeholder: 'privacy@synthetix.com' },
      { name: 'RETENTION_PERIOD', label: 'Standard Data Retention Period', type: 'text', required: true, placeholder: 'e.g. 24 months post-account closure' },
      { name: 'THIRD_PARTY_SERVICES', label: 'Third-Party Analytics & Sub-processors', type: 'textarea', required: false, placeholder: 'e.g. AWS, Stripe, Google Analytics' },
    ],
  },
  {
    id: 'cookie-policy',
    name: 'Cookie Policy',
    category: 'compliance',
    is_legal: true,
    description: 'Disclosure on cookies, tracking pixels, local storage, consent management, and opt-out controls.',
    default_jurisdiction: 'European Union',
    default_instructions: [
      'Explain what cookies and similar tracking technologies are.',
      'Categorize cookies into strictly necessary, functional, analytics, and marketing.',
      'Explain cookie consent mechanism and how users can withdraw consent.',
      'Provide browser-level instructions for blocking or deleting cookies.',
    ],
    required_sections: [
      '1. What Are Cookies',
      '2. How We Use Cookies',
      '3. Categories of Cookies Used',
      '4. Third-Party Tracking',
      '5. Managing Cookie Preferences',
      '6. Updates & Contact Information',
    ],
    fields: [
      { name: 'COMPANY_NAME', label: 'Company Name', type: 'text', required: true, placeholder: 'e.g. Apex Media Ltd.' },
      { name: 'COOKIE_MANAGER_LINK', label: 'Cookie Consent Tool URL or Anchor', type: 'text', required: false, placeholder: 'e.g. #manage-cookies' },
    ],
  },
  {
    id: 'refund-policy',
    name: 'Refund Policy',
    category: 'business',
    is_legal: true,
    description: 'Clear commercial refund, cancellation, exchange, and chargeback rules.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'State eligibility criteria and timeframes for refund requests.',
      'Define non-refundable goods or services (e.g. custom software, digital downloads).',
      'Detail the step-by-step refund request process and payment processor timelines.',
    ],
    required_sections: [
      '1. Refund Eligibility Window',
      '2. Non-Refundable Products and Services',
      '3. Refund Request Process',
      '4. Processing Timeframes & Methods',
      '5. Chargebacks & Disputes',
    ],
    fields: [
      { name: 'COMPANY_NAME', label: 'Company Name', type: 'text', required: true, placeholder: 'e.g. CloudScale SaaS' },
      { name: 'REFUND_WINDOW_DAYS', label: 'Refund Window (Days)', type: 'number', required: true, defaultValue: '14', placeholder: '14' },
      { name: 'SUPPORT_EMAIL', label: 'Support Email', type: 'text', required: true, placeholder: 'support@cloudscale.io' },
    ],
  },
  {
    id: 'disclaimer',
    name: 'Disclaimer',
    category: 'legal',
    is_legal: true,
    description: 'Protective liability disclaimer covering professional advice, fitness for purpose, and third-party links.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Disclaim warranties of accuracy, completeness, and fitness for a particular purpose.',
      'Clarify that content is for informational purposes only and not professional advice.',
      'Limit liability for actions taken in reliance on provided content.',
    ],
    required_sections: [
      '1. General Information Disclaimer',
      '2. No Professional Advice (Legal/Financial/Medical)',
      '3. External Links Disclaimer',
      '4. Limitation of Liability',
    ],
    fields: [
      { name: 'COMPANY_NAME', label: 'Company Name', type: 'text', required: true, placeholder: 'e.g. Nexus Advisory' },
      { name: 'DISCLAIMER_SUBJECT', label: 'Subject Matter (e.g. Financial Software, AI Tools)', type: 'text', required: true, placeholder: 'AI and Financial Telemetry Tools' },
    ],
  },
  {
    id: 'data-processing-agreement',
    name: 'Data Processing Agreement',
    category: 'compliance',
    is_legal: true,
    description: 'B2B DPA under GDPR Article 28 and UK Data Protection Act governing controller-processor duties.',
    default_jurisdiction: 'European Union',
    default_instructions: [
      'Establish controller and processor relationship under GDPR Article 28.',
      'Specify scope, nature, and purpose of processing operations.',
      'Mandate technical and organizational security measures (TOMs).',
      'Regulate sub-processor appointment and prior notification rules.',
      'Enforce personal data breach notification within 48 to 72 hours.',
      'Govern data deletion and audit assistance rights.',
    ],
    required_sections: [
      '1. Scope & Interpretation',
      '2. Roles of the Parties & Processing Details',
      '3. Processor Obligations',
      '4. Sub-processors',
      '5. Security Measures & Confidentiality',
      '6. Personal Data Breach Management',
      '7. Audits & Inspections',
      '8. Data Return & Deletion',
      '9. Annex A: Details of Processing',
      '10. Annex B: Technical and Organisational Measures',
    ],
    fields: [
      { name: 'CONTROLLER_NAME', label: 'Data Controller Company', type: 'text', required: true, placeholder: 'e.g. Enterprise Client Corp.' },
      { name: 'PROCESSOR_NAME', label: 'Data Processor Company', type: 'text', required: true, placeholder: 'e.g. AI Cloud Solutions Inc.' },
      { name: 'BREACH_NOTIFICATION_HOURS', label: 'Breach Notification Timeline (Hours)', type: 'number', required: true, defaultValue: '48', placeholder: '48' },
    ],
  },
  {
    id: 'service-agreement',
    name: 'Service Agreement',
    category: 'business',
    is_legal: true,
    description: 'General commercial services agreement with SLAs, fees, and standard contractual clauses.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Define detailed scope of services and deliverables.',
      'Establish payment terms, invoicing cycle, and late fees.',
      'Provide performance standards and service level guarantees.',
      'Specify term, renewal, and termination notice periods.',
    ],
    required_sections: [
      '1. Engagement & Services',
      '2. Deliverables & Schedule',
      '3. Compensation & Invoicing',
      '4. Term & Termination',
      '5. Warranties & Service Standards',
      '6. Confidentiality & IP',
      '7. Governing Law',
    ],
    fields: [
      { name: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true, placeholder: 'e.g. Horizon Ventures LLC' },
      { name: 'PROVIDER_NAME', label: 'Service Provider Name', type: 'text', required: true, placeholder: 'e.g. Quantum Services Group' },
      { name: 'SERVICE_DESCRIPTION', label: 'Service Description', type: 'textarea', required: true, placeholder: 'e.g. Ongoing cloud infrastructure management and optimization' },
      { name: 'TOTAL_FEE', label: 'Service Fees / Retainer', type: 'text', required: true, placeholder: 'e.g. $5,000 USD per month' },
    ],
  },
  {
    id: 'software-development-agreement',
    name: 'Software Development Agreement',
    category: 'business',
    is_legal: true,
    description: 'Software engineering contract with milestone specifications, acceptance testing, source code IP assignment, and bug warranty.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Document detailed software specifications and agile/waterfall milestones.',
      'Establish strict acceptance testing procedures and rejection cure windows.',
      'Specify explicit transfer of Intellectual Property upon full payment.',
      'Include 30-90 day warranty for software bugs and critical defect remediation.',
      'Define open-source licensing compliance and third-party dependency warranties.',
    ],
    required_sections: [
      '1. Project Scope & Specifications',
      '2. Development Milestones & Delivery Schedule',
      '3. Acceptance Testing & Cure Period',
      '4. Fees, Payment Milestones & Expenses',
      '5. Intellectual Property Rights & Source Code Assignment',
      '6. Warranties & Bug Remediation Period',
      '7. Open Source Compliance',
      '8. Confidentiality & Non-Disclosure',
      '9. Limitation of Liability',
      '10. Termination & Governing Law',
    ],
    fields: [
      { name: 'CLIENT_NAME', label: 'Client Company', type: 'text', required: true, placeholder: 'e.g. Fintech Global Corp.' },
      { name: 'DEVELOPER_NAME', label: 'Developer / Agency Name', type: 'text', required: true, placeholder: 'e.g. DevCraft Studios' },
      { name: 'SOFTWARE_NAME', label: 'Software / Project Name', type: 'text', required: true, placeholder: 'e.g. Automated Order Matching Engine' },
      { name: 'TOTAL_PRICE', label: 'Total Contract Value', type: 'text', required: true, placeholder: 'e.g. $45,000 USD' },
      { name: 'WARRANTY_DAYS', label: 'Bug Warranty Period (Days)', type: 'number', required: true, defaultValue: '60', placeholder: '60' },
      { name: 'ACCEPTANCE_DAYS', label: 'Acceptance Testing Window (Days)', type: 'number', required: true, defaultValue: '14', placeholder: '14' },
    ],
  },
  {
    id: 'website-development-agreement',
    name: 'Website Development Agreement',
    category: 'business',
    is_legal: true,
    description: 'Contract for website design, front-end/back-end development, hosting handover, and revision rounds.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Include scope of work and design deliverables.',
      'Include payment terms and milestone installments.',
      'Include revision policy and feedback turnaround times.',
      'Include intellectual property ownership assignment upon full settlement.',
      'Include confidentiality.',
      'Include termination notice period.',
      'Include dispute resolution.',
      'Include governing law.',
      'Include limitation of liability.',
      'Include client responsibilities (providing assets, copy, and credentials).',
    ],
    required_sections: [
      '1. Scope of Work & Deliverables',
      '2. Client Responsibilities & Asset Provision',
      '3. Revisions & Approval Process',
      '4. Fees & Payment Schedule',
      '5. Intellectual Property Ownership',
      '6. Confidentiality',
      '7. Warranties & Limitation of Liability',
      '8. Termination',
      '9. Dispute Resolution & Governing Law',
      '10. Signatures',
    ],
    fields: [
      { name: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true, placeholder: 'e.g. Retail Innovations LLC' },
      { name: 'DEVELOPER_NAME', label: 'Developer / Agency Name', type: 'text', required: true, placeholder: 'e.g. PixelWave Digital' },
      { name: 'PROJECT_DESCRIPTION', label: 'Website Project Description', type: 'textarea', required: true, placeholder: 'Custom e-commerce portal built with Next.js and Stripe integration' },
      { name: 'TOTAL_PRICE', label: 'Total Project Price', type: 'text', required: true, placeholder: 'e.g. $12,500 USD' },
      { name: 'PAYMENT_SCHEDULE', label: 'Payment Schedule', type: 'text', required: true, placeholder: 'e.g. 50% upfront deposit, 25% upon staging review, 25% on final launch' },
      { name: 'DELIVERY_DATE', label: 'Estimated Delivery Date', type: 'date', required: true },
      { name: 'NUMBER_OF_REVISIONS', label: 'Included Revision Rounds', type: 'number', required: true, defaultValue: '2', placeholder: '2' },
      { name: 'TERMINATION_NOTICE', label: 'Termination Notice Period (Days)', type: 'number', required: true, defaultValue: '14', placeholder: '14' },
    ],
  },
  {
    id: 'ai-development-agreement',
    name: 'AI Development Agreement',
    category: 'business',
    is_legal: true,
    description: 'Specialized contract for custom AI models, model training, dataset ownership, hallucination disclaimers, and algorithmic IP.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Define training dataset ownership and data rights warranties.',
      'Address model weights, embeddings, and fine-tuning artifact IP allocation.',
      'Include explicit disclaimer regarding AI output non-determinism, hallucinations, and accuracy limits.',
      'Establish responsible AI ethics, acceptable use, and safety alignment covenants.',
      'Define API rate limits, hosting infrastructure, and compute cost allocations.',
    ],
    required_sections: [
      '1. Purpose & Scope of AI Development',
      '2. Training Data Rights, Warranties & Compliance',
      '3. Model Deliverables, Embeddings & Weights Ownership',
      '4. AI Output Disclaimer & Non-Determinism Notice',
      '5. Compute Costs & API Consumption',
      '6. Intellectual Property & Algorithmic Assignment',
      '7. Confidentiality & Security of Model Artifacts',
      '8. Limitation of Liability',
      '9. Governing Law & Dispute Resolution',
    ],
    fields: [
      { name: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true, placeholder: 'e.g. AI MedTech Corp' },
      { name: 'DEVELOPER_NAME', label: 'AI Developer Name', type: 'text', required: true, placeholder: 'e.g. NeuralWave Labs' },
      { name: 'AI_SCOPE', label: 'AI Scope & Model Architecture', type: 'textarea', required: true, placeholder: 'Fine-tuned LLM pipeline for clinical documentation extraction' },
      { name: 'TOTAL_PRICE', label: 'Development Fee', type: 'text', required: true, placeholder: 'e.g. $60,000 USD' },
    ],
  },
  {
    id: 'ai-automation-agreement',
    name: 'AI Automation Agreement',
    category: 'business',
    is_legal: true,
    description: 'Contract for autonomous workflow automations, agent bots, webhook integrations, and monitoring SLAs.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Detail automated workflow triggers, actions, and third-party connectors.',
      'Establish uptime targets, error handling protocols, and manual fallback procedures.',
      'Limit liability for downtime caused by upstream AI API providers.',
    ],
    required_sections: [
      '1. Automation Architecture & Scope',
      '2. Integration Protocols & Credentials Access',
      '3. Upstream API Dependency Disclaimers',
      '4. Fees & Maintenance Retainer',
      '5. Limitation of Liability & SLA Exclusions',
    ],
    fields: [
      { name: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true, placeholder: 'e.g. Global Logistics Inc.' },
      { name: 'AUTOMATOR_NAME', label: 'Automation Provider', type: 'text', required: true, placeholder: 'e.g. AutoFlow Systems' },
      { name: 'WORKFLOW_DESCRIPTION', label: 'Workflow Description', type: 'textarea', required: true, placeholder: 'Automated CRM lead ingestion, email enrichment, and invoice generation' },
    ],
  },
  {
    id: 'nda',
    name: 'NDA (Non-Disclosure Agreement)',
    category: 'legal',
    is_legal: true,
    description: 'Mutual or unilateral confidentiality agreement protecting trade secrets, source code, business data, and discussions.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Define Confidential Information comprehensively including code, algorithms, and business plans.',
      'Define standard exclusions (publicly known, prior knowledge, independent development, legally compelled).',
      'Specify standard of care (reasonable degree of care, not less than own confidential info).',
      'Set confidentiality duration (e.g. 2-5 years; indefinite for trade secrets).',
      'Mandate immediate return or certified destruction upon request.',
      'Provide injunctive relief rights for breach.',
    ],
    required_sections: [
      '1. Definition of Confidential Information',
      '2. Exclusions from Confidentiality',
      '3. Obligations of Receiving Party',
      '4. Term & Duration of Confidentiality',
      '5. Return or Destruction of Materials',
      '6. Remedies & Injunctive Relief',
      '7. Governing Law & Jurisdiction',
      '8. Signatures',
    ],
    fields: [
      { name: 'DISCLOSING_PARTY', label: 'Disclosing Party Name', type: 'text', required: true, placeholder: 'e.g. Alpha Technologies Inc.' },
      { name: 'RECEIVING_PARTY', label: 'Receiving Party Name', type: 'text', required: true, placeholder: 'e.g. Beta Ventures LLC' },
      { name: 'PURPOSE_OF_DISCLOSURE', label: 'Purpose of Disclosure', type: 'textarea', required: true, placeholder: 'Evaluating potential merger, strategic partnership, and technology license' },
      { name: 'DURATION_YEARS', label: 'Confidentiality Duration (Years)', type: 'number', required: true, defaultValue: '3', placeholder: '3' },
    ],
  },
  {
    id: 'freelance-service-agreement',
    name: 'Freelance Service Agreement',
    category: 'business',
    is_legal: true,
    description: 'Independent contractor agreement for freelancers with clear IP handover upon payment and tax liability clauses.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Clarify independent contractor status (not employee).',
      'Detail freelance deliverables, deadlines, and compensation.',
      'Specify copyright assignment upon full payment.',
      'Include tax responsibility clause (contractor pays own self-employment taxes).',
    ],
    required_sections: [
      '1. Services & Engagement',
      '2. Independent Contractor Status & Taxes',
      '3. Compensation & Expenses',
      '4. Ownership of Work Product',
      '5. Confidentiality',
      '6. Termination & Governing Law',
    ],
    fields: [
      { name: 'CLIENT_NAME', label: 'Client Name', type: 'text', required: true, placeholder: 'e.g. Growth Rocket LLC' },
      { name: 'FREELANCER_NAME', label: 'Freelancer Full Name', type: 'text', required: true, placeholder: 'e.g. John Doe' },
      { name: 'SERVICE_SUMMARY', label: 'Deliverables Summary', type: 'textarea', required: true, placeholder: 'UX/UI design for mobile application and interactive Figma prototypes' },
      { name: 'COMPENSATION_RATE', label: 'Rate / Project Fee', type: 'text', required: true, placeholder: 'e.g. $75/hour or $3,500 fixed' },
    ],
  },
  {
    id: 'client-agreement',
    name: 'Client Agreement',
    category: 'business',
    is_legal: true,
    description: 'Master client engagement agreement establishing relationship terms, retainers, and mutual obligations.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Outline scope of customer relationship and account management.',
      'Detail billing cycles, retainer replenishments, and payment terms.',
      'Set liability limits and dispute arbitration provisions.',
    ],
    required_sections: [
      '1. Scope of Client Relationship',
      '2. Account Representation & Authority',
      '3. Financial Terms & Invoicing',
      '4. Confidentiality & Data Rights',
      '5. Term, Suspension & Termination',
      '6. Governing Law',
    ],
    fields: [
      { name: 'CLIENT_NAME', label: 'Client Company', type: 'text', required: true, placeholder: 'e.g. Premier Brands Corp.' },
      { name: 'AGENCY_NAME', label: 'Service Provider / Agency', type: 'text', required: true, placeholder: 'e.g. Apex Strategic Group' },
      { name: 'RETAINER_FEE', label: 'Monthly Retainer Amount', type: 'text', required: true, placeholder: 'e.g. $8,500 USD per month' },
    ],
  },
  {
    id: 'employment-documentation',
    name: 'Employment Documentation',
    category: 'legal',
    is_legal: true,
    description: 'Standard employment agreement template with role responsibilities, compensation, benefits, and at-will/statutory terms.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'State job title, duties, reporting line, and work location.',
      'Detail base salary, bonus structure, benefits, and pay schedule.',
      'Incorporate at-will employment notice or statutory termination notice periods.',
      'Include proprietary information and inventions assignment agreement.',
    ],
    required_sections: [
      '1. Position, Duties & Reporting',
      '2. Compensation, Bonuses & Benefits',
      '3. Employment Term & At-Will Status',
      '4. Inventions Assignment & Intellectual Property',
      '5. Confidentiality & Non-Solicitation',
      '6. Governing Law & Severability',
    ],
    fields: [
      { name: 'EMPLOYER_NAME', label: 'Employer Company', type: 'text', required: true, placeholder: 'e.g. CloudTech Systems Inc.' },
      { name: 'EMPLOYEE_NAME', label: 'Employee Full Name', type: 'text', required: true, placeholder: 'e.g. Jane Smith' },
      { name: 'JOB_TITLE', label: 'Job Title', type: 'text', required: true, placeholder: 'e.g. Senior Software Architect' },
      { name: 'ANNUAL_SALARY', label: 'Base Annual Salary', type: 'text', required: true, placeholder: 'e.g. $140,000 USD' },
      { name: 'START_DATE', label: 'Employment Start Date', type: 'date', required: true },
    ],
  },
  {
    id: 'contractor-agreement',
    name: 'Contractor Agreement',
    category: 'business',
    is_legal: true,
    description: 'B2B/B2C contractor engagement covering statements of work, insurance, indemnification, and deliverables.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Define scope through statement of work (SOW) mechanism.',
      'Require contractor to maintain necessary commercial liability insurance.',
      'Include mutual indemnification for IP infringement and negligence.',
    ],
    required_sections: [
      '1. Contractor Engagement & SOWs',
      '2. Performance Standard & Deadlines',
      '3. Compensation & Invoices',
      '4. Intellectual Property Rights',
      '5. Insurance & Indemnity',
      '6. Governing Law',
    ],
    fields: [
      { name: 'COMPANY_NAME', label: 'Hiring Company', type: 'text', required: true, placeholder: 'e.g. Frontier Solutions LLC' },
      { name: 'CONTRACTOR_NAME', label: 'Contractor Firm / Individual', type: 'text', required: true, placeholder: 'e.g. Precision Engineering Ltd.' },
      { name: 'FEE_STRUCTURE', label: 'Fee Structure', type: 'text', required: true, placeholder: 'e.g. Fixed fee of $15,000 upon milestones' },
    ],
  },
  {
    id: 'acceptable-use-policy',
    name: 'Acceptable Use Policy',
    category: 'compliance',
    is_legal: true,
    description: 'Security and behavioral guidelines for network, SaaS, API, and platform users.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Specify prohibited network activities (port scanning, DoS, spamming).',
      'Detail restrictions on malware, illegal content, and security evasion.',
      'Explain enforcement actions (suspension, termination, law enforcement referral).',
    ],
    required_sections: [
      '1. Scope & Application',
      '2. Prohibited Security Activities',
      '3. Prohibited Content & Abuse',
      '4. API & Resource Consumption Limits',
      '5. Monitoring & Enforcement Rights',
      '6. Reporting Violations',
    ],
    fields: [
      { name: 'COMPANY_NAME', label: 'Company Name', type: 'text', required: true, placeholder: 'e.g. HyperNet Cloud' },
      { name: 'ABUSE_EMAIL', label: 'Abuse Reporting Email', type: 'text', required: true, placeholder: 'abuse@hypernet.io' },
    ],
  },
  {
    id: 'intellectual-property-policy',
    name: 'Intellectual Property Policy',
    category: 'legal',
    is_legal: true,
    description: 'Trademark, copyright, open source, and DMCA notice policy for online platforms.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Assert platform ownership over trademarks, logos, and proprietary assets.',
      'Provide DMCA / copyright takedown notice instructions and designated agent details.',
      'Detail counter-notification procedure and repeat infringer policy.',
    ],
    required_sections: [
      '1. Ownership of Platform IP',
      '2. Limited License to Users',
      '3. DMCA Copyright Notice & Takedown Procedure',
      '4. Counter-Notice & Dispute Process',
      '5. Repeat Infringer Policy',
      '6. Designated DMCA Agent Details',
    ],
    fields: [
      { name: 'COMPANY_NAME', label: 'Company Name', type: 'text', required: true, placeholder: 'e.g. CreatorsHub Media Inc.' },
      { name: 'DMCA_AGENT_EMAIL', label: 'Designated DMCA Agent Email', type: 'text', required: true, placeholder: 'copyright@creatorshub.com' },
      { name: 'DMCA_AGENT_ADDRESS', label: 'Designated Agent Physical Address', type: 'text', required: true, placeholder: '100 Innovation Way, Suite 400, Wilmington, DE' },
    ],
  },
  {
    id: 'website-documentation',
    name: 'Website Documentation',
    category: 'technical',
    is_legal: false,
    description: 'Comprehensive operational manual and architecture documentation for website platforms.',
    default_jurisdiction: 'All',
    default_instructions: [
      'Document site information architecture, routing, and tech stack.',
      'Explain content management workflow, publishing steps, and asset guidelines.',
      'Detail deployment, domain DNS settings, and CDN configurations.',
    ],
    required_sections: [
      '1. System Overview & Tech Stack',
      '2. Site Architecture & Directory Structure',
      '3. Content Management Workflow',
      '4. Deployment & Hosting Guide',
      '5. Performance & SEO Configuration',
    ],
    fields: [
      { name: 'PROJECT_NAME', label: 'Website Project Name', type: 'text', required: true, placeholder: 'e.g. Enterprise Portal 2026' },
      { name: 'TECH_STACK', label: 'Framework & Stack', type: 'text', required: true, placeholder: 'e.g. Next.js 16, TypeScript, Tailwind CSS, Vercel' },
    ],
  },
  {
    id: 'api-documentation',
    name: 'API Documentation',
    category: 'technical',
    is_legal: false,
    description: 'Technical API reference guide including endpoints, authentication, schemas, error codes, and rate limits.',
    default_jurisdiction: 'All',
    default_instructions: [
      'Detail authentication scheme (Bearer token, API key, OAuth).',
      'Specify base URLs, environments, and rate limits.',
      'Document request/response schemas with status codes (200, 400, 401, 429, 500).',
    ],
    required_sections: [
      '1. API Overview & Base URLs',
      '2. Authentication & Authorization',
      '3. Rate Limiting & Throttling',
      '4. Core Endpoints & Payloads',
      '5. Error Handling & Status Codes',
      '6. Webhook Subscriptions',
    ],
    fields: [
      { name: 'API_NAME', label: 'API Name', type: 'text', required: true, placeholder: 'e.g. HumanFlow Document API' },
      { name: 'BASE_URL', label: 'Base URL', type: 'text', required: true, placeholder: 'https://api.example.com/v1' },
      { name: 'AUTH_TYPE', label: 'Authentication Method', type: 'text', required: true, placeholder: 'Bearer API Key' },
    ],
  },
  {
    id: 'product-documentation',
    name: 'Product Documentation',
    category: 'technical',
    is_legal: false,
    description: 'End-to-end product specifications, features, target persona, workflows, and release notes.',
    default_jurisdiction: 'All',
    default_instructions: [
      'Describe product vision, value proposition, and user personas.',
      'Enumerate core features with workflow step-by-step guidance.',
      'Provide technical requirements and integration prerequisites.',
    ],
    required_sections: [
      '1. Product Overview & Value Proposition',
      '2. Core Capabilities & Feature Catalog',
      '3. User Workflows & Journey',
      '4. System Requirements & Compatibility',
      '5. Release Notes & Roadmap',
    ],
    fields: [
      { name: 'PRODUCT_NAME', label: 'Product Name', type: 'text', required: true, placeholder: 'e.g. FlowEngine Autonomous AI' },
      { name: 'VERSION', label: 'Product Version', type: 'text', required: true, defaultValue: 'v2.4', placeholder: 'v2.4' },
    ],
  },
  {
    id: 'technical-documentation',
    name: 'Technical Documentation',
    category: 'technical',
    is_legal: false,
    description: 'Deep architectural blueprints, database schemas, sequence diagrams, and security architecture.',
    default_jurisdiction: 'All',
    default_instructions: [
      'Detail system architecture diagrams and component interactions.',
      'Document database ERD, data flow pipelines, and queue topologies.',
      'Specify disaster recovery, failover strategies, and backup schedules.',
    ],
    required_sections: [
      '1. Architectural Blueprint & Design Principles',
      '2. Data Pipeline & Storage Topologies',
      '3. Security Model & Encryption Standards',
      '4. Scalability & Resilience Architecture',
      '5. Monitoring, Logging & Telemetry',
    ],
    fields: [
      { name: 'SYSTEM_NAME', label: 'System Name', type: 'text', required: true, placeholder: 'e.g. Distributed Ingestion Engine' },
      { name: 'ARCHITECTURE_STYLE', label: 'Architecture Style', type: 'text', required: true, placeholder: 'Event-Driven Microservices' },
    ],
  },
  {
    id: 'user-guide',
    name: 'User Guide',
    category: 'technical',
    is_legal: false,
    description: 'Action-oriented handbook for end users with onboarding steps, FAQ, and troubleshooting.',
    default_jurisdiction: 'All',
    default_instructions: [
      'Provide initial onboarding and quick start guide.',
      'Explain every user interface control and common actions.',
      'Include FAQ section addressing common stumbling blocks.',
    ],
    required_sections: [
      '1. Getting Started & Account Setup',
      '2. Navigating the Interface',
      '3. Step-by-Step Task Execution',
      '4. Best Practices & Pro Tips',
      '5. Frequently Asked Questions',
      '6. Support & Feedback',
    ],
    fields: [
      { name: 'APPLICATION_NAME', label: 'Application Name', type: 'text', required: true, placeholder: 'e.g. HumanFlow Document Studio' },
    ],
  },
  {
    id: 'sop',
    name: 'SOP (Standard Operating Procedure)',
    category: 'business',
    is_legal: false,
    description: 'Rigorous standard operating procedure for operational teams, quality gates, and error escalation.',
    default_jurisdiction: 'All',
    default_instructions: [
      'Define SOP purpose, scope, and accountable roles (RACI matrix).',
      'Provide sequential checklist of standard operational actions.',
      'Detail deviation handling and emergency escalation protocol.',
    ],
    required_sections: [
      '1. Objective & Scope',
      '2. Roles & Responsibilities',
      '3. Sequential Step-by-Step Procedures',
      '4. Quality Assurance Verification Gates',
      '5. Exceptions & Incident Escalation',
      '6. Revision History & Audit Approval',
    ],
    fields: [
      { name: 'SOP_TITLE', label: 'SOP Title', type: 'text', required: true, placeholder: 'e.g. Document Humanization Quality Gate Review' },
      { name: 'DEPARTMENT', label: 'Department / Unit', type: 'text', required: true, placeholder: 'e.g. Operations & Compliance' },
      { name: 'REVISION_NUMBER', label: 'SOP Revision Number', type: 'text', required: true, defaultValue: 'REV-01', placeholder: 'REV-01' },
    ],
  },
  {
    id: 'internal-policy',
    name: 'Internal Policy',
    category: 'compliance',
    is_legal: false,
    description: 'Corporate workplace policy covering security, remote work, equipment usage, or data handling.',
    default_jurisdiction: 'All',
    default_instructions: [
      'Outline corporate policy guidelines and rationale.',
      'Specify employee responsibilities and compliance expectations.',
      'Detail disciplinary measures for willful non-compliance.',
    ],
    required_sections: [
      '1. Purpose & Policy Statement',
      '2. Applicability & Coverage',
      '3. Core Rules & Employee Duties',
      '4. Monitoring & Audit Compliance',
      '5. Disciplinary Sanctions for Breaches',
    ],
    fields: [
      { name: 'POLICY_NAME', label: 'Policy Name', type: 'text', required: true, placeholder: 'e.g. Information Security & Remote Work Policy' },
      { name: 'COMPANY_NAME', label: 'Company Name', type: 'text', required: true, placeholder: 'e.g. Global Tech Enterprise Ltd.' },
    ],
  },
  {
    id: 'compliance-documentation',
    name: 'Compliance Documentation',
    category: 'compliance',
    is_legal: true,
    description: 'Formal compliance controls mapping, risk assessments, audit logs, and regulatory attestations.',
    default_jurisdiction: 'United States',
    default_instructions: [
      'Enumerate relevant compliance frameworks (SOC2, ISO 27001, HIPAA, GDPR).',
      'Document internal controls and evidence gathering protocols.',
      'Detail periodic audit schedules and remediation tracking.',
    ],
    required_sections: [
      '1. Regulatory Framework & Governance Scope',
      '2. Control Catalog & Technical Implementation',
      '3. Risk Assessment & Threat Modeling',
      '4. Audit Logging & Continuous Verification',
      '5. Attestation & Sign-off',
    ],
    fields: [
      { name: 'FRAMEWORK', label: 'Compliance Standard (e.g. SOC2 Type II, ISO 27001)', type: 'text', required: true, placeholder: 'SOC2 Type II / ISO 27001' },
      { name: 'ENTITY_NAME', label: 'Organization Name', type: 'text', required: true, placeholder: 'e.g. SafeCore Cloud Services' },
    ],
  },
  {
    id: 'custom-document',
    name: 'Custom Document',
    category: 'legal',
    is_legal: true,
    description: 'Tailored legal or technical document configured to specific custom parameters.',
    default_jurisdiction: 'Custom',
    default_instructions: [
      'Follow custom user instructions faithfully.',
      'Structure into professional numbered sections with definitions, obligations, and governing law.',
      'Preserve all provided legal entities and factual details.',
    ],
    required_sections: [
      '1. Preamble & Purpose',
      '2. Definitions & Principles',
      '3. Substantive Provisions',
      '4. Legal Conditions & Limitations',
      '5. Governing Law & Final Provisions',
    ],
    fields: [
      { name: 'DOCUMENT_TITLE', label: 'Custom Document Title', type: 'text', required: true, placeholder: 'e.g. Strategic Joint Venture Protocol' },
      { name: 'PRIMARY_PARTIES', label: 'Primary Parties', type: 'text', required: true, placeholder: 'e.g. Party A and Party B' },
      { name: 'CUSTOM_PURPOSE', label: 'Custom Purpose & Directives', type: 'textarea', required: true, placeholder: 'Describe the core agreement and custom clauses required...' },
    ],
  },
];

export const INITIAL_KNOWLEDGE_BASE: LegalKnowledgeBaseEntry[] = [
  {
    id: 'kb_us_governing_law_01',
    title: 'Standard US Delaware Governing Law & Forum Selection',
    category: 'clause',
    jurisdiction: 'United States',
    document_type: 'All',
    content:
      'This Agreement and all claims or causes of action (whether in contract, tort, or statute) that may be based upon, arise out of, or relate to this Agreement, shall be governed by, and enforced in accordance with, the internal laws of the State of Delaware, without giving effect to any choice or conflict of law provision or rule. Each party irrevocably and unconditionally submits to the exclusive jurisdiction of the State and Federal courts sitting in New Castle County, Delaware.',
    summary: 'Approved Delaware choice of law and venue clause with contract and tort scope.',
    source: 'AUTHORITATIVE_SOURCE',
    source_url: 'Delaware General Corporation Law § 271 / Standard Commercial Practice',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 'v1.2',
    status: 'Approved',
    tags: ['governing_law', 'jurisdiction', 'delaware', 'forum_selection', 'united_states'],
    approved_by: 'Admin / Chief Legal Counsel',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'kb_uk_governing_law_02',
    title: 'English Law Governing Law and London Court Jurisdiction',
    category: 'clause',
    jurisdiction: 'United Kingdom',
    document_type: 'All',
    content:
      'This Agreement and any dispute or claim arising out of or in connection with it or its subject matter or formation (including non-contractual disputes or claims) shall be governed by and construed in accordance with the law of England and Wales. Each party irrevocably agrees that the courts of England and Wales shall have exclusive jurisdiction to settle any dispute or claim arising out of or in connection with this Agreement.',
    summary: 'Standard English and Welsh governing law clause with non-contractual claims coverage.',
    source: 'AUTHORITATIVE_SOURCE',
    source_url: 'Law Society of England and Wales Commercial Precedents',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 'v1.1',
    status: 'Approved',
    tags: ['governing_law', 'united_kingdom', 'england_wales', 'commercial'],
    approved_by: 'Admin / Chief Legal Counsel',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'kb_pk_governing_law_03',
    title: 'Pakistan Contract Act 1872 & Arbitration Act 1940 Jurisdiction Clause',
    category: 'clause',
    jurisdiction: 'Pakistan',
    document_type: 'All',
    content:
      'This Agreement shall be governed by, construed and enforced in accordance with the laws of the Islamic Republic of Pakistan, including the Contract Act, 1872. Any dispute, controversy or claim arising out of or relating to this Agreement shall be referred to and resolved by arbitration under the Arbitration Act, 1940. The venue of arbitration shall be Islamabad/Lahore/Karachi, Pakistan, and the proceedings shall be conducted in the English language.',
    summary: 'Statutory Pakistan governing law and arbitration clause under Contract Act 1872.',
    source: 'AUTHORITATIVE_SOURCE',
    source_url: 'Contract Act 1872 & Arbitration Act 1940 (Pakistan)',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 'v1.0',
    status: 'Approved',
    tags: ['governing_law', 'pakistan', 'arbitration_act_1940', 'contract_act_1872'],
    approved_by: 'Admin / Chief Legal Counsel',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'kb_eu_gdpr_art28_04',
    title: 'EU GDPR Article 28 Mandatory Processor Covenants',
    category: 'compliance_note',
    jurisdiction: 'European Union',
    document_type: 'Data Processing Agreement',
    content:
      'Under GDPR Article 28(3), the processor must: (a) process personal data only on documented instructions from the controller; (b) ensure that persons authorized to process the personal data have committed themselves to confidentiality; (c) take all measures required pursuant to Article 32 (Security of processing); (d) respect the conditions referred to in paragraphs 2 and 4 for engaging another processor; (e) assist the controller by appropriate technical and organizational measures in fulfilling data subject rights; (f) assist the controller in ensuring compliance with obligations pursuant to Articles 32 to 36; (g) at the choice of the controller, delete or return all personal data; and (h) make available to the controller all information necessary to demonstrate compliance.',
    summary: 'Statutory requirements of Article 28(3) GDPR for Data Processing Agreements.',
    source: 'AUTHORITATIVE_SOURCE',
    source_url: 'Regulation (EU) 2016/679 (GDPR), Article 28',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 'v1.0',
    status: 'Approved',
    tags: ['gdpr', 'article_28', 'dpa', 'controller_processor', 'european_union'],
    approved_by: 'Admin / DPO',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'kb_website_dev_ip_05',
    title: 'Website Development IP Transfer Upon Full Payment',
    category: 'approved_wording',
    jurisdiction: 'United States',
    document_type: 'Website Development Agreement',
    content:
      'Upon Developer receipt of full, final and cleared payment of all agreed fees and expenses set forth in this Agreement, Developer hereby assigns, transfers, and conveys to Client all right, title, and interest in and to the custom deliverables, graphic assets, and bespoke source code created specifically for Client under this Agreement. Developer retains ownership of Developer background technology, pre-existing libraries, and general reusable tools, granting Client a perpetual, worldwide, non-exclusive, royalty-free license to use such background technology embedded within the Deliverables.',
    summary: 'Balanced IP assignment clause requiring full payment prior to copyright conveyance.',
    source: 'INTERNAL_TEMPLATE',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 'v1.3',
    status: 'Approved',
    tags: ['ip_assignment', 'website_development', 'background_technology', 'payment_condition'],
    approved_by: 'Admin / Commercial Counsel',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'kb_limitation_liability_06',
    title: 'Standard Mutual Limitation of Liability & Consequential Damages Exclusion',
    category: 'clause',
    jurisdiction: 'United States',
    document_type: 'All',
    content:
      'TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL EITHER PARTY BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, PUNITIVE, OR CONSEQUENTIAL DAMAGES (INCLUDING LOSS OF PROFITS, DATA, USE, GOODWILL, OR BUSINESS INTERRUPTION) ARISING OUT OF OR IN CONNECTION WITH THIS AGREEMENT, REGARDLESS OF THE THEORY OF LIABILITY (WHETHER CONTRACT, TORT, STRICT LIABILITY, OR OTHERWISE). IN NO EVENT SHALL EITHER PARTY TOTAL AGGREGATE LIABILITY EXCEED THE TOTAL FEES PAID OR PAYABLE BY CLIENT UNDER THIS AGREEMENT DURING THE TWELVE (12) MONTHS PRECEDING THE CLAIM.',
    summary: 'Standard mutual cap on liability and exclusion of consequential damages.',
    source: 'AUTHORITATIVE_SOURCE',
    source_url: 'American Bar Association Commercial Model Contract Clauses',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 'v1.4',
    status: 'Approved',
    tags: ['limitation_of_liability', 'consequential_damages', 'liability_cap', 'commercial'],
    approved_by: 'Admin / Commercial Counsel',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'kb_ai_hallucination_disclaimer_07',
    title: 'AI Output Hallucination and Non-Determinism Disclaimer',
    category: 'clause',
    jurisdiction: 'United States',
    document_type: 'AI Development Agreement',
    content:
      'Client expressly acknowledges and agrees that artificial intelligence models, machine learning systems, and neural networks operate probabilistically and are inherently non-deterministic. Developer makes no representations, warranties, or guarantees that generated AI outputs will be error-free, factual, or free from hallucinations, omissions, or algorithmic biases. Client assumes sole responsibility for testing, validating, verifying, and supervising all AI-generated outputs prior to commercial deployment or end-user reliance.',
    summary: 'Essential disclaimer protecting AI developers against hallucination claims.',
    source: 'AUTHORITATIVE_SOURCE',
    source_url: 'Emerging AI Commercial Precedents & Tech Law Standards',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 'v1.0',
    status: 'Approved',
    tags: ['ai_disclaimer', 'hallucinations', 'non_deterministic', 'ai_development'],
    approved_by: 'Admin / Tech Law Practice',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'kb_prohibited_terms_08',
    title: 'Prohibited Fabrications and Unverifiable Legal Claims',
    category: 'prohibited_wording',
    jurisdiction: 'All',
    document_type: 'All',
    content:
      'The drafting engine is strictly prohibited from generating phrasing that claims: "This document is legally guaranteed in all courts worldwide", "This draft replaces independent legal counsel", or fabricating nonexistent statute numbers, penal codes, or appellate case citations. When specific statutory provisions are unknown for a non-standard jurisdiction, the engine must insert: "[Requires qualified local legal review]".',
    summary: 'Core safety rule against legal hallucinations and false guarantees.',
    source: 'ADMIN_GUIDANCE',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 'v1.0',
    status: 'Approved',
    tags: ['prohibited_wording', 'safety_rule', 'compliance', 'hallucination_prevention'],
    approved_by: 'Platform Compliance Officer',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'kb_uae_governing_law_09',
    title: 'UAE Federal Law & DIFC / ADGM Arbitration Jurisdiction Clause',
    category: 'clause',
    jurisdiction: 'UAE',
    document_type: 'All',
    content:
      'This Agreement shall be governed by and construed in accordance with the federal laws of the United Arab Emirates and the local laws applicable in the Emirate of Dubai. Any dispute arising out of or in connection with this contract, including any question regarding its existence, validity or termination, shall be referred to and finally resolved by arbitration under the Arbitration Rules of the Dubai International Arbitration Centre (DIAC) or the DIFC-LCIA Arbitration Centre, which Rules are deemed to be incorporated by reference into this clause.',
    summary: 'UAE Dubai / DIFC commercial governing law and arbitration clause.',
    source: 'AUTHORITATIVE_SOURCE',
    source_url: 'UAE Federal Law No. 6 of 2018 on Arbitration / DIAC Rules',
    effective_date: '2026-01-01',
    review_date: '2027-01-01',
    version: 'v1.0',
    status: 'Approved',
    tags: ['uae', 'dubai', 'difc', 'diac', 'governing_law', 'arbitration'],
    approved_by: 'Admin / Legal Counsel',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

export const INITIAL_TEMPLATES: LegalTemplate[] = [
  {
    id: 'tpl_website_dev_v1',
    name: 'Website Development Master Agreement',
    document_type: 'Website Development Agreement',
    jurisdiction: 'United States',
    purpose: 'Commercial contract for bespoke website design, development, milestone payments, revision limits, and IP conveyance.',
    required_sections: [
      '1. Engagement & Scope of Work',
      '2. Client Responsibilities & Asset Deliveries',
      '3. Revisions & Acceptance Testing',
      '4. Fees, Payment Milestones & Expenses',
      '5. Intellectual Property & Ownership Assignment',
      '6. Confidentiality & Non-Disclosure',
      '7. Warranties & Limitation of Liability',
      '8. Term & Termination',
      '9. Dispute Resolution & Governing Law',
      '10. Signatures',
    ],
    optional_sections: [
      '11. Ongoing Maintenance & Hosting Addendum',
    ],
    required_clauses: [
      'Scope of Work Clause',
      'IP Assignment Upon Full Payment',
      'Limitation of Liability',
      'Governing Law & Forum Selection',
    ],
    optional_clauses: [
      'Portfolio Credit Rights',
      'Expedited Delivery Surcharge',
    ],
    variables: [
      { name: 'CLIENT_NAME', label: 'Client Name', placeholder: 'Acme Retail LLC', type: 'text', required: true },
      { name: 'DEVELOPER_NAME', label: 'Developer / Agency Name', placeholder: 'DevCraft Labs Inc.', type: 'text', required: true },
      { name: 'PROJECT_DESCRIPTION', label: 'Website Description', placeholder: 'Modern responsive marketing website and customer portal', type: 'textarea', required: true },
      { name: 'TOTAL_PRICE', label: 'Total Price', placeholder: '$15,000 USD', type: 'text', required: true },
      { name: 'PAYMENT_SCHEDULE', label: 'Payment Schedule', placeholder: '50% upon execution, 50% upon final acceptance', type: 'text', required: true },
      { name: 'DELIVERY_DATE', label: 'Target Delivery Date', placeholder: '2026-12-01', type: 'date', required: true },
      { name: 'NUMBER_OF_REVISIONS', label: 'Included Revision Rounds', placeholder: '2', type: 'number', required: true, defaultValue: '2' },
      { name: 'TERMINATION_NOTICE', label: 'Termination Notice Days', placeholder: '14', type: 'number', required: true, defaultValue: '14' },
      { name: 'JURISDICTION', label: 'Governing Jurisdiction', placeholder: 'State of Delaware, United States', type: 'text', required: true, defaultValue: 'United States' },
    ],
    legal_notes: 'Standard bilateral agreement. Enforces payment prior to IP transfer. Delaware choice of law recommended.',
    humanization_rules: {
      clause_protection: 'HIGH',
      tone: 'legal',
      intensity: 'CONSERVATIVE',
    },
    version: 'v1.4',
    approval_status: 'Approved',
    template_content: `# WEBSITE DEVELOPMENT AGREEMENT

This Website Development Agreement ("Agreement") is made and entered into as of {{EFFECTIVE_DATE}}, by and between:

**Client:** {{CLIENT_NAME}} ("Client"), and
**Developer:** {{DEVELOPER_NAME}} ("Developer").

Client and Developer may collectively be referred to as the "Parties" or individually as a "Party."

---

### 1. Engagement & Scope of Work
Developer agrees to perform website design, development, and engineering services described as follows:
{{PROJECT_DESCRIPTION}}

Developer shall deliver the completed deliverables in accordance with professional industry standards on or before {{DELIVERY_DATE}}.

### 2. Client Responsibilities & Asset Deliveries
Client shall provide all necessary text, logos, high-resolution media, access credentials, and third-party API accounts in a timely manner. Developer shall not be responsible for project delays caused by Client failure to provide necessary assets within five (5) business days of written request.

### 3. Revisions & Acceptance Testing
Client shall have a period of ten (10) business days following delivery of the staging deployment to inspect and test the website ("Acceptance Period"). Client may submit up to {{NUMBER_OF_REVISIONS}} consolidated rounds of feedback and revision requests within the original project scope. If Client fails to deliver written objections within the Acceptance Period, deliverables shall be deemed accepted.

### 4. Fees, Payment Milestones & Expenses
In consideration for the services rendered, Client agrees to pay Developer the total contract sum of {{TOTAL_PRICE}} according to the following schedule:
{{PAYMENT_SCHEDULE}}

All invoices are payable within fourteen (14) days of issuance. Late payments shall incur interest at the rate of 1.5% per month or the maximum rate permissible by law.

### 5. Intellectual Property & Ownership Assignment
Upon Developer receipt of full and final payment of all fees due under this Agreement, Developer hereby assigns, transfers, and conveys to Client all right, title, and copyright in and to the custom front-end code, bespoke graphics, and project deliverables created specifically for Client. Developer retains ownership of pre-existing development toolkits, libraries, and open-source packages, granting Client a perpetual, royalty-free license to utilize such components.

### 6. Confidentiality & Non-Disclosure
Each Party agrees to hold in strict confidence all proprietary technical, financial, and business information disclosed by the other Party during the term of this Agreement. Neither Party shall disclose confidential information without prior written consent.

### 7. Warranties & Limitation of Liability
Developer warrants that the website deliverables shall operate substantially in conformance with specifications for thirty (30) days post-launch. EXCEPT AS EXPRESSLY PROVIDED, DEVELOPER DISCLAIMS ALL WARRANTIES, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT PERMITTED BY LAW, NEITHER PARTY SHALL BE LIABLE FOR INDIRECT, CONSEQUENTIAL, OR PUNITIVE DAMAGES, AND TOTAL AGGREGATE LIABILITY SHALL NOT EXCEED THE TOTAL FEES PAID HEREUNDER.

### 8. Term & Termination
Either Party may terminate this Agreement upon {{TERMINATION_NOTICE}} days prior written notice. In the event of termination, Client shall pay Developer for all completed work and non-cancelable expenses incurred through the date of termination.

### 9. Dispute Resolution & Governing Law
This Agreement shall be governed by, construed and enforced in accordance with the laws of {{JURISDICTION}}. Any legal proceeding arising out of or related to this Agreement shall be brought exclusively in the courts of {{JURISDICTION}}.

### 10. Signatures

**Client: {{CLIENT_NAME}}**
Signature: __________________________
Name / Title: _______________________
Date: _______________________________

**Developer: {{DEVELOPER_NAME}}**
Signature: __________________________
Name / Title: _______________________
Date: _______________________________`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tpl_nda_mutual_v1',
    name: 'Mutual Non-Disclosure Agreement',
    document_type: 'NDA',
    jurisdiction: 'United States',
    purpose: 'Standard bilateral non-disclosure agreement protecting confidential business plans, technical IP, and discussions.',
    required_sections: [
      '1. Definition of Confidential Information',
      '2. Exclusions from Confidentiality',
      '3. Obligations & Standard of Care',
      '4. Term & Duration of Confidentiality',
      '5. Return or Destruction of Materials',
      '6. Remedies & Injunctive Relief',
      '7. Governing Law & Dispute Resolution',
      '8. Signatures',
    ],
    optional_sections: [
      '9. Non-Solicitation of Personnel',
    ],
    required_clauses: [
      'Standard of Care Clause',
      'Exceptions to Confidentiality',
      'Injunctive Relief Clause',
      'Governing Law Clause',
    ],
    optional_clauses: [
      'Residual Knowledge Carve-out',
    ],
    variables: [
      { name: 'DISCLOSING_PARTY', label: 'Disclosing / First Party', placeholder: 'Company Alpha LLC', type: 'text', required: true },
      { name: 'RECEIVING_PARTY', label: 'Receiving / Second Party', placeholder: 'Company Beta Corp', type: 'text', required: true },
      { name: 'PURPOSE_OF_DISCLOSURE', label: 'Purpose of Disclosure', placeholder: 'Evaluating strategic technology partnership and commercial engagement', type: 'textarea', required: true },
      { name: 'DURATION_YEARS', label: 'Duration (Years)', placeholder: '3', type: 'number', required: true, defaultValue: '3' },
      { name: 'JURISDICTION', label: 'Governing Jurisdiction', placeholder: 'State of Delaware, United States', type: 'text', required: true, defaultValue: 'United States' },
    ],
    legal_notes: 'Standard mutual NDA. Enforces injunctive relief rights for breach.',
    humanization_rules: {
      clause_protection: 'HIGH',
      tone: 'legal',
      intensity: 'CONSERVATIVE',
    },
    version: 'v1.1',
    approval_status: 'Approved',
    template_content: `# MUTUAL NON-DISCLOSURE AGREEMENT

This Mutual Non-Disclosure Agreement ("Agreement") is entered into as of {{EFFECTIVE_DATE}} by and between:

**Party A:** {{DISCLOSING_PARTY}}, and
**Party B:** {{RECEIVING_PARTY}}.

Each party may disclose ("Disclosing Party") or receive ("Receiving Party") confidential information under this Agreement.

---

### 1. Definition of Confidential Information
"Confidential Information" means all non-public, proprietary information disclosed by either Party to the other, whether orally, visually, or in writing, that is designated as confidential or that reasonably should be understood to be confidential given the nature of the information and circumstances of disclosure. Confidential Information includes, without limitation, source code, software architecture, algorithms, business plans, customer lists, financial data, and technical specifications related to:
{{PURPOSE_OF_DISCLOSURE}}

### 2. Exclusions from Confidentiality
Confidential Information does not include information that: (a) is or becomes publicly available without breach of this Agreement; (b) was known to Receiving Party prior to disclosure without confidentiality restrictions; (c) is independently developed by Receiving Party without reference to or reliance upon Disclosing Party Confidential Information; or (d) is rightfully received from a third party without duty of confidentiality.

### 3. Obligations & Standard of Care
Receiving Party agrees to: (a) protect Confidential Information using the same degree of care it uses to protect its own confidential information of like nature, but not less than reasonable care; (b) use Confidential Information solely for the Purpose described herein; and (c) restrict access to Confidential Information to employees, contractors, and advisors who have a need to know and are bound by confidentiality obligations at least as restrictive as those herein.

### 4. Term & Duration of Confidentiality
This Agreement shall govern disclosures made within one (1) year of the Effective Date. The confidentiality and non-use obligations with respect to all disclosed Confidential Information shall survive for a period of {{DURATION_YEARS}} years from the date of initial disclosure, except for trade secrets, which shall remain protected for as long as they qualify as trade secrets under applicable law.

### 5. Return or Destruction of Materials
Upon written request by Disclosing Party, Receiving Party shall promptly return or certify in writing the destruction of all documents, prototypes, and media containing Disclosing Party Confidential Information, provided that Receiving Party may retain archival copies solely to the extent required by law or automated system backup procedures.

### 6. Remedies & Injunctive Relief
The Parties acknowledge that an unauthorized disclosure of Confidential Information may cause irreparable harm for which monetary damages alone would be inadequate. Accordingly, Disclosing Party shall be entitled to seek equitable relief, including injunctive orders, without the necessity of posting a bond.

### 7. Governing Law & Dispute Resolution
This Agreement shall be governed by, and construed in accordance with, the laws of {{JURISDICTION}}, without regard to principles of conflicts of law.

### 8. Signatures

**{{DISCLOSING_PARTY}}**
Signature: __________________________
Name: _______________________________
Title: ______________________________
Date: _______________________________

**{{RECEIVING_PARTY}}**
Signature: __________________________
Name: _______________________________
Title: ______________________________
Date: _______________________________`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'tpl_privacy_policy_gdpr_v1',
    name: 'Global Privacy Policy (GDPR / CCPA)',
    document_type: 'Privacy Policy',
    jurisdiction: 'European Union',
    purpose: 'Comprehensive privacy policy compliant with GDPR, UK GDPR, and California CPRA.',
    required_sections: [
      '1. Overview & Data Controller Identity',
      '2. Categories of Information We Collect',
      '3. Legal Basis for Processing Personal Data',
      '4. How We Utilize Collected Information',
      '5. Third-Party Sharing & Sub-processors',
      '6. International Cross-Border Data Transfers',
      '7. Data Retention & Safeguards',
      '8. Data Subject Rights & Opt-Out Requests',
      '9. Children Privacy Notice',
      '10. Updates & Privacy Contact',
    ],
    optional_sections: [],
    required_clauses: [
      'Data Subject Rights Clause',
      'Legal Basis for Processing',
      'International Transfer Safeguards',
    ],
    optional_clauses: [],
    variables: [
      { name: 'COMPANY_NAME', label: 'Company / Organization Name', placeholder: 'Nexus Cloud Ltd.', type: 'text', required: true },
      { name: 'DPO_EMAIL', label: 'Privacy / DPO Email', placeholder: 'privacy@nexuscloud.io', type: 'text', required: true },
      { name: 'RETENTION_PERIOD', label: 'Retention Period', placeholder: '24 months after account termination', type: 'text', required: true },
      { name: 'JURISDICTION', label: 'Jurisdiction', placeholder: 'European Union', type: 'text', required: true, defaultValue: 'European Union' },
    ],
    legal_notes: 'GDPR Article 13/14 transparency disclosures and CCPA consumer rights.',
    humanization_rules: {
      clause_protection: 'HIGH',
      tone: 'formal',
      intensity: 'CONSERVATIVE',
    },
    version: 'v2.0',
    approval_status: 'Approved',
    template_content: `# PRIVACY POLICY

**Effective Date:** {{EFFECTIVE_DATE}}  
**Last Updated:** {{EFFECTIVE_DATE}}

{{COMPANY_NAME}} ("we," "our," or "us") is dedicated to protecting your privacy and handling your personal data transparently. This Privacy Policy details how we collect, process, store, and safeguard personal information collected through our services, in compliance with applicable data protection laws, including the General Data Protection Regulation (GDPR) and the California Consumer Privacy Act (CCPA).

---

### 1. Overview & Data Controller Identity
The data controller responsible for the processing of your personal data under this policy is {{COMPANY_NAME}}. If you have any inquiries regarding data protection, you may reach our Data Protection Officer at: {{DPO_EMAIL}}.

### 2. Categories of Information We Collect
We collect personal information that you provide directly, information collected automatically during service interaction, and data received from trusted partners:
- **Identifiers & Contact Details:** Name, email address, corporate affiliation, and telephone number.
- **Account & Authentication Data:** Login credentials, security tokens, and permission profiles.
- **Technical & Usage Telemetry:** IP address, browser type, operating system, session durations, and request logs.
- **Commercial & Payment Records:** Transaction identifiers, order details, and billing history (processed via certified PCI-DSS third-party processors).

### 3. Legal Basis for Processing Personal Data
Under the GDPR, we process personal data under the following legal bases:
- **Contractual Necessity:** Processing essential to provide, maintain, and deliver our contracted services.
- **Legitimate Interests:** Operating secure systems, fraud prevention, optimizing platform performance, and customer support.
- **Consent:** Where you have granted explicit consent, such as for promotional communications.
- **Legal Compliance:** Fulfilling statutory tax, accounting, and regulatory obligations.

### 4. How We Utilize Collected Information
We process your personal data for clear, legitimate purposes:
- Operating, maintaining, and improving platform capabilities.
- Managing user accounts, verification, and transactional security.
- Responding to support inquiries and legal notices.
- Detecting, preventing, and remediating unauthorized use or cybersecurity incidents.

### 5. Third-Party Sharing & Sub-processors
We do not sell personal information to third parties. We disclose data solely to:
- Authorized sub-processors providing cloud infrastructure, database hosting, and analytics.
- Payment gateway providers executing financial settlement.
- Competent law enforcement or regulatory authorities where mandated by binding legal process.

### 6. International Cross-Border Data Transfers
When personal data is transferred outside the European Economic Area (EEA), we implement appropriate safeguards in accordance with Chapter V of the GDPR, including European Commission Standard Contractual Clauses (SCCs).

### 7. Data Retention & Safeguards
We retain your personal data for: {{RETENTION_PERIOD}}, or for the duration necessary to satisfy the purposes set forth in this policy and statutory retention rules. We implement appropriate technical and organizational measures (TOMs), including encryption at rest (AES-256) and in transit (TLS 1.3), access controls, and regular vulnerability assessments.

### 8. Data Subject Rights & Opt-Out Requests
Subject to applicable law, you possess the right to:
- Request access to and a copy of your personal data.
- Request rectification of inaccurate or incomplete personal records.
- Request erasure ("right to be forgotten") of your personal data.
- Restrict or object to the processing of your data.
- Exercise data portability rights.
- Withdraw consent at any time without affecting past lawful processing.
To exercise any of these rights, contact our privacy desk at {{DPO_EMAIL}}.

### 9. Children Privacy Notice
Our platform is not directed toward individuals under the age of 18. We do not knowingly collect personal data from minors.

### 10. Updates & Privacy Contact
We may amend this Privacy Policy periodically. Notice of material updates will be posted clearly on our website. For inquiries, reach: {{DPO_EMAIL}}.`,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];
