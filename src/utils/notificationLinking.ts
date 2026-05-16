import { Linking } from 'react-native';
import type { AppDispatch } from '../store';
import { fetchDocumentById } from '../store/documentsSlice';
import { fetchTaskById } from '../store/tasksSlice';
import type { DocumentVersionReadDTO } from '../types/document';
import type { NotificationDTO } from '../types/notification';
import type { TaskReadDTO } from '../types/task';

type AppNavigation = {
  navigate: (name: string, params?: object) => void;
};

type TaskTarget = {
  kind: 'task';
  documentId?: string;
  versionId: string;
  taskId: string;
  taskStepId?: string;
};

type DocumentTarget = {
  kind: 'document';
  documentId: string;
  versionId: string;
};

type ScreenTarget = {
  kind: 'screen';
  screen: 'Subscription' | 'Tasks' | 'Documents';
};

type NotificationLinkTarget = TaskTarget | DocumentTarget | ScreenTarget | null;

const URL_BASE = 'https://app.integri-x.com';
const QUERY_TARGET_KEYS = ['returnurl', 'redirect', 'redirecturl', 'url', 'path', 'to'];

function safeDecode(value: string): string {
  try {
    return decodeURIComponent(value.replace(/\+/g, '%20'));
  } catch {
    return value;
  }
}

function safeDecodePart(value: string | undefined): string | undefined {
  if (!value) return undefined;
  return safeDecode(value).trim() || undefined;
}

function tryParseUrl(value: string): URL | null {
  try {
    return new URL(value, URL_BASE);
  } catch {
    return null;
  }
}

function getSearchParam(parsed: URL | null | undefined, key: string): string | null {
  if (!parsed) return null;
  const normalizedKey = key.toLowerCase();
  for (const [name, value] of parsed.searchParams.entries()) {
    if (name.toLowerCase() === normalizedKey) {
      return value;
    }
  }
  return null;
}

function addVariant(variants: string[], seen: Set<string>, value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed || seen.has(trimmed)) return;
  seen.add(trimmed);
  variants.push(trimmed);

  const decoded = safeDecode(trimmed);
  if (decoded && decoded !== trimmed && !seen.has(decoded)) {
    seen.add(decoded);
    variants.push(decoded);
  }
}

function collectLinkVariants(rawLink: string): string[] {
  const variants: string[] = [];
  const seen = new Set<string>();

  addVariant(variants, seen, rawLink);

  for (let i = 0; i < variants.length && i < 20; i += 1) {
    const parsed = tryParseUrl(variants[i]);
    if (!parsed) continue;

    addVariant(variants, seen, `${parsed.pathname}${parsed.search}${parsed.hash}`);
    addVariant(variants, seen, `${parsed.pathname}${parsed.search}`);

    QUERY_TARGET_KEYS.forEach((key) => {
      addVariant(variants, seen, getSearchParam(parsed, key));
    });
  }

  return variants;
}

