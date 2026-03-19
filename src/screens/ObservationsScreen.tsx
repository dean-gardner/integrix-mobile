import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useDispatch } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import {
  fetchObservations,
  fetchMoreObservations,
  createObservation,
  editObservation,
  deleteObservation,
} from '../store/observationsSlice';
import type { ObservationFeedReadDTO } from '../types/observation';
import { usePaginatedList } from '../hooks/usePaginatedList';
import { ListScreenLayout, LoadMoreButton } from '../components/ListScreenLayout';
import { screenStyles } from '../styles/screenStyles';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

export default function ObservationsScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const fetch = useCallback(() => dispatch(fetchObservations()), [dispatch]);
  const fetchMore = useCallback(() => dispatch(fetchMoreObservations()), [dispatch]);
  const [createVisible, setCreateVisible] = useState(false);
  const [createDescription, setCreateDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingObservation, setEditingObservation] = useState<ObservationFeedReadDTO | null>(null);
  const [editDescription, setEditDescription] = useState('');
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

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
    selector: (s: RootState) => s.observations,
    fetch,
    fetchMore,
  });

  const openCreate = () => {
    setCreateDescription('');
    setCreateError(null);
    setCreateVisible(true);
  };

  const submitCreate = async () => {
    const description = (createDescription ?? '').trim();
    if (!description) {
      setCreateError(t('app.observations.enterDesc'));
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      await dispatch(createObservation({ description })).unwrap();
      setCreateVisible(false);
    } catch (e) {
      setCreateError((e as string) || t('app.observations.createFail'));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (o: ObservationFeedReadDTO) => {
    setEditingObservation(o);
    setEditDescription(o.description ?? '');
    setEditError(null);
  };

  const closeEdit = () => setEditingObservation(null);

  const submitEdit = async () => {
    if (!editingObservation) return;
    const description = (editDescription ?? '').trim();
    if (!description) {
      setEditError(t('app.observations.enterDesc'));
      return;
    }
    setEditError(null);
    setEditing(true);
    try {
      await dispatch(
        editObservation({ observationId: editingObservation.id, description })
      ).unwrap();
      closeEdit();
    } catch (e) {
      setEditError((e as string) || t('app.observations.editFail'));
    } finally {
      setEditing(false);
    }
  };

  return (
    <ListScreenLayout
      title={t('app.observations.title')}
      error={error}
      isLoading={isLoading}
      isEmpty={items.length === 0}
      emptyMessage={t('app.observations.empty')}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <>
        <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
          <Text style={styles.createBtnText}>{t('app.observations.createBtn')}</Text>
        </TouchableOpacity>
      <View style={screenStyles.list}>
        {items.map((o) => (
          <View key={o.id} style={screenStyles.card}>
            <View style={styles.cardRow}>
              <View style={styles.cardContent}>
                <Text style={styles.taskTitle}>{o.taskTitle}</Text>
                {o.taskSectionTitle ? (
                  <Text style={styles.section}>{o.taskSectionTitle}</Text>
                ) : null}
                <Text style={styles.desc} numberOfLines={3}>
                  {o.description ?? '—'}
                </Text>
                <Text style={screenStyles.muted}>
                  {o.createdByName}
                  {o.createdOnUtc
                    ? ` · ${new Date(o.createdOnUtc).toLocaleString(undefined, {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}`
                    : ''}
                </Text>
                {o.assetName ? (
                  <Text style={styles.caption}>
                    {t('app.observations.assetCaption', { name: o.assetName })}
                  </Text>
                ) : null}
              </View>
              <View style={styles.rowActions}>
                {o.canEdit !== false ? (
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(o)}>
                    <Text style={styles.editBtnText}>{t('app.common.edit')}</Text>
                  </TouchableOpacity>
                ) : null}
                {o.canDelete !== false ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() =>
                      Alert.alert(
                        t('app.observations.deleteTitle'),
                        t('app.observations.deleteConfirm'),
                        [
                          { text: t('app.modal.cancel'), style: 'cancel' },
                          {
                            text: t('app.modal.delete'),
                            style: 'destructive',
                            onPress: () => dispatch(deleteObservation(o.id)),
                          },
                        ]
                      )
                    }
                  >
                    <Text style={styles.deleteBtnText}>{t('app.common.delete')}</Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            </View>
          </View>
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
            <Text style={styles.modalTitle}>{t('app.observations.createTitle')}</Text>
            {createError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{createError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>{t('app.tasksScreen.description')}</Text>
            <TextInput
              style={[screenStyles.formInput, styles.textArea]}
              value={createDescription}
              onChangeText={setCreateDescription}
              placeholder={t('app.observations.describePh')}
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={4}
              editable={!creating}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setCreateVisible(false)}
                disabled={creating}
              >
                <Text style={styles.cancelBtnText}>{t('app.modal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[screenStyles.formButton, creating && styles.buttonDisabled]}
                onPress={submitCreate}
                disabled={creating}
              >
                {creating ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={screenStyles.formButtonText}>{t('app.observations.createAction')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={editingObservation != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('app.observations.editTitle')}</Text>
            {editError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{editError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>{t('app.tasksScreen.description')}</Text>
            <TextInput
              style={[screenStyles.formInput, styles.textArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder={t('app.observations.describePh')}
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={4}
              editable={!editing}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeEdit}
                disabled={editing}
              >
                <Text style={styles.cancelBtnText}>{t('app.modal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[screenStyles.formButton, editing && styles.buttonDisabled]}
                onPress={submitEdit}
                disabled={editing}
              >
                {editing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={screenStyles.formButtonText}>{t('app.common.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
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
  cardRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'space-between' },
  cardContent: { flex: 1 },
  taskTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  editBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  editBtnText: { fontSize: 14, color: theme.colors.primary },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  deleteBtnText: { fontSize: 14, color: theme.colors.error ?? '#dc3545' },
  section: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 8 },
  desc: { fontSize: 14, color: theme.colors.text, marginBottom: 8 },
  caption: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
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
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 16 },
  textArea: { minHeight: 100, textAlignVertical: 'top' },
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
});
