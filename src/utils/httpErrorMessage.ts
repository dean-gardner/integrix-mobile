import type { AxiosError } from 'axios';

/**
 * Readable message from API errors (Axios + ASP.NET validation ProblemDetails).
 */
export function getHttpErrorMessage(e: unknown, fallback: string): string {
  const err = e as AxiosError<unknown>;
  const isNetworkFailure =
    err.code === 'ERR_NETWORK' ||
    err.code === 'ERR_INTERNET_DISCONNECTED' ||
    err.message === 'Network Error';
  if (isNetworkFailure) return '';
  const data = err.response?.data;
  if (data == null) {
    const m = err.message?.trim();
    if (m && m !== 'Network Error') return m;
    if (m === '') return '';
    return fallback;
  }
  if (typeof data === 'string') {
    const t = data.trim();
    return t || fallback;
  }
  if (typeof data !== 'object' || data === null) return fallback;
  const o = data as Record<string, unknown>;
  if (typeof o.message === 'string' && o.message.trim()) return o.message.trim();
  if (typeof o.title === 'string' && o.title.trim()) {
    const errors = o.errors;
    if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
      const parts: string[] = [];
      for (const v of Object.values(errors as Record<string, unknown>)) {
        if (Array.isArray(v)) parts.push(...v.map(String));
        else if (v != null) parts.push(String(v));
      }
      if (parts.length) return `${o.title.trim()}: ${parts.join(' ')}`;
    }
    return o.title.trim();
  }
  return fallback;
}
