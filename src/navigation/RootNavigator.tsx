import React, { useEffect, useRef, useState } from 'react';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { View, ActivityIndicator, StyleSheet, Modal, TouchableWithoutFeedback, Animated, Easing, Platform } from 'react-native';
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

const Stack = createNativeStackNavigator();
const DRAWER_WIDTH = 240;
const DRAWER_ANIMATION_DURATION = 220;

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
  const { t } = useTranslation();
  const user = useSelector((s: RootState) => s.auth.user);
  const displayName = user?.firstName || user?.fullName || user?.userName || '';
  const { isOpen, closeDrawer } = useDrawer();
  const [isModalVisible, setIsModalVisible] = useState(isOpen);
  const drawerTranslateX = useRef(new Animated.Value(isOpen ? 0 : -DRAWER_WIDTH)).current;
  const backdropOpacity = useRef(new Animated.Value(isOpen ? 1 : 0)).current;

  useEffect(() => {
    if (isOpen) {
      setIsModalVisible(true);
      Animated.parallel([
        Animated.timing(drawerTranslateX, {
          toValue: 0,
          duration: DRAWER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
        Animated.timing(backdropOpacity, {
          toValue: 1,
          duration: DRAWER_ANIMATION_DURATION,
          easing: Easing.out(Easing.cubic),
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    Animated.parallel([
      Animated.timing(drawerTranslateX, {
        toValue: -DRAWER_WIDTH,
        duration: DRAWER_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(backdropOpacity, {
        toValue: 0,
        duration: DRAWER_ANIMATION_DURATION,
        easing: Easing.in(Easing.cubic),
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) {
        setIsModalVisible(false);
      }
    });
  }, [isOpen, drawerTranslateX, backdropOpacity]);

  return (
    <>
      <Stack.Navigator
        initialRouteName="Feed"
        screenOptions={{
          gestureEnabled: Platform.OS === 'ios',
          fullScreenGestureEnabled: Platform.OS === 'ios',
          header: ({ route }) => (
            <AppHeader
              title={getHeaderTitle(route.name, t)}
              userDisplayName={displayName}
            />
          ),
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
        <Stack.Screen name="EditProfile" component={EditProfileScreen} />
        <Stack.Screen name="Subscription" component={SubscriptionScreen} />
        <Stack.Screen name="Notifications" component={NotificationsScreen} />
        <Stack.Screen name="ChangePassword" component={ChangePasswordScreen} />
      </Stack.Navigator>

      <Modal
        visible={isModalVisible}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={styles.drawerBackdrop}>
          <Animated.View
            style={[
              styles.drawerPanel,
              {
                transform: [{ translateX: drawerTranslateX }],
              },
            ]}
          >
            <DrawerContent onClose={closeDrawer} />
          </Animated.View>
          <TouchableWithoutFeedback onPress={closeDrawer}>
            <Animated.View
              style={[
                styles.drawerBackdropArea,
                {
                  opacity: backdropOpacity,
                },
              ]}
            />
          </TouchableWithoutFeedback>
        </View>
      </Modal>
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
  drawerBackdrop: {
    flex: 1,
    flexDirection: 'row',
  },
  drawerBackdropArea: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
  },
  drawerPanel: {
    width: DRAWER_WIDTH,
  },
});
