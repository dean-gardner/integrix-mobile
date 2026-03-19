import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import type { FeedTaskFilterId, FeedTaskFilterOption } from '../../config/feedScreen';

type TaskFilterSelectProps = {
  options: FeedTaskFilterOption[];
  selectedFilterId: FeedTaskFilterId | null;
  onSelect: (value: FeedTaskFilterId | null) => void;
};

export function TaskFilterSelect({ options, selectedFilterId, onSelect }: TaskFilterSelectProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);

  const selectedOption = useMemo(
    () => options.find((option) => option.id === selectedFilterId) ?? null,
    [options, selectedFilterId]
  );

  const onPick = (value: FeedTaskFilterId) => {
    onSelect(selectedFilterId === value ? null : value);
    setOpen(false);
  };

  return (
    <View style={styles.wrapper}>
      <Text style={styles.floatingLabel}>{t('app.feed.filterFloat')}</Text>
      <TouchableOpacity
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.8}
      >
        <Text style={[styles.triggerText, !selectedOption && styles.placeholderText]} numberOfLines={1}>
          {selectedOption ? t(selectedOption.titleKey) : t('app.feed.selectFilter')}
        </Text>
        <MaterialIcons
          name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={20}
          color="#7d8699"
        />
      </TouchableOpacity>

      {open ? (
        <View style={styles.menu}>
          {options.map((option) => (
            <TouchableOpacity
              key={option.id}
              style={styles.optionRow}
              onPress={() => onPick(option.id)}
              activeOpacity={0.8}
            >
              <View style={[styles.filterChip, { backgroundColor: option.indicatorColor }]}>
                <Text style={styles.optionText}>{t(option.titleKey)}</Text>
              </View>
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    width: 206,
    position: 'relative',
    zIndex: 20,
  },
  floatingLabel: {
    position: 'absolute',
    top: -8,
    left: 10,
    zIndex: 2,
    paddingHorizontal: 4,
    backgroundColor: theme.colors.background,
    color: '#1976d2',
    fontSize: 12,
  },
  trigger: {
    width: 206,
    minHeight: 40,
    borderWidth: 1,
    borderColor: '#adb7ca',
    borderRadius: 4,
    backgroundColor: '#ecf0fa',
    paddingHorizontal: 14,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerOpen: {
    borderColor: '#1976d2',
  },
  triggerText: {
    flex: 1,
    fontSize: 14,
    color: '#2d3448',
    fontWeight: '500',
    marginRight: 8,
  },
  placeholderText: {
    color: '#4a5369',
    fontWeight: '400',
  },
  menu: {
    position: 'absolute',
    top: 46,
    left: 0,
    width: 206,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d9dfeb',
    paddingVertical: 12,
    paddingHorizontal: 10,
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 4 },
    elevation: 6,
  },
  optionRow: {
    minHeight: 36,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  filterChip: {
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  optionText: {
    fontSize: 13,
    color: '#ffffff',
    fontWeight: '600',
  },
});
