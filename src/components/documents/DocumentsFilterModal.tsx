import React, { useEffect, useRef, useState } from 'react';
import {
  Keyboard,
  Modal,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
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
  const docNoRef = useRef<TextInput>(null);
  const titleRef = useRef<TextInput>(null);
  const authorRef = useRef<TextInput>(null);
  const wasVisibleRef = useRef(false);

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setForm(initialValues);
    }
    wasVisibleRef.current = visible;
  }, [visible, initialValues]);

  /** Modal children stay mounted when hidden; a focused TextInput steals the next tap. */
  useEffect(() => {
    if (visible) return;
    const id = requestAnimationFrame(() => {
      Keyboard.dismiss();
      docNoRef.current?.blur();
      titleRef.current?.blur();
      authorRef.current?.blur();
    });
    return () => cancelAnimationFrame(id);
  }, [visible]);

  const setField = (field: keyof DocumentsFilterForm, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    Keyboard.dismiss();
    docNoRef.current?.blur();
    titleRef.current?.blur();
    authorRef.current?.blur();
    const reset = { documentNumberStr: '', description: '', createdByName: '' };
    setForm(reset);
    onResetFlag();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card} collapsable={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filter</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={28} color="#2a2c32" />
            </TouchableOpacity>
          </View>

          {/*
            keyboardShouldPersistTaps="always" avoids the first tap being consumed as
            "dismiss keyboard / blur field" instead of reaching the Reset button.
          */}
          <ScrollView
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
            contentContainerStyle={styles.scrollInner}
          >
            <View style={styles.fieldRow}>
              <Text style={styles.label}>Document No</Text>
              <TextInput
                ref={docNoRef}
                style={styles.input}
                value={form.documentNumberStr}
                onChangeText={(value) => setField('documentNumberStr', value)}
                blurOnSubmit
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Title</Text>
              <TextInput
                ref={titleRef}
                style={styles.input}
                value={form.description}
                onChangeText={(value) => setField('description', value)}
                blurOnSubmit
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>Author</Text>
              <TextInput
                ref={authorRef}
                style={styles.input}
                value={form.createdByName}
                onChangeText={(value) => setField('createdByName', value)}
                blurOnSubmit
                returnKeyType="done"
              />
            </View>

            <Pressable
              style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
              onPress={handleReset}
              hitSlop={12}
              android_ripple={{ color: 'rgba(39, 50, 78, 0.12)' }}
            >
              <Text style={styles.resetText}>Reset filter</Text>
              <MaterialIcons name="refresh" size={18} color="#27324e" />
            </Pressable>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  Keyboard.dismiss();
                  onApply(form);
                }}
              >
                <Text style={styles.applyText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </ScrollView>
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
    maxHeight: '90%',
  },
  scrollInner: {
    paddingBottom: 4,
    flexGrow: 1,
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
    minHeight: 44,
    borderRadius: 4,
    backgroundColor: '#edf1fa',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  resetButtonPressed: {
    opacity: 0.88,
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
