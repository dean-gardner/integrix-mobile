/**
 * Custom persistence without redux-persist: save/load whitelist slices to AsyncStorage.
 * Loading/error flags are never persisted so a killed mid-fetch cannot leave the UI spinning forever.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

const PERSIST_KEY = 'root';
const WHITELIST: string[] = [
  'auth',
  'feed',
  'tasks',
  'documents',
  'users',
  'defects',
  'dashboard',
  'notifications',
  'teams',
  'companyAssets',
  'subscription',
  'observations',
  'company',
  'userInvitations',
];

export type StoredState = Record<string, unknown>;

function sanitizeSliceForPersist(slice: unknown): unknown {
  if (!slice || typeof slice !== 'object' || Array.isArray(slice)) return slice;
  const next = { ...(slice as Record<string, unknown>) };
  if ('isLoading' in next) next.isLoading = false;
  if ('currentTaskLoading' in next) next.currentTaskLoading = false;
  if ('isActionLoading' in next) next.isActionLoading = false;
  if ('error' in next) next.error = null;
  if ('activeFetchRequestId' in next) next.activeFetchRequestId = null;
  return next;
}

function sanitizeStoredState(state: StoredState): StoredState {
  const sanitized: StoredState = {};
  for (const [key, value] of Object.entries(state)) {
    sanitized[key] = sanitizeSliceForPersist(value);
  }
  return sanitized;
}

export async function getStoredState(): Promise<StoredState | null> {
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as StoredState;
    return sanitizeStoredState(parsed);
  } catch {
    return null;
  }
}

export async function setStoredState(state: StoredState): Promise<void> {
  try {
    const toStore: StoredState = {};
    for (const key of WHITELIST) {
      if (key in state && state[key] !== undefined) {
        toStore[key] = sanitizeSliceForPersist(state[key]);
      }
    }
    await AsyncStorage.setItem(PERSIST_KEY, JSON.stringify(toStore));
  } catch {
    // ignore write errors
  }
}

let saveTimeout: ReturnType<typeof setTimeout> | null = null;
const SAVE_DEBOUNCE_MS = 500;

export function subscribePersist(store: {
  getState: () => StoredState;
  subscribe: (listener: () => void) => () => void;
}): () => void {
  const unsub = store.subscribe(() => {
    if (saveTimeout) clearTimeout(saveTimeout);
    saveTimeout = setTimeout(() => {
      saveTimeout = null;
      void setStoredState(store.getState() as StoredState);
    }, SAVE_DEBOUNCE_MS);
  });
  return () => {
    if (saveTimeout) clearTimeout(saveTimeout);
    unsub();
  };
}
