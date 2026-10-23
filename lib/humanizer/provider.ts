import {HumanizerProviderConfig, HumanizerRequest, HumanizerResponse} from './types';
import {parseResponseJsonSafely, sanitizeErrorMessage} from '@/lib/safe-json';
import {parseHumanizerApiResponse} from './parser';
import {humanizeWithGeminiAi, transformWithNaturalEngine} from './natural-engine';

const degradedEndpoints = new Map<string, {until: number; reason: string}>();

export function clearHumanizerCircuitBreaker(apiUrl?: string) {
  if (apiUrl) {
    degradedEndpoints.delete(apiUrl);
  } else {
    degradedEndpoints.clear();
  }
}

/**
 * Natural Humanization Engine.
 * Transforms text with rich burstiness, active voice, and robotic cliché removal,
 * while strictly preserving all numbers, currencies, dates, citations, URLs, emails, headings, and legal obligations.
 */
export function runNaturalHumanizationTransform(
  input: string,
  intensity: 'LOW' | 'NORMAL' = 'NORMAL',
  isLegalClause = false,
  protectedTokens: string[] = []
): string {
  return transformWithNaturalEngine(input, intensity, isLegalClause, protectedTokens);
}

export async function executeProviderHumanization(
  req: HumanizerRequest,
  config: HumanizerProviderConfig
): Promise<HumanizerResponse> {
  const startTime = Date.now();

  // 1. Try Gemini AI if available
  try {
    const geminiText = await humanizeWithGeminiAi(req.text, req.intensity);
    if (geminiText && geminiText.trim().length > 10) {
      return {
        success: true,
        humanizedText: geminiText,
        provider: 'Google Gemini AI (Direct Pipeline)',
        model: 'gemini-2.5-flash',
        durationMs: Math.max(10, Date.now() - startTime),
        rawStatus: 200,
        usedFallback: false,
      };
    }
  } catch (geminiErr) {
    console.warn('[Humanizer] Gemini pipeline error, continuing to secondary:', geminiErr);
  }

  const isPlaceholderUrl =
    !config.apiUrl ||
    config.apiUrl.includes('.example.com') ||
    !config.apiUrl.startsWith('http');

  // 2. Built-in Natural Engine for DEMO mode or unconfigured API
  if (config.mode === 'DEMO' || isPlaceholderUrl || !config.apiKey) {
    const transformed = runNaturalHumanizationTransform(
      req.text,
      req.intensity,
      req.isLegalClause,
      req.protectedTokens
    );
    return {
      success: true,
      humanizedText: transformed,
      provider: 'HumanFlow Built-In Natural Engine',
      model: config.model || 'humanflow-natural-v3',
      durationMs: Math.max(4, Date.now() - startTime),
      rawStatus: 200,
      usedFallback: false,
    };
  }

  // 3. Fast circuit breaker: if external URL recently timed out or failed
  const circuit = degradedEndpoints.get(config.apiUrl);
  if (circuit && circuit.until > Date.now() && req.traceId !== 'HF-ADMIN-TEST') {
    const transformed = runNaturalHumanizationTransform(
      req.text,
      req.intensity,
      req.isLegalClause,
      req.protectedTokens
    );
    return {
      success: true,
      humanizedText: transformed,
      provider: 'HumanFlow Built-In Natural Engine (Auto-Recovery)',
      model: config.model || 'humanflow-natural-v3',
      durationMs: Math.max(2, Date.now() - startTime),
      rawStatus: 200,
      usedFallback: true,
      errorMessage: circuit.reason,
    };
  }

  const isHumanGpt = config.apiUrl.includes('humangpt.io');

  // Short snippets (< 15 words) bypass HumanGPT's 15-word threshold
  const words = req.text.trim().split(/\s+/).filter(Boolean);
  if (isHumanGpt && words.length < 15) {
    const transformed = runNaturalHumanizationTransform(
      req.text,
      req.intensity,
      req.isLegalClause,
      req.protectedTokens
    );
    return {
      success: true,
      humanizedText: transformed,
      provider: 'HumanFlow Built-In Natural Engine (Text < 15 words)',
      model: config.model || 'humangpt-rule',
      durationMs: Math.max(2, Date.now() - startTime),
      rawStatus: 200,
      usedFallback: false,
    };
  }

  const effectiveTimeoutMs = Math.min(config.timeoutMs || 20000, 45000);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), effectiveTimeoutMs);

  try {
    const requestHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `Bearer ${config.apiKey}`,
    };

    let requestBody: string;
    if (isHumanGpt) {
      requestBody = JSON.stringify({
        text: req.text,
        mode: req.intensity === 'LOW' ? 'light' : 'medium',
      });
    } else {
      requestHeaders['X-API-Key'] = config.apiKey;
      requestHeaders['X-Trace-Id'] = req.traceId || 'HF-LIVE';
      requestBody = JSON.stringify({
        text: req.text,
        model: req.model || config.model || 'humanflow-pro-v2',
        intensity: req.intensity,
        preserve_meaning: true,
        preserve_tokens: req.protectedTokens || [],
      });
    }

    const response = await fetch(config.apiUrl, {
      method: 'POST',
      headers: requestHeaders,
      body: requestBody,
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const durationMs = Date.now() - startTime;

    const safeParsed = await parseResponseJsonSafely<Record<string, unknown>>(response, {});

    if (safeParsed.isHtml) {
      const reason =
        safeParsed.errorMessage ||
        `External endpoint returned an HTML page instead of JSON (HTTP ${response.status})`;
      degradedEndpoints.set(config.apiUrl, {
        until: Date.now() + 180_000,
        reason,
      });
      throw new Error(reason);
    }

    if (!response.ok) {
      const errObj = safeParsed.data?.error as {message?: string; code?: string} | undefined;
      const reason =
        errObj?.message ||
        safeParsed.errorMessage ||
        `External Humanizer API returned HTTP ${response.status}`;
      degradedEndpoints.set(config.apiUrl, {
        until: Date.now() + 60_000,
        reason,
      });
      throw new Error(reason);
    }

    const parsedText = parseHumanizerApiResponse(safeParsed.data, config.responsePath);

    if (!parsedText) {
      const reason = `External response did not contain humanized text at path "${config.responsePath}"`;
      degradedEndpoints.set(config.apiUrl, {
        until: Date.now() + 60_000,
        reason,
      });
      throw new Error(reason);
    }

    degradedEndpoints.delete(config.apiUrl);

    return {
      success: true,
      humanizedText: parsedText,
      provider: isHumanGpt ? 'HumanGPT API (humangpt.io)' : 'External Humanizer API',
      model: req.model || config.model || (isHumanGpt ? 'humangpt-medium' : 'external-model'),
      durationMs,
      rawStatus: response.status,
      usedFallback: false,
    };
  } catch (err) {
    clearTimeout(timeout);
    const cleanErr = sanitizeErrorMessage(
      err,
      'External Humanizer endpoint unreachable; automatic Built-In Engine recovery used'
    );
    degradedEndpoints.set(config.apiUrl, {
      until: Date.now() + 120_000,
      reason: cleanErr,
    });

    const fallbackText = runNaturalHumanizationTransform(
      req.text,
      req.intensity,
      req.isLegalClause,
      req.protectedTokens
    );
    return {
      success: true,
      humanizedText: fallbackText,
      provider: 'HumanFlow Built-In Natural Engine (Auto-Recovery)',
      model: config.model || 'humanflow-natural-v3',
      durationMs: Date.now() - startTime,
      rawStatus: 200,
      usedFallback: true,
      errorMessage: cleanErr,
    };
  }
}
