import React, { useEffect, useState } from 'react';
import { Modal, View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
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
};

export function DocumentsSortModal({
  visible,
  sortingField,
  sortingOrder,
  sortingFieldOptions,
  sortingOrderOptions,
  onClose,
  onApply,
}: DocumentsSortModalProps) {
  const [localField, setLocalField] = useState(sortingField);
  const [localOrder, setLocalOrder] = useState(sortingOrder);

  useEffect(() => {
    if (!visible) return;
    setLocalField(sortingField);
    setLocalOrder(sortingOrder);
  }, [visible, sortingField, sortingOrder]);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Sort</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={28} color="#2a2c32" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>By field</Text>
            <DocumentsSelect
              value={localField}
              options={sortingFieldOptions}
              onChange={setLocalField}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Order</Text>
            <DocumentsSelect
              value={localOrder}
              options={sortingOrderOptions}
              onChange={setLocalOrder}
            />
          </View>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => onApply({ sortingField: localField, sortingOrder: localOrder })}
            >
              <Text style={styles.applyText}>Apply</Text>
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
    marginBottom: 14,
    gap: 14,
  },
  label: {
    width: 70,
    color: '#4a5a81',
    fontSize: 15,
    fontWeight: '500',
  },
  actionsRow: {
    marginTop: 8,
    flexDirection: 'row',
    gap: 8,
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
