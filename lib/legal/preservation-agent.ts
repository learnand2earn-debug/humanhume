import { LegalPreservationCheckResult, LegalSectionItem } from './types';

export class LegalPreservationAgent {
  /**
   * Compares the original draft against the humanized version section by section.
   * If any contractual obligation, prohibition, deadline, amount, or statutory reference
   * is altered materially, automatically restores the original draft section.
   */
  static verifyAndReconcile(
    draftSections: LegalSectionItem[],
    humanizedSections: LegalSectionItem[]
  ): {
    reconciledSections: LegalSectionItem[];
    preservationResult: LegalPreservationCheckResult;
  } {
    const restoredSections: Array<{
      sectionTitle: string;
      originalContent: string;
      alteredContent: string;
      restorationReason: string;
    }> = [];

    const deviationsDetected: string[] = [];
    let totalObligationsOriginal = 0;
    let totalObligationsHumanized = 0;

    const reconciledSections: LegalSectionItem[] = [];

    for (let i = 0; i < draftSections.length; i++) {
      const origSec = draftSections[i];
      const humSec = humanizedSections.find((h) => h.title === origSec.title) || humanizedSections[i];

      if (!humSec) {
        // Section was dropped entirely! Restore immediately.
        restoredSections.push({
          sectionTitle: origSec.title,
          originalContent: origSec.content,
          alteredContent: '(Missing)',
          restorationReason: 'Section was dropped during rewriting',
        });
        deviationsDetected.push(`Section "${origSec.title}" was missing from humanized output.`);
        reconciledSections.push({ ...origSec });
        continue;
      }

      const origText = origSec.content;
      const humText = humSec.content;

      // Extract obligations ("shall", "must", "agrees to", "covenants")
      const origObligations = (origText.match(/\b(shall|must|agrees to|covenants|undertakes)\b/gi) || []).length;
      const humObligations = (humText.match(/\b(shall|must|agrees to|covenants|undertakes)\b/gi) || []).length;
      totalObligationsOriginal += origObligations;
      totalObligationsHumanized += humObligations;

      // Extract prohibitions ("shall not", "must not", "may not", "prohibited", "will not")
      const origProhibitions = (origText.match(/\b(shall not|must not|may not|prohibited|will not)\b/gi) || []).length;
      const humProhibitions = (humText.match(/\b(shall not|must not|may not|prohibited|will not)\b/gi) || []).length;

      // Check numbers / currencies / percentages
      const origNumbers: string[] = origText.match(/\b\d+(\.\d+)?%?|\$\d+(,\d+)*\b/g) || [];
      const humNumbers: string[] = humText.match(/\b\d+(\.\d+)?%?|\$\d+(,\d+)*\b/g) || [];

      let needsRestoration = false;
      let reason = '';

      // Check for statutory references
      const statutes = ['gdpr', 'contract act', 'arbitration act', 'delaware', 'ccpa', 'cpra'];
      for (const st of statutes) {
        if (origText.toLowerCase().includes(st) && !humText.toLowerCase().includes(st)) {
          needsRestoration = true;
          reason = `Critical statutory/jurisdiction anchor "${st}" was omitted`;
          break;
        }
      }

      // Check for prohibition mismatch (e.g. prohibited conduct became permissible)
      if (!needsRestoration && origProhibitions > 0 && humProhibitions < origProhibitions) {
        needsRestoration = true;
        reason = `Contractual prohibition dropped (${origProhibitions} in draft vs ${humProhibitions} in humanized)`;
      }

      // Check for severe obligation drop (more than 40% loss of legal mandates in a legal clause)
      if (!needsRestoration && origSec.isLegalClause && origObligations >= 2 && humObligations < Math.ceil(origObligations * 0.6)) {
        needsRestoration = true;
        reason = `Substantial dilution of mandatory covenants (${origObligations} obligations down to ${humObligations})`;
      }

      // Check for dropped numbers or dates
      if (!needsRestoration && origNumbers.length > humNumbers.length && origNumbers.some((n) => !humNumbers.includes(n))) {
        needsRestoration = true;
        reason = 'Numerical figures, deadlines, or currency values altered during transformation';
      }

      if (needsRestoration) {
        restoredSections.push({
          sectionTitle: origSec.title,
          originalContent: origText,
          alteredContent: humText,
          restorationReason: reason,
        });
        deviationsDetected.push(`[Auto-Restored] ${origSec.title}: ${reason}`);
        reconciledSections.push({
          ...origSec,
          reviewReason: `Restored to draft wording: ${reason}`,
        });
      } else {
        // Safe to use humanized version
        reconciledSections.push({
          ...humSec,
          sourceId: origSec.sourceId,
          sourceName: origSec.sourceName,
          jurisdiction: origSec.jurisdiction,
          version: origSec.version,
          lastUpdated: origSec.lastUpdated,
          requiresReview: origSec.requiresReview,
        });
      }
    }

    const totalSections = draftSections.length || 1;
    const restoredCount = restoredSections.length;
    const preservationScore = Math.max(0, Math.round(((totalSections - restoredCount) / totalSections) * 100));

    const preservationResult: LegalPreservationCheckResult = {
      passed: restoredCount === 0 || preservationScore >= 80,
      preservationScore,
      restoredCount,
      restoredSections,
      deviationsDetected,
      originalObligationsCount: totalObligationsOriginal,
      humanizedObligationsCount: totalObligationsHumanized,
      checkedAt: new Date().toISOString(),
    };

    return {
      reconciledSections,
      preservationResult,
    };
  }
}
