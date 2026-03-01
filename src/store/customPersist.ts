/**
 * Custom persistence without redux-persist: save/load whitelist slices to AsyncStorage.
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

export async function getStoredState(): Promise<StoredState | null> {
  try {
    const raw = await AsyncStorage.getItem(PERSIST_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as StoredState;
  } catch {
    return null;
  }
}

export async function setStoredState(state: StoredState): Promise<void> {
  try {
    const toStore: StoredState = {};
    for (const key of WHITELIST) {
      if (key in state && state[key] !== undefined) {
        toStore[key] = state[key] as Record<string, unknown>;
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
