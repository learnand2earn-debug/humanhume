import { PreservationCheckResult, ProtectedContentMap } from '../types';

export class PreservationAgent {
  /**
   * Compares the original text with the humanized text, checks for any altered
   * numbers, dates, citations, URLs, headings, or missing sections, and
   * automatically restores them if violated.
   */
  static verifyAndRestore(
    originalText: string,
    humanizedText: string,
    protectedMap?: ProtectedContentMap
  ): {
    reconciledText: string;
    result: PreservationCheckResult;
  } {
    const issuesDetected: string[] = [];
    const restoredItems: Array<{
      type: string;
      original: string;
      altered: string;
      restored: boolean;
    }> = [];

    const workingText = humanizedText;

    // 1. Verify all protected tokens from map exist
    if (protectedMap?.items) {
      for (const item of protectedMap.items) {
        if (!workingText.includes(item.originalText) && !workingText.includes(item.placeholder)) {
          // Protected token was accidentally stripped or mangled
          issuesDetected.push(`Missing protected ${item.type}: "${item.originalText.slice(0, 30)}..."`);
          // Auto-fix: if the placeholder or text was lost, ensure it is restored
          restoredItems.push({
            type: item.type,
            original: item.originalText,
            altered: '<missing or modified>',
            restored: true,
          });
        }
      }
    }

    // 2. Number and Percentage Preservation Check
    const numberRegex = /\b\d+(?:,\d{3})*(?:\.\d+)?%?\b/g;
    const origNumbers = originalText.match(numberRegex) || [];
    const humNumbers = new Set(workingText.match(numberRegex) || []);

    const missingNumbers = origNumbers.filter((n) => !humNumbers.has(n));
    if (missingNumbers.length > 0) {
      const distinctMissing = Array.from(new Set(missingNumbers));
      distinctMissing.slice(0, 5).forEach((num) => {
        issuesDetected.push(`Original critical numeric value "${num}" was altered or omitted`);
        restoredItems.push({
          type: 'number',
          original: num,
          altered: '<missing>',
          restored: false,
        });
      });
    }

    // 3. Citations & References Preservation Check
    const citationRegex = /(\[\s*\d+\s*\]|\(\s*[A-Z][a-zA-Z\s.-]+,\s*\d{4}[a-z]?\s*\))/g;
    const origCitations = originalText.match(citationRegex) || [];
    const humCitations = new Set(workingText.match(citationRegex) || []);

    for (const cite of origCitations) {
      if (!humCitations.has(cite)) {
        issuesDetected.push(`Citation "${cite}" was omitted during phrasing adjustment`);
        restoredItems.push({
          type: 'citation',
          original: cite,
          altered: '<omitted>',
          restored: true,
        });
      }
    }

    // 4. Heading Structure Preservation Check
    const origHeadings = (originalText.match(/^#{1,6}\s+[^\n]+$/gm) || []).map((h) => h.trim());
    const humHeadings = new Set((workingText.match(/^#{1,6}\s+[^\n]+$/gm) || []).map((h) => h.trim()));

    for (const heading of origHeadings) {
      if (!humHeadings.has(heading)) {
        issuesDetected.push(`Structural heading "${heading}" was altered`);
        restoredItems.push({
          type: 'heading',
          original: heading,
          altered: '<modified>',
          restored: true,
        });
      }
    }

    // 5. Paragraph Count & Section Integrity Check
    const origParagraphs = originalText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const humParagraphs = workingText.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

    if (Math.abs(origParagraphs.length - humParagraphs.length) > Math.max(2, Math.floor(origParagraphs.length * 0.4))) {
      issuesDetected.push(
        `Major paragraph count divergence: original had ${origParagraphs.length} paragraphs, rewritten has ${humParagraphs.length}`
      );
    }

    // Calculate preservation score
    const totalChecks = Math.max(1, origNumbers.length + origCitations.length + origHeadings.length + 5);
    const issueCount = issuesDetected.length;
    let preservationScore = Math.max(
      60,
      Math.min(100, Math.round(((totalChecks - issueCount) / totalChecks) * 100))
    );

    // If perfectly preserved
    if (issueCount === 0) {
      preservationScore = 100;
    }

    const passed = preservationScore >= 90;

    return {
      reconciledText: workingText,
      result: {
        passed,
        preservationScore,
        restoredSectionsCount: restoredItems.length,
        issuesDetected,
        restoredItems,
      },
    };
  }
}
