import { legalRepository } from './repository';
import {
  LegalDocumentType,
  LegalSectionItem,
  LegalTemplate,
} from './types';

export interface DraftRequest {
  documentTypeId: string;
  jurisdiction?: string;
  instructions?: string;
  fieldValues: Record<string, unknown>;
  disclaimerEnabled?: boolean;
}

export interface MissingInfoCheckResult {
  hasMissing: boolean;
  missingCount: number;
  missingFields: Array<{ name: string; label: string; description?: string }>;
  message: string;
}

export class DocumentationDraftingAgent {
  /**
   * Validates if jurisdiction is provided for legal documents
   */
  static validateJurisdiction(
    docType: LegalDocumentType,
    jurisdiction?: string
  ): { valid: boolean; error?: string } {
    if (docType.is_legal) {
      if (!jurisdiction || !jurisdiction.trim()) {
        return {
          valid: false,
          error: 'Jurisdiction required: Every legal document must have a designated jurisdiction.',
        };
      }
    }
    return { valid: true };
  }

  /**
   * Missing Information Engine (Section 24)
   * Detects missing required variables and instructions before drafting
   */
  static checkMissingInformation(
    docType: LegalDocumentType,
    fieldValues: Record<string, unknown>,
    template?: LegalTemplate | null
  ): MissingInfoCheckResult {
    const missing: Array<{ name: string; label: string; description?: string }> = [];

    // Check doc type fields
    for (const f of docType.fields) {
      if (f.required) {
        const val = fieldValues[f.name];
        if (val === undefined || val === null || String(val).trim() === '') {
          missing.push({
            name: f.name,
            label: f.label,
            description: f.description || `Required detail for ${docType.name}`,
          });
        }
      }
    }

    // Check template variables if template exists
    if (template && template.variables) {
      for (const v of template.variables) {
        if (v.required && !missing.some((m) => m.name === v.name)) {
          const val = fieldValues[v.name];
          if (val === undefined || val === null || String(val).trim() === '') {
            missing.push({
              name: v.name,
              label: v.label,
              description: v.description || `Required template variable: {{${v.name}}}`,
            });
          }
        }
      }
    }

    const hasMissing = missing.length > 0;
    return {
      hasMissing,
      missingCount: missing.length,
      missingFields: missing,
      message: hasMissing
        ? `${missing.length} required detail${missing.length > 1 ? 's are' : ' is'} missing: ${missing.map((m) => m.label).join(', ')}`
        : 'All required information provided.',
    };
  }

