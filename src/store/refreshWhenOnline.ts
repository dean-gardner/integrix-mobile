/**
 * Prefetch all app data on mount and when returning to foreground.
 * Offline: persisted Redux state is shown immediately via customPersist.
 * Online: all slices are refreshed in parallel, user-dependent data after loadUser resolves.
 */
import { store } from './index';
import { loadUser } from './authSlice';
import { fetchFeedItems } from './feedSlice';
import { fetchTasks } from './tasksSlice';
import { fetchDocuments } from './documentsSlice';
import { fetchUsers } from './usersSlice';
import { fetchDefects } from './defectsSlice';
import { fetchDashboardStats } from './dashboardSlice';
import { fetchNotifications } from './notificationsSlice';
import { fetchTeams } from './teamsSlice';
import { fetchCompanyAssets } from './companyAssetsSlice';
import { fetchUserSubscription } from './subscriptionSlice';
import { fetchObservations } from './observationsSlice';
import { fetchUserCompany } from './companySlice';
import { fetchUserInvitations } from './userInvitationsSlice';
import { CompanyAssetStatus } from '../types/companyAsset';
import NetInfo from '@react-native-community/netinfo';
import { AppState, AppStateStatus } from 'react-native';
import type { UserDTO } from '../types/UserDTO';

async function refreshAllData() {
  // 1. Refresh user session first — needed for user-dependent fetches below.
  const userAction = await store.dispatch(loadUser());
  const user: UserDTO | null =
    (userAction as { payload?: UserDTO | null }).payload ?? store.getState().auth.user;

  // 2. Fetch all user-independent data in parallel.
  void store.dispatch(fetchFeedItems());
  void store.dispatch(fetchTasks());
  void store.dispatch(fetchDocuments());
  void store.dispatch(fetchUsers());
  void store.dispatch(fetchDefects());
  void store.dispatch(fetchObservations());
  void store.dispatch(fetchNotifications());
  void store.dispatch(fetchUserCompany());
  void store.dispatch(fetchDashboardStats(undefined));
  void store.dispatch(fetchUserInvitations());

  // 3. Fetch user-dependent data (requires companyId / userId).
  if (user?.companyId) {
    void store.dispatch(fetchTeams(user.companyId));
    void store.dispatch(
      fetchCompanyAssets({
        companyId: user.companyId,
        parentAssetId: null,
        status: CompanyAssetStatus.Active,
      })
    );
  }
  if (user?.id) {
    void store.dispatch(fetchUserSubscription(user.id));
  }
}

let isRefreshing = false;

async function tryRefreshWhenOnline() {
  if (isRefreshing) return;
  const netState = await NetInfo.fetch();
  if (!netState.isConnected) return;
  isRefreshing = true;
  try {
    await refreshAllData();
  } finally {
    isRefreshing = false;
  }
}

/**
 * Call once from App on mount.
 * Refreshes immediately if online, and again each time the app returns to foreground.
 */
export function setupRefreshWhenOnline() {
  void tryRefreshWhenOnline();

  const sub = AppState.addEventListener('change', (nextState: AppStateStatus) => {
    if (nextState === 'active') {
      void tryRefreshWhenOnline();
    }
  });

  return () => {
    sub.remove();
  };
}
