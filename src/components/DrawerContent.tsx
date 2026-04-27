import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';
import { drawerMenuGroups, type DrawerMenuItem } from '../config/drawerMenu';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

type DrawerContentProps = { onClose: () => void };

export function DrawerContent({ onClose }: DrawerContentProps) {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const safeAreaInsets = useSafeAreaInsets();
  const user = useSelector((s: RootState) => s.auth.user);
  const roles = Array.isArray(user?.roles)
    ? user.roles.filter((role): role is string => typeof role === 'string')
    : [];
  const canSee = (item: DrawerMenuItem) => {
    if (item.isVisibleForMobile === false) return false;
    if (item.requiredRoles?.length) {
      const hasRole = item.requiredRoles.some((r) => roles.includes(r));
      if (!hasRole) return false;
    }
    return true;
  };

  const state = navigation.getState?.();
  const currentRouteName = state?.routes?.[state.index]?.name ?? 'Feed';

  const closeAndNavigate = (screen: string) => {
    onClose();
    navigation.navigate(screen as never);
  };

  const visibleMenuGroups = drawerMenuGroups
    .map((group) => ({
      ...group,
      items: group.items.filter(canSee),
    }))
    .filter((group) => group.items.length > 0);

  return (
    <View style={styles.container}>
      <View style={[styles.header, { paddingTop: Math.max(14, safeAreaInsets.top + 8) }]}>
        <TouchableOpacity onPress={onClose} style={styles.headerIconButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="close" size={20} color={theme.colors.sidebarText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appName')}</Text>
        <View style={styles.headerIconButton}>
          <MaterialIcons name="more-vert" size={20} color={theme.colors.sidebarText} />
        </View>
      </View>
      <View style={[styles.body, { paddingBottom: 20 + safeAreaInsets.bottom }]}>
        <View>
          {visibleMenuGroups.map((group) => (
            <View key={group.titleKey} style={styles.group}>
              <Text style={styles.groupTitle}>{t(group.titleKey)}</Text>
              {group.items.map((item) => {
                const isActive = currentRouteName === item.route;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.item, isActive && styles.itemActive]}
                    onPress={() => closeAndNavigate(item.route)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={20}
                      color={isActive ? theme.colors.primary : theme.colors.sidebarText}
                      style={styles.itemIcon}
                    />
                    <Text style={[styles.itemText, isActive && styles.itemTextActive]}>{t(item.titleKey)}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          ))}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.sidebarBg,
  },
  header: {
    paddingHorizontal: 12,
    paddingTop: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.sidebarBorder,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerIconButton: {
    width: 36,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    lineHeight: 24,
    color: theme.colors.sidebarHeading,
  },
  body: {
    flex: 1,
    ...Platform.select({
      ios: {
        paddingTop: 14,
      },
    }),
  },
  group: {
    marginBottom: 20,
  },
  groupTitle: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.sidebarHeading,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  itemIcon: {
    marginRight: 12,
  },
  itemActive: {
    borderLeftColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  itemText: {
    fontSize: 15,
    color: theme.colors.sidebarText,
  },
  itemTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
});
