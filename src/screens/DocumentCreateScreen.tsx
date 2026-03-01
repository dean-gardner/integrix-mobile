import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useDispatch } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import type { AppDispatch } from '../store';
import { createDocument } from '../store/documentsSlice';
import { theme } from '../theme';
import {
  DocumentTaskReferencing,
  taskReferencingOptions,
} from '../config/documentCreate';

export default function DocumentCreateScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();

  const [expanded, setExpanded] = useState(true);
  const [documentTitle, setDocumentTitle] = useState('');
  const [selectedTaskReferencing, setSelectedTaskReferencing] = useState<DocumentTaskReferencing>(
    DocumentTaskReferencing.WorkOrderAndNotificationNo
  );
  const [titleError, setTitleError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  const handleCreate = async () => {
    const trimmedTitle = documentTitle.trim();
    if (!trimmedTitle) {
      setTitleError('Document title is required');
      return;
    }

    setTitleError(null);
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('Description', trimmedTitle);
      formData.append('TaskReferencingType', String(selectedTaskReferencing));

      const created = await dispatch(createDocument(formData)).unwrap();
      (navigation.navigate as (name: string, params?: object) => void)('DocumentDetail', {
        document: created,
      });
    } catch (e) {
      Alert.alert('Create document', (e as string) || 'Failed to create document.');
    } finally {
      setCreating(false);
    }
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
      <View style={styles.outerCard}>
        <TouchableOpacity
          style={styles.sectionHeader}
          onPress={() => setExpanded((prev) => !prev)}
          activeOpacity={0.8}
        >
          <Text style={styles.sectionTitle}>TASK DETAILS</Text>
          <MaterialIcons
            name={expanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
            size={22}
            color="#6aa6d9"
          />
        </TouchableOpacity>

        {expanded ? (
          <View style={styles.innerCard}>
            <Text style={styles.label}>Document Title *</Text>
            <TextInput
              style={[styles.input, titleError && styles.inputError]}
              value={documentTitle}
              onChangeText={(value) => {
                setDocumentTitle(value);
                if (titleError) setTitleError(null);
              }}
            />
            {titleError ? <Text style={styles.errorText}>{titleError}</Text> : null}

            <Text style={styles.label}>Task Referencing</Text>
            {taskReferencingOptions.map((option) => {
              const selected = option.value === selectedTaskReferencing;
              return (
                <View key={option.value} style={styles.radioRow}>
                  <TouchableOpacity
                    style={styles.radioLeft}
                    onPress={() => setSelectedTaskReferencing(option.value)}
                    activeOpacity={0.8}
                  >
                    <View style={[styles.radioOuter, selected && styles.radioOuterSelected]}>
                      {selected ? <View style={styles.radioInner} /> : null}
                    </View>
                    <Text style={styles.radioLabel}>{option.label}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => Alert.alert('Task referencing', option.tooltip)}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <MaterialIcons name="info" size={16} color="#7d8ca8" />
                  </TouchableOpacity>
                </View>
              );
            })}

            <Text style={[styles.label, styles.refDocsLabel]}>Reference Documentation</Text>
            <TouchableOpacity
              style={styles.fileButton}
              onPress={() =>
                Alert.alert(
                  'Reference Documentation',
                  'File upload is not connected yet in mobile.'
                )
              }
              activeOpacity={0.85}
            >
              <MaterialIcons name="upload-file" size={24} color="#000000" />
              <Text style={styles.fileButtonText}>Click to select the file</Text>
            </TouchableOpacity>

            <View style={styles.divider} />

            <TouchableOpacity
              style={[styles.nextButton, creating && styles.nextButtonDisabled]}
              onPress={handleCreate}
              disabled={creating}
            >
              {creating ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.nextButtonText}>Next</Text>
              )}
            </TouchableOpacity>
          </View>
        ) : null}
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 10,
    paddingVertical: 12,
  },
  outerCard: {
    borderWidth: 1,
    borderColor: '#d6dcec',
    backgroundColor: '#f9fbff',
    borderRadius: 4,
    padding: 14,
  },
  sectionHeader: {
    backgroundColor: '#e7ebf3',
    borderRadius: 3,
    minHeight: 52,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 26,
    fontWeight: '700',
    color: '#2f3b56',
  },
  innerCard: {
    marginTop: 14,
    backgroundColor: '#ffffff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e6e6e6',
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.14,
    shadowRadius: 7,
    shadowOffset: { width: 0, height: 3 },
    elevation: 4,
  },
  label: {
    color: '#111111',
    fontSize: 18,
    fontWeight: '500',
    marginBottom: 8,
  },
  input: {
    height: 36,
    borderWidth: 1,
    borderColor: '#d8dce8',
    borderRadius: 3,
    paddingHorizontal: 8,
    marginBottom: 6,
  },
  inputError: {
    borderColor: '#d44848',
  },
  errorText: {
    color: '#d44848',
    fontSize: 12,
    marginBottom: 8,
  },
  radioRow: {
    minHeight: 32,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  radioLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    paddingRight: 10,
  },
  radioOuter: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: '#aeb3c0',
    marginTop: 2,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
  },
  radioOuterSelected: {
    borderColor: '#2f3fb0',
  },
  radioInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#2f3fb0',
  },
  radioLabel: {
    color: '#111111',
    fontSize: 16,
    flex: 1,
  },
  refDocsLabel: {
    marginTop: 14,
    marginBottom: 10,
    fontWeight: '600',
  },
  fileButton: {
    borderWidth: 3,
    borderColor: '#111111',
    borderRadius: 12,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 6,
  },
  fileButtonText: {
    fontSize: 15,
    color: '#000000',
    marginTop: 2,
  },
  divider: {
    marginTop: 22,
    marginBottom: 10,
    height: 1,
    backgroundColor: '#e6e7ec',
  },
  nextButton: {
    alignSelf: 'center',
    width: 150,
    height: 42,
    borderRadius: 3,
    backgroundColor: '#2f3fb0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nextButtonDisabled: {
    opacity: 0.7,
  },
  nextButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
});
