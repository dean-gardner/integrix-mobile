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
import { theme } from '../theme';

export default function ObservationsScreen() {
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
      setCreateError('Enter a description.');
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      await dispatch(createObservation({ description })).unwrap();
      setCreateVisible(false);
    } catch (e) {
      setCreateError((e as string) || 'Failed to create observation');
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
      setEditError('Enter a description.');
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
      setEditError((e as string) || 'Failed to edit observation');
    } finally {
      setEditing(false);
    }
  };

  return (
    <ListScreenLayout
      title="Observations"
      error={error}
      isLoading={isLoading}
      isEmpty={items.length === 0}
      emptyMessage="No observations yet."
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <>
        <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
          <Text style={styles.createBtnText}>Create observation</Text>
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
                  <Text style={styles.caption}>Asset: {o.assetName}</Text>
                ) : null}
              </View>
              <View style={styles.rowActions}>
                {o.canEdit !== false ? (
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(o)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                ) : null}
                {o.canDelete !== false ? (
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() =>
                      Alert.alert(
                        'Delete observation',
                        'Delete this observation?',
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Delete',
                            style: 'destructive',
                            onPress: () => dispatch(deleteObservation(o.id)),
                          },
                        ]
                      )
                    }
                  >
                    <Text style={styles.deleteBtnText}>Delete</Text>
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
            <Text style={styles.modalTitle}>Create observation</Text>
            {createError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{createError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>Description</Text>
            <TextInput
              style={[screenStyles.formInput, styles.textArea]}
              value={createDescription}
              onChangeText={setCreateDescription}
              placeholder="Describe the observation..."
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
          </View>
        </View>
      </Modal>
      <Modal visible={editingObservation != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit observation</Text>
            {editError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{editError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>Description</Text>
            <TextInput
              style={[screenStyles.formInput, styles.textArea]}
              value={editDescription}
              onChangeText={setEditDescription}
              placeholder="Describe the observation..."
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
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[screenStyles.formButton, editing && styles.buttonDisabled]}
                onPress={submitEdit}
                disabled={editing}
              >
                {editing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={screenStyles.formButtonText}>Save</Text>
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
