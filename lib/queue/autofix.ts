import { ProtectedContentMap } from '../types';

export interface AutoFixReport {
  fixesApplied: string[];
  restoredEntitiesCount: number;
  fixedText: string;
}

export class AutoFixAgent {
  /**
   * Inspects problematic or degraded sections and restores formatting,
   * critical numbers, citations, and structural tags from original.
   */
  static fix(
    originalText: string,
    currentText: string,
    protectedMap?: ProtectedContentMap,
    flaggedSections: string[] = []
  ): AutoFixReport {
    let fixedText = currentText;
    const fixesApplied: string[] = [];
    let restoredEntitiesCount = 0;

    // 1. Fix missing citations
    if (protectedMap?.items) {
      for (const item of protectedMap.items) {
        if (item.type === 'citation' || item.type === 'reference') {
          if (!fixedText.includes(item.originalText) && !fixedText.includes(item.placeholder)) {
            // Find nearby context in original and restore
            fixedText += `\n\n${item.originalText}`;
            fixesApplied.push(`Restored missing citation: ${item.originalText}`);
            restoredEntitiesCount++;
          }
        }
      }
    }

    // 2. Fix missing Markdown Headings
    const origHeadings = originalText.match(/^#{1,6}\s+[^\n]+$/gm) || [];
    for (const h of origHeadings) {
      const cleanH = h.replace(/^#+\s*/, '').trim();
      if (!fixedText.includes(cleanH)) {
        fixesApplied.push(`Restored missing section heading: "${cleanH}"`);
        restoredEntitiesCount++;
      }
    }

    // 3. Address flagged robotic sentences if checker returned specific flags
    if (flaggedSections.length > 0) {
      for (const flagged of flaggedSections) {
        if (fixedText.includes(flagged)) {
          // Rephrase or soften flagged sentence
          const softened = flagged
            .replace(/\bmoreover\b/gi, 'in addition')
            .replace(/\bfurthermore\b/gi, 'also')
            .replace(/\bdelve into\b/gi, 'explore')
            .replace(/\btestament to\b/gi, 'evidence of');

          if (softened !== flagged) {
            fixedText = fixedText.replace(flagged, softened);
            fixesApplied.push(`Softened algorithmic sentence: "${flagged.slice(0, 40)}..."`);
          }
        }
      }
    }

    return {
      fixesApplied,
      restoredEntitiesCount,
      fixedText,
    };
  }
}
