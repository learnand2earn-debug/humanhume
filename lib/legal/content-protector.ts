export interface ProtectedLegalToken {
  placeholder: string;
  originalText: string;
  type:
    | 'statute'
    | 'citation'
    | 'section_number'
    | 'currency'
    | 'percentage'
    | 'date'
    | 'deadline'
    | 'party_name'
    | 'legal_definition'
    | 'jurisdiction'
    | 'signature';
  startIndex: number;
}

export interface ProtectedLegalMap {
  tokens: ProtectedLegalToken[];
  tokenMap: Record<string, string>; // placeholder -> originalText
}

export class LegalContentProtector {
  /**
   * Identifies and wraps critical legal definitions, statutory references,
   * dates, amounts, percentages, jurisdiction clauses, and signatures into protected tokens.
   */
  static protect(text: string, knownEntities?: Record<string, unknown>): {
    protectedText: string;
    tokenMap: Record<string, string>;
    tokens: ProtectedLegalToken[];
  } {
    let working = text;
    const tokens: ProtectedLegalToken[] = [];
    const tokenMap: Record<string, string> = {};
    let counter = 1;

    const addToken = (
      originalText: string,
      type: ProtectedLegalToken['type']
    ): string => {
      // Check if already protected
      for (const t of tokens) {
        if (t.originalText === originalText && t.type === type) {
          return t.placeholder;
        }
      }
      const placeholder = `{{LEGAL_PROT_${String(counter++).padStart(4, '0')}}}`;
      tokens.push({
        placeholder,
        originalText,
        type,
        startIndex: 0,
      });
      tokenMap[placeholder] = originalText;
      return placeholder;
    };

    // 1. Protect Known User Entities (Company names, party names, jurisdiction)
    if (knownEntities) {
      for (const [key, val] of Object.entries(knownEntities)) {
        if (val && typeof val === 'string' && val.trim().length > 2) {
          const trimmed = val.trim();
          // Escape regex characters
          const escaped = trimmed.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const reg = new RegExp(`\\b${escaped}\\b`, 'g');
          if (reg.test(working)) {
            const ph = addToken(trimmed, key.includes('JURISDICTION') ? 'jurisdiction' : 'party_name');
            working = working.replace(reg, ph);
          }
        }
      }
    }

    // 2. Protect Signatures & Execution blocks
    working = working.replace(
      /(Signature:\s*_{3,}|Name\s*\/\s*Title:\s*_{3,}|Date:\s*_{3,})/g,
      (match) => addToken(match, 'signature')
    );

    // 3. Protect Legal Definitions in quotes e.g. ("Agreement"), ("Client"), ("Parties")
    working = working.replace(
      /\("([A-Z][a-zA-Z0-9\s-]{1,30})"\)/g,
      (match) => addToken(match, 'legal_definition')
    );

    // 4. Protect Statutes & Legal Citations e.g. GDPR Article 28, Contract Act, 1872, § 271, [1]
    working = working.replace(
      /\b(GDPR\s+Article\s+\d+(\(\d+\))?|Contract\s+Act,\s*1872|Arbitration\s+Act,\s*1940|§\s*\d+|Section\s+\d+(\([a-z\d]+\))*|Regulation\s+\(EU\)\s+\d+\/\d+|CCPA|CPRA)\b/gi,
      (match) => addToken(match, 'statute')
    );

    // 5. Protect Currencies and Amounts e.g. $15,000 USD, €50,000, £2,500
    working = working.replace(
      /(\$\s*[\d,]+(\.\d{2})?(\s*USD)?|€\s*[\d,]+(\.\d{2})?|£\s*[\d,]+(\.\d{2})?)/g,
      (match) => addToken(match, 'currency')
    );

    // 6. Protect Percentages e.g. 1.5%, 50%, 100%
    working = working.replace(
      /(\b\d+(\.\d+)?%\b)/g,
      (match) => addToken(match, 'percentage')
    );

    // 7. Protect Specific Deadlines e.g. "fourteen (14) days", "five (5) business days", "ten (10) business days"
    working = working.replace(
      /\b([a-z]+\s*\(\d+\)\s*(business\s*days|calendar\s*days|days|months|years))\b/gi,
      (match) => addToken(match, 'deadline')
    );

    // 8. Protect Section headers numbering like "### 1. Introduction" or "1. Engagement"
    working = working.replace(
      /^(###\s+\d+\.\s+)/gm,
      (match) => addToken(match, 'section_number')
    );

    return {
      protectedText: working,
      tokenMap,
      tokens,
    };
  }

  /**
   * Restores protected tokens back to their original text
   */
  static restore(text: string, tokenMap: Record<string, string>): string {
    let result = text;
    for (const [placeholder, original] of Object.entries(tokenMap)) {
      result = result.replace(new RegExp(placeholder.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'g'), original);
    }
    return result;
  }
}