function extractTaskStepId(value: string): string | undefined {
  const parsed = tryParseUrl(value);
  const fromQuery = getSearchParam(parsed, 'taskStepId') ?? getSearchParam(parsed, 'stepId');
  if (fromQuery) return safeDecodePart(fromQuery);

  const match = value.match(/\/+tasksteps?\/+([^/?#]+)/i);
  return safeDecodePart(match?.[1]);
}

function resolveNotificationLinkTarget(rawLink: string): NotificationLinkTarget {
  const variants = collectLinkVariants(rawLink);

  for (const variant of variants) {
    const taskPathMatch = variant.match(
      /(?:^|\/+)app\/+documents\/+([^/?#]+)\/+versions\/+([^/?#]+)\/+tasks\/+([^/?#]+)/i
    );
    if (taskPathMatch) {
      return {
        kind: 'task',
        documentId: safeDecodePart(taskPathMatch[1]),
        versionId: safeDecodePart(taskPathMatch[2]) ?? '',
        taskId: safeDecodePart(taskPathMatch[3]) ?? '',
        taskStepId: extractTaskStepId(variant),
      };
    }

    const parsed = tryParseUrl(variant);
    const queryTaskId = getSearchParam(parsed, 'taskId');
    const queryVersionId = getSearchParam(parsed, 'versionId');
    const queryDocumentId = getSearchParam(parsed, 'documentId');
    if (queryTaskId && queryVersionId) {
      return {
        kind: 'task',
        documentId: safeDecodePart(queryDocumentId ?? undefined),
        versionId: safeDecodePart(queryVersionId) ?? '',
        taskId: safeDecodePart(queryTaskId) ?? '',
        taskStepId: extractTaskStepId(variant),
      };
    }
  }

  for (const variant of variants) {
    const documentPathMatch = variant.match(
      /(?:^|\/+)app\/+documents\/+([^/?#]+)\/+versions\/+([^/?#]+)/i
    );
    if (documentPathMatch) {
      return {
        kind: 'document',
        documentId: safeDecodePart(documentPathMatch[1]) ?? '',
        versionId: safeDecodePart(documentPathMatch[2]) ?? '',
      };
    }

    const parsed = tryParseUrl(variant);
    const queryVersionId = getSearchParam(parsed, 'versionId');
    const queryDocumentId = getSearchParam(parsed, 'documentId');
    if (queryDocumentId && queryVersionId) {
      return {
        kind: 'document',
        documentId: safeDecodePart(queryDocumentId) ?? '',
        versionId: safeDecodePart(queryVersionId) ?? '',
      };
    }
  }

  const combined = variants.join(' ').toLowerCase();
  if (combined.includes('subscription')) {
    return { kind: 'screen', screen: 'Subscription' };
  }
  if (combined.includes('/app/tasks') || combined.includes('/tasks') || combined.includes('task')) {
    return { kind: 'screen', screen: 'Tasks' };
  }
  if (combined.includes('/app/documents') || combined.includes('/documents') || combined.includes('document')) {
    return { kind: 'screen', screen: 'Documents' };
  }

  return null;
}

function createTaskRouteFallback(target: TaskTarget): TaskReadDTO {
  return {
    id: target.taskId,
    taskNumber: target.taskId,
    documentId: target.documentId,
    versionId: target.versionId,
  };
}

function createDocumentRouteFallback(target: DocumentTarget): DocumentVersionReadDTO {
  return {
    id: target.versionId,
    documentId: target.documentId,
    documentNo: target.documentId,
    documentNumberStr: target.documentId,
    description: '',
    createdByName: '',
    createdOnUtc: '',
    versionStatusCode: '',
    versionNo: '',
  };
}

async function openExternalUrl(rawLink: string): Promise<void> {
  try {
    await Linking.openURL(rawLink);
  } catch {
    if (rawLink.startsWith('http://')) {
      await Linking.openURL(`https://${rawLink.slice('http://'.length)}`);
    }
  }
}

export async function openNotificationLinkInApp(
  notification: NotificationDTO,
  dispatch: AppDispatch,
  navigation: AppNavigation
): Promise<void> {
  const rawLink = notification.link?.trim();
  if (!rawLink) return;

  const target = resolveNotificationLinkTarget(rawLink);

  if (target?.kind === 'task' && target.versionId && target.taskId) {
    const fallbackTask = createTaskRouteFallback(target);
    try {
      const task = await dispatch(
        fetchTaskById({ versionId: target.versionId, taskId: target.taskId })
      ).unwrap();
      navigation.navigate('TaskDetail', {
        task: {
          ...fallbackTask,
          ...task,
          documentId: task.documentId ?? fallbackTask.documentId,
          versionId: task.versionId ?? fallbackTask.versionId,
        },
        taskStepId: target.taskStepId ?? null,
      });
    } catch {
      navigation.navigate('TaskDetail', {
        task: fallbackTask,
        taskStepId: target.taskStepId ?? null,
      });
    }
    return;
  }

  if (target?.kind === 'document' && target.documentId && target.versionId) {
    const fallbackDocument = createDocumentRouteFallback(target);
    try {
      const document = await dispatch(
        fetchDocumentById({ documentId: target.documentId, versionId: target.versionId })
      ).unwrap();
      navigation.navigate('DocumentDetail', { document });
    } catch {
      navigation.navigate('DocumentDetail', { document: fallbackDocument });
    }
    return;
  }

  if (target?.kind === 'screen') {
    navigation.navigate(target.screen);
    return;
  }

  if (/^https?:\/\//i.test(rawLink)) {
    await openExternalUrl(rawLink);
  }
}
