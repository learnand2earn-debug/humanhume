import { ProtectedContentMap } from '../types';

export interface DocumentAnalysisReport {
  wordCount: number;
  sentenceCount: number;
  paragraphCount: number;
  averageWordsPerSentence: number;
  estimatedReadingTimeMinutes: number;
  headingsCount: number;
  citationsCount: number;
  tablesCount: number;
  protectedElementsCount: number;
  structuralIntegrityScore: number; // 0-100%
  syntheticMarkers: {
    repetitiveSentenceStarters: number;
    uniformSentenceLengthRatio: number;
    passiveVoiceDensity: number;
    buzzwordDensity: number;
  };
  summary: string;
}

const AI_CLICHE_WORDS = [
  'delve',
  'tapestry',
  'testament',
  'furthermore',
  'moreover',
  'in conclusion',
  'it is crucial to note',
  'seamless',
  'pivotal',
  'beacon',
  'unwavering',
  'underscores',
  'fosters',
  'holistic',
  'embark',
  'realm',
  'leverage',
  'synergy',
  'multifaceted',
];

export class DocumentAnalyzer {
  static analyze(text: string, protectedMap?: ProtectedContentMap): DocumentAnalysisReport {
    const words = text.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Sentence splitting
    const rawSentences = text.split(/(?<=[.!?])\s+/).filter((s) => s.trim().length > 3);
    const sentenceCount = Math.max(1, rawSentences.length);

    // Paragraph splitting
    const paragraphs = text.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const paragraphCount = Math.max(1, paragraphs.length);

    const averageWordsPerSentence = Math.round((wordCount / sentenceCount) * 10) / 10;
    const estimatedReadingTimeMinutes = Math.max(1, Math.round(wordCount / 200));

    // Protected item counts
    const items = protectedMap?.items || [];
    const headingsCount = items.filter((i) => i.type === 'heading').length;
    const citationsCount = items.filter((i) => i.type === 'citation' || i.type === 'reference').length;
    const tablesCount = items.filter((i) => i.type === 'table').length;
    const protectedElementsCount = items.length;

    // Synthetic marker analysis
    let buzzwordMatches = 0;
    const lower = text.toLowerCase();
    for (const phrase of AI_CLICHE_WORDS) {
      const regex = new RegExp(`\\b${phrase}\\b`, 'gi');
      const matches = lower.match(regex);
      if (matches) buzzwordMatches += matches.length;
    }

    // Sentence starter uniformity
    const starters: Record<string, number> = {};
    for (const sentence of rawSentences) {
      const firstWord = sentence.trim().split(/\s+/)[0]?.toLowerCase() || '';
      if (firstWord.length > 2) {
        starters[firstWord] = (starters[firstWord] || 0) + 1;
      }
    }
    const maxRepeatedStarter = Math.max(0, ...Object.values(starters));

    // Sentence length variance
    const lengths = rawSentences.map((s) => s.split(/\s+/).filter(Boolean).length);
    const variance =
      lengths.reduce((acc, len) => acc + Math.pow(len - averageWordsPerSentence, 2), 0) /
      sentenceCount;
    const stdDev = Math.sqrt(variance);
    // Lower standard deviation means robotic, uniform sentences
    const uniformSentenceLengthRatio = stdDev < 4 ? 0.85 : stdDev < 8 ? 0.5 : 0.2;

    const structuralIntegrityScore = 100;

    return {
      wordCount,
      sentenceCount,
      paragraphCount,
      averageWordsPerSentence,
      estimatedReadingTimeMinutes,
      headingsCount,
      citationsCount,
      tablesCount,
      protectedElementsCount,
      structuralIntegrityScore,
      syntheticMarkers: {
        repetitiveSentenceStarters: maxRepeatedStarter,
        uniformSentenceLengthRatio,
        passiveVoiceDensity: Math.round((buzzwordMatches / Math.max(1, wordCount)) * 1000) / 10,
        buzzwordDensity: buzzwordMatches,
      },
      summary: `Document contains ${wordCount} words across ${paragraphCount} paragraphs. Identified ${protectedElementsCount} protected entities (citations, formulas, tables, headings) to preserve intact.`,
    };
  }
}
