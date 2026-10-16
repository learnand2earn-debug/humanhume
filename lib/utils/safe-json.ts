/**
 * Safe JSON parser & fetch utility that shields against non-JSON and HTML/proxy errors
 * such as 502/503 "upstream error", preventing "Unexpected token 'u'" crashes across
 * the entire platform.
 */

export function isUpstreamError(text: string | null | undefined): boolean {
  if (!text || typeof text !== 'string') return false;
  const lower = text.toLowerCase();
  return (
    lower.includes('upstream error') ||
    lower.includes('upstream connect error') ||
    lower.includes('upstream request timeout') ||
    lower.includes('bad gateway') ||
    lower.includes('502 bad gateway') ||
    lower.includes('503 service unavailable') ||
    lower.includes('504 gateway time-out') ||
    lower.includes('gateway timeout') ||
    lower.includes('service unavailable') ||
    lower.includes('connection refused') ||
    lower.includes('server is warming up')
  );
}

export async function safeParseResponse<T = any>(
  res: Response
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const rawText = await res.text();

    if (isUpstreamError(rawText)) {
      return {
        ok: false,
        status: res.status || 502,
        data: null,
        error: 'Server is warming up or reconnecting. Please wait a moment and try again.',
      };
    }

    if (!res.ok) {
      if (rawText && rawText.trim()) {
        try {
          const errorJson = JSON.parse(rawText);
          return {
            ok: false,
            status: res.status,
            data: null,
            error:
              errorJson.error ||
              errorJson.message ||
              `Request failed with status ${res.status}`,
          };
        } catch {
          return {
            ok: false,
            status: res.status,
            data: null,
            error:
              rawText.length > 200
                ? `HTTP error ${res.status}`
                : rawText.trim() || `HTTP error ${res.status}`,
          };
        }
      }
      return {
        ok: false,
        status: res.status,
        data: null,
        error: `Request failed with status ${res.status}`,
      };
    }

    if (!rawText || rawText.trim() === '') {
      return { ok: true, status: res.status, data: null };
    }

    try {
      const data = JSON.parse(rawText) as T;
      return { ok: true, status: res.status, data };
    } catch {
      return {
        ok: false,
        status: res.status,
        data: null,
        error: 'Received non-JSON response from server',
      };
    }
  } catch (err: any) {
    return {
      ok: false,
      status: res.status || 0,
      data: null,
      error: err.message || 'Error parsing server response',
    };
  }
}

export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(input, init);
    return await safeParseResponse<T>(res);
  } catch (err: any) {
    const message = err?.message || 'Network connectivity error';
    const isUpstream = isUpstreamError(message);
    return {
      ok: false,
      status: 0,
      data: null,
      error: isUpstream
        ? 'Server is warming up or reconnecting. Please wait a moment and try again.'
        : message,
    };
  }
}

export function safeJsonParse<T = any>(
  text: string | null | undefined,
  fallback: T | null = null
): T | null {
  if (!text || typeof text !== 'string') return fallback;
  if (isUpstreamError(text)) return fallback;
  try {
    return JSON.parse(text) as T;
  } catch {
    return fallback;
  }
}

/**
 * Initializes global client-side protection interceptor on Response.prototype.json
 * to guarantee that any unexpected upstream error string never throws a fatal SyntaxError.
 */
export function installGlobalJsonShield(): void {
  if (typeof window === 'undefined') return;
  const win = window as any;
  if (win.__humanflow_json_shield_installed) return;
  win.__humanflow_json_shield_installed = true;

  if (typeof Response !== 'undefined' && Response.prototype && Response.prototype.json) {
    const originalJson = Response.prototype.json;
    Response.prototype.json = async function () {
      try {
        const rawText = await this.text();
        if (isUpstreamError(rawText)) {
          return {
            success: false,
            ok: false,
            error: 'Server is warming up or reconnecting. Please wait a moment and try again.',
          };
        }
        return JSON.parse(rawText);
      } catch (err: any) {
        if (err?.message && isUpstreamError(err.message)) {
          return {
            success: false,
            ok: false,
            error: 'Server is warming up or reconnecting. Please wait a moment and try again.',
          };
        }
        // Fallback to original behavior for other errors
        throw err;
      }
    };
  }
}
