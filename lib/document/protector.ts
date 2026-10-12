import { ProtectedContentMap, ProtectedItem } from '../types';

export class ContentProtector {
  /**
   * Analyzes document text, detects all critical facts, structures, citations,
   * tables, and numbers, and substitutes them with safe tokens.
   */
  static protect(text: string, documentId: string): {
    protectedText: string;
    map: ProtectedContentMap;
  } {
    const items: ProtectedItem[] = [];
    const tokenMap: Record<string, string> = {};
    let counter = 1;

    const makeToken = (prefix: string) => {
      const token = `{{HF_PROT_${prefix.toUpperCase()}_${String(counter++).padStart(4, '0')}}}`;
      return token;
    };

    let processedText = text;

    // 1. Code Blocks (fenced and inline)
    processedText = processedText.replace(/(```[\s\S]*?```|`[^`\n]+`)/g, (match) => {
      const token = makeToken('CODE');
      items.push({
        id: token,
        type: 'code',
        originalText: match,
        placeholder: token,
        category: 'technical',
      });
      tokenMap[token] = match;
      return token;
    });

    // 2. Mathematical formulas / equations (prevent single-dollar currency match)
    processedText = processedText.replace(/(\$\$[\s\S]*?\$\$|\$(?!\d)[\s\S]*?(?<!\s)\$)/g, (match) => {
      // Must not look like a single currency number
      if (/^\$[0-9,.]+(?:\s*(?:million|billion|k|M|B))?$/i.test(match)) {
        return match;
      }
      const token = makeToken('FORMULA');
      items.push({
        id: token,
        type: 'formula',
        originalText: match,
        placeholder: token,
        category: 'technical',
      });
      tokenMap[token] = match;
      return token;
    });

    // 3. Tables (Markdown tables)
    processedText = processedText.replace(/((?:\|[^\n]+\|\r?\n)+)/g, (match) => {
      if (match.includes('|---') || match.includes('| ---')) {
        const token = makeToken('TABLE');
        items.push({
          id: token,
          type: 'table',
          originalText: match,
          placeholder: token,
          category: 'structural',
        });
        tokenMap[token] = match;
        return `\n${token}\n`;
      }
      return match;
    });

    // 4. Citations & DOI references (e.g. [1], [1, 2], (Smith et al., 2024), doi:10.xxx)
    processedText = processedText.replace(
      /(doi:10\.\d{4,9}\/[-._;()/:A-Za-z0-9]+|\(\s*[A-Z][a-zA-Z\s.-]+,\s*\d{4}[a-z]?\s*\)|\[\s*(?:\d+(?:\s*,\s*\d+)*|[A-Z][a-zA-Z\s.-]+\s*\d{4})\s*\])/g,
      (match) => {
        const token = makeToken('CITE');
        items.push({
          id: token,
          type: 'citation',
          originalText: match,
          placeholder: token,
          category: 'reference',
        });
        tokenMap[token] = match;
        return token;
      }
    );

    // 5. URLs and Emails
    processedText = processedText.replace(
      /(https?:\/\/[^\s<>"{}|\\^`]+|[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+)/g,
      (match) => {
        const isEmail = match.includes('@');
        const token = makeToken(isEmail ? 'EMAIL' : 'URL');
        items.push({
          id: token,
          type: isEmail ? 'email' : 'url',
          originalText: match,
          placeholder: token,
          category: 'reference',
        });
        tokenMap[token] = match;
        return token;
      }
    );

    // 6. Direct Quotations ("..." or “...”) longer than 15 chars
    processedText = processedText.replace(/(["“][^"”\r\n]{15,}["”])/g, (match) => {
      const token = makeToken('QUOTE');
      items.push({
        id: token,
        type: 'quote',
        originalText: match,
        placeholder: token,
        category: 'reference',
      });
      tokenMap[token] = match;
      return token;
    });

    // 7. Currencies ($1,200.50, €50M, £45,000)
    processedText = processedText.replace(
      /([$€£¥₹]\s*\d+(?:,\d{3})*(?:\.\d+)?(?:\s*(?:million|billion|trillion|k|M|B))?)/gi,
      (match) => {
        const token = makeToken('CURR');
        items.push({
          id: token,
          type: 'currency',
          originalText: match,
          placeholder: token,
          category: 'factual',
        });
        tokenMap[token] = match;
        return token;
      }
    );

    // 8. Percentages (99.8%, 15.4 %)
    processedText = processedText.replace(/(\b\d+(?:\.\d+)?\s*%)/g, (match) => {
      const token = makeToken('PERC');
      items.push({
        id: token,
        type: 'percentage',
        originalText: match,
        placeholder: token,
        category: 'factual',
      });
      tokenMap[token] = match;
      return token;
    });

    // 9. Structured Dates (2024-10-12, 12/10/2024, October 15, 2024)
    processedText = processedText.replace(
      /(\b(?:\d{4}-\d{2}-\d{2}|\d{1,2}\/\d{1,2}\/\d{2,4}|(?:Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember))\s+\d{1,2}(?:st|nd|rd|th)?,?\s+\d{4})\b)/gi,
      (match) => {
        const token = makeToken('DATE');
        items.push({
          id: token,
          type: 'date',
          originalText: match,
          placeholder: token,
          category: 'factual',
        });
        tokenMap[token] = match;
        return token;
      }
    );

    // 10. Headings (Markdown headers #, ##, ###)
    processedText = processedText.replace(/(^#{1,6}\s+[^\n]+$)/gm, (match) => {
      const token = makeToken('HEAD');
      items.push({
        id: token,
        type: 'heading',
        originalText: match,
        placeholder: token,
        category: 'structural',
      });
      tokenMap[token] = match;
      return token;
    });

    return {
      protectedText: processedText,
      map: {
        documentId,
        items,
        tokenMap,
      },
    };
  }

  /**
   * Restores all tokens back to their original verbatim content.
   */
  static restore(text: string, tokenMap: Record<string, string>): string {
    let restored = text;
    for (const [token, original] of Object.entries(tokenMap)) {
      // Replace all occurrences of this token
      restored = restored.split(token).join(original);
    }
    return restored;
  }
}
