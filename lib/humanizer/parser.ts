/**
 * Configurable response parser that extracts the humanized text
 * from arbitrary external API responses without hard-coding the shape.
 */
export class HumanizerResponseParser {
  /**
   * Resolves a nested property path like 'choices[0].message.content' or 'data.text'
   */
  static extractByPath(obj: any, path: string): string | null {
    if (!obj) return null;
    if (typeof obj === 'string') return obj;

    // Direct string keys if single word
    if (typeof obj[path] === 'string') {
      return obj[path];
    }

    try {
      // Normalize bracket access: choices[0].message -> choices.0.message
      const normalizedPath = path.replace(/\[(\w+)\]/g, '.$1');
      const parts = normalizedPath.split('.');
      let current = obj;

      for (const part of parts) {
        if (current === null || current === undefined) {
          return null;
        }
        current = current[part];
      }

      if (typeof current === 'string') {
        return current;
      }
      if (typeof current === 'object' && current !== null) {
        return JSON.stringify(current);
      }
      return null;
    } catch {
      return null;
    }
  }

  /**
   * Discovers text automatically if path does not match
   */
  static autoParse(responseBody: any): string {
    if (typeof responseBody === 'string') {
      return responseBody;
    }

    // Try common AI provider formats
    const candidatePaths = [
      'choices[0].message.content',
      'choices[0].text',
      'candidates[0].content.parts[0].text',
      'content[0].text',
      'data.text',
      'data.humanized_text',
      'data.result',
      'result.text',
      'result',
      'output',
      'response',
      'text',
      'message',
    ];

    for (const path of candidatePaths) {
      const extracted = this.extractByPath(responseBody, path);
      if (extracted && extracted.trim().length > 0) {
        return extracted;
      }
    }

    // If response is an object with a single string property
    if (typeof responseBody === 'object' && responseBody !== null) {
      for (const value of Object.values(responseBody)) {
        if (typeof value === 'string' && value.length > 20) {
          return value;
        }
      }
    }

    throw new Error(
      `Unable to parse humanized text from API response. Configure HUMANIZER_RESPONSE_PATH in Admin Settings.`
    );
  }
}
