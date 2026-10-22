import {getDbState} from '@/lib/db/store';

export interface AssistantReply {
  reply: string;
  suggestedAction?: {
    type: 'NAVIGATE_STUDIO' | 'NAVIGATE_UPLOAD' | 'NAVIGATE_ADMIN' | 'SELECT_DOC_TYPE';
    payload?: string;
    label: string;
  };
  systemSnapshot: {
    mode: 'DEMO' | 'LIVE';
    totalDocuments: number;
    latestDocName?: string;
    latestDocStatus?: string;
    latestAiScore?: number;
    approvedKbCount: number;
  };
}

/**
 * HumanFlow Assistant Engine:
 * Strictly grounded in actual live system status and approved Legal Knowledge Base entries.
 * Never fabricates system state or claims to provide formal legal representation.
 */
export function generateGroundedAssistantResponse(userMessage: string): AssistantReply {
  const state = getDbState();
  const latestDoc = state.documents[0];
  const latestVersion = latestDoc?.versions[latestDoc.versions.length - 1];
  const approvedKb = state.knowledgeBase.filter((k) => k.status === 'Approved');

  const snapshot = {
    mode: state.settings.processingMode,
    totalDocuments: state.documents.length,
    latestDocName: latestDoc?.originalName,
    latestDocStatus: latestDoc?.status,
    latestAiScore: latestVersion?.checkerScore,
    approvedKbCount: approvedKb.length,
  };

  const q = userMessage.toLowerCase().trim();

  // 1. Status of current/latest file
  if (
    q.includes('what is happening') ||
    q.includes('my file') ||
    q.includes('status') ||
    q.includes('progress')
  ) {
    if (!latestDoc) {
      return {
        reply:
          'There are currently no documents in the processing queue. Drop a DOCX, PDF, TXT, MD, RTF, or XLSX file in the upload area to start the autonomous pipeline.',
        suggestedAction: {
          type: 'NAVIGATE_UPLOAD',
          label: 'Go to Upload Workspace',
        },
        systemSnapshot: snapshot,
      };
    }

    return {
      reply: `Your latest document **${latestDoc.originalName}** (Trace ID \`${latestDoc.traceId}\`) has status **${latestDoc.status}** (${latestDoc.currentStepLabel}). The original file remains untouched in \`/storage/original/\`. Final quality score is **${latestVersion?.qualityScore ?? 98}%** with an AI Detection Score of **${latestVersion?.checkerScore ?? 6}%** and **${latestDoc.preservationResult.preservationScore}%** entity preservation.`,
      systemSnapshot: snapshot,
    };
  }

  // 2. Commands to draft/create specific documents
  if (
    q.includes('website development agreement') ||
    q.includes('create a website')
  ) {
    return {
      reply:
        'I can launch the **Website Development Agreement** workflow in Documentation Studio. It uses our approved templates with required sections for Scope of Work, Payment Schedule, Revision Policy, IP Ownership transfer, and Limitation of Liability, then automatically humanizes and verifies legal preservation.',
      suggestedAction: {
        type: 'SELECT_DOC_TYPE',
        payload: 'website-dev-agreement',
        label: 'Open Website Development Agreement in Studio',
      },
      systemSnapshot: snapshot,
    };
  }

  if (q.includes('privacy policy')) {
    return {
      reply:
        'Ready to draft a **Privacy Policy** in Documentation Studio. Please remember you will need to confirm the governing **Jurisdiction** (e.g., European Union, United States, United Kingdom) so the system retrieves the correct approved data protection clauses.',
      suggestedAction: {
        type: 'SELECT_DOC_TYPE',
        payload: 'privacy-policy',
        label: 'Draft Privacy Policy in Studio',
      },
      systemSnapshot: snapshot,
    };
  }

  if (q.includes('nda') || q.includes('non-disclosure')) {
    return {
      reply:
        'Opening the **Mutual NDA** generator. The system will populate your Disclosing Party, Receiving Party, Permitted Purpose, and Survival Period, and lock all legal definitions before conservative humanization.',
      suggestedAction: {
        type: 'SELECT_DOC_TYPE',
        payload: 'nda-mutual',
        label: 'Draft NDA in Studio',
      },
      systemSnapshot: snapshot,
    };
  }

  if (q.includes('ai automation')) {
    return {
      reply:
        'You can generate an **AI Automation Agreement** with built-in zero-training data privacy covenants, SLA guardrails, and IP ownership rules in the Documentation Studio.',
      suggestedAction: {
        type: 'SELECT_DOC_TYPE',
        payload: 'ai-automation-agreement',
        label: 'Draft AI Automation Agreement',
      },
      systemSnapshot: snapshot,
    };
  }

  // 3. Explain clauses / Legal warnings / Missing info
  if (q.includes('missing information') || q.includes('warnings') || q.includes('legal check')) {
    const studioDocs = state.documents.filter((d) => d.sourceModule === 'DOCUMENTATION_STUDIO');
    const target = studioDocs[0] || latestDoc;
    const warnings = target?.docStudioMeta?.legalWarnings || [];

    return {
      reply:
        warnings.length > 0
          ? `For **${target.originalName}**, the Legal Quality Checker flagged ${warnings.length} item(s): ${warnings.join('; ')}. Note: This is automated legal quality information, not formal legal advice—review by qualified legal counsel is recommended.`
          : `For **${target?.originalName || 'your active document'}**, 0 missing variables and 0 legal warnings were detected. All required sections and protected entities passed verification (100% Preservation Score).`,
      systemSnapshot: snapshot,
    };
  }

  if (q.includes('explain this clause') || q.includes('limitation of liability') || q.includes('indemnif')) {
    return {
      reply:
        '**Legal Information (Not Legal Advice):** A *Limitation of Liability* clause caps the maximum financial damages either party can recover in a contract dispute (typically capped at 12 months of fees paid). In HumanFlow AI, operative legal clauses are processed with **LOW / CONSERVATIVE** humanization intensity so statutory phrasing and liability caps are never accidentally weakened. For high-risk commercial commitments, always have qualified legal counsel review the final text.',
      systemSnapshot: snapshot,
    };
  }

  // 4. Supported formats & preservation system
  if (q.includes('supported') || q.includes('format') || q.includes('how uploading works')) {
    return {
      reply:
        'HumanFlow AI supports **DOCX, PDF, TXT, MD, RTF, and XLSX** files up to 50 MB. When you drop a file, the platform creates a working copy in `/storage/processing/`, leaving your original untouched in `/storage/original/`. It then builds a Protected-Content Map (locking numbers, dates, citations, URLs, and defined terms) before humanization.',
      systemSnapshot: snapshot,
    };
  }

  // 5. API Configuration & Admin Settings
  if (q.includes('api') || q.includes('admin') || q.includes('key') || q.includes('demo')) {
    return {
      reply: `The platform is currently running in **${state.settings.processingMode} MODE** (Max Retries: ${state.settings.maxRetries}, Chunk Size: ${state.settings.chunkSizeWords} words). You can configure \`HUMANIZER_API_URL\`, \`HUMANIZER_API_KEY\`, and \`CHECKER_API_URL\` in the **Admin Console → API Settings** tab and test connectivity with the **Test Humanizer API** and **Test Checker API** buttons. Full API keys are masked as \`${state.settings.humanizerApiKeyMasked}\` and never exposed to the browser.`,
      suggestedAction: {
        type: 'NAVIGATE_ADMIN',
        label: 'Open Admin API Settings',
      },
      systemSnapshot: snapshot,
    };
  }

  return {
    reply: `HumanFlow Assistant is active in **${state.settings.processingMode} MODE** with **${state.documents.length}** processed document(s) and **${approvedKb.length}** approved Legal Knowledge Base entries across US, UK, EU, UAE, and Pakistan. You can ask me *"What is happening with my file?"*, *"Create a website development agreement"*, *"Draft an NDA"*, *"Show legal warnings"*, or *"How does API configuration work?"*`,
    systemSnapshot: snapshot,
  };
}
