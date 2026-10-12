import crypto from 'crypto';
import { extractDocumentText } from '../document/extractor';
import { SupportedFileType } from '../types';
import { legalRepository } from './repository';
import {
  KnowledgeCategory,
  KnowledgeSource,
  KnowledgeStatus,
  LegalKnowledgeBaseEntry,
} from './types';

export class KnowledgeIngestionEngine {
  /**
   * Ingests an uploaded document (PDF, DOCX, TXT, MD), extracts metadata,
   * creates an unapproved draft knowledge entry, and saves source reference.
   * STRICT SAFETY RULE: Material is NEVER automatically approved for production.
   */
  static async ingestDocument(
    buffer: Buffer,
    fileName: string,
    fileType: SupportedFileType
  ): Promise<{
    source: KnowledgeSource;
    draftKnowledgeEntry: LegalKnowledgeBaseEntry;
  }> {
    const extracted = await extractDocumentText(buffer, fileType, fileName);
    const text = extracted.text;

    // Detect Jurisdiction
    let jurisdiction = 'United States';
    const lower = text.toLowerCase();
    if (lower.includes('pakistan') || lower.includes('contract act, 1872')) {
      jurisdiction = 'Pakistan';
    } else if (lower.includes('england and wales') || lower.includes('united kingdom')) {
      jurisdiction = 'United Kingdom';
    } else if (lower.includes('gdpr') || lower.includes('european union')) {
      jurisdiction = 'European Union';
    } else if (lower.includes('dubai') || lower.includes('uae') || lower.includes('difc')) {
      jurisdiction = 'UAE';
    } else if (lower.includes('delaware') || lower.includes('california')) {
      jurisdiction = 'United States';
    }

    // Detect Document Type
    let detectedDocType = 'Custom Document';
    const docTypes = legalRepository.listDocumentTypes();
    for (const dt of docTypes) {
      if (lower.includes(dt.name.toLowerCase())) {
        detectedDocType = dt.name;
        break;
      }
    }

    // Extract Sections and Clauses
    const sections: string[] = [];
    const lines = text.split('\n');
    for (const line of lines) {
      if (line.startsWith('#') || line.startsWith('Section') || line.startsWith('Article')) {
        sections.push(line.replace(/^[#\s]+/, '').trim());
      }
    }

    // Extract Definitions in quotes
    const defMatches = text.match(/\("([A-Z][a-zA-Z0-9\s-]{1,25})"\)/g) || [];
    const definitions = defMatches.map((d) => d.replace(/[()"]/g, ''));

    // Extract Dates
    const dateMatches = text.match(/\b\d{4}-\d{2}-\d{2}\b|\b[A-Z][a-z]+\s+\d{1,2},\s+\d{4}\b/g) || [];

    const sourceId = `src_${Date.now()}_${crypto.randomUUID().slice(0, 6)}`;
    const source: KnowledgeSource = {
      id: sourceId,
      title: fileName.replace(/\.[^/.]+$/, ''),
      file_name: fileName,
      file_type: fileType,
      raw_text: text,
      extracted_metadata: {
        title: fileName,
        jurisdiction,
        document_type: detectedDocType,
        relevant_sections: sections.slice(0, 10),
        definitions: definitions.slice(0, 10),
        dates: dateMatches.slice(0, 5),
        version: 'v1.0-draft',
      },
      status: 'Draft' as KnowledgeStatus, // ALWAYS DRAFT UNTIL ADMIN APPROVAL
      uploaded_at: new Date().toISOString(),
    };

    legalRepository.saveKnowledgeSource(source);

    // Create Draft Knowledge Entry
    const kbId = `kb_imported_${Date.now()}_${crypto.randomUUID().slice(0, 5)}`;
    const draftKnowledgeEntry: LegalKnowledgeBaseEntry = {
      id: kbId,
      title: `Imported: ${source.title}`,
      category: 'legal_principle' as KnowledgeCategory,
      jurisdiction,
      document_type: detectedDocType,
      content: text.slice(0, 3000), // Curated excerpt
      summary: `Uploaded document "${fileName}" with ${sections.length} extracted structural sections. Requires Admin Review.`,
      source: 'ADMIN_GUIDANCE',
      source_url: `Uploaded file: ${fileName}`,
      effective_date: new Date().toISOString().slice(0, 10),
      version: 'v1.0-draft',
      status: 'Draft', // NOT APPROVED FOR PRODUCTION
      tags: ['imported_document', jurisdiction.toLowerCase(), detectedDocType.toLowerCase().replace(/\s+/g, '_')],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    legalRepository.saveKnowledgeBaseEntry(draftKnowledgeEntry);

    // Audit Log: Ingestion completed in draft state
    legalRepository.addAuditLog({
      user: 'admin',
      action: 'INGEST_KNOWLEDGE_FILE',
      metadata: {
        fileName,
        fileType,
        sourceId,
        kbId,
        status: 'Draft',
      },
    });

    return {
      source,
      draftKnowledgeEntry,
    };
  }
}
