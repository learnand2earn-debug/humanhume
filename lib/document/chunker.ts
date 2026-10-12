export interface DocumentChunk {
  index: number;
  id: string;
  text: string;
  wordCount: number;
  isHeading: boolean;
  containsProtected: boolean;
}

export class DocumentChunker {
  /**
   * Splits a document into logical, semantic chunks preserving headings,
   * tables, code, and protected tokens intact.
   */
  static splitIntoChunks(text: string, maxWordsPerChunk = 600): DocumentChunk[] {
    const rawParagraphs = text.split(/\n\s*\n/);
    const chunks: DocumentChunk[] = [];
    let currentParagraphs: string[] = [];
    let currentWordCount = 0;
    let chunkCounter = 0;

    const flushChunk = () => {
      if (currentParagraphs.length === 0) return;
      const combinedText = currentParagraphs.join('\n\n');
      const words = combinedText.split(/\s+/).filter(Boolean);
      const isHeading = combinedText.trim().startsWith('#') || combinedText.trim().startsWith('{{HF_PROT_HEAD_');
      const containsProtected = combinedText.includes('{{HF_PROT_');

      chunks.push({
        index: chunkCounter,
        id: `chunk_${chunkCounter}`,
        text: combinedText,
        wordCount: words.length,
        isHeading,
        containsProtected,
      });

      chunkCounter++;
      currentParagraphs = [];
      currentWordCount = 0;
    };

    for (const paragraph of rawParagraphs) {
      const p = paragraph.trim();
      if (!p) continue;

      const pWords = p.split(/\s+/).filter(Boolean).length;
      const isHeading = p.startsWith('#') || p.startsWith('{{HF_PROT_HEAD_');
      const isTable = p.startsWith('|') || p.startsWith('{{HF_PROT_TABLE_');
      const isCode = p.startsWith('```') || p.startsWith('{{HF_PROT_CODE_');

      // Standalone tables or large code blocks should not be split across other text
      if (isTable || isCode) {
        flushChunk();
        currentParagraphs.push(p);
        currentWordCount = pWords;
        flushChunk();
        continue;
      }

      // If adding this paragraph exceeds maxWords, flush current
      if (currentWordCount + pWords > maxWordsPerChunk && currentParagraphs.length > 0) {
        flushChunk();
      }

      // If this paragraph itself is a major heading, consider starting a new chunk
      if (isHeading && currentParagraphs.length > 0 && currentWordCount > maxWordsPerChunk / 2) {
        flushChunk();
      }

      currentParagraphs.push(p);
      currentWordCount += pWords;
    }

    flushChunk();

    // If text was very short and resulted in 0 chunks, return single chunk
    if (chunks.length === 0 && text.trim().length > 0) {
      chunks.push({
        index: 0,
        id: 'chunk_0',
        text: text.trim(),
        wordCount: text.trim().split(/\s+/).filter(Boolean).length,
        isHeading: false,
        containsProtected: text.includes('{{HF_PROT_'),
      });
    }

    return chunks;
  }

  /**
   * Reassembles processed chunks back into a unified document.
   */
  static reassemble(chunks: Array<{ index: number; text: string }>): string {
    const sorted = [...chunks].sort((a, b) => a.index - b.index);
    return sorted.map((c) => c.text).join('\n\n');
  }
}
