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
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import type { NotificationDTO } from '../types/notification';
import {
  findFirstUrlRangeInMessage,
  findLinkRangeInMessage,
  notificationActionLabel,
  stripEmbeddedUrlsFromDisplay,
} from '../utils/notificationDisplay';
import { formatLocaleDateTime } from '../utils/formatLocaleDateTime';

export default function NotificationsScreen() {
  const { t, i18n } = useTranslation();
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

  const formatDate = (dateUtc?: string): string =>
    formatLocaleDateTime(dateUtc, i18n.language, 'notifications');

  const openNotificationLink = async (notification: NotificationDTO) => {
    if (!notification.link) return;

    const rawLink = notification.link.trim();
    if (!rawLink) return;

    if (/^https?:\/\//i.test(rawLink)) {
      try {
        await Linking.openURL(rawLink);
        return;
      } catch {
        // Try HTTPS when backend sends HTTP URL.
        if (rawLink.startsWith('http://')) {
          const httpsLink = `https://${rawLink.slice('http://'.length)}`;
          try {
            await Linking.openURL(httpsLink);
            return;
          } catch {
            // fall through to route-keyword fallback below
          }
        }
      }
    }

    const lower = rawLink.toLowerCase();
    let pathLower = '';
    try {
      if (/^https?:\/\//i.test(rawLink)) {
        const parsed = new URL(rawLink);
        pathLower = `${parsed.pathname}${parsed.search}`.toLowerCase();
      }
    } catch {
      // ignore parse error and fallback to raw string matching
    }

    const target = `${lower} ${pathLower}`;
    if (target.includes('subscription')) {
      (navigation.navigate as (name: string) => void)('Subscription');
    } else if (target.includes('task')) {
      (navigation.navigate as (name: string) => void)('Tasks');
    } else if (target.includes('document')) {
      (navigation.navigate as (name: string) => void)('Documents');
    }
  };

  const onOpenFromNotification = (notification: NotificationDTO) => {
    if (notification.link?.trim()) {
      openNotificationLink(notification).catch(() => {});
    }
  };

  const onPressNotification = (notification: NotificationDTO) => {
    if (!notification.isRead) {
      dispatch(markNotificationRead(notification.id));
    }
    onOpenFromNotification(notification);
  };

  const onPressLinkText = (notification: NotificationDTO) => {
    if (!notification.isRead) {
      dispatch(markNotificationRead(notification.id));
    }
    onOpenFromNotification(notification);
  };

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.content}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <Text style={styles.pageTitle}>{t('app.notifications.title')}</Text>

      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <View style={styles.panelHeaderTexts}>
            <Text style={styles.panelHeaderTitle}>{t('app.notifications.title')}</Text>
            <Text style={styles.panelHeaderSubtitle}>
              {t('app.notificationsScreen.unreadCount', { count: unreadCount })}
            </Text>
          </View>
          <TouchableOpacity
            style={[styles.markReadButton, unreadCount === 0 && styles.markReadButtonDisabled]}
            onPress={onMarkAllRead}
            disabled={unreadCount === 0}
          >
            <Text style={styles.markReadButtonText}>{t('app.notificationsScreen.markAllReadBtn')}</Text>
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
            <Text style={styles.emptyText}>{t('app.notificationsScreen.emptyList')}</Text>
          </View>
        ) : (
          <View>
            {items.map((notification) => {
              const link = notification.link?.trim();
              const hasLink = Boolean(link);
              const actionLabel = hasLink ? notificationActionLabel(notification.linkText, t) : '';
              const inlineRange = hasLink
                ? findLinkRangeInMessage(notification.message, link) ??
                  findFirstUrlRangeInMessage(notification.message)
                : null;
              const hasInlineLink = Boolean(hasLink && inlineRange);
              const fallbackMessage = hasLink
                ? stripEmbeddedUrlsFromDisplay(notification.message)
                : notification.message;

              return (
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
                    {hasInlineLink && inlineRange ? (
                      <Text style={styles.itemMessage}>
                        {notification.message.slice(0, inlineRange.start)}
                        <Text
                          style={styles.itemLinkInline}
                          onPress={() => {
                            onPressLinkText(notification);
                          }}
                        >
                          {actionLabel}
                        </Text>
                        {notification.message.slice(inlineRange.end)}
                      </Text>
                    ) : (
                      <Text style={styles.itemMessage}>{fallbackMessage}</Text>
                    )}
                    {hasLink && !hasInlineLink ? (
                      <Text
                        style={styles.itemLinkInline}
                        onPress={() => {
                          onPressLinkText(notification);
                        }}
                      >
                        {actionLabel}
                      </Text>
                    ) : null}
                    <Text style={styles.itemDate}>{formatDate(notification.createdOnUtc)}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
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
  itemLinkInline: {
    color: '#243aa8',
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },
  itemDate: {
    marginTop: 4,
    color: '#536280',
    fontSize: 13,
  },
});
