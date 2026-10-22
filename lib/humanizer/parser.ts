/**
 * Configurable Response Parser for Provider-Independent Humanizer API
 * Supports custom dot-notation paths (e.g., "data.text", "result.output", "choices.0.message.content")
 * and automatically falls back to common response schemas if the primary path is absent.
 */
export function parseHumanizerApiResponse(
  payload: unknown,
  configuredPath = 'data.text'
): string | null {
  if (!payload) return null;
  if (typeof payload === 'string') {
    const trimmed = payload.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof payload !== 'object') return null;

  const extractByPath = (obj: Record<string, unknown>, path: string): unknown => {
    const segments = path
      .replace(/\[(\d+)\]/g, '.$1')
      .split('.')
      .filter(Boolean);
    let current: unknown = obj;
    for (const seg of segments) {
      if (current === null || current === undefined || typeof current !== 'object') {
        return undefined;
      }
      current = (current as Record<string, unknown>)[seg];
    }
    return current;
  };

  const record = payload as Record<string, unknown>;

  // 1. Try user/admin configured path first
  if (configuredPath) {
    const customResult = extractByPath(record, configuredPath);
    if (typeof customResult === 'string' && customResult.trim().length > 0) {
      return customResult.trim();
    }
  }

  // 2. Try standard fallback paths used across commercial Humanizer / LLM endpoints
  const fallbackPaths = [
    'data.text',
    'data.humanized_text',
    'data.output',
    'humanized_text',
    'humanizedText',
    'text',
    'output',
    'result.text',
    'result',
    'response',
    'choices.0.message.content',
    'choices.0.text',
  ];

  for (const path of fallbackPaths) {
    const val = extractByPath(record, path);
    if (typeof val === 'string' && val.trim().length > 0) {
      return val.trim();
    }
  }

  return null;
}
