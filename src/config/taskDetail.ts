export const TASK_STATUS_IN_PROGRESS = 0;
export const TASK_STATUS_COMPLETE = 1;
export const TASK_STATUS_CANCELLED = 2;
export const TASK_STATUS_LOCKED = 3;
export const TASK_STATUS_PLANNED = 4;

export const TASK_STEP_NOT_COMPLETED = 0;
export const TASK_STEP_COMPLETED_WITH_RECORD = 1;

const TASK_STATUS_LABELS: Record<number, string> = {
  [TASK_STATUS_IN_PROGRESS]: 'In Progress',
  [TASK_STATUS_COMPLETE]: 'Complete',
  [TASK_STATUS_CANCELLED]: 'Cancelled',
  [TASK_STATUS_LOCKED]: 'Locked',
  [TASK_STATUS_PLANNED]: 'Planned',
};

export function getTaskStatusLabel(status?: number): string {
  if (typeof status !== 'number') return '—';
  return TASK_STATUS_LABELS[status] ?? `Status ${status}`;
}

export function getTaskStatusAction(status?: number): { label: string; nextStatus: number | null } {
  switch (status) {
    case TASK_STATUS_IN_PROGRESS:
      return { label: 'Cancel task', nextStatus: TASK_STATUS_CANCELLED };
    case TASK_STATUS_CANCELLED:
      return { label: 'Uncancel task', nextStatus: TASK_STATUS_IN_PROGRESS };
    case TASK_STATUS_COMPLETE:
      return { label: 'Reopen task', nextStatus: TASK_STATUS_IN_PROGRESS };
    default:
      return { label: 'Cancel task', nextStatus: null };
  }
}

const VERIFICATION_STATUS_API_NAMES: Record<number, string> = {
  [TASK_STEP_NOT_COMPLETED]: 'NotCompleted',
  [TASK_STEP_COMPLETED_WITH_RECORD]: 'CompletedWithRecord',
};

export function verificationStatusToApiString(status: number | null): string | null {
  if (status === null || status === undefined) return null;
  return VERIFICATION_STATUS_API_NAMES[status] ?? null;
}

export function parseVerificationStatus(value: unknown): number | null {
  if (value === null || value === undefined || value === '') return null;
  if (value === 'CompletedWithRecord') return TASK_STEP_COMPLETED_WITH_RECORD;
  if (value === 'NotCompleted') return TASK_STEP_NOT_COMPLETED;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

export function formatDateTime(dateUtc?: string): string {
  if (!dateUtc) return '-';
  const d = new Date(dateUtc);
  if (Number.isNaN(d.getTime())) return '-';
  const day = String(d.getDate()).padStart(2, '0');
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const year = d.getFullYear();
  const hours = String(d.getHours()).padStart(2, '0');
  const minutes = String(d.getMinutes()).padStart(2, '0');
  return `${day}-${month}-${year} ${hours}:${minutes}`;
}

export function getElapsedTime(createdOnUtc?: string): string {
  if (!createdOnUtc) return '-';
  const start = new Date(createdOnUtc);
  if (Number.isNaN(start.getTime())) return '-';
  const diffMs = Date.now() - start.getTime();
  if (diffMs <= 0) return '0 hours';
  const totalHours = Math.floor(diffMs / (1000 * 60 * 60));
  const days = Math.floor(totalHours / 24);
  const hours = totalHours % 24;
  if (days <= 0) return `${hours} hour${hours === 1 ? '' : 's'}`;
  return `${days} day${days === 1 ? '' : 's'} ${hours} hour${hours === 1 ? '' : 's'}`;
}

export function stripHtmlToText(html?: string): string {
  if (!html) return '';
  return html
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

export function isImageFile(name?: string, url?: string): boolean {
  const source = `${name ?? ''} ${url ?? ''}`.toLowerCase();
  return (
    source.includes('.png') ||
    source.includes('.jpg') ||
    source.includes('.jpeg') ||
    source.includes('.webp') ||
    source.includes('.gif')
  );
}
