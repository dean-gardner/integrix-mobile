import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTranslation } from 'react-i18next';
import { DocumentsSelect } from './DocumentsSelect';
import type { DocumentsSelectOption } from '../../config/documentsScreen';

type DocumentsSortModalProps = {
  visible: boolean;
  sortingField: string;
  sortingOrder: number;
  sortingFieldOptions: DocumentsSelectOption<string>[];
  sortingOrderOptions: DocumentsSelectOption<number>[];
  onClose: () => void;
  onApply: (next: { sortingField: string; sortingOrder: number }) => void;
  /** When omitted, uses tasks sort label */
  headerTitle?: string;
};

type SortSelectKey = 'field' | 'order' | null;
const SORT_OPTION_ROW_HEIGHT = 38;
const SORT_VISIBLE_OPTION_COUNT = 4;

export function DocumentsSortModal({
  visible,
  sortingField,
  sortingOrder,
  sortingFieldOptions,
  sortingOrderOptions,
  onClose,
  onApply,
  headerTitle,
}: DocumentsSortModalProps) {
  const { t } = useTranslation();
  const [localField, setLocalField] = useState(sortingField);
  const [localOrder, setLocalOrder] = useState(sortingOrder);
  const [openSelect, setOpenSelect] = useState<SortSelectKey>(null);

  useEffect(() => {
    if (!visible) return;
    setLocalField(sortingField);
    setLocalOrder(sortingOrder);
    setOpenSelect(null);
  }, [visible, sortingField, sortingOrder]);

  const activeOptions = openSelect === 'field' ? sortingFieldOptions : openSelect === 'order' ? sortingOrderOptions : [];
  const dropdownSlotHeight = SORT_VISIBLE_OPTION_COUNT * SORT_OPTION_ROW_HEIGHT + 2;

  const onSelectOption = (option: DocumentsSelectOption<string> | DocumentsSelectOption<number>) => {
    if (openSelect === 'field') {
      setLocalField(option.value as string);
    } else if (openSelect === 'order') {
      setLocalOrder(option.value as number);
    }
    setOpenSelect(null);
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{headerTitle ?? t('app.tasks.sort')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={28} color="#2a2c32" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>{t('app.tasksScreen.byField')}</Text>
            <DocumentsSelect
              value={localField}
              options={sortingFieldOptions}
              onChange={(value) => {
                setLocalField(value);
                setOpenSelect(null);
              }}
              open={openSelect === 'field'}
              onOpenChange={(nextOpen) => setOpenSelect(nextOpen ? 'field' : null)}
              showMenu={false}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>{t('app.tasksScreen.order')}</Text>
            <DocumentsSelect
              value={localOrder}
              options={sortingOrderOptions}
              onChange={(value) => {
                setLocalOrder(value);
                setOpenSelect(null);
              }}
              open={openSelect === 'order'}
              onOpenChange={(nextOpen) => setOpenSelect(nextOpen ? 'order' : null)}
              showMenu={false}
            />
          </View>

          <View style={[styles.dropdownSlot, { height: dropdownSlotHeight }]}>
            {openSelect ? (
              <View style={styles.dropdownMenu}>
                <ScrollView
                  style={styles.dropdownScroll}
                  nestedScrollEnabled
                  keyboardShouldPersistTaps="handled"
                >
                  {activeOptions.map((option) => {
                    const active =
                      openSelect === 'field'
                        ? option.value === localField
                        : option.value === localOrder;
                    return (
                      <TouchableOpacity
                        key={`${option.value}-${option.label}`}
                        style={[styles.optionRow, active && styles.optionRowActive]}
                        onPress={() => onSelectOption(option)}
                        activeOpacity={0.82}
                      >
                        <Text style={[styles.optionText, active && styles.optionTextActive]}>
                          {option.label}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </ScrollView>
              </View>
            ) : null}
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>{t('app.modal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => {
                setOpenSelect(null);
                onApply({ sortingField: localField, sortingOrder: localOrder });
              }}
            >
              <Text style={styles.applyText}>{t('app.tasksScreen.apply')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.35)',
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 18,
    alignSelf: 'center',
    width: '100%',
    maxWidth: 420,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 34,
    fontWeight: '600',
    color: '#2a2c32',
  },
  fieldRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    marginBottom: 14,
  },
  label: {
    width: 70,
    color: '#4a5a81',
    fontSize: 15,
    fontWeight: '500',
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dropdownSlot: {
    marginBottom: 14,
  },
  dropdownMenu: {
    maxHeight: SORT_VISIBLE_OPTION_COUNT * SORT_OPTION_ROW_HEIGHT + 2,
    borderWidth: 1,
    borderColor: '#d9dfeb',
    borderRadius: 4,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
  },
  dropdownScroll: {
    maxHeight: SORT_VISIBLE_OPTION_COUNT * SORT_OPTION_ROW_HEIGHT,
  },
  optionRow: {
    minHeight: SORT_OPTION_ROW_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 10,
  },
  optionRowActive: {
    backgroundColor: '#2f80ed',
  },
  optionText: {
    color: '#1e1f23',
    fontSize: 14,
  },
  optionTextActive: {
    color: '#ffffff',
  },
  cancelButton: {
    flex: 1,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#7282a9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  applyButton: {
    flex: 1,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#2f3fb0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  applyText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
