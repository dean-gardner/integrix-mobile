/**
 * Integrix React Native (CLI) - no Expo
 * @format
 * Offline: show latest persisted data. When app opens with internet, refresh all data.
 */

import React, { useEffect } from 'react';
import { StatusBar, KeyboardAvoidingView, Platform, View, ActivityIndicator, StyleSheet, Linking } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { SafeAreaProvider, SafeAreaView } from 'react-native-safe-area-context';
import { Provider } from 'react-redux';
import { store, rehydrate } from './src/store';
import { setUnauthorized } from './src/store/authSlice';
import { setOnUnauthorized } from './src/api/axios';
import { removeToken } from './src/storage/tokenStorage';
import { setupRefreshWhenOnline } from './src/store/refreshWhenOnline';
import { OfflineBanner } from './src/components/OfflineBanner';
import RootNavigator from './src/navigation/RootNavigator';
import { navigationRef, navigate } from './src/navigation/navigationRef';

function LoadingRehydrate() {
  return (
    <View style={styles.loading}>
      <ActivityIndicator size="large" color="#2136A1" />
    </View>
  );
}

type ParsedDeepLink =
  | { screen: 'ResetPassword'; params: { token: string; email: string } }
  | {
      screen: 'AcceptInvitation';
      params: {
        email?: string;
        companyTeamId?: number;
        companyName?: string;
        invitationId?: string;
      };
    };

function parseDeepLink(url: string): ParsedDeepLink | null {
  if (!url) return null;
  const q = url.indexOf('?');
  const params = new URLSearchParams(q >= 0 ? url.slice(q) : '');

  if (url.includes('reset-password')) {
    const token = params.get('token')?.trim();
    const email = params.get('email')?.trim();
    if (!token || !email) return null;
    return { screen: 'ResetPassword', params: { token, email } };
  }

  if (url.includes('accept-invitation')) {
    const email = params.get('email')?.trim() || undefined;
    const companyName = params.get('companyName')?.trim() || undefined;
    const invitationId = params.get('invitationId')?.trim() || undefined;
    const companyTeamIdRaw = params.get('companyTeamId')?.trim();
    const companyTeamId = companyTeamIdRaw ? Number(companyTeamIdRaw) : undefined;
    return {
      screen: 'AcceptInvitation',
      params: {
        email,
        companyName,
        invitationId,
        companyTeamId: Number.isFinite(companyTeamId as number) ? companyTeamId : undefined,
      },
    };
  }

  return null;
}

function handleDeepLink(url: string | null) {
  if (!url) return;
  const parsed = parseDeepLink(url);
  if (!parsed) return;
  const { user } = store.getState().auth;
  if (user) return;
  navigate(parsed.screen, parsed.params);
}

function AppContent() {
  useEffect(() => {
    const cleanup = setupRefreshWhenOnline();
    return cleanup;
  }, []);

  useEffect(() => {
    setOnUnauthorized(() => {
      store.dispatch(setUnauthorized());
      void removeToken();
    });
  }, []);

  useEffect(() => {
    const tryInitial = (url: string | null) => {
      handleDeepLink(url);
      if (url && parseDeepLink(url) && !store.getState().auth.user) {
        setTimeout(() => handleDeepLink(url), 400);
      }
    };
    Linking.getInitialURL().then(tryInitial);
    const sub = Linking.addEventListener('url', ({ url }) => handleDeepLink(url));
    return () => sub.remove();
  }, []);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={0}
    >
      <SafeAreaView style={{ flex: 1 }} edges={['top', 'bottom', 'left', 'right']}>
        <OfflineBanner />
        <NavigationContainer ref={navigationRef}>
          <RootNavigator />
        </NavigationContainer>
        <StatusBar barStyle="dark-content" />
      </SafeAreaView>
    </KeyboardAvoidingView>
  );
}

function RehydrateGate({ children }: { children: React.ReactNode }) {
  const [ready, setReady] = React.useState(false);
  React.useEffect(() => {
    rehydrate().then(() => setReady(true));
  }, []);
  if (!ready) return <LoadingRehydrate />;
  return <>{children}</>;
}

export default function App() {
  return (
    <Provider store={store}>
      <RehydrateGate>
        <SafeAreaProvider>
          <AppContent />
        </SafeAreaProvider>
      </RehydrateGate>
    </Provider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
});
