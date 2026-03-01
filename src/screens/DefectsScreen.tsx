import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { fetchDefects, fetchMoreDefects, createDefect } from '../store/defectsSlice';
import { getDefaultDefectFieldsTemplate, getDefectFieldsTemplatesBySearch } from '../api/defectFieldsTemplates';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { ListScreenLayout, LoadMoreButton } from '../components/ListScreenLayout';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';
import type { DefectReadDTO } from '../types/defect';
import type { DefectFieldReadDTO, DefectFieldsTemplateDTO } from '../types/defectTemplate';

export default function DefectsScreen() {
  const navigation = useNavigation();
  const dispatch = useDispatch<AppDispatch>();
  const fetch = useCallback(() => dispatch(fetchDefects()), [dispatch]);
  const fetchMore = useCallback(() => dispatch(fetchMoreDefects()), [dispatch]);

  const [createVisible, setCreateVisible] = useState(false);
  const [createDescription, setCreateDescription] = useState('');
  const [remediationDetails, setRemediationDetails] = useState('');
  const [templatePickerVisible, setTemplatePickerVisible] = useState(false);
  const [templateSearch, setTemplateSearch] = useState('');
  const [templates, setTemplates] = useState<DefectFieldsTemplateDTO[]>([]);
  const [selectedTemplate, setSelectedTemplate] = useState<DefectFieldsTemplateDTO | null>(null);
  const [fieldValues, setFieldValues] = useState<Record<string, string>>({});
  const [templatesLoading, setTemplatesLoading] = useState(false);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);

  const {
    items,
    isLoading,
    error,
    totalCount,
    noMorePages,
    refreshing,
    onRefresh,
    loadMore,
  } = usePaginatedList({
    selector: (s: RootState) => s.defects,
    fetch,
    fetchMore,
  });

  const loadTemplates = useCallback(async (search = '') => {
    setTemplatesLoading(true);
    try {
      const res = await getDefectFieldsTemplatesBySearch(search);
      setTemplates(res.data ?? []);
    } catch {
      setTemplates([]);
    } finally {
      setTemplatesLoading(false);
    }
  }, []);

  const openCreate = () => {
    setCreateDescription('');
    setRemediationDetails('');
    setTemplateSearch('');
    setTemplates([]);
    setSelectedTemplate(null);
    setFieldValues({});
    setCreateError(null);
    setCreateVisible(true);
    loadTemplates('').catch(() => {});
    (async () => {
      try {
        const res = await getDefaultDefectFieldsTemplate();
        setSelectedTemplate(res.data);
      } catch {
        // Best-effort fallback; user can still pick manually.
      }
    })().catch(() => {});
  };

  const getFieldValue = useCallback(
    (field: DefectFieldReadDTO) => {
      const explicitValue = fieldValues[field.id];
      if (explicitValue != null) return explicitValue;
      if (field.name.toLowerCase().includes('description')) return createDescription;
      return '';
    },
    [createDescription, fieldValues]
  );

  const submitCreate = async () => {
    const description = (createDescription ?? '').trim();
    if (!description) {
      setCreateError('Enter a description.');
      return;
    }

    if (selectedTemplate?.fields?.length) {
      const missingRequiredFields = selectedTemplate.fields
        .filter((field) => field.isRequired)
        .filter((field) => !(getFieldValue(field) ?? '').trim())
        .map((field) => field.name);

      if (missingRequiredFields.length) {
        setCreateError(`Fill required fields: ${missingRequiredFields.join(', ')}.`);
        return;
      }
    }

    setCreateError(null);
    setCreating(true);
    try {
      const formData = new FormData();
      formData.append('Description', description);
      formData.append('IsHiddenOnFeed', 'true');
      if (remediationDetails.trim()) {
        formData.append('RemediationDetails', remediationDetails.trim());
      }

      if (selectedTemplate) {
        formData.append('TemplateId', selectedTemplate.id);
        selectedTemplate.fields.forEach((field, index) => {
          formData.append(`DefectFieldsValues[${index}].Name`, field.name);
          formData.append(`DefectFieldsValues[${index}].Type`, field.type != null ? String(field.type) : '');
          formData.append(`DefectFieldsValues[${index}].Id`, field.id);
          formData.append(`DefectFieldsValues[${index}].Value`, getFieldValue(field));
        });
      }

      await dispatch(createDefect(formData)).unwrap();
      setCreateVisible(false);
    } catch (e) {
      setCreateError((e as string) || 'Failed to create defect');
    } finally {
      setCreating(false);
    }
  };

  const openDefect = (d: DefectReadDTO) => {
    (navigation.navigate as (name: string, params?: object) => void)('DefectDetail', {
      defect: d,
    });
  };

  return (
    <ListScreenLayout
      title="Defects"
      error={error}
      isLoading={isLoading}
      isEmpty={items.length === 0}
      emptyMessage="No defects yet."
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <>
        <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
          <Text style={styles.createBtnText}>Create defect</Text>
        </TouchableOpacity>
        <View style={screenStyles.list}>
          {items.map((d) => (
            <TouchableOpacity
              key={d.id}
              style={screenStyles.card}
              onPress={() => openDefect(d)}
              activeOpacity={0.7}
            >
              <Text style={styles.defectNumber}>{d.defectNumber}</Text>
              <Text style={styles.defectDesc} numberOfLines={2}>
                {d.description ?? '—'}
              </Text>
              <Text style={screenStyles.muted}>
                {d.createdByName} · {d.statusCode}
              </Text>
            </TouchableOpacity>
          ))}
          {!noMorePages && (
            <LoadMoreButton
              onPress={loadMore}
              loading={isLoading}
              totalCount={totalCount}
              disabled={isLoading}
            />
          )}
        </View>
      </>
      <Modal visible={createVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <ScrollView keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Create defect</Text>
              {createError ? (
                <View style={screenStyles.errorBox}>
                  <Text style={screenStyles.errorText}>{createError}</Text>
                </View>
              ) : null}
              <TouchableOpacity
                style={styles.templateBtn}
                onPress={() => setTemplatePickerVisible(true)}
                disabled={creating}
              >
                <Text style={styles.templateBtnText}>Choose template</Text>
              </TouchableOpacity>
              {selectedTemplate ? (
                <Text style={styles.templateInfo}>
                  Template: {selectedTemplate.name}
                  {selectedTemplate.details ? ` - ${selectedTemplate.details}` : ''}
                </Text>
              ) : (
                <Text style={styles.templateInfo}>No template selected.</Text>
              )}

              <Text style={screenStyles.formLabel}>Description</Text>
              <TextInput
                style={[screenStyles.formInput, styles.textArea]}
                value={createDescription}
                onChangeText={setCreateDescription}
                placeholder="Describe the defect..."
                placeholderTextColor="#6c757d"
                multiline
                numberOfLines={4}
                editable={!creating}
              />

              <Text style={screenStyles.formLabel}>Remediation details (optional)</Text>
              <TextInput
                style={[screenStyles.formInput, styles.textArea]}
                value={remediationDetails}
                onChangeText={setRemediationDetails}
                placeholder="Remediation details"
                placeholderTextColor="#6c757d"
                multiline
                numberOfLines={3}
                editable={!creating}
              />

              {selectedTemplate?.fields?.length ? (
                <>
                  <Text style={styles.customFieldsTitle}>Custom fields</Text>
                  {selectedTemplate.fields.map((field) => (
                    <View key={field.id}>
                      <Text style={screenStyles.formLabel}>
                        {field.name}
                        {field.isRequired ? ' *' : ''}
                      </Text>
                      <TextInput
                        style={screenStyles.formInput}
                        value={getFieldValue(field)}
                        onChangeText={(value) =>
                          setFieldValues((prev) => ({ ...prev, [field.id]: value }))
                        }
                        placeholder={`Enter ${field.name}`}
                        placeholderTextColor="#6c757d"
                        editable={!creating}
                      />
                    </View>
                  ))}
                </>
              ) : null}

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={styles.cancelBtn}
                  onPress={() => setCreateVisible(false)}
                  disabled={creating}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[screenStyles.formButton, creating && styles.buttonDisabled]}
                  onPress={submitCreate}
                  disabled={creating}
                >
                  {creating ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={screenStyles.formButtonText}>Create</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </View>
      </Modal>

      <Modal visible={templatePickerVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Choose defect template</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={[screenStyles.formInput, styles.searchInput]}
                value={templateSearch}
                onChangeText={setTemplateSearch}
                placeholder="Search templates..."
                placeholderTextColor="#6c757d"
                editable={!templatesLoading}
              />
              <TouchableOpacity
                style={[styles.searchBtn, templatesLoading && styles.buttonDisabled]}
                onPress={() => {
                  loadTemplates(templateSearch).catch(() => {});
                }}
                disabled={templatesLoading}
              >
                <Text style={styles.searchBtnText}>Search</Text>
              </TouchableOpacity>
            </View>

            {templatesLoading ? (
              <View style={styles.templateLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : (
              <ScrollView style={styles.templateList}>
                {templates.length === 0 ? (
                  <Text style={screenStyles.muted}>No templates found.</Text>
                ) : (
                  templates.map((template) => (
                    <TouchableOpacity
                      key={template.id}
                      style={styles.templateRow}
                      onPress={() => {
                        setSelectedTemplate(template);
                        setFieldValues({});
                        setTemplatePickerVisible(false);
                      }}
                    >
                      <Text style={styles.templateName}>{template.name}</Text>
                      <Text style={screenStyles.muted} numberOfLines={2}>
                        {template.details || 'No details'}
                      </Text>
                      <Text style={styles.templateFieldCount}>
                        {template.fields?.length ?? 0} fields
                      </Text>
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            )}

            <TouchableOpacity
              style={[styles.cancelBtn, styles.templateCloseBtn]}
              onPress={() => setTemplatePickerVisible(false)}
            >
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ListScreenLayout>
  );
}

const styles = StyleSheet.create({
  createBtn: {
    alignSelf: 'flex-start',
    marginBottom: 16,
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  defectNumber: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  defectDesc: { fontSize: 14, color: theme.colors.textMuted },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: theme.spacing.cardPadding,
    maxHeight: '88%',
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 16 },
  templateBtn: {
    marginBottom: 10,
    paddingVertical: 10,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  templateBtnText: { color: theme.colors.primary, fontSize: 14, fontWeight: '600' },
  templateInfo: { fontSize: 12, color: theme.colors.textMuted, marginBottom: 10 },
  textArea: { minHeight: 90, textAlignVertical: 'top' },
  customFieldsTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
    marginTop: 4,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: { fontSize: 16, color: theme.colors.text },
  buttonDisabled: { opacity: 0.7 },
  searchRow: { flexDirection: 'row', gap: 10, marginBottom: 10 },
  searchInput: { flex: 1, marginBottom: 0 },
  searchBtn: {
    minWidth: 90,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    paddingHorizontal: 10,
  },
  searchBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  templateLoader: { paddingVertical: 14, alignItems: 'center' },
  templateList: { maxHeight: 320 },
  templateRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  templateName: { fontSize: 14, color: theme.colors.text, fontWeight: '600' },
  templateFieldCount: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  templateCloseBtn: { marginTop: 10 },
});
