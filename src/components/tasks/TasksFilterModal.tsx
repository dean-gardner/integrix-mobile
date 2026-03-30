import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Keyboard,
  KeyboardAvoidingView,
  Modal,
  Platform,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Pressable,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTranslation } from 'react-i18next';
import { DocumentsSelect } from '../documents/DocumentsSelect';
import type { TasksFilterForm } from '../../config/tasksScreen';
import { defaultTaskReferenceField, taskReferenceFieldOptions } from '../../config/tasksScreen';

type TasksFilterModalProps = {
  visible: boolean;
  initialValues: TasksFilterForm;
  onClose: () => void;
  onApply: (values: TasksFilterForm, meta?: { taskReferenceFieldTouched: boolean }) => void;
  onResetFlag: () => void;
};

export function TasksFilterModal({
  visible,
  initialValues,
  onClose,
  onApply,
  onResetFlag,
}: TasksFilterModalProps) {
  const { t } = useTranslation();
  const [form, setForm] = useState<TasksFilterForm>(initialValues);
  const [taskReferenceFieldTouched, setTaskReferenceFieldTouched] = useState(false);
  const taskNoRef = useRef<TextInput>(null);
  const descRef = useRef<TextInput>(null);
  const refContainsRef = useRef<TextInput>(null);
  const createdByRef = useRef<TextInput>(null);
  const wasVisibleRef = useRef(false);

  const taskRefOptions = useMemo(
    () =>
      taskReferenceFieldOptions.map((o) => ({
        value: o.value,
        label:
          o.value === 'workOrderNumber'
            ? t('app.tasksScreen.workOrder')
            : o.value === 'notificationNumber'
              ? t('app.tasksScreen.notificationNo')
              : t('app.tasksScreen.projectNo'),
      })),
    [t]
  );

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setForm(initialValues);
      setTaskReferenceFieldTouched(false);
    }
    wasVisibleRef.current = visible;
  }, [visible, initialValues]);

  useEffect(() => {
    if (visible) return;
    const id = requestAnimationFrame(() => {
      Keyboard.dismiss();
      taskNoRef.current?.blur();
      descRef.current?.blur();
      refContainsRef.current?.blur();
      createdByRef.current?.blur();
    });
    return () => cancelAnimationFrame(id);
  }, [visible]);

  const setField = <T extends keyof TasksFilterForm>(field: T, value: TasksFilterForm[T]) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    Keyboard.dismiss();
    taskNoRef.current?.blur();
    descRef.current?.blur();
    refContainsRef.current?.blur();
    createdByRef.current?.blur();
    setForm({
      taskNumber: '',
      description: '',
      taskReferenceField: defaultTaskReferenceField,
      taskReference: '',
      createdBy: '',
    });
    setTaskReferenceFieldTouched(false);
    onResetFlag();
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={styles.card} collapsable={false}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('app.tasks.filter')}</Text>
            <TouchableOpacity onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
              <MaterialIcons name="close" size={28} color="#2a2c32" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.formScroll}
            keyboardShouldPersistTaps="always"
            keyboardDismissMode="on-drag"
            showsVerticalScrollIndicator={false}
            bounces={false}
            nestedScrollEnabled
            contentContainerStyle={styles.scrollInner}
          >
            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('app.tasksScreen.taskNo')}</Text>
              <TextInput
                ref={taskNoRef}
                style={styles.input}
                value={form.taskNumber}
                onChangeText={(value) => setField('taskNumber', value)}
                blurOnSubmit
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('app.tasksScreen.description')}</Text>
              <TextInput
                ref={descRef}
                style={styles.input}
                value={form.description}
                onChangeText={(value) => setField('description', value)}
                blurOnSubmit
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('app.tasksScreen.taskReference')}</Text>
              <DocumentsSelect
                value={form.taskReferenceField}
                options={taskRefOptions}
                onChange={(value) => {
                  setField('taskReferenceField', value);
                  setTaskReferenceFieldTouched(true);
                }}
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('app.tasksScreen.contains')}</Text>
              <TextInput
                ref={refContainsRef}
                style={styles.input}
                value={form.taskReference}
                onChangeText={(value) => setField('taskReference', value)}
                blurOnSubmit
                returnKeyType="next"
              />
            </View>

            <View style={styles.fieldRow}>
              <Text style={styles.label}>{t('app.tasksScreen.createdBy')}</Text>
              <TextInput
                ref={createdByRef}
                style={styles.input}
                value={form.createdBy}
                onChangeText={(value) => setField('createdBy', value)}
                blurOnSubmit
                returnKeyType="done"
              />
            </View>
          </ScrollView>

          <View style={styles.footer}>
            <Pressable
              style={({ pressed }) => [styles.resetButton, pressed && styles.resetButtonPressed]}
              onPress={handleReset}
              hitSlop={12}
              android_ripple={{ color: 'rgba(39, 50, 78, 0.12)' }}
            >
              <Text style={styles.resetText}>{t('app.tasksScreen.resetFilter')}</Text>
              <MaterialIcons name="refresh" size={18} color="#27324e" />
            </Pressable>

            <View style={styles.actionsRow}>
              <TouchableOpacity style={styles.cancelButton} onPress={onClose}>
                <Text style={styles.cancelText}>{t('app.modal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyButton}
                onPress={() => {
                  Keyboard.dismiss();
                  onApply(form, { taskReferenceFieldTouched });
                }}
              >
                <Text style={styles.applyText}>{t('app.tasksScreen.apply')}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
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
    width: '100%',
  },
  formScroll: {
    minHeight: 0,
    flexShrink: 1,
  },
  scrollInner: {
    paddingBottom: 6,
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
    width: 78,
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
  footer: {
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: '#e8edf6',
  },
  actionsRow: {
    marginTop: 10,
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
