import React, { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  RefreshControl,
  TouchableOpacity,
  Linking,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { AppDispatch, RootState } from '../store';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../store/notificationsSlice';
import { theme } from '../theme';
import type { NotificationDTO } from '../types/notification';

export default function NotificationsScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { items, isLoading, error } = useSelector((s: RootState) => s.notifications);
  const [refreshing, setRefreshing] = React.useState(false);
  const unreadCount = items.filter((notification) => !notification.isRead).length;

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const onRefresh = async () => {
    setRefreshing(true);
    await dispatch(fetchNotifications()).unwrap().catch(() => {});
    setRefreshing(false);
  };

  const onMarkAllRead = () => {
    dispatch(markAllNotificationsRead());
  };

  const formatDate = (dateUtc?: string): string => {
    if (!dateUtc) return '';
    return new Date(dateUtc).toLocaleString(undefined, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openNotificationLink = async (notification: NotificationDTO) => {
    if (!notification.link) return;

    const rawLink = notification.link.trim();
    if (!rawLink) return;

    if (/^https?:\/\//i.test(rawLink)) {
      const canOpen = await Linking.canOpenURL(rawLink);
      if (canOpen) {
        await Linking.openURL(rawLink);
      }
      return;
    }

    const lower = rawLink.toLowerCase();
    if (lower.includes('subscription')) {
      (navigation.navigate as (name: string) => void)('Subscription');
    } else if (lower.includes('task')) {
      (navigation.navigate as (name: string) => void)('Tasks');
    } else if (lower.includes('document')) {
      (navigation.navigate as (name: string) => void)('Documents');
    }
  };

  const onPressNotification = (notification: NotificationDTO) => {
    if (!notification.isRead) {
      dispatch(markNotificationRead(notification.id));
    }
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.pageTitle}>Notifications</Text>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.panelHeaderTexts}>
            <Text style={styles.panelHeaderTitle}>Notifications</Text>
            <Text style={styles.panelHeaderSubtitle}>
              You have {unreadCount} unread notifications
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.markReadButton, unreadCount === 0 && styles.markReadButtonDisabled]}
            onPress={onMarkAllRead}
            disabled={unreadCount === 0}
          >
            <Text style={styles.markReadButtonText}>Mark All Read</Text>
          </TouchableOpacity>
        </View>

        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}

        {isLoading && items.length === 0 ? (
          <View style={styles.loader}>
            <ActivityIndicator size="small" color={theme.colors.primary} />
          </View>
        ) : items.length === 0 ? (
          <View style={styles.emptyWrap}>
            <Text style={styles.emptyText}>No notifications.</Text>
          </View>
        ) : (
          <View>
            {items.map((notification) => (
              <TouchableOpacity
                key={notification.id}
                style={[styles.itemRow, !notification.isRead && styles.itemRowUnread]}
                onPress={() => onPressNotification(notification)}
                activeOpacity={0.85}
              >
                <View style={styles.itemIconWrap}>
                  <MaterialIcons name="mail-outline" size={22} color="#2f3b57" />
                </View>
                <View style={styles.itemBody}>
                  <Text style={styles.itemMessage}>{notification.message}</Text>
                  {notification.link ? (
                    <TouchableOpacity
                      onPress={() => {
                        openNotificationLink(notification).catch(() => {});
                      }}
                    >
                      <Text style={styles.itemLink}>{notification.linkText || 'View'}</Text>
                    </TouchableOpacity>
                  ) : null}
                  <Text style={styles.itemDate}>{formatDate(notification.createdOnUtc)}</Text>
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 8,
    paddingTop: 10,
    paddingBottom: 20,
  },
  pageTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#1f2a40',
    marginBottom: 10,
  },
  panel: {
    borderWidth: 1,
    borderColor: '#d8deec',
    borderRadius: 8,
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  panelHeader: {
    backgroundColor: '#243aa8',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  panelHeaderTexts: {
    flex: 1,
  },
  panelHeaderTitle: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: '700',
  },
  panelHeaderSubtitle: {
    color: '#c7cff6',
    fontSize: 14,
    marginTop: 2,
  },
  markReadButton: {
    minHeight: 28,
    borderRadius: 14,
    backgroundColor: '#ffd024',
    paddingHorizontal: 14,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  markReadButtonDisabled: {
    opacity: 0.6,
  },
  markReadButtonText: {
    color: '#232323',
    fontSize: 13,
    fontWeight: '600',
  },
  errorBox: {
    margin: 10,
    borderRadius: 6,
    backgroundColor: '#fee',
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
  },
  loader: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyWrap: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  emptyText: {
    color: '#5f6678',
    fontSize: 14,
  },
  itemRow: {
    minHeight: 88,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d8dbe2',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  itemRowUnread: {
    backgroundColor: '#d6dbe8',
  },
  itemIconWrap: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  itemBody: {
    flex: 1,
  },
  itemMessage: {
    color: '#212633',
    fontSize: 14,
    lineHeight: 22,
  },
  itemLink: {
    marginTop: 2,
    color: '#243aa8',
    fontSize: 14,
    fontWeight: '500',
  },
  itemDate: {
    marginTop: 4,
    color: '#536280',
    fontSize: 13,
  },
});
