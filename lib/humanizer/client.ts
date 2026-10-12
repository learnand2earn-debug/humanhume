import { HumanizerResponseParser } from './parser';
import { HumanizeRequest, HumanizeResponse, HumanizerClientConfig } from './types';

export class HumanizerClient {
  private config: HumanizerClientConfig;

  constructor(config: HumanizerClientConfig) {
    this.config = config;
  }

  /**
   * Executes a humanization request against the configured external API.
   * API Key is strictly server-side and never exposed.
   */
  async humanize(request: HumanizeRequest): Promise<HumanizeResponse> {
    const startTime = Date.now();
    const timeoutMs = this.config.timeoutMs || 45000;
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const authHeaderName = this.config.authHeader || 'Authorization';
      const authPrefix = this.config.authPrefix !== undefined ? this.config.authPrefix : 'Bearer';
      const authValue = authPrefix ? `${authPrefix} ${this.config.apiKey}`.trim() : this.config.apiKey;

      const headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };
      if (this.config.apiKey) {
        headers[authHeaderName] = authValue;
      }

      // Universal system prompt enforcing strict fact preservation
      const systemInstruction =
        'You are an expert humanizer editor. Improve naturalness, burstiness, variation, sentence rhythm, and flow. ' +
        'CRITICAL RULES: DO NOT change facts, statistics, numbers, citations, references, headings, names, or quotes. ' +
        'DO NOT alter any token formatted as {{HF_PROT_...}}. Return ONLY the humanized text.';

      const payload = {
        model: this.config.model || 'gpt-4o-mini',
        messages: [
          { role: 'system', content: systemInstruction },
          { role: 'user', content: request.text },
        ],
        temperature: 0.7,
      };

      const res = await fetch(this.config.apiUrl, {
        method: 'POST',
        headers,
        body: JSON.stringify(payload),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!res.ok) {
        const errorBody = await res.text().catch(() => '');
        throw new Error(
          `Humanizer API returned HTTP ${res.status}: ${errorBody.slice(0, 300) || res.statusText}`
        );
      }

      const jsonResponse = await res.json();
      const durationMs = Date.now() - startTime;

      let humanizedText = '';
      if (this.config.responsePath) {
        humanizedText =
          HumanizerResponseParser.extractByPath(jsonResponse, this.config.responsePath) || '';
      }
      if (!humanizedText) {
        humanizedText = HumanizerResponseParser.autoParse(jsonResponse);
      }

      return {
        humanizedText: humanizedText.trim(),
        provider: 'Custom Humanizer API',
        model: this.config.model,
        durationMs,
        rawResponse: jsonResponse,
      };
    } catch (err: unknown) {
      clearTimeout(timeoutId);
      if (err instanceof Error && err.name === 'AbortError') {
        throw new Error(`Humanizer API timed out after ${timeoutMs / 1000}s`);
      }
      throw err;
    }
  }

  /**
   * Diagnostic test method for Admin settings
   */
  async testConnection(): Promise<{ success: boolean; latencyMs: number; message: string }> {
    const startTime = Date.now();
    try {
      const testRes = await this.humanize({
        text: 'This is a brief connectivity verification phrase.',
        documentId: 'admin_test_probe',
      });
      return {
        success: Boolean(testRes.humanizedText),
        latencyMs: Date.now() - startTime,
        message: 'Humanizer API responded successfully and generated text.',
      };
    } catch (err: unknown) {
      return {
        success: false,
        latencyMs: Date.now() - startTime,
        message: err instanceof Error ? err.message : String(err),
      };
    }
  }
}
