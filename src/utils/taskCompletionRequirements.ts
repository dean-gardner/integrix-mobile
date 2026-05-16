/** Possible API keys for “require signature on task completion” (document version or task). */
export const SIGNATURE_REQUIRED_FLAG_KEYS = [
  'requireSignatureOnTaskCompletion',
  'isRequireSignatureOnTaskCompletion',
  'requireSignatureOnCompletion',
  'isSignatureRequiredOnTaskCompletion',
  'requireSignature',
] as const;

function isTruthyFlagValue(value: unknown): boolean {
  if (value === true || value === 1) return true;
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    return normalized === 'true' || normalized === '1' || normalized === 'yes';
  }
  return false;
}

export function readTruthyFlag(
  source: Record<string, unknown> | null | undefined,
  keys: readonly string[]
): boolean {
  if (!source) return false;
  for (const key of keys) {
    if (isTruthyFlagValue(source[key])) return true;
  }
  return false;
}

export function isSignatureRequiredOnTaskCompletion(
  task?: Record<string, unknown> | null,
  documentVersion?: Record<string, unknown> | null
): boolean {
  return (
    readTruthyFlag(task, SIGNATURE_REQUIRED_FLAG_KEYS) ||
    readTruthyFlag(documentVersion, SIGNATURE_REQUIRED_FLAG_KEYS)
  );
}
