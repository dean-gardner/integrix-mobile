/**
 * Redux-persist config: persist list data and auth user for offline.
 * When app opens with internet, we refetch and overwrite.
 */
import AsyncStorage from '@react-native-async-storage/async-storage';

export const persistConfig = {
  key: 'root',
  storage: AsyncStorage,
  whitelist: [
    'auth',
    'feed',
    'tasks',
    'documents',
    'users',
    'defects',
    'dashboard',
  ],
  // Don't persist loading/error flags so we start clean
  version: 1,
};
