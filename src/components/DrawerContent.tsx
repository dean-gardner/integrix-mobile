import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';
import { useSelector } from 'react-redux';
import type { RootState, AppDispatch } from '../store';
import { signOut } from '../store/authSlice';
import { drawerMenuGroups, type DrawerMenuItem } from '../config/drawerMenu';
import { setAppLanguage, SUPPORTED_LANGUAGES } from '../i18n';

type DrawerContentProps = { onClose: () => void };

export function DrawerContent({ onClose }: DrawerContentProps) {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const roles = user?.roles ?? [];

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

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={onClose} style={styles.headerIconButton} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
          <MaterialIcons name="close" size={20} color={theme.colors.sidebarText} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('appName')}</Text>
        <View style={styles.headerIconButton}>
          <MaterialIcons name="more-vert" size={20} color={theme.colors.sidebarText} />
        </View>
      </View>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {drawerMenuGroups.map((group) => {
          const visibleItems = group.items.filter(canSee);
          if (visibleItems.length === 0) return null;
          return (
            <View key={group.titleKey} style={styles.group}>
              <Text style={styles.groupTitle}>{t(group.titleKey)}</Text>
              {visibleItems.map((item) => {
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
          );
        })}

        <View style={styles.group}>
          <Text style={styles.groupTitle}>{t('drawer.language')}</Text>
          {SUPPORTED_LANGUAGES.map(({ code, nativeLabel }) => {
            const active = i18n.language === code || i18n.language.startsWith(`${code}-`);
            return (
              <TouchableOpacity
                key={code}
                style={[styles.item, active && styles.itemActive]}
                onPress={() => {
                  void setAppLanguage(code);
                }}
                activeOpacity={0.7}
              >
                <MaterialIcons
                  name="language"
                  size={20}
                  color={active ? theme.colors.primary : theme.colors.sidebarText}
                  style={styles.itemIcon}
                />
                <Text style={[styles.itemText, active && styles.itemTextActive]}>{nativeLabel}</Text>
              </TouchableOpacity>
            );
          })}
        </View>

        <TouchableOpacity
          style={styles.signOutItem}
          onPress={() => {
            onClose();
            dispatch(signOut());
          }}
          activeOpacity={0.7}
        >
          <MaterialIcons
            name="logout"
            size={20}
            color={theme.colors.sidebarText}
            style={styles.itemIcon}
          />
          <Text style={styles.signOutText}>{t('drawer.signOut')}</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingVertical: 16,
    paddingBottom: 32,
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
  signOutItem: {
    marginTop: 8,
    marginHorizontal: 20,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  signOutText: {
    fontSize: 15,
    color: theme.colors.sidebarHeading,
    fontWeight: '700',
  },
});
