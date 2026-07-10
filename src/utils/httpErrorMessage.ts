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

/** ASP.NET ProblemDetails titles that should not be shown to users when field details exist. */
function isGenericValidationTitle(title: string): boolean {
  return /^one or more validation errors occurred\.?$/i.test(title.trim());
}

/**
 * Prefer concrete validation details over generic ASP.NET titles like
 * "One or more validation errors occurred.: Invalid email format."
 */
export function sanitizeApiErrorMessage(message: string): string {
  const trimmed = message.trim();
  if (!trimmed) return trimmed;

  const prefixed = trimmed.match(
    /^one or more validation errors occurred\.?\s*[:\-–—]\s*(.+)$/i
  );
  if (prefixed?.[1]?.trim()) return prefixed[1].trim();

  return trimmed;
}

function collectValidationDetails(errors: unknown): string[] {
  if (!errors || typeof errors !== 'object' || Array.isArray(errors)) return [];
  const parts: string[] = [];
  for (const v of Object.values(errors as Record<string, unknown>)) {
    if (Array.isArray(v)) parts.push(...v.map(String));
    else if (v != null) parts.push(String(v));
  }
  return parts.map((part) => part.trim()).filter(Boolean);
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
    if (m && m !== 'Network Error') return sanitizeApiErrorMessage(m);
    if (m === '') return '';
    return fallback;
  }
  if (typeof data === 'string') {
    const t = data.trim();
    if (!t || /^Bad Request$/i.test(t) || isTechnicalErrorMessage(t)) return fallback;
    return sanitizeApiErrorMessage(t) || fallback;
  }
  if (typeof data !== 'object' || data === null) return fallback;
  const o = data as Record<string, unknown>;
  const validationDetails = collectValidationDetails(o.errors);
  if (validationDetails.length) {
    const details = validationDetails.join(' ');
    if (isTechnicalErrorMessage(details)) return fallback;
    return sanitizeApiErrorMessage(details);
  }
  if (typeof o.message === 'string' && o.message.trim()) {
    const message = o.message.trim();
    return isTechnicalErrorMessage(message) ? fallback : sanitizeApiErrorMessage(message);
  }
  if (typeof o.title === 'string' && o.title.trim()) {
    const title = o.title.trim();
    if (isTechnicalErrorMessage(title) || isGenericValidationTitle(title)) return fallback;
    return sanitizeApiErrorMessage(title);
  }
  return fallback;
}
