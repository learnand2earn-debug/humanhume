import {
  LegalDocumentType,
  LegalQualityCheckResult,
  LegalSectionItem,
  LegalTemplate,
} from './types';

export class LegalQualityChecker {
  /**
   * Performs rigorous legal consistency, completeness, and validity checks.
   */
  static evaluate(
    sections: LegalSectionItem[],
    fullText: string,
    docType: LegalDocumentType,
    template?: LegalTemplate | null,
    expectedJurisdiction?: string
  ): LegalQualityCheckResult {
    const missingSections: string[] = [];
    const missingClauses: string[] = [];
    const contradictoryClauses: Array<{ clauseA: string; clauseB: string; reason: string }> = [];
    const undefinedTerms: string[] = [];
    const emptyVariables: string[] = [];
    const inconsistentEntities: Array<{ type: string; found: string[]; expected: string }> = [];
    const duplicateClauses: string[] = [];
    const brokenReferences: string[] = [];
    const warnings: string[] = [];

    // 1. Missing Required Sections
    const requiredSections = template?.required_sections || docType.required_sections;
    for (const req of requiredSections) {
      const cleanReq = req.replace(/^\d+\.\s*/, '').toLowerCase();
      const hasSec = sections.some((s) => s.title.toLowerCase().includes(cleanReq));
      if (!hasSec) {
        missingSections.push(req);
      }
    }

    // 2. Missing Required Clauses (if defined on template)
    if (template?.required_clauses) {
      for (const clause of template.required_clauses) {
        const cleanClause = clause.toLowerCase();
        const found = sections.some((s) => s.content.toLowerCase().includes(cleanClause) || s.title.toLowerCase().includes(cleanClause));
        if (!found) {
          missingClauses.push(clause);
        }
      }
    }

    // 3. Empty Variables Detection (e.g. {{COMPANY_NAME}})
    const unreplacedMatches = fullText.match(/\{\{([A-Z0-9_-]+)\}\}/g);
    if (unreplacedMatches) {
      for (const m of unreplacedMatches) {
        if (!emptyVariables.includes(m)) {
          emptyVariables.push(m);
        }
      }
    }

    // 4. Inconsistent Jurisdiction Check
    if (docType.is_legal && expectedJurisdiction) {
      const lowerText = fullText.toLowerCase();
      const expectedLower = expectedJurisdiction.toLowerCase();

      // Check if another prominent jurisdiction appears in a governing law context
      const otherJurisdictions = ['delaware', 'england', 'pakistan', 'dubai', 'california', 'new york']
        .filter((j) => !expectedLower.includes(j));

      for (const other of otherJurisdictions) {
        if (
          lowerText.includes(`governed by the laws of ${other}`) ||
          lowerText.includes(`courts of ${other}`)
        ) {
          inconsistentEntities.push({
            type: 'Jurisdiction',
            found: [other],
            expected: expectedJurisdiction,
          });
          contradictoryClauses.push({
            clauseA: `Governing jurisdiction header: ${expectedJurisdiction}`,
            clauseB: `Clause body refers to: ${other}`,
            reason: 'Governing law forum conflict between document metadata and internal clause',
          });
        }
      }
    }

    // 5. Contradictory Clauses Detection
    const lower = fullText.toLowerCase();
    if (lower.includes('non-refundable') && lower.includes('full refund within')) {
      contradictoryClauses.push({
        clauseA: 'States payment is non-refundable',
        clauseB: 'States full refund is available within window',
        reason: 'Potential contradiction between non-refundable clause and refund eligibility',
      });
    }

    // 6. Missing Signatures for contracts/agreements
    let missingSignatures = false;
    if (
      docType.is_legal &&
      (docType.name.toLowerCase().includes('agreement') || docType.name.toLowerCase().includes('nda') || docType.name.toLowerCase().includes('contract'))
    ) {
      const hasSignatureMarker =
        lower.includes('signature:') ||
        lower.includes('in witness whereof') ||
        lower.includes('signatures');
      if (!hasSignatureMarker) {
        missingSignatures = true;
        warnings.push('Contract agreement lacks formal execution or signature lines.');
      }
    }

    // 7. Duplicate Clauses Detection
    const seenTitles: Record<string, number> = {};
    for (const sec of sections) {
      const cleanTitle = sec.title.replace(/^\d+\.\s*/, '').toLowerCase();
      seenTitles[cleanTitle] = (seenTitles[cleanTitle] || 0) + 1;
      if (seenTitles[cleanTitle] > 1 && !duplicateClauses.includes(sec.title)) {
        duplicateClauses.push(sec.title);
      }
    }

    // 8. Broken Internal References (e.g. "pursuant to Section 14" when there are only 8 sections)
    const sectionRefMatches = fullText.match(/\bsection\s+(\d+)\b/gi);
    if (sectionRefMatches) {
      const totalSecCount = sections.length;
      for (const ref of sectionRefMatches) {
        const num = parseInt(ref.replace(/\D/g, ''), 10);
        if (num > totalSecCount + 2 && !brokenReferences.includes(ref)) {
          brokenReferences.push(`${ref} (exceeds total sections: ${totalSecCount})`);
        }
      }
    }

    // Compile warnings
    if (missingSections.length > 0) {
      warnings.push(`Missing ${missingSections.length} required section(s): ${missingSections.slice(0, 3).join(', ')}`);
    }
    if (emptyVariables.length > 0) {
      warnings.push(`Contains unpopulated template variable(s): ${emptyVariables.join(', ')}`);
    }
    if (contradictoryClauses.length > 0) {
      warnings.push(`Detected ${contradictoryClauses.length} potentially conflicting contractual clauses.`);
    }
    if (brokenReferences.length > 0) {
      warnings.push(`Found broken numerical section reference(s): ${brokenReferences.join(', ')}`);
    }

    // Compute Overall Quality Score (0 - 100)
    let score = 100;
    score -= missingSections.length * 15;
    score -= missingClauses.length * 10;
    score -= contradictoryClauses.length * 20;
    score -= emptyVariables.length * 15;
    score -= brokenReferences.length * 5;
    score -= duplicateClauses.length * 5;
    if (missingSignatures) score -= 10;
    score = Math.max(0, Math.min(100, score));

    // Status: PASS | WARNING | NEEDS_REVIEW
    let status: 'PASS' | 'WARNING' | 'NEEDS_REVIEW' = 'PASS';
    if (contradictoryClauses.length > 0 || emptyVariables.length > 0 || score < 70) {
      status = 'NEEDS_REVIEW';
    } else if (warnings.length > 0 || score < 90) {
      status = 'WARNING';
    }

    const details = `Legal quality analysis completed: ${status} (Score: ${score}/100, Warnings: ${warnings.length})`;

    return {
      status,
      score,
      missingSections,
      missingClauses,
      contradictoryClauses,
      undefinedTerms,
      emptyVariables,
      inconsistentEntities,
      missingSignatures,
      duplicateClauses,
      brokenReferences,
      warnings,
      details,
      checkedAt: new Date().toISOString(),
    };
  }
}
