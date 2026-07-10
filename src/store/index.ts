import { configureStore, combineReducers } from '@reduxjs/toolkit';
import { getStoredState, subscribePersist } from './customPersist';

import authReducer from './authSlice';
import dashboardReducer from './dashboardSlice';
import feedReducer from './feedSlice';
import tasksReducer from './tasksSlice';
import documentsReducer from './documentsSlice';
import usersReducer from './usersSlice';
import defectsReducer from './defectsSlice';
import notificationsReducer from './notificationsSlice';
import teamsReducer from './teamsSlice';
import companyAssetsReducer from './companyAssetsSlice';
import subscriptionReducer from './subscriptionSlice';
import observationsReducer from './observationsSlice';
import companyReducer from './companySlice';
import userInvitationsReducer from './userInvitationsSlice';

const rootReducer = combineReducers({
  auth: authReducer,
  dashboard: dashboardReducer,
  feed: feedReducer,
  tasks: tasksReducer,
  documents: documentsReducer,
  users: usersReducer,
  defects: defectsReducer,
  notifications: notificationsReducer,
  teams: teamsReducer,
  companyAssets: companyAssetsReducer,
  subscription: subscriptionReducer,
  observations: observationsReducer,
  company: companyReducer,
  userInvitations: userInvitationsReducer,
});

const REHYDRATE = 'persist/REHYDRATE';

export type RootState = ReturnType<typeof rootReducer>;

const SLICES_WITH_PENDING_EDITS = new Set(['tasks', 'feed', 'dashboard']);

function clearLoadingFlags(slice: unknown): unknown {
  if (!slice || typeof slice !== 'object' || Array.isArray(slice)) return slice;
  const next = { ...(slice as Record<string, unknown>) };
  if ('isLoading' in next) next.isLoading = false;
  if ('currentTaskLoading' in next) next.currentTaskLoading = false;
  if ('isActionLoading' in next) next.isActionLoading = false;
  if ('activeFetchRequestId' in next) next.activeFetchRequestId = null;
  return next;
}

function normalizeRehydratedSlice(key: string, slice: unknown): unknown {
  const next = clearLoadingFlags(slice);
  if (!SLICES_WITH_PENDING_EDITS.has(key)) return next;
  if (!next || typeof next !== 'object' || Array.isArray(next)) return next;
  const record = { ...(next as Record<string, unknown>) };
  const pending = record.pendingReferenceEdits;
  record.pendingReferenceEdits =
    pending && typeof pending === 'object' && !Array.isArray(pending) ? pending : {};
  return record;
}

function withRehydrate(
  reducer: ReturnType<typeof combineReducers>
): (state: RootState | undefined, action: { type: string; payload?: Partial<RootState> }) => RootState {
  return (state, action) => {
    if (action.type === REHYDRATE && action.payload) {
      const cleaned: Partial<RootState> = {};
      for (const [key, value] of Object.entries(action.payload)) {
        (cleaned as Record<string, unknown>)[key] = normalizeRehydratedSlice(key, value);
      }
      return { ...(state ?? {}), ...cleaned } as RootState;
    }
    return reducer(state, action) as RootState;
  };
}

export const store = configureStore({
  reducer: withRehydrate(rootReducer) as typeof rootReducer,
});

subscribePersist(store);

/** Load persisted state and dispatch REHYDRATE. Call before rendering app. */
export async function rehydrate(): Promise<void> {
  const stored = await getStoredState();
  if (stored && Object.keys(stored).length > 0) {
    store.dispatch({ type: REHYDRATE, payload: stored });
  }
}

export type AppDispatch = typeof store.dispatch;
