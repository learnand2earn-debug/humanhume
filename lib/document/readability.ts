export interface ReadabilityMetrics {
  fleschReadingEase: number;
  fleschKincaidGradeLevel: number;
  readingEaseLabel: string;
  gradeLevelLabel: string;
  averageSentenceLength: number;
  averageSyllablesPerWord: number;
  lexicalDiversity: number; // 0 - 1.0
}

function countSyllablesInWord(word: string): number {
  const clean = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!clean) return 1;
  if (clean.length <= 3) return 1;

  const formatted = clean
    .replace(/(?:[^laeiouy]|ed|es|e)$/, '')
    .replace(/^y/, '');
  const syllables = formatted.match(/[aeiouy]{1,2}/g);
  return Math.max(1, syllables ? syllables.length : 1);
}

export class ReadabilityCalculator {
  static compute(text: string): ReadabilityMetrics {
    const cleanText = text.replace(/\{\{HF_PROT_[^}]+\}\}/g, '');
    const words = cleanText.split(/\s+/).filter((w) => /[a-zA-Z0-9]/.test(w));
    const totalWords = Math.max(1, words.length);

    const sentences = cleanText
      .split(/(?<=[.!?])\s+/)
      .filter((s) => s.trim().length > 3);
    const totalSentences = Math.max(1, sentences.length);

    let totalSyllables = 0;
    const uniqueWords = new Set<string>();

    for (const word of words) {
      totalSyllables += countSyllablesInWord(word);
      uniqueWords.add(word.toLowerCase());
    }

    const wordsPerSentence = totalWords / totalSentences;
    const syllablesPerWord = totalSyllables / totalWords;

    // Flesch Reading Ease formula: 206.835 - (1.015 * ASL) - (84.6 * ASW)
    let flesch = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;
    flesch = Math.max(0, Math.min(100, Math.round(flesch * 10) / 10));

    // Flesch-Kincaid Grade Level: (0.39 * ASL) + (11.8 * ASW) - 15.59
    let gradeLevel = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;
    gradeLevel = Math.max(1, Math.min(18, Math.round(gradeLevel * 10) / 10));

    let readingEaseLabel = 'Standard';
    if (flesch >= 90) readingEaseLabel = 'Very Easy';
    else if (flesch >= 80) readingEaseLabel = 'Easy';
    else if (flesch >= 70) readingEaseLabel = 'Fairly Easy';
    else if (flesch >= 60) readingEaseLabel = 'Standard';
    else if (flesch >= 50) readingEaseLabel = 'Fairly Difficult';
    else if (flesch >= 30) readingEaseLabel = 'Difficult';
    else readingEaseLabel = 'Very Confusing / Academic';

    let gradeLevelLabel = 'High School';
    if (gradeLevel <= 6) gradeLevelLabel = 'Elementary';
    else if (gradeLevel <= 8) gradeLevelLabel = 'Middle School';
    else if (gradeLevel <= 12) gradeLevelLabel = 'High School';
    else if (gradeLevel <= 16) gradeLevelLabel = 'College Undergraduate';
    else gradeLevelLabel = 'Graduate / Professional';

    const lexicalDiversity = Math.round((uniqueWords.size / totalWords) * 100) / 100;

    return {
      fleschReadingEase: flesch,
      fleschKincaidGradeLevel: gradeLevel,
      readingEaseLabel,
      gradeLevelLabel,
      averageSentenceLength: Math.round(wordsPerSentence * 10) / 10,
      averageSyllablesPerWord: Math.round(syllablesPerWord * 100) / 100,
      lexicalDiversity,
    };
  }
}
