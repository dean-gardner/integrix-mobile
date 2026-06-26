/** Possible API keys for “require signature on task completion” (document version or task). */
export const SIGNATURE_REQUIRED_FLAG_KEYS = [
  'requireSignatureOnTaskCompletion',
  'RequireSignatureOnTaskCompletion',
  'isRequireSignatureOnTaskCompletion',
  'IsRequireSignatureOnTaskCompletion',
  'requireSignatureOnCompletion',
  'RequireSignatureOnCompletion',
  'isSignatureRequiredOnTaskCompletion',
  'IsSignatureRequiredOnTaskCompletion',
  'requireSignature',
  'RequireSignature',
  'signatureRequired',
  'SignatureRequired',
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
  const nestedDocument =
    task?.document && typeof task.document === 'object'
      ? (task.document as Record<string, unknown>)
      : null;
  const nestedDocumentVersion =
    task?.documentVersion && typeof task.documentVersion === 'object'
      ? (task.documentVersion as Record<string, unknown>)
      : null;
  const nestedVersion =
    task?.version && typeof task.version === 'object'
      ? (task.version as Record<string, unknown>)
      : null;

  return (
    readTruthyFlag(task, SIGNATURE_REQUIRED_FLAG_KEYS) ||
    readTruthyFlag(documentVersion, SIGNATURE_REQUIRED_FLAG_KEYS) ||
    readTruthyFlag(nestedDocument, SIGNATURE_REQUIRED_FLAG_KEYS) ||
    readTruthyFlag(nestedDocumentVersion, SIGNATURE_REQUIRED_FLAG_KEYS) ||
    readTruthyFlag(nestedVersion, SIGNATURE_REQUIRED_FLAG_KEYS)
  );
}
