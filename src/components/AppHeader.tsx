import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  Modal,
  ScrollView,
  TouchableWithoutFeedback,
  ActivityIndicator,
  Linking,
} from 'react-native';
import { theme } from '../theme';
import { useDrawer } from '../context/DrawerContext';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppDispatch, RootState } from '../store';
import {
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from '../store/notificationsSlice';
import type { NotificationDTO } from '../types/notification';
import { useTranslation } from 'react-i18next';
import {
  findFirstUrlRangeInMessage,
  findLinkRangeInMessage,
  notificationActionLabel,
  stripEmbeddedUrlsFromDisplay,
} from '../utils/notificationDisplay';
import { formatLocaleDateTime } from '../utils/formatLocaleDateTime';

type AppHeaderProps = {
  title?: string;
  showMenu?: boolean;
  userDisplayName?: string;
};

export function AppHeader({ title, showMenu = true }: AppHeaderProps) {
  const { t, i18n } = useTranslation();
  const displayTitle = title ?? t('appName');
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const { openDrawer } = useDrawer();
  const { items, isLoading } = useSelector((s: RootState) => s.notifications);
  const [actionsVisible, setActionsVisible] = useState(false);
  const [notificationsPreviewVisible, setNotificationsPreviewVisible] = useState(false);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);
  const previewItems = useMemo(() => {
    const unread = items.filter((item) => !item.isRead);
    if (unread.length > 0) return unread.slice(0, 4);
    return items.slice(0, 4);
  }, [items]);

  const closeActions = () => setActionsVisible(false);

  const openNotificationsPreview = () => {
    closeActions();
    setNotificationsPreviewVisible(true);
    dispatch(fetchNotifications()).then(() => {
      dispatch(markAllNotificationsRead());
    });
  };

  const closeNotificationsPreview = () => setNotificationsPreviewVisible(false);

  const openNotificationsScreen = () => {
    closeNotificationsPreview();
    (navigation.navigate as (name: string) => void)('Notifications');
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

  const onPressPreviewItem = (notification: NotificationDTO) => {
    if (!notification.isRead) {
      dispatch(markNotificationRead(notification.id));
    }
    onOpenFromNotification(notification);
  };

  const onPressPreviewLink = (notification: NotificationDTO) => {
    if (!notification.isRead) {
      dispatch(markNotificationRead(notification.id));
    }
    onOpenFromNotification(notification);
  };

  return (
    <>
      <View style={styles.container}>
        {showMenu ? (
          <TouchableOpacity
            style={styles.iconBtn}
            onPress={openDrawer}
            hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          >
            <MaterialIcons name="menu" size={22} color={theme.colors.primary} />
          </TouchableOpacity>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}

        <Text style={styles.logo} numberOfLines={1}>
          {displayTitle}
        </Text>

        <TouchableOpacity style={styles.iconBtn} onPress={() => setActionsVisible(true)}>
          <MaterialIcons name="more-vert" size={22} color="#7d8699" />
        </TouchableOpacity>
      </View>

      <Modal visible={actionsVisible} transparent animationType="fade" onRequestClose={closeActions}>
        <TouchableWithoutFeedback onPress={closeActions}>
          <View style={styles.actionsBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.actionsCard}>
                <TouchableOpacity
                  style={styles.notificationsMenuItem}
                  onPress={openNotificationsPreview}
                  activeOpacity={0.8}
                >
                  <View style={styles.notificationsIconWrap}>
                    <MaterialIcons name="notifications-none" size={22} color="#2b2f38" />
                    <View
                      style={[
                        styles.notificationStatusDot,
                        unreadCount > 0 ? styles.notificationStatusDotUnread : styles.notificationStatusDotRead,
                      ]}
                    />
                  </View>
                  <Text style={styles.notificationsMenuText}>{t('header.notifications')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal
        visible={notificationsPreviewVisible}
        transparent
        animationType="fade"
        onRequestClose={closeNotificationsPreview}
      >
        <TouchableWithoutFeedback onPress={closeNotificationsPreview}>
          <View style={styles.previewBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.previewCard}>
                <View style={styles.previewHeader}>
                  <View style={styles.previewHeaderTexts}>
                    <Text style={styles.previewTitle}>{t('header.notificationsPreview')}</Text>
                    <Text style={styles.previewSubtitle}>
                      {t('header.unreadCount', { count: unreadCount })}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[styles.markReadButton, unreadCount === 0 && styles.markReadButtonDisabled]}
                    onPress={onMarkAllRead}
                    disabled={unreadCount === 0}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.markReadButtonText}>{t('header.markAllReadShort')}</Text>
                  </TouchableOpacity>
                </View>

                {isLoading && items.length === 0 ? (
                  <View style={styles.previewLoader}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : previewItems.length === 0 ? (
                  <View style={styles.previewEmpty}>
                    <Text style={styles.previewEmptyText}>{t('header.noNotificationsShort')}</Text>
                  </View>
                ) : (
                  <ScrollView style={styles.previewList} nestedScrollEnabled>
                    {previewItems.map((notification) => {
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
                          style={[styles.previewItem, !notification.isRead && styles.previewItemUnread]}
                          onPress={() => onPressPreviewItem(notification)}
                          activeOpacity={0.85}
                        >
                          <View style={styles.previewItemIconWrap}>
                            <MaterialIcons name="mail-outline" size={22} color="#2f3b57" />
                          </View>
                          <View style={styles.previewItemBody}>
                            {hasInlineLink && inlineRange ? (
                              <Text style={styles.previewItemMessage}>
                                {notification.message.slice(0, inlineRange.start)}
                                <Text
                                  style={styles.previewItemLinkInline}
                                  onPress={() => {
                                    onPressPreviewLink(notification);
                                  }}
                                >
                                  {actionLabel}
                                </Text>
                                {notification.message.slice(inlineRange.end)}
                              </Text>
                            ) : (
                              <Text style={styles.previewItemMessage}>
                                {fallbackMessage.trim() || t('app.notificationsScreen.openActionHint')}
                              </Text>
                            )}
                            {hasLink && !hasInlineLink ? (
                              <Text
                                style={styles.previewItemLink}
                                onPress={() => {
                                  onPressPreviewLink(notification);
                                }}
                              >
                                {actionLabel}
                              </Text>
                            ) : null}
                            <Text style={styles.previewItemDate}>{formatDate(notification.createdOnUtc)}</Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </ScrollView>
                )}

                <TouchableOpacity style={styles.viewAllButton} onPress={openNotificationsScreen}>
                  <Text style={styles.viewAllButtonText}>{t('header.viewAllShort')}</Text>
                </TouchableOpacity>
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: theme.spacing.headerHeight,
    paddingHorizontal: 12,
    backgroundColor: theme.colors.headerBg,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
    ...Platform.select({
      ios: { paddingTop: 8 },
      android: { paddingTop: 4 },
    }),
  },
  logo: {
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.headerText,
  },
  iconBtn: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconPlaceholder: {
    width: 40,
    height: 40,
  },
  actionsBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'flex-end',
    paddingTop: theme.spacing.headerHeight + 8,
    paddingRight: 10,
  },
  actionsCard: {
    width: 180,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8deec',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  notificationsMenuItem: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
  },
  notificationsIconWrap: {
    width: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationsMenuText: {
    fontSize: 14,
    color: '#283046',
    fontWeight: '500',
  },
  notificationStatusDot: {
    position: 'absolute',
    top: -3,
    left: -2,
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#ffffff',
  },
  notificationStatusDotUnread: {
    backgroundColor: '#e84c63',
  },
  notificationStatusDotRead: {
    backgroundColor: '#34b157',
  },
  previewBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.18)',
    alignItems: 'center',
    justifyContent: 'flex-start',
    paddingTop: theme.spacing.headerHeight + 6,
    paddingHorizontal: 6,
  },
  previewCard: {
    width: '100%',
    maxWidth: 520,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8deec',
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  previewHeader: {
    backgroundColor: '#243aa8',
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 14,
    gap: 10,
  },
  previewHeaderTexts: {
    flex: 1,
  },
  previewTitle: {
    color: '#ffffff',
    fontSize: 25,
    fontWeight: '700',
  },
  previewSubtitle: {
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
    marginTop: 6,
  },
  markReadButtonDisabled: {
    opacity: 0.6,
  },
  markReadButtonText: {
    color: '#232323',
    fontSize: 13,
    fontWeight: '600',
  },
  previewLoader: {
    paddingVertical: 24,
    alignItems: 'center',
  },
  previewEmpty: {
    paddingVertical: 22,
    alignItems: 'center',
  },
  previewEmptyText: {
    color: '#5f6678',
    fontSize: 14,
  },
  previewList: {
    maxHeight: 380,
  },
  previewItem: {
    minHeight: 86,
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d8dbe2',
    backgroundColor: '#ffffff',
    paddingHorizontal: 10,
    paddingVertical: 10,
    gap: 10,
  },
  previewItemUnread: {
    backgroundColor: '#d6dbe8',
  },
  previewItemIconWrap: {
    width: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  previewItemBody: {
    flex: 1,
  },
  previewItemMessage: {
    color: '#212633',
    fontSize: 14,
    lineHeight: 22,
  },
  previewItemLinkInline: {
    color: '#243aa8',
    fontSize: 14,
    fontWeight: '500',
    textDecorationLine: 'underline',
  },
  previewItemLink: {
    marginTop: 2,
    color: '#243aa8',
    fontSize: 14,
    fontWeight: '500',
  },
  previewItemDate: {
    marginTop: 4,
    color: '#536280',
    fontSize: 13,
  },
  viewAllButton: {
    minHeight: 42,
    borderTopWidth: 1,
    borderTopColor: '#d8dbe2',
    backgroundColor: '#f4f4f8',
    alignItems: 'center',
    justifyContent: 'center',
  },
  viewAllButtonText: {
    color: '#1f2430',
    fontSize: 17,
    fontWeight: '600',
  },
});
