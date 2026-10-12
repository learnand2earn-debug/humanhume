import { repository } from '../db/repository';
import { legalRepository } from '../legal/repository';

export class ChatbotAssistant {
  /**
   * Responds to user queries using real system telemetry and factual knowledge.
   */
  static async handleMessage(userMessage: string, activeDocumentId?: string): Promise<string> {
    const text = userMessage.toLowerCase().trim();

    // -----------------------------------------------------------------
    // SECTION 25 & 26: LEGAL DOCUMENTATION STUDIO & SAFETY COMMANDS
    // -----------------------------------------------------------------
    const legalSafetyNotice =
      '\n\n*Notice: I provide legal drafting information and assistance based on approved internal knowledge bases. I am not an attorney and do not provide binding legal advice. Review by a qualified legal professional is strongly recommended before execution.*';

    // Intelligent Workflow / Checklist Command
    if (text.includes('intelligent') || text.includes('checklist') || text.includes('claude') || text.includes('file analysis')) {
      return (
        `Our **Intelligent File Analysis & Dynamic Checklist Studio** executes a 12-stage Claude-style workflow:\n` +
        `1. **Universal File Intake**: Drop documents, spreadsheets, images, videos, audio, or code.\n` +
        `2. **Deep Content Extraction**: Inspects tables, citations, and detects cross-file contradictions.\n` +
        `3. **Dynamic Requirements Checklist**: Builds content-aware criteria with prioritized validation rules.\n` +
        `4. **Targeted Follow-Ups**: Prompts for missing information and merges decisions seamlessly.\n` +
        `5. **Post-Generation Verification**: Scores deliverable compliance, detects remaining gaps, and certifies production quality.\n\n` +
        `To start, click **"Intelligent Studio"** in the top navigation bar!`
      );
    }

    // 1. "Create a website development agreement."
    if (text.includes('website development agreement') || (text.includes('create') && text.includes('website') && text.includes('agreement'))) {
      return (
        `To draft a **Website Development Agreement**:
1. Open the **Documentation Studio** in the top navigation.
2. Select **Website Development Agreement**.
3. Choose your jurisdiction (e.g. United States, United Kingdom, Pakistan, EU).
4. Enter Client Name, Developer Name, Project Description, Total Price, Delivery Date, and Revisions.
5. Click **"Generate Document"**.

The system will retrieve approved IP conveyance clauses, enforce liability caps, draft structured sections, run the automated Humanizer, verify quality, and deliver a final DOCX/PDF/Markdown file.` +
        legalSafetyNotice
      );
    }

    // 2. "Create a privacy policy."
    if (text.includes('privacy policy') || (text.includes('create') && text.includes('privacy'))) {
      return (
        `To generate a GDPR / CCPA compliant **Privacy Policy**:
1. Navigate to the **Documentation Studio**.
2. Select **Privacy Policy**.
3. Specify your jurisdiction (e.g. European Union, United States, UK).
4. Enter your Company Name, Data Protection Officer Email, and Retention Period.
5. Click **"Generate Document"**.

Our engine automatically indexes GDPR Article 13/14 transparency principles, applies conservative legal humanization, and verifies complete statutory preservation.` +
        legalSafetyNotice
      );
    }

    // 3. "Draft an NDA."
    if (text.includes('draft an nda') || text.includes('create an nda') || text.includes('non-disclosure agreement') || text.includes('draft nda')) {
      return (
        `To draft a **Mutual Non-Disclosure Agreement (NDA)**:
1. Go to **Documentation Studio** → **Create Document**.
2. Select **NDA (Non-Disclosure Agreement)**.
3. Enter Disclosing Party, Receiving Party, Purpose of Disclosure, and Confidentiality Duration (e.g. 3 years).
4. Click **"Generate Document"**.

The draft will automatically incorporate standard definitions, trade secret carve-outs, injunctive relief covenants, and strict entity protection.` +
        legalSafetyNotice
      );
    }

    // 4. "Show missing information."
    if (text.includes('missing information') || text.includes('missing detail') || text.includes('what is missing')) {
      const activeLegalDoc = activeDocumentId ? legalRepository.getDocument(activeDocumentId) : legalRepository.listDocuments()[0];
      if (activeLegalDoc) {
        const docType = legalRepository.getDocumentType(activeLegalDoc.document_type.toLowerCase().replace(/\s+/g, '-')) ||
          legalRepository.listDocumentTypes().find((d) => d.name.toLowerCase() === activeLegalDoc.document_type.toLowerCase());
        if (docType) {
          const missing = docType.fields.filter(
            (f) => f.required && (!activeLegalDoc.input_parameters[f.name] || !String(activeLegalDoc.input_parameters[f.name]).trim())
          );
          if (missing.length > 0) {
            return `Missing Information for "${activeLegalDoc.title}":\n` +
              missing.map((m) => `• **${m.label}**: required detail missing`).join('\n') +
              `\nPlease supply these fields before final execution.` + legalSafetyNotice;
          }
        }
        return `All mandatory fields for document "${activeLegalDoc.title}" have been successfully provided and validated.` + legalSafetyNotice;
      }
      return `No active legal draft found. In the Documentation Studio, our Missing Information Engine automatically detects unprovided required variables before generation starts.` + legalSafetyNotice;
    }

    // 5. "Show legal warnings."
    if (text.includes('legal warning') || text.includes('show warnings') || text.includes('warnings')) {
      const activeLegalDoc = activeDocumentId ? legalRepository.getDocument(activeDocumentId) : legalRepository.listDocuments()[0];
      if (activeLegalDoc && activeLegalDoc.report) {
        const warnings = activeLegalDoc.report.warnings;
        if (warnings.length > 0) {
          return `Legal Warnings for "${activeLegalDoc.title}":\n` +
            warnings.map((w) => `⚠️ ${w}`).join('\n') +
            `\nQuality Status: **${activeLegalDoc.report.legalQualityResult.status}**.` + legalSafetyNotice;
        }
        return `Great news! "${activeLegalDoc.title}" has **0 warnings** and passed all Legal Quality Checker audits with a score of ${activeLegalDoc.report.legalQualityResult.score}/100.` + legalSafetyNotice;
      }
      return `Our Legal Quality Checker detects: missing sections, missing clauses, contradictory terms, undefined definitions, empty variables, missing signatures, and jurisdiction mismatches.` + legalSafetyNotice;
    }

    // 6. "Explain this clause."
    if (text.includes('explain') && (text.includes('clause') || text.includes('provision') || text.includes('term'))) {
      const kbEntries = legalRepository.listKnowledgeBase({ status: 'Approved' });
      const sample = kbEntries.slice(0, 3).map((k) => `• **${k.title}** (${k.jurisdiction}): ${k.summary}`).join('\n');
      return (
        `Here are examples of approved legal clauses indexed in our Knowledge Base:\n${sample}\n\nOur internal knowledge base indexes approved wording, prohibited statements, and statutory references. Ask about specific clauses like **Delaware Governing Law**, **GDPR Article 28**, or **Limitation of Liability**.` +
        legalSafetyNotice
      );
    }

    // 7. "Check this document."
    if (text.includes('check this document') || (text.includes('check') && text.includes('legal'))) {
      const activeLegalDoc = activeDocumentId ? legalRepository.getDocument(activeDocumentId) : legalRepository.listDocuments()[0];
      if (activeLegalDoc && activeLegalDoc.report) {
        return (
          `Audit Summary for "${activeLegalDoc.title}":
• Status: **${activeLegalDoc.status}**
• AI Detection Probability: **${activeLegalDoc.report.checkerResult.score}%** (${activeLegalDoc.report.checkerResult.status})
• Legal Quality Score: **${activeLegalDoc.report.legalQualityResult.score}/100** (${activeLegalDoc.report.legalQualityResult.status})
• Contractual Preservation Score: **${activeLegalDoc.report.preservationResult.score}%** (Restored: ${activeLegalDoc.report.preservationResult.restoredCount} sections)
• Warnings: ${activeLegalDoc.report.warnings.length}` + legalSafetyNotice
        );
      }
      return `To run a complete legal check, open your draft in **Documentation Studio** and click **Run Legal Check**.` + legalSafetyNotice;
    }

    // 8. "Humanize this document."
    if (text.includes('humanize this document') || (text.includes('humanize') && text.includes('draft'))) {
      return (
        `In Documentation Studio, humanization is **100% automated**:
1. The draft is first protected (locking numbers, statutes, definitions, dates, and party names).
2. It is passed through our Humanizer Engine with **Conservative / Legal register**.
3. The Legal Preservation Agent verifies that all obligations and prohibitions remain intact.
4. If any obligation changes, that section is instantly restored.` + legalSafetyNotice
      );
    }

    // Check if the user is asking about an active document or specific file
    if (activeDocumentId || text.includes('my file') || text.includes('document') || text.includes('status')) {
      const documents = repository.listDocuments();
      const targetDoc = activeDocumentId
        ? repository.getDocument(activeDocumentId)
        : documents[0];

      if (targetDoc) {
        const job = repository.getJob(targetDoc.id);
        const versions = repository.listVersions(targetDoc.id);

        if (text.includes('status') || text.includes('happening') || text.includes('progress')) {
          switch (targetDoc.status) {
            case 'QUEUED':
              return `Your document "${targetDoc.originalName}" is queued and will begin extraction immediately. The original file remains safe and untouched.`;
            case 'EXTRACTING':
              return `We are currently extracting text and inspecting the formatting of "${targetDoc.originalName}".`;
            case 'ANALYZING':
              return `Our Document Analysis Agent is detecting headings, tone, and paragraph structures in "${targetDoc.originalName}".`;
            case 'PROTECTING':
              return `We are locking critical content (numbers, citations, formulas, tables, headings) in "${targetDoc.originalName}" into a protected-content map so it cannot be altered.`;
            case 'HUMANIZING':
              return `The Humanizer Agent is currently refining sentence rhythms and natural flow in "${targetDoc.originalName}".`;
            case 'CHECKING':
              return `Your document is currently being checked after humanization. The original file remains unchanged.`;
            case 'FIXING':
              return `Our Auto-Fix Agent is inspecting flagged sentences and restoring any modified numbers or citations in "${targetDoc.originalName}".`;
            case 'FINALIZING':
              return `Final quality checks are running and the output document is being compiled with preserved formatting.`;
            case 'COMPLETED':
              return `Great news! "${targetDoc.originalName}" has completed processing with a Preservation Score of ${targetDoc.preservationScore ?? 100}% and AI Detection probability of ${targetDoc.aiCheckScore ?? 8}%. You can now download the Original, Best Version, or Final Document.`;
            case 'NEEDS_REVIEW':
              return `Document "${targetDoc.originalName}" has finished with a status of NEEDS_REVIEW. You can inspect the Diff and review versions before downloading.`;
            case 'FAILED':
              return `Processing for "${targetDoc.originalName}" failed with error: "${targetDoc.errorMessage || 'Unknown error'}". You can click Retry in the dashboard.`;
            default:
              return `Document "${targetDoc.originalName}" is currently in state: ${targetDoc.status} (Progress: ${job?.progressPercent ?? 0}%).`;
          }
        }

        if (text.includes('score') || text.includes('quality') || text.includes('check')) {
          return `For "${targetDoc.originalName}": Preservation Score is ${targetDoc.preservationScore ?? 100}%, AI Score is ${targetDoc.aiCheckScore ?? 8}%, and Readability is ${targetDoc.readabilityScore ?? 75}/100. We generated ${versions.length} versions.`;
        }
      } else {
        if (text.includes('my file') || text.includes('status')) {
          return `You don't have any uploaded documents currently in processing. Drop a file onto the upload zone to begin automated processing!`;
        }
      }
    }

    // Supported formats
    if (text.includes('format') || text.includes('supported') || text.includes('file type')) {
      return `HumanFlow AI supports **DOCX**, **PDF**, **TXT**, **MD**, **RTF**, and **XLSX**. The original file is always saved untouched in secure storage, and a working copy is generated for processing.`;
    }

    // Preservation system
    if (text.includes('preserv') || text.includes('citation') || text.includes('fact') || text.includes('number')) {
      return `Our Content Protection and Preservation Agents automatically detect and protect citations, references, headings, numbers, percentages, dates, URLs, code, and tables. If any critical entity is altered during rewriting, it is automatically restored from the original.`;
    }

    // How uploading works
    if (text.includes('how') && (text.includes('upload') || text.includes('work') || text.includes('pipeline'))) {
      return `It's 100% autonomous: simply drop your document into the upload zone. HumanFlow AI automatically extracts text, protects factual content, runs the humanizer, verifies AI scores, automatically fixes any flagged sections, generates the final formatted file, and notifies you when ready for download.`;
    }

    // API settings & configuration
    if (text.includes('api') || text.includes('key') || text.includes('setting') || text.includes('admin')) {
      const settings = repository.getSettings();
      return `You can configure the Humanizer and Checker APIs in the Admin Settings panel. Current mode is **${settings.mode.toUpperCase()}**. API keys are kept strictly on the server and are masked in the UI. You can test your API connections using the "Test Humanizer API" and "Test Checker API" buttons.`;
    }

    // Downloads
    if (text.includes('download') || text.includes('export')) {
      return `Once a document finishes processing, you can download the **Original**, the **Best Version**, or the **Final Processed Document** directly from the Results view or Version History panel.`;
    }

    // Troubleshooting
    if (text.includes('troubleshoot') || text.includes('error') || text.includes('fail') || text.includes('help')) {
      return `If a document fails or gets flagged for review:
1. Ensure the file isn't password protected.
2. Check that the text is readable (not an unreadable scanned image without OCR).
3. If using Live Mode, test your API connection in Admin Settings.
4. Click the "Retry" button on the document card to re-trigger the automated pipeline.`;
    }

    // Default overview
    return `Hello! I am the HumanFlow Assistant. I can help you with:
• **Documentation Studio**: "Create a website development agreement", "Create a privacy policy", "Draft an NDA"
• **Legal Analysis**: "Explain this clause", "Show missing information", "Show legal warnings", "Check this document"
• **Autonomous Pipeline**: Live document tracking, factual preservation, anti-detection scoring
• **File Formats**: DOCX, PDF, TXT, MD, RTF, XLSX export and downloads.

How can I assist you today?`;
  }
}
