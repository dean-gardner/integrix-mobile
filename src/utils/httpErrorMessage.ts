import type { AxiosError } from 'axios';

function isTechnicalErrorMessage(message: string): boolean {
  return (
    /^Request failed with status code \d+$/i.test(message) ||
    /^Internal Server Error$/i.test(message) ||
    /(?:^|\s)at\s+[\w.<>]+\(/.test(message) ||
    /\/home\/runner\//i.test(message) ||
    /\\src\\|\/src\//i.test(message) ||
    /\.cs:line\s+\d+/i.test(message) ||
    /\b(?:StackTrace|stack trace|Exception|System\.|StripeClient|Stripe API|SubscriptionService|CreateCheckoutSession)\b/i.test(message) ||
    /\b(?:price_data|line item)\b/i.test(message)
  );
}

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
    if (m && isTechnicalErrorMessage(m)) return fallback;
    if (m && m !== 'Network Error') return m;
    if (m === '') return '';
    return fallback;
  }
  if (typeof data === 'string') {
    const t = data.trim();
    if (!t || /^Bad Request$/i.test(t) || isTechnicalErrorMessage(t)) return fallback;
    return t || fallback;
  }
  if (typeof data !== 'object' || data === null) return fallback;
  const o = data as Record<string, unknown>;
  if (typeof o.message === 'string' && o.message.trim()) {
    const message = o.message.trim();
    return isTechnicalErrorMessage(message) ? fallback : message;
  }
  if (typeof o.title === 'string' && o.title.trim()) {
    const title = o.title.trim();
    if (isTechnicalErrorMessage(title)) return fallback;
    const errors = o.errors;
    if (errors && typeof errors === 'object' && !Array.isArray(errors)) {
      const parts: string[] = [];
      for (const v of Object.values(errors as Record<string, unknown>)) {
        if (Array.isArray(v)) parts.push(...v.map(String));
        else if (v != null) parts.push(String(v));
      }
      if (parts.length) {
        const details = parts.join(' ');
        if (isTechnicalErrorMessage(details)) return fallback;
        return `${title}: ${details}`;
      }
    }
    return title;
  }
  return fallback;
}
