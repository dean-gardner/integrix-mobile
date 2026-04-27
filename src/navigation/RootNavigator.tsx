import React from 'react';
import {
  createNativeStackNavigator,
  type NativeStackHeaderProps,
  type NativeStackNavigationOptions,
} from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import {
  View,
  ActivityIndicator,
  StyleSheet,
  TouchableWithoutFeedback,
  Platform,
  I18nManager,
} from 'react-native';
import { AppHeader } from '../components/AppHeader';
import { DrawerContent } from '../components/DrawerContent';
import { DrawerProvider, useDrawer } from '../context/DrawerContext';

import SignInScreen from '../screens/SignInScreen';
import SignUpScreen from '../screens/SignUpScreen';
import AcceptInvitationScreen from '../screens/AcceptInvitationScreen';
import FeedScreen from '../screens/FeedScreen';
import DashboardScreen from '../screens/DashboardScreen';
import DocumentsScreen from '../screens/DocumentsScreen';
import TasksScreen from '../screens/TasksScreen';
import TaskDetailScreen from '../screens/TaskDetailScreen';
import DefectsScreen from '../screens/DefectsScreen';
import DefectDetailScreen from '../screens/DefectDetailScreen';
import DocumentDetailScreen from '../screens/DocumentDetailScreen';
import DocumentCreateScreen from '../screens/DocumentCreateScreen';
import UsersScreen from '../screens/UsersScreen';
import UserSearchScreen from '../screens/UserSearchScreen';
import TeamsScreen from '../screens/TeamsScreen';
import CompanyAssetsScreen from '../screens/CompanyAssetsScreen';
import EditProfileScreen from '../screens/EditProfileScreen';
import SubscriptionScreen from '../screens/SubscriptionScreen';
import NotificationsScreen from '../screens/NotificationsScreen';
import ObservationsScreen from '../screens/ObservationsScreen';
import ChangePasswordScreen from '../screens/ChangePasswordScreen';
import ForgotPasswordScreen from '../screens/ForgotPasswordScreen';
import ResetPasswordScreen from '../screens/ResetPasswordScreen';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import { RTL_LANGUAGES } from '../i18n';

const Stack = createNativeStackNavigator();
const DRAWER_WIDTH = 240;

function getHeaderTitle(routeName: string, t: TFunction): string {
  const keys: Record<string, string> = {
    Feed: 'nav.feed',
    Dashboard: 'nav.dashboard',
    Documents: 'nav.documents',
    DocumentDetail: 'nav.documentDetail',
    DocumentCreate: 'nav.documents',
    Tasks: 'nav.tasks',
    TaskDetail: 'nav.taskDetail',
    Defects: 'nav.defects',
    DefectDetail: 'nav.defectDetail',
    Observations: 'nav.observations',
    Users: 'nav.users',
    UserSearch: 'nav.userSearch',
    Teams: 'nav.teams',
    CompanyAssets: 'nav.companyAssets',
    EditProfile: 'nav.editProfile',
    Subscription: 'nav.subscription',
    Notifications: 'nav.notifications',
    ChangePassword: 'nav.changePassword',
  };
  const key = keys[routeName];
  return key ? t(key) : t('appName');
}

function MainStack() {
  const { t, i18n } = useTranslation();
  const user = useSelector((s: RootState) => s.auth.user);
  const displayName = user?.firstName || user?.fullName || user?.userName || '';
  const { isOpen, closeDrawer } = useDrawer();
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en').toLowerCase();
  const wantsRightSide = RTL_LANGUAGES.some(
    (code) => currentLanguage === code || currentLanguage.startsWith(`${code}-`)
  );
  const isRtlLanguage = wantsRightSide;
  const swapsLeftRight = Boolean(I18nManager.isRTL && I18nManager.doLeftAndRightSwapInRTL);
  const useRightProp = wantsRightSide !== swapsLeftRight;
  const panelSideStyle = useRightProp ? styles.drawerPanelRight : styles.drawerPanelLeft;
  const renderHeader = React.useCallback(
    ({ route }: NativeStackHeaderProps) => (
      <AppHeader
        title={getHeaderTitle(route.name, t)}
        userDisplayName={displayName}
      />
    ),
    [displayName, t]
  );
  const profileTransitionOptions = React.useMemo<NativeStackNavigationOptions>(
    () => ({
      fullScreenGestureEnabled: Platform.OS === 'ios' && !isRtlLanguage,
      animation: Platform.OS === 'ios' && isRtlLanguage ? 'none' : 'default',
    }),
    [isRtlLanguage]
  );

  return (
    <>
      <Stack.Navigator
        initialRouteName="Feed"
        screenOptions={{
          gestureEnabled: Platform.OS === 'ios',
          fullScreenGestureEnabled: Platform.OS === 'ios',
          header: renderHeader,
        }}
      >
        <Stack.Screen name="Feed" component={FeedScreen} />
        <Stack.Screen name="Dashboard" component={DashboardScreen} />
        <Stack.Screen name="Documents" component={DocumentsScreen} />
        <Stack.Screen name="DocumentCreate" component={DocumentCreateScreen} />
        <Stack.Screen name="DocumentDetail" component={DocumentDetailScreen} />
        <Stack.Screen name="Tasks" component={TasksScreen} />
        <Stack.Screen name="TaskDetail" component={TaskDetailScreen} />
        <Stack.Screen name="Defects" component={DefectsScreen} />
        <Stack.Screen name="DefectDetail" component={DefectDetailScreen} />
        <Stack.Screen name="Observations" component={ObservationsScreen} />
        <Stack.Screen name="Users" component={UsersScreen} />
        <Stack.Screen name="UserSearch" component={UserSearchScreen} />
        <Stack.Screen name="Teams" component={TeamsScreen} />
        <Stack.Screen name="CompanyAssets" component={CompanyAssetsScreen} />
        <Stack.Screen name="EditProfile" component={EditProfileScreen} options={profileTransitionOptions} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} options={profileTransitionOptions} />
      </Stack.Navigator>

      {isOpen ? (
        <View style={styles.drawerOverlay} pointerEvents="box-none">
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <View style={styles.drawerBackdropArea} />
          </TouchableWithoutFeedback>
          <View style={[styles.drawerPanel, panelSideStyle]}>
            <DrawerContent onClose={closeDrawer} />
          </View>
        </View>
      ) : null}
    </>
  );
}

function AuthStack() {
  return (
    <Stack.Navigator screenOptions={{ headerShown: false }}>
      <Stack.Screen name="SignIn" component={SignInScreen} />
      <Stack.Screen name="SignUp" component={SignUpScreen} />
      <Stack.Screen name="AcceptInvitation" component={AcceptInvitationScreen} />
      <Stack.Screen name="ForgotPassword" component={ForgotPasswordScreen} />
      <Stack.Screen name="ResetPassword" component={ResetPasswordScreen} />
    </Stack.Navigator>
  );
}

export default function RootNavigator() {
  const { user, isLoaded } = useSelector((s: RootState) => s.auth);

  if (!isLoaded) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#2136A1" />
      </View>
    );
  }

  if (!user) {
    return <AuthStack />;
  }

  return (
    <DrawerProvider>
      <MainStack />
    </DrawerProvider>
  );
}

const styles = StyleSheet.create({
  loading: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f2f5',
  },
  drawerOverlay: {
    ...StyleSheet.absoluteFillObject,
    zIndex: 1000,
    elevation: 1000,
  },
  drawerBackdropArea: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  drawerPanel: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: DRAWER_WIDTH,
  },
  drawerPanelLeft: {
    left: 0,
  },
  drawerPanelRight: {
    right: 0,
  },
});
