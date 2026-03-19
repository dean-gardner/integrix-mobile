/**
 * Find the span of an embedded URL/link inside notification.message so we can
 * replace it with linkText (same intent as web Header.renderNotification).
 */

function tryParseUrl(url: string): URL | null {
  try {
    return new URL(url);
  } catch {
    return null;
  }
}

/** Collapse duplicate slashes so //TASK/x and /TASK/x compare equal */
function normalizePathForCompare(pathname: string): string {
  const segments = pathname.split('/').filter((s) => s.length > 0);
  return `/${segments.join('/')}`;
}

function hostEqual(a: string, b: string): boolean {
  return a.toLowerCase() === b.toLowerCase();
}

/**
 * Same resource even when message vs API differ: http/https, // in path,
 * trailing slash, or query-only differences on signed URLs.
 */
export function urlsResourceEquivalent(msgUrl: URL, linkUrl: URL): boolean {
  if (!hostEqual(msgUrl.hostname, linkUrl.hostname)) return false;

  const pm = normalizePathForCompare(msgUrl.pathname);
  const pl = normalizePathForCompare(linkUrl.pathname);
  if (pm === pl) return true;

  const lastM = pm.split('/').pop() ?? '';
  const lastL = pl.split('/').pop() ?? '';
  if (lastM && lastL && (lastM === lastL || lastM.startsWith(lastL) || lastL.startsWith(lastM))) {
    return true;
  }

  return false;
}

/** Stop URL at whitespace, brackets, quotes, or backticks (markdown-style). */
const URL_IN_MESSAGE_RE = /https?:\/\/[^\s<>"')\x60[\]]+/gi;

function trimTrailingPunctFromUrl(raw: string): string {
  return raw.replace(/[.,;:'")\]]+$/u, '');
}

/** First URL span found in a message (trailing punctuation excluded). */
export function findFirstUrlRangeInMessage(message: string): { start: number; end: number } | null {
  const m = URL_IN_MESSAGE_RE.exec(message);
  URL_IN_MESSAGE_RE.lastIndex = 0;
  if (!m) return null;
  const start = m.index ?? 0;
  const trimmed = trimTrailingPunctFromUrl(m[0]);
  return { start, end: start + trimmed.length };
}

export function findLinkRangeInMessage(message: string, link: string): { start: number; end: number } | null {
  const L = link.trim();
  if (!L || !message) return null;

  let i = message.indexOf(L);
  if (i >= 0) return { start: i, end: i + L.length };

  const noSlash = L.replace(/\/+$/, '');
  if (noSlash && noSlash !== L) {
    i = message.indexOf(noSlash);
    if (i >= 0) return { start: i, end: i + noSlash.length };
  }
  const withSlash = L.endsWith('/') ? L : `${L}/`;
  if (withSlash !== L) {
    i = message.indexOf(withSlash);
    if (i >= 0) return { start: i, end: i + withSlash.length };
  }

  const linkUrlParsed = L.startsWith('http') ? tryParseUrl(L) : null;

  for (const m of message.matchAll(URL_IN_MESSAGE_RE)) {
    const raw = m[0];
    const start = m.index ?? 0;
    const trimmed = trimTrailingPunctFromUrl(raw);
    const effectiveEnd = start + trimmed.length;

    if (linkUrlParsed) {
      const msgUrl = tryParseUrl(trimmed);
      if (msgUrl && urlsResourceEquivalent(msgUrl, linkUrlParsed)) {
        return { start, end: effectiveEnd };
      }
      if (msgUrl && msgUrl.href === linkUrlParsed.href) {
        return { start, end: effectiveEnd };
      }
    }

    if (L.startsWith('/') && !L.startsWith('http')) {
      const msgUrl = tryParseUrl(trimmed);
      if (msgUrl) {
        const path = `${msgUrl.pathname}${msgUrl.search}`;
        if (path === L || path.endsWith(L) || L.endsWith(path)) {
          return { start, end: effectiveEnd };
        }
      }
    }

    if (trimmed === L || trimmed.endsWith(L) || L.endsWith(trimmed)) {
      return { start, end: effectiveEnd };
    }
  }

  if (L.startsWith('/')) {
    i = message.indexOf(L);
    if (i >= 0) return { start: i, end: i + L.length };
  }

  /*
   * API sometimes puts a different-but-equivalent URL in `link` than the substring in `message`
   * (scheme, slashes). If the message contains exactly one http(s) URL, treat it as the link target.
   */
  if (linkUrlParsed) {
    const all = [...message.matchAll(URL_IN_MESSAGE_RE)];
    if (all.length === 1) {
      const raw = all[0][0];
      const start = all[0].index ?? 0;
      const trimmed = trimTrailingPunctFromUrl(raw);
      const msgUrl = tryParseUrl(trimmed);
      if (msgUrl && urlsResourceEquivalent(msgUrl, linkUrlParsed)) {
        return { start, end: start + trimmed.length };
      }
    }
  }

  return null;
}

/**
 * Strip every http(s) URL from the message so we never print raw links on screen.
 * Cleans common English boilerplate left behind ("Click … to open the report").
 * When nothing remains, returns the original message with URLs removed only (last pass).
 */
export function stripEmbeddedUrlsFromDisplay(message: string): string {
  if (!message?.trim()) return '';
  let s = message.replace(URL_IN_MESSAGE_RE, '');
  s = s.replace(/\s+/g, ' ');
  s = s.replace(/\bClick\s+to\s+open\s+the\s+report\.?\s*/gi, '');
  s = s.replace(/\bClick\s+to\s+open\s+it\.?\s*/gi, '');
  s = s.replace(/\bto\s+open\s+the\s+report\.?\s*/gi, '');
  s = s.replace(/\bClick\s+here\s+to\s+open\s+the\s+report\.?\s*/gi, '');
  s = s.replace(/\s{2,}/g, ' ').trim();
  s = s.replace(/\s+\./g, '.').replace(/\.{2,}/g, '.').trim();
  if (s.length > 0) return s;
  const fallback = message.replace(URL_IN_MESSAGE_RE, '').replace(/\s+/g, ' ').trim();
  return fallback.length > 0 ? fallback : message;
}

/** Keep API-provided label (e.g. "here") to match web UI wording. */
export function notificationActionLabel(
  linkText: string | undefined,
  translate: (key: string) => string
): string {
  const raw = (linkText ?? '').trim();
  if (!raw) return translate('app.notificationsScreen.viewLink');
  return raw;
}