  /**
   * Generates a structured draft from user inputs, approved KB, and template
   */
  static async generateDraft(request: DraftRequest): Promise<{
    draftText: string;
    sections: LegalSectionItem[];
    templateUsed?: LegalTemplate;
    knowledgeSourcesUsed: Array<{ id: string; title: string; source: string }>;
  }> {
    const docType = legalRepository.getDocumentType(request.documentTypeId);
    if (!docType) {
      throw new Error(`Invalid document type: ${request.documentTypeId}`);
    }

    // 1. Jurisdiction check
    const jurCheck = this.validateJurisdiction(docType, request.jurisdiction);
    if (!jurCheck.valid) {
      throw new Error(jurCheck.error);
    }

    const jurisdiction = request.jurisdiction || docType.default_jurisdiction || 'United States';
    const settings = legalRepository.getSettings();

    // 2. Retrieve appropriate approved template
    const templates = legalRepository.listTemplates({
      documentType: docType.name,
      jurisdiction,
      status: 'Approved',
    });
    const template = templates[0] || legalRepository.listTemplates({ documentType: docType.name })[0] || null;

    // 3. Retrieve relevant approved knowledge base records
    const approvedKB = legalRepository.listKnowledgeBase({
      jurisdiction,
      documentType: docType.name,
      status: 'Approved',
    });

    // Also include general 'All' jurisdiction entries
    const globalApprovedKB = legalRepository.listKnowledgeBase({
      jurisdiction: 'All',
      documentType: docType.name,
      status: 'Approved',
    });
    const combinedKB = [...approvedKB, ...globalApprovedKB.filter((g) => !approvedKB.some((a) => a.id === g.id))];

    // Check knowledge conflicts
    legalRepository.detectConflicts(jurisdiction, docType.name);

    // 4. Determine required sections based on doc type
    const sectionTitles = template?.required_sections && template.required_sections.length > 0
      ? template.required_sections
      : docType.required_sections;

    const sections: LegalSectionItem[] = [];
    const knowledgeSourcesUsed: Array<{ id: string; title: string; source: string }> = [];

    // Helper to replace variables
    const effectiveDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });

    const mergedValues: Record<string, string> = {
      EFFECTIVE_DATE: effectiveDate,
      JURISDICTION: jurisdiction,
    };

    for (const [k, v] of Object.entries(request.fieldValues)) {
      mergedValues[k] = String(v ?? '');
    }

    const replaceVariables = (str: string) => {
      let res = str;
      for (const [k, v] of Object.entries(mergedValues)) {
        res = res.replace(new RegExp(`{{${k}}}`, 'g'), v);
      }
      return res;
    };

    // If template has full content, parse sections from template content
    if (template && template.template_content) {
      const templateSections = this.parseTemplateSections(template.template_content);
      for (let i = 0; i < templateSections.length; i++) {
        const tSec = templateSections[i];
        let content = replaceVariables(tSec.content);

        // Check matching approved KB entry for enrichment or verification
        const matchedKB = combinedKB.find(
          (k) =>
            k.content.toLowerCase().includes(tSec.title.toLowerCase()) ||
            tSec.title.toLowerCase().includes(k.category.toLowerCase()) ||
            k.tags.some((t) => tSec.title.toLowerCase().includes(t.toLowerCase()))
        );

        let sourceName = 'Generated from configured drafting instructions';
        let sourceId: string | undefined;
        let requiresReview = false;
        let reviewReason: string | undefined;

        if (matchedKB) {
          sourceId = matchedKB.id;
          sourceName = `${matchedKB.source}: ${matchedKB.title}`;
          knowledgeSourcesUsed.push({
            id: matchedKB.id,
            title: matchedKB.title,
            source: matchedKB.source,
          });
        } else if (docType.is_legal && (tSec.title.toLowerCase().includes('governing law') || tSec.title.toLowerCase().includes('dispute'))) {
          // If legal section has no approved knowledge base source for this jurisdiction
          if (jurisdiction === 'Custom' || !combinedKB.some((k) => k.category === 'clause' && k.tags.includes('governing_law'))) {
            requiresReview = true;
            reviewReason = 'Jurisdiction statutory principles not fully indexed in knowledge base. Requires local counsel review.';
            content += '\n\n[Requires legal review: Specific statutory dispute mechanisms for this jurisdiction must be verified by local counsel.]';
          }
        }

        sections.push({
          id: `sec_${i + 1}`,
          sectionNumber: i + 1,
          title: tSec.title,
          content: content.trim(),
          isLegalClause: docType.is_legal,
          sourceId,
          sourceName,
          jurisdiction,
          version: template.version,
          lastUpdated: template.updated_at,
          requiresReview,
          reviewReason,
        });
      }
    } else {
      // Dynamic section generation from docType instructions
      for (let i = 0; i < sectionTitles.length; i++) {
        const title = sectionTitles[i];
        const instruction = docType.default_instructions[i] || `Draft professional content for ${title}.`;

        const matchedKB = combinedKB.find(
          (k) =>
            k.content.toLowerCase().includes(title.toLowerCase()) ||
            k.tags.some((t) => title.toLowerCase().includes(t.toLowerCase()))
        );

        let content = '';
        let sourceName = 'Generated from configured drafting instructions';
        let sourceId: string | undefined;
        let requiresReview = false;
        let reviewReason: string | undefined;

        if (matchedKB) {
          content = replaceVariables(matchedKB.content);
          sourceId = matchedKB.id;
          sourceName = `${matchedKB.source}: ${matchedKB.title}`;
          knowledgeSourcesUsed.push({
            id: matchedKB.id,
            title: matchedKB.title,
            source: matchedKB.source,
          });
        } else {
          content = this.generateFallbackSectionContent(title, instruction, docType, mergedValues);
        }

        if (docType.is_legal && !matchedKB && (title.toLowerCase().includes('governing') || title.toLowerCase().includes('liability'))) {
          requiresReview = true;
          reviewReason = 'Statutory clause lacks authoritative knowledge base entry for specified jurisdiction.';
          content += '\n\n[Requires legal review: Applicable statutory provisions must be certified by local counsel.]';
        }

        sections.push({
          id: `sec_${i + 1}`,
          sectionNumber: i + 1,
          title,
          content: replaceVariables(content).trim(),
          isLegalClause: docType.is_legal,
          sourceId,
          sourceName,
          jurisdiction,
          version: 'v1.0',
          lastUpdated: new Date().toISOString(),
          requiresReview,
          reviewReason,
        });
      }
    }

    // 5. Append user specific instructions if provided
    if (request.instructions && request.instructions.trim()) {
      const userNotes = replaceVariables(request.instructions.trim());
      // Append as Special Terms / Schedule if not empty
      sections.push({
        id: `sec_special_${sections.length + 1}`,
        sectionNumber: sections.length + 1,
        title: 'Special Conditions & Specific Provisions',
        content: `The Parties additionally agree to the following bespoke specifications:\n${userNotes}`,
        isLegalClause: docType.is_legal,
        sourceName: 'User-provided custom drafting specifications',
        jurisdiction,
        version: 'v1.0',
        lastUpdated: new Date().toISOString(),
      });
    }

    // 6. Build final markdown text with disclaimer if enabled
    const parts: string[] = [];

    const showDisclaimer = request.disclaimerEnabled !== false && settings.disclaimerEnabled;
    if (showDisclaimer && docType.is_legal) {
      parts.push(`> [!NOTE]\n> **Legal Notice:** ${settings.legalDisclaimer}\n`);
    }

    parts.push(`# ${docType.name.toUpperCase()}\n`);
    parts.push(`**Jurisdiction:** ${jurisdiction}  `);
    parts.push(`**Effective Date:** ${effectiveDate}\n`);
    parts.push('---\n');

    for (const sec of sections) {
      parts.push(`### ${sec.title}`);
      parts.push(`${sec.content}\n`);
    }

    const draftText = parts.join('\n');

    return {
      draftText,
      sections,
      templateUsed: template || undefined,
      knowledgeSourcesUsed,
    };
  }

  private static parseTemplateSections(content: string): Array<{ title: string; content: string }> {
    const lines = content.split('\n');
    const sections: Array<{ title: string; content: string }> = [];

    let currentTitle = 'Preamble';
    let currentLines: string[] = [];

    for (const line of lines) {
      if (line.startsWith('### ') || line.startsWith('## ')) {
        if (currentLines.length > 0) {
          sections.push({
            title: currentTitle,
            content: currentLines.join('\n').trim(),
          });
          currentLines = [];
        }
        currentTitle = line.replace(/^#{2,3}\s+/, '').trim();
      } else {
        currentLines.push(line);
      }
    }

    if (currentLines.length > 0) {
      sections.push({
        title: currentTitle,
        content: currentLines.join('\n').trim(),
      });
    }

    return sections;
  }

  private static generateFallbackSectionContent(
    title: string,
    instruction: string,
    docType: LegalDocumentType,
    values: Record<string, string>
  ): string {
    const t = title.toLowerCase();
    if (t.includes('introduction') || t.includes('preamble') || t.includes('acceptance')) {
      return `This ${docType.name} ("Document") is established as of ${values.EFFECTIVE_DATE || 'the Effective Date'} by and between the relevant entities pursuant to: ${instruction}`;
    }
    if (t.includes('scope') || t.includes('responsibilities')) {
      return `The applicable parties covenant to perform and fulfill their respective responsibilities and deliverables in accordance with professional industry standards:\n- ${instruction}\n- All work product shall conform to agreed specifications.`;
    }
    if (t.includes('payment') || t.includes('compensation') || t.includes('fees')) {
      return `Compensation and consideration for all performances under this Document shall be rendered according to agreed financial terms: ${values.TOTAL_PRICE || values.FEE_STRUCTURE || 'as agreed in writing'}. All payments are non-refundable unless expressly stated.`;
    }
    if (t.includes('intellectual property') || t.includes('ownership')) {
      return `All rights, title, copyright, and patent privileges in and to proprietary materials and confidential deliverables shall remain protected. Any transfer of ownership shall be conditional upon cleared payment.`;
    }
    if (t.includes('confidentiality')) {
      return `The Parties shall maintain in confidence all non-public proprietary data, operational secrets, and communications received in connection with this Document, exercising a reasonable degree of care.`;
    }
    if (t.includes('governing law') || t.includes('dispute')) {
      return `This Document shall be construed, interpreted, and governed under the laws of ${values.JURISDICTION || 'the applicable jurisdiction'}. Any controversy or dispute shall be submitted to the competent courts of ${values.JURISDICTION || 'the jurisdiction'}.`;
    }
    if (t.includes('signature')) {
      return `IN WITNESS WHEREOF, the authorized representatives have executed this Document as of the Effective Date.\n\nParty 1: __________________________\nParty 2: __________________________`;
    }
    return `Pursuant to ${instruction}, the parties shall adhere strictly to the terms, conditions, covenants, and performance requirements set forth herein.`;
  }
}
