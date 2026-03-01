import React, { useEffect, useState } from 'react';
import {
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { DocumentsFilterForm } from '../../config/documentsScreen';

type DocumentsFilterModalProps = {
  visible: boolean;
  initialValues: DocumentsFilterForm;
  onClose: () => void;
  onApply: (values: DocumentsFilterForm) => void;
  onResetFlag: () => void;
};

export function DocumentsFilterModal({
  visible,
  initialValues,
  onClose,
  onApply,
  onResetFlag,
}: DocumentsFilterModalProps) {
  const [form, setForm] = useState<DocumentsFilterForm>(initialValues);

  useEffect(() => {
    if (!visible) return;
    setForm(initialValues);
  }, [visible, initialValues]);

  const setField = (field: keyof DocumentsFilterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    const reset = { documentNumberStr: '', description: '', createdByName: '' };
    setForm(reset);
    onResetFlag();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filter</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={28} color="#2a2c32" />
            </TouchableOpacity>
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Document No</Text>
            <TextInput
              style={styles.input}
              value={form.documentNumberStr}
              onChangeText={(value) => setField('documentNumberStr', value)}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Title</Text>
            <TextInput
              style={styles.input}
              value={form.description}
              onChangeText={(value) => setField('description', value)}
            />
          </View>

          <View style={styles.fieldRow}>
            <Text style={styles.label}>Author</Text>
            <TextInput
              style={styles.input}
              value={form.createdByName}
              onChangeText={(value) => setField('createdByName', value)}
            />
          </View>

          <TouchableOpacity style={styles.resetButton} onPress={handleReset}>
            <Text style={styles.resetText}>Reset filter</Text>
            <MaterialIcons name="refresh" size={18} color="#27324e" />
          </TouchableOpacity>

          <View style={styles.actionsRow}>
            <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.applyButton}
              onPress={() => onApply(form)}
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
    paddingHorizontal: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  title: {
    fontSize: 34,
    fontWeight: '600',
    color: '#2a2c32',
  },
  fieldRow: {
    marginTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  label: {
    width: 72,
    color: '#4a5a81',
    fontSize: 15,
    fontWeight: '500',
  },
  input: {
    flex: 1,
    height: 38,
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d9dfeb',
    paddingHorizontal: 10,
    color: '#202126',
    fontSize: 14,
    backgroundColor: '#ffffff',
  },
  resetButton: {
    marginTop: 18,
    height: 36,
    borderRadius: 4,
    backgroundColor: '#edf1fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetText: {
    color: '#27324e',
    fontSize: 15,
  },
  actionsRow: {
    marginTop: 14,
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
