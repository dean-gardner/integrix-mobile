/** Format timestamps using the active app language (not only the device locale). */

export type LocaleDatePreset = 'notifications' | 'listMeta';

const PRESETS: Record<LocaleDatePreset, Intl.DateTimeFormatOptions> = {
  notifications: {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  },
  listMeta: {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  },
};

export function formatLocaleDateTime(
  dateUtc: string | undefined,
  locale: string,
  preset: LocaleDatePreset = 'notifications'
): string {
  if (!dateUtc) return '';
  const d = new Date(dateUtc);
  if (Number.isNaN(d.getTime())) return '';
  try {
    return new Intl.DateTimeFormat(locale, PRESETS[preset]).format(d);
  } catch {
    return d.toLocaleString(locale);
  }
}
