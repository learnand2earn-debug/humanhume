/**
 * Universal safe JSON parsing and fetch utilities.
 * Prevents "SyntaxError: Unexpected token '<', \"<!doctype \"... is not valid JSON"
 * whenever an external API, reverse proxy, or server route returns an HTML error page
 * (e.g., 404, 413 Payload Too Large, 500, 502 Bad Gateway, 504 Gateway Timeout) instead of JSON.
 */

export interface SafeJsonResult<T = Record<string, unknown>> {
  ok: boolean;
  status: number;
  data: T;
  isHtml: boolean;
  rawText: string;
  errorMessage?: string;
}

export function sanitizeErrorMessage(
  err: unknown,
  fallback = 'Request could not be completed. Please try again.'
): string {
  const raw = err instanceof Error ? err.message : typeof err === 'string' ? err : '';
  if (!raw) return fallback;

  const lower = raw.toLowerCase();
  if (
    lower.includes('unexpected token') ||
    lower.includes('<!doctype') ||
    lower.includes('<html') ||
    lower.includes('is not valid json') ||
    lower.includes('json.parse')
  ) {
    return 'The server or external endpoint returned an HTML page instead of JSON (e.g., gateway timeout or payload limit). Automatic recovery has been engaged.';
  }
  return raw;
}

export function parseRawTextAsJsonSafely<T = Record<string, unknown>>(
  rawText: string,
  status = 200,
  fallbackData: T = {} as T
): {data: T; isHtml: boolean; errorMessage?: string} {
  const trimmed = (rawText || '').trim();
  if (!trimmed) {
    return {
      data: fallbackData,
      isHtml: false,
      errorMessage: status >= 400 ? `Empty response from server (HTTP ${status}).` : undefined,
    };
  }

  const looksLikeHtml =
    trimmed.startsWith('<!') ||
    trimmed.toLowerCase().startsWith('<html') ||
    trimmed.toLowerCase().startsWith('<head') ||
    trimmed.toLowerCase().startsWith('<body') ||
    trimmed.startsWith('<?xml');

  if (looksLikeHtml) {
    const titleMatch = trimmed.match(/<title[^>]*>([^<]+)<\/title>/i);
    const extractedTitle = titleMatch?.[1]?.trim();
    let friendly = `Endpoint returned an HTML error page (HTTP ${status || 502})`;
    if (status === 413) {
      friendly = 'File payload exceeded gateway transfer size limit (HTTP 413).';
    } else if (status === 502 || status === 503 || status === 504) {
      friendly = `Gateway timeout or external service temporarily unavailable (HTTP ${status}).`;
    } else if (status === 404) {
      friendly = 'Requested API endpoint was not found (HTTP 404).';
    } else if (extractedTitle) {
      friendly = `${extractedTitle} (HTTP ${status})`;
    }
    return {
      data: fallbackData,
      isHtml: true,
      errorMessage: friendly,
    };
  }

  try {
    const parsed = JSON.parse(trimmed) as T;
    return {
      data: parsed ?? fallbackData,
      isHtml: false,
    };
  } catch {
    return {
      data: fallbackData,
      isHtml: trimmed.includes('<') && trimmed.includes('>'),
      errorMessage:
        status >= 400
          ? `Non-JSON error response (HTTP ${status}): ${trimmed.slice(0, 120)}`
          : 'Received non-JSON response payload.',
    };
  }
}

export async function parseResponseJsonSafely<T = Record<string, unknown>>(
  res: Response,
  fallbackData: T = {} as T
): Promise<SafeJsonResult<T>> {
  let rawText = '';
  try {
    rawText = await res.text();
  } catch {
    return {
      ok: false,
      status: res.status || 500,
      data: fallbackData,
      isHtml: false,
      rawText: '',
      errorMessage: 'Failed to read response stream.',
    };
  }

  const parsed = parseRawTextAsJsonSafely<T>(rawText, res.status, fallbackData);
  const recordData = parsed.data as unknown as Record<string, unknown>;
  const serverErr =
    typeof recordData?.error === 'string'
      ? recordData.error
      : typeof recordData?.message === 'string' && !res.ok
        ? recordData.message
        : parsed.errorMessage;

  return {
    ok: res.ok && !parsed.isHtml,
    status: res.status,
    data: parsed.data,
    isHtml: parsed.isHtml,
    rawText,
    errorMessage: serverErr,
  };
}
