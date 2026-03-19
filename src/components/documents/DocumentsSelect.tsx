import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { theme } from '../../theme';
import type { DocumentsSelectOption, DocumentsSelectValue } from '../../config/documentsScreen';

type DocumentsSelectProps<T extends DocumentsSelectValue> = {
  value: T;
  options: DocumentsSelectOption<T>[];
  onChange: (value: T) => void;
  placeholder?: string;
};

export function DocumentsSelect<T extends DocumentsSelectValue>({
  value,
  options,
  onChange,
  placeholder = '',
}: DocumentsSelectProps<T>) {
  const [open, setOpen] = useState(false);

  const selected = useMemo(
    () => options.find((option) => option.value === value) ?? null,
    [options, value]
  );

  return (
    <View style={[styles.wrapper, open && styles.wrapperOpen]}>
      <TouchableOpacity
        style={[styles.trigger, open && styles.triggerOpen]}
        onPress={() => setOpen((prev) => !prev)}
        activeOpacity={0.85}
      >
        <Text style={[styles.triggerText, !selected && styles.placeholderText]} numberOfLines={1}>
          {selected?.label ?? placeholder}
        </Text>
        <View style={styles.triggerArrowWrap}>
          <MaterialIcons
            name={open ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={20}
            color="#8a90a0"
          />
        </View>
      </TouchableOpacity>

      {open ? (
        <View style={styles.menu}>
          {options.map((option) => {
            const active = option.value === value;
            return (
              <TouchableOpacity
                key={`${option.value ?? 'null'}-${option.label}`}
                style={[styles.option, active && styles.optionActive]}
                onPress={() => {
                  onChange(option.value);
                  setOpen(false);
                }}
                activeOpacity={0.8}
              >
                <Text style={[styles.optionText, active && styles.optionTextActive]}>{option.label}</Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    flex: 1,
    position: 'relative',
    zIndex: 5,
  },
  wrapperOpen: {
    zIndex: 40,
  },
  trigger: {
    height: 38,
    minHeight: 38,
    borderWidth: 1,
    borderColor: '#d9dfeb',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    paddingLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  triggerOpen: {
    borderColor: theme.colors.primary,
  },
  triggerText: {
    flex: 1,
    color: '#25262b',
    fontSize: 14,
  },
  placeholderText: {
    color: '#777f94',
  },
  triggerArrowWrap: {
    alignSelf: 'stretch',
    minWidth: 34,
    borderLeftWidth: 1,
    borderLeftColor: '#d9dfeb',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 0,
  },
  menu: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    marginTop: 0,
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d9dfeb',
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 3 },
    elevation: 6,
    overflow: 'hidden',
  },
  option: {
    minHeight: 38,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  optionActive: {
    backgroundColor: '#2f80ed',
  },
  optionText: {
    color: '#1e1f23',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#ffffff',
  },
});
