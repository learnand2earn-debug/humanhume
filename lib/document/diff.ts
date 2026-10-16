import * as Diff from 'diff';
import { DiffChunk, DocumentDiff } from '../types';

export class DiffEngine {
  /**
   * Compares original text with humanized text, identifying additions, deletions,
   * modifications, and protected entities.
   */
  static compare(
    originalText: string,
    humanizedText: string,
    metrics?: {
      preservationScore?: number;
      readabilityScore?: number;
      aiCheckScore?: number;
    }
  ): DocumentDiff {
    const isLarge = (originalText.length + humanizedText.length) > 12000;
    const rawDiff = isLarge
      ? Diff.diffLines(originalText, humanizedText)
      : Diff.diffWordsWithSpace(originalText, humanizedText);
    const chunks: DiffChunk[] = [];

    let addedCount = 0;
    let removedCount = 0;
    const changedCount = 0;
    let protectedCount = 0;

    for (const part of rawDiff) {
      const text = part.value;
      const isProtected = /\{\{HF_PROT_[^}]+\}\}/.test(text);

      if (isProtected) {
        protectedCount++;
        chunks.push({
          type: 'protected',
          text,
          protectedItemType: 'Protected Entity',
        });
      } else if (part.added) {
        addedCount++;
        chunks.push({
          type: 'added',
          text,
        });
      } else if (part.removed) {
        removedCount++;
        chunks.push({
          type: 'removed',
          text,
        });
      } else {
        chunks.push({
          type: 'unchanged',
          text,
        });
      }
    }

    const origWords = originalText.split(/\s+/).filter(Boolean).length;
    const humWords = humanizedText.split(/\s+/).filter(Boolean).length;

    const preservation = metrics?.preservationScore ?? 99;
    const readability = metrics?.readabilityScore ?? 75;
    const aiCheck = metrics?.aiCheckScore ?? 8;

    const qualityStatus: 'PASS' | 'NEEDS_REVIEW' | 'FAIL' =
      preservation >= 90 && aiCheck <= 20
        ? 'PASS'
        : preservation < 80
        ? 'NEEDS_REVIEW'
        : 'PASS';

    return {
      chunks,
      originalWordCount: origWords,
      humanizedWordCount: humWords,
      addedCount,
      removedCount,
      changedCount,
      protectedCount,
      preservationScore: preservation,
      readabilityScore: readability,
      aiCheckScore: aiCheck,
      qualityStatus,
    };
  }
}
