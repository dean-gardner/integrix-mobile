import React, { useEffect, useMemo, useState } from 'react';
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
import { signOut } from '../store/authSlice';
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
  translateNotificationMessage,
} from '../utils/notificationDisplay';
import { formatLocaleDateTime } from '../utils/formatLocaleDateTime';
import { setAppLanguage, SUPPORTED_LANGUAGES } from '../i18n';

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
  const user = useSelector((s: RootState) => s.auth.user);
  const { items, isLoading } = useSelector((s: RootState) => s.notifications);
  const [languageVisible, setLanguageVisible] = useState(false);
  const [notificationsPreviewVisible, setNotificationsPreviewVisible] = useState(false);
  const [profileVisible, setProfileVisible] = useState(false);

  const unreadCount = useMemo(() => items.filter((item) => !item.isRead).length, [items]);
  const previewItems = useMemo(() => {
    const unread = items.filter((item) => !item.isRead);
    if (unread.length > 0) return unread.slice(0, 4);
    return items.slice(0, 4);
  }, [items]);
  const currentLanguage = (i18n.resolvedLanguage ?? i18n.language ?? 'en').split('-')[0];
  const currentLanguageOption =
    SUPPORTED_LANGUAGES.find((language) => language.code === currentLanguage) ?? SUPPORTED_LANGUAGES[0];
  const languageLabels: Record<(typeof SUPPORTED_LANGUAGES)[number]['code'], string> = {
    en: t('language.english'),
    es: t('language.spanish'),
    ar: t('language.arabic'),
    ur: t('language.urdu'),
  };
  const languageFlags: Record<(typeof SUPPORTED_LANGUAGES)[number]['code'], string> = {
    en: '🇨🇦',
    es: '🇪🇸',
    ar: '🇶🇦',
    ur: '🇵🇰',
  };
  const userName = user?.fullName || `${user?.firstName ?? ''} ${user?.lastName ?? ''}`.trim() || user?.userName || user?.email || '';
  const userInitials = (user?.firstName?.[0] ?? user?.fullName?.[0] ?? user?.email?.[0] ?? 'U').toUpperCase();

  useEffect(() => {
    dispatch(fetchNotifications());
  }, [dispatch]);

  const closeHeaderPopovers = () => {
    setLanguageVisible(false);
    setNotificationsPreviewVisible(false);
    setProfileVisible(false);
  };

  const openNotificationsPreview = () => {
    setLanguageVisible(false);
    setProfileVisible(false);
    setNotificationsPreviewVisible(true);
    dispatch(fetchNotifications());
  };

  const closeNotificationsPreview = () => setNotificationsPreviewVisible(false);

  const openNotificationsScreen = () => {
    closeNotificationsPreview();
    (navigation.navigate as (name: string) => void)('Notifications');
  };

  const onMarkAllRead = () => {
    dispatch(markAllNotificationsRead());
  };

  const openHelp = () => {
    closeHeaderPopovers();
    Linking.openURL('https://www.integri-x.com/').catch(() => {});
  };

  const openLanguageMenu = () => {
    setNotificationsPreviewVisible(false);
    setProfileVisible(false);
    setLanguageVisible(true);
  };

  const openProfileMenu = () => {
    setLanguageVisible(false);
    setNotificationsPreviewVisible(false);
    setProfileVisible(true);
  };

  const navigateFromProfile = (screen: string) => {
    setProfileVisible(false);
    (navigation.navigate as (name: string) => void)(screen);
  };

  const handleSignOut = () => {
    setProfileVisible(false);
    dispatch(signOut());
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

        <View style={styles.headerActions}>
          <TouchableOpacity style={styles.headerActionButton} onPress={openHelp} activeOpacity={0.8}>
            <MaterialIcons name="help" size={22} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.headerActionButton} onPress={openNotificationsPreview} activeOpacity={0.8}>
            <MaterialIcons name="notifications" size={22} color="#111827" />
            {unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount > 99 ? '99+' : unreadCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>

          <TouchableOpacity style={styles.languageButton} onPress={openLanguageMenu} activeOpacity={0.8}>
            <Text style={styles.languageFlag}>{languageFlags[currentLanguageOption.code]}</Text>
            <Text style={styles.languageCode}>{currentLanguageOption.code.toUpperCase()}</Text>
            <MaterialIcons name="arrow-drop-down" size={18} color="#111827" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.profileButton} onPress={openProfileMenu} activeOpacity={0.8}>
            <Text style={styles.profileInitials}>{userInitials}</Text>
          </TouchableOpacity>
        </View>
      </View>

      <Modal visible={languageVisible} transparent animationType="fade" onRequestClose={() => setLanguageVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setLanguageVisible(false)}>
          <View style={styles.dropdownBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.languageCard}>
                <Text style={styles.dropdownTitle}>{t('language.title')}</Text>
                {SUPPORTED_LANGUAGES.map(({ code, nativeLabel }) => {
                  const active = code === currentLanguageOption.code;
                  return (
                    <TouchableOpacity
                      key={code}
                      style={[styles.dropdownRow, active && styles.dropdownRowActive]}
                      onPress={() => {
                        setLanguageVisible(false);
                        setAppLanguage(code).catch(() => {});
                      }}
                      activeOpacity={0.8}
                    >
                      <Text style={styles.languageFlag}>{languageFlags[code]}</Text>
                      <Text style={[styles.dropdownRowText, active && styles.dropdownRowTextActive]}>
                        {languageLabels[code] ?? nativeLabel}
                      </Text>
                      {active ? <MaterialIcons name="check" size={18} color={theme.colors.primary} /> : null}
                    </TouchableOpacity>
                  );
                })}
              </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

      <Modal visible={profileVisible} transparent animationType="fade" onRequestClose={() => setProfileVisible(false)}>
        <TouchableWithoutFeedback onPress={() => setProfileVisible(false)}>
          <View style={styles.dropdownBackdrop}>
            <TouchableWithoutFeedback onPress={() => {}}>
              <View style={styles.profileCard}>
                <View style={styles.profileHeader}>
                  <View style={styles.profileAvatarLarge}>
                    <Text style={styles.profileAvatarLargeText}>{userInitials}</Text>
                  </View>
                  <View style={styles.profileHeaderTextWrap}>
                    <Text style={styles.profileName} numberOfLines={1}>
                      {userName || t('app.feed.unknownUser')}
                    </Text>
                    {user?.email ? (
                      <Text style={styles.profileEmail} numberOfLines={1}>{user.email}</Text>
                    ) : null}
                  </View>
                </View>

                <TouchableOpacity style={styles.dropdownRow} onPress={() => navigateFromProfile('EditProfile')}>
                  <MaterialIcons name="manage-accounts" size={20} color="#5b6e88" />
                  <Text style={styles.dropdownRowText}>{t('drawer.editProfile')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownRow} onPress={() => navigateFromProfile('ChangePassword')}>
                  <MaterialIcons name="lock-outline" size={20} color="#5b6e88" />
                  <Text style={styles.dropdownRowText}>{t('nav.changePassword')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.dropdownRow} onPress={() => navigateFromProfile('Subscription')}>
                  <MaterialIcons name="card-membership" size={20} color="#5b6e88" />
                  <Text style={styles.dropdownRowText}>{t('drawer.subscription')}</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.dropdownRow, styles.signOutRow]} onPress={handleSignOut}>
                  <MaterialIcons name="logout" size={20} color="#5b6e88" />
                  <Text style={styles.dropdownRowText}>{t('drawer.signOut')}</Text>
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
                      const displayMessage = translateNotificationMessage(notification.message, t);
                      const actionLabel = hasLink ? notificationActionLabel(notification.linkText, t) : '';
                      const inlineRange = hasLink && displayMessage === notification.message
                        ? findLinkRangeInMessage(notification.message, link) ??
                          findFirstUrlRangeInMessage(notification.message)
                        : null;
                      const hasInlineLink = Boolean(hasLink && inlineRange);
                      const fallbackMessage = hasLink
                        ? stripEmbeddedUrlsFromDisplay(displayMessage)
                        : displayMessage;

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
    flex: 1,
    fontSize: 20,
    fontWeight: '600',
    color: theme.colors.headerText,
    textAlign: 'center',
    marginHorizontal: 4,
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    gap: 4,
  },
  headerActionButton: {
    width: 32,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadBadge: {
    position: 'absolute',
    top: 5,
    right: 1,
    minWidth: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#e84c63',
    borderWidth: 1,
    borderColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  unreadBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: '700',
  },
  languageButton: {
    height: 34,
    minWidth: 66,
    borderRadius: 17,
    backgroundColor: '#f3f6ff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingLeft: 7,
    paddingRight: 3,
  },
  languageFlag: {
    fontSize: 15,
    marginRight: 4,
  },
  languageCode: {
    color: '#111827',
    fontSize: 12,
    fontWeight: '700',
  },
  profileButton: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: '#7487ff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileInitials: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700',
  },
  dropdownBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.12)',
    alignItems: 'flex-end',
    paddingTop: theme.spacing.headerHeight + 8,
    paddingRight: 8,
  },
  languageCard: {
    width: 210,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8deec',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  profileCard: {
    width: 250,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#d8deec',
    backgroundColor: '#fff',
    overflow: 'hidden',
  },
  dropdownTitle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    color: '#283046',
    fontSize: 13,
    fontWeight: '700',
    backgroundColor: '#f7f8fc',
    borderBottomWidth: 1,
    borderBottomColor: '#e4e8f3',
  },
  dropdownRow: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f7',
  },
  dropdownRowActive: {
    backgroundColor: theme.colors.primaryLight,
  },
  dropdownRowText: {
    flex: 1,
    color: '#283046',
    fontSize: 14,
    fontWeight: '500',
  },
  dropdownRowTextActive: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 14,
    backgroundColor: theme.colors.primary,
  },
  profileAvatarLarge: {
    width: 42,
    height: 42,
    borderRadius: 21,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  profileAvatarLargeText: {
    color: theme.colors.primary,
    fontWeight: '800',
    fontSize: 16,
  },
  profileHeaderTextWrap: {
    flex: 1,
  },
  profileName: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
  },
  profileEmail: {
    color: '#dbe3ff',
    fontSize: 12,
    marginTop: 2,
  },
  signOutRow: {
    borderBottomWidth: 0,
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
