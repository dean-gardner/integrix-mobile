import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { FeedTabKey, FeedTabOption } from '../../config/feedScreen';

type FeedTabSwitchProps = {
  tabs: FeedTabOption[];
  activeTab: FeedTabKey;
  onTabPress: (tab: FeedTabKey) => void;
};

export function FeedTabSwitch({ tabs, activeTab, onTabPress }: FeedTabSwitchProps) {
  const { t } = useTranslation();
  return (
    <View style={styles.container}>
      {tabs.map((tab) => {
        const isActive = tab.key === activeTab;
        return (
          <TouchableOpacity
            key={tab.key}
            style={[styles.tabButton, isActive ? styles.tabButtonActive : styles.tabButtonInactive]}
            onPress={() => onTabPress(tab.key)}
            activeOpacity={0.8}
          >
            <Text style={[styles.tabText, isActive ? styles.tabTextActive : styles.tabTextInactive]}>
              {t(tab.titleKey)}
            </Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 18,
  },
  tabButton: {
    flex: 1,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabButtonActive: {
    backgroundColor: '#697796',
  },
  tabButtonInactive: {
    backgroundColor: '#d8dfec',
  },
  tabText: {
    fontSize: 17,
    fontWeight: '600',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  tabTextInactive: {
    color: theme.colors.primary,
  },
});
