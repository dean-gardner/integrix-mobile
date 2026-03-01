import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import {
  fetchCompanyAssets,
  createAsset,
  editAsset,
  setAssetStatus,
  reassignAssetParent,
} from '../store/companyAssetsSlice';
import { getExternalIds, getAssetsBySearch } from '../api/companyAssets';
import { CompanyAssetStatus, type CompanyAssetNodeDTO, type CompanyAssetReadDTO } from '../types/companyAsset';
import { ListScreenLayout } from '../components/ListScreenLayout';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';

export default function CompanyAssetsScreen() {
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const { items, isLoading, error } = useSelector((s: RootState) => s.companyAssets);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createExternalId, setCreateExternalId] = useState('');
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingAsset, setEditingAsset] = useState<CompanyAssetNodeDTO | null>(null);
  const [editName, setEditName] = useState('');
  const [editExternalId, setEditExternalId] = useState('');
  const [editParentId, setEditParentId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [reassignAsset, setReassignAsset] = useState<CompanyAssetNodeDTO | null>(null);
  const [reassignParentId, setReassignParentId] = useState<number | null>(null);
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);
  const [externalIdsVisible, setExternalIdsVisible] = useState(false);
  const [externalIdsList, setExternalIdsList] = useState<string[]>([]);
  const [externalIdsLoading, setExternalIdsLoading] = useState(false);
  const [externalIdsError, setExternalIdsError] = useState<string | null>(null);
  const [searchVisible, setSearchVisible] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<CompanyAssetReadDTO[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [searchSearched, setSearchSearched] = useState(false);

  const fetch = useCallback(() => {
    if (user?.companyId) {
      dispatch(
        fetchCompanyAssets({
          companyId: user.companyId,
          parentAssetId: null,
          status: CompanyAssetStatus.Active,
        })
      );
    }
  }, [dispatch, user?.companyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    if (!user?.companyId) return;
    setRefreshing(true);
    await dispatch(
      fetchCompanyAssets({
        companyId: user.companyId,
        parentAssetId: null,
        status: CompanyAssetStatus.Active,
      })
    )
      .unwrap()
      .catch(() => {});
    setRefreshing(false);
  }, [dispatch, user?.companyId]);

  const openCreate = () => {
    setCreateName('');
    setCreateExternalId('');
    setCreateParentId(null);
    setCreateError(null);
    setCreateVisible(true);
  };

  const submitCreate = async () => {
    if (!user?.companyId) return;
    const name = (createName ?? '').trim();
    const externalId = (createExternalId ?? '').trim();
    if (!name) {
      setCreateError('Enter asset name.');
      return;
    }
    if (!externalId) {
      setCreateError('Enter external ID.');
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      await dispatch(
        createAsset({
          companyId: user.companyId,
          model: { name, parentId: createParentId, externalId },
        })
      ).unwrap();
      setCreateVisible(false);
    } catch (e) {
      setCreateError((e as string) || 'Failed to create asset');
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (a: CompanyAssetNodeDTO) => {
    setEditingAsset(a);
    setEditName(a.name);
    setEditExternalId(a.externalId ?? '');
    setEditParentId(a.parentId);
    setEditError(null);
  };

  const closeEdit = () => setEditingAsset(null);

  const openReassign = (a: CompanyAssetNodeDTO) => {
    setReassignAsset(a);
    setReassignParentId(a.parentId ?? null);
    setReassignError(null);
  };

  const closeReassign = () => setReassignAsset(null);

  const openExternalIds = useCallback(async () => {
    if (!user?.companyId) return;
    setExternalIdsVisible(true);
    setExternalIdsError(null);
    setExternalIdsLoading(true);
    try {
      const res = await getExternalIds(user.companyId);
      setExternalIdsList(res.data ?? []);
    } catch (e: unknown) {
      setExternalIdsList([]);
      setExternalIdsError((e as { message?: string })?.message ?? 'Failed to load external IDs');
    } finally {
      setExternalIdsLoading(false);
    }
  }, [user?.companyId]);

  const closeExternalIds = () => setExternalIdsVisible(false);

  const openSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSearchError(null);
    setSearchSearched(false);
    setSearchVisible(true);
  };

  const closeSearch = () => setSearchVisible(false);

  const runSearch = useCallback(async () => {
    if (!user?.companyId) return;
    const q = (searchQuery ?? '').trim();
    if (q.length < 2) {
      setSearchError('Enter at least 2 characters.');
      return;
    }
    setSearchError(null);
    setSearchSearched(true);
    setSearchLoading(true);
    try {
      const res = await getAssetsBySearch(user.companyId, q, undefined, true);
      setSearchResults(res.data ?? []);
    } catch (e: unknown) {
      setSearchResults([]);
      setSearchError((e as { message?: string })?.message ?? 'Search failed.');
    } finally {
      setSearchLoading(false);
    }
  }, [user?.companyId, searchQuery]);

  const submitEdit = async () => {
    if (!user?.companyId || !editingAsset) return;
    const name = (editName ?? '').trim();
    const externalId = (editExternalId ?? '').trim();
    if (!name) {
      setEditError('Enter asset name.');
      return;
    }
    if (!externalId) {
      setEditError('Enter external ID.');
      return;
    }
    setEditError(null);
    setEditing(true);
    try {
      await dispatch(
        editAsset({
          id: editingAsset.id,
          companyId: user.companyId,
          model: { name, parentId: editParentId, externalId },
        })
      ).unwrap();
      closeEdit();
    } catch (e) {
      setEditError((e as string) || 'Failed to edit asset');
    } finally {
      setEditing(false);
    }
  };

  const submitReassign = async () => {
    if (!user?.companyId || !reassignAsset) return;
    setReassignError(null);
    setReassigning(true);
    try {
      await dispatch(
        reassignAssetParent({
          companyId: user.companyId,
          model: {
            currentNodeId: reassignAsset.id,
            newParentNodeId: reassignParentId ?? null,
          },
        })
      ).unwrap();
      closeReassign();
    } catch (e) {
      setReassignError((e as string) || 'Failed to reassign parent');
    } finally {
      setReassigning(false);
    }
  };

  const isEmpty = !user?.companyId || items.length === 0;
  const emptyMessage = !user?.companyId ? 'Sign in to view assets.' : 'No assets yet.';

  return (
    <ListScreenLayout
      title="Assets"
      error={user?.companyId ? error : null}
      isLoading={user?.companyId ? isLoading : false}
      isEmpty={isEmpty}
      emptyMessage={emptyMessage}
      refreshing={refreshing}
      onRefresh={onRefresh}
    >
      <>
        {user?.companyId ? (
          <View style={styles.topActions}>
            <TouchableOpacity style={styles.createBtn} onPress={openCreate}>
              <Text style={styles.createBtnText}>Create asset</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={openExternalIds}>
              <Text style={styles.secondaryBtnText}>View external IDs</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.secondaryBtn} onPress={openSearch}>
              <Text style={styles.secondaryBtnText}>Search assets</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={screenStyles.list}>
          {items.map((a) => (
            <View key={a.id} style={screenStyles.card}>
              <View style={styles.assetRow}>
                <View style={styles.assetInfo}>
                  <Text style={styles.assetName}>
                    {a.namePrefix ? `${a.namePrefix} ` : ''}
                    {a.name}
                  </Text>
                  <Text style={styles.caption}>ID: {a.externalId}</Text>
                  {a.hasChildren ? (
                    <Text style={styles.caption}>Has children</Text>
                  ) : null}
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(a)}>
                    <Text style={styles.editBtnText}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reassignBtn} onPress={() => openReassign(a)}>
                    <Text style={styles.reassignBtnText}>Reassign</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.archiveBtn}
                    onPress={() =>
                      Alert.alert(
                        'Archive asset',
                        `Archive "${a.name}"? It will be removed from the active list.`,
                        [
                          { text: 'Cancel', style: 'cancel' },
                          {
                            text: 'Archive',
                            style: 'destructive',
                            onPress: () =>
                              user?.companyId &&
                              dispatch(
                                setAssetStatus({
                                  id: a.id,
                                  companyId: user.companyId,
                                  status: CompanyAssetStatus.Archived,
                                })
                              ),
                          },
                        ]
                      )
                    }
                  >
                    <Text style={styles.archiveBtnText}>Archive</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          ))}
        </View>
      </>
      <Modal visible={createVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Create asset</Text>
            {createError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{createError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>Asset name</Text>
            <TextInput
              style={screenStyles.formInput}
              value={createName}
              onChangeText={setCreateName}
              placeholder="Name"
              placeholderTextColor="#6c757d"
              editable={!creating}
            />
            <Text style={screenStyles.formLabel}>External ID</Text>
            <TextInput
              style={screenStyles.formInput}
              value={createExternalId}
              onChangeText={setCreateExternalId}
              placeholder="External ID"
              placeholderTextColor="#6c757d"
              editable={!creating}
            />
            <Text style={screenStyles.formLabel}>Parent asset (optional)</Text>
            <View style={styles.parentRow}>
              {[{ id: null, name: 'None' }, ...items].map((a) => (
                <TouchableOpacity
                  key={a.id != null ? a.id : 'none'}
                  style={[
                    styles.parentChip,
                    createParentId === a.id && styles.parentChipActive,
                  ]}
                  onPress={() => setCreateParentId(a.id)}
                >
                  <Text
                    style={[
                      styles.parentChipText,
                      createParentId === a.id && styles.parentChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {a.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
      <Modal visible={editingAsset != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Edit asset</Text>
            {editError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{editError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>Asset name</Text>
            <TextInput
              style={screenStyles.formInput}
              value={editName}
              onChangeText={setEditName}
              placeholder="Name"
              placeholderTextColor="#6c757d"
              editable={!editing}
            />
            <Text style={screenStyles.formLabel}>External ID</Text>
            <TextInput
              style={screenStyles.formInput}
              value={editExternalId}
              onChangeText={setEditExternalId}
              placeholder="External ID"
              placeholderTextColor="#6c757d"
              editable={!editing}
            />
            <Text style={screenStyles.formLabel}>Parent asset (optional)</Text>
            <View style={styles.parentRow}>
              {[
                { id: null, name: 'None' },
                ...items.filter((x) => x.id !== editingAsset?.id),
              ].map((x) => (
                <TouchableOpacity
                  key={x.id != null ? x.id : 'none'}
                  style={[
                    styles.parentChip,
                    editParentId === x.id && styles.parentChipActive,
                  ]}
                  onPress={() => setEditParentId(x.id)}
                >
                  <Text
                    style={[
                      styles.parentChipText,
                      editParentId === x.id && styles.parentChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {x.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
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
      <Modal visible={externalIdsVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.externalIdsCard]}>
            <Text style={styles.modalTitle}>External IDs</Text>
            <Text style={styles.externalIdsHint}>
              All external IDs in use (for reference when creating assets).
            </Text>
            {externalIdsError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{externalIdsError}</Text>
              </View>
            ) : null}
            {externalIdsLoading ? (
              <View style={styles.externalIdsLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : externalIdsList.length === 0 ? (
              <Text style={screenStyles.muted}>No external IDs.</Text>
            ) : (
              <ScrollView style={styles.externalIdsScroll} nestedScrollEnabled>
                {externalIdsList.map((id, idx) => (
                  <Text key={`${id}-${idx}`} style={styles.externalIdRow}>
                    {id}
                  </Text>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={closeExternalIds}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={searchVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, styles.externalIdsCard]}>
            <Text style={styles.modalTitle}>Search assets</Text>
            <View style={styles.searchRow}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={(t) => {
                  setSearchQuery(t);
                  setSearchError(null);
                }}
                placeholder="Name or external ID..."
                placeholderTextColor="#6c757d"
                returnKeyType="search"
                onSubmitEditing={runSearch}
                editable={!searchLoading}
              />
              <TouchableOpacity
                style={[styles.searchSubmitBtn, searchLoading && styles.buttonDisabled]}
                onPress={runSearch}
                disabled={searchLoading}
              >
                {searchLoading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.searchSubmitText}>Search</Text>
                )}
              </TouchableOpacity>
            </View>
            {searchError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{searchError}</Text>
              </View>
            ) : null}
            {searchSearched && !searchLoading ? (
              searchResults.length === 0 ? (
                <Text style={screenStyles.muted}>No assets found.</Text>
              ) : (
                <ScrollView style={styles.externalIdsScroll} nestedScrollEnabled>
                  {searchResults.map((a) => (
                    <View key={a.id} style={styles.searchResultRow}>
                      <Text style={styles.assetName} numberOfLines={1}>{a.name}</Text>
                      <Text style={styles.caption}>ID: {a.externalId}</Text>
                      {a.parentName ? (
                        <Text style={styles.caption}>Parent: {a.parentName}</Text>
                      ) : null}
                    </View>
                  ))}
                </ScrollView>
              )
            ) : null}
            <TouchableOpacity style={styles.cancelBtn} onPress={closeSearch}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={reassignAsset != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Reassign parent</Text>
            {reassignAsset ? (
              <Text style={styles.reassignHint}>Move "{reassignAsset.name}" under:</Text>
            ) : null}
            {reassignError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{reassignError}</Text>
              </View>
            ) : null}
            <View style={styles.parentRow}>
              {[{ id: null, name: 'None' }, ...items.filter((x) => x.id !== reassignAsset?.id)].map((x) => (
                <TouchableOpacity
                  key={x.id != null ? x.id : 'none'}
                  style={[styles.parentChip, reassignParentId === x.id && styles.parentChipActive]}
                  onPress={() => setReassignParentId(x.id)}
                >
                  <Text
                    style={[
                      styles.parentChipText,
                      reassignParentId === x.id && styles.parentChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {x.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeReassign}
                disabled={reassigning}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[screenStyles.formButton, reassigning && styles.buttonDisabled]}
                onPress={submitReassign}
                disabled={reassigning}
              >
                {reassigning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={screenStyles.formButtonText}>Reassign</Text>
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
  topActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 16 },
  createBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  createBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  secondaryBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  secondaryBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  externalIdsCard: { maxHeight: '80%' },
  externalIdsHint: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 12 },
  externalIdsLoader: { paddingVertical: 24, alignItems: 'center' },
  externalIdsScroll: { maxHeight: 320, marginBottom: 12 },
  externalIdRow: { fontSize: 14, color: theme.colors.text, paddingVertical: 6 },
  searchRow: { flexDirection: 'row', gap: 12, marginBottom: 12 },
  searchInput: { flex: 1, ...screenStyles.formInput, marginBottom: 0 },
  searchSubmitBtn: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    minWidth: 80,
  },
  searchSubmitText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  searchResultRow: {
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  assetRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  assetInfo: { flex: 1 },
  assetName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  caption: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  editBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  editBtnText: { fontSize: 14, color: theme.colors.primary },
  reassignBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  reassignBtnText: { fontSize: 14, color: theme.colors.primary },
  archiveBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  archiveBtnText: { fontSize: 14, color: theme.colors.error ?? '#dc3545' },
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
  reassignHint: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 12 },
  parentRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 16 },
  parentChip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  parentChipActive: { borderColor: theme.colors.primary, backgroundColor: theme.colors.primaryLight },
  parentChipText: { fontSize: 14, color: theme.colors.text },
  parentChipTextActive: { color: theme.colors.primary, fontWeight: '500' },
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
