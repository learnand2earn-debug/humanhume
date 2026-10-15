/**
 * Safe JSON parser utility that shields against non-JSON and HTML/proxy errors
 * such as 502/503 "upstream error", preventing "Unexpected token 'u'" crashes.
 */
export async function safeFetchJson<T = any>(
  input: RequestInfo | URL,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T | null; error?: string }> {
  try {
    const res = await fetch(input, init);
    const contentType = res.headers.get('content-type') || '';
    const rawText = await res.text();

    if (!res.ok) {
      if (rawText.toLowerCase().includes('upstream error')) {
        return {
          ok: false,
          status: res.status,
          data: null,
          error: 'Server is warming up or reconnecting. Please wait a moment and try again.',
        };
      }
      try {
        const errorJson = JSON.parse(rawText);
        return {
          ok: false,
          status: res.status,
          data: null,
          error: errorJson.error || errorJson.message || `Request failed with status ${res.status}`,
        };
      } catch {
        return {
          ok: false,
          status: res.status,
          data: null,
          error: rawText.slice(0, 200) || `HTTP error ${res.status}`,
        };
      }
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
      status: 0,
      data: null,
      error: err.message || 'Network connectivity error',
    };
  }
}
