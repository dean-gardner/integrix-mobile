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
import { fetchTeams, createTeam, editTeam, deleteTeam, reassignParentNode } from '../store/teamsSlice';
import { getTeamsToJoin, joinTeam as apiJoinTeam, requestNewTeam } from '../api/teams';
import type { CompanyTeamNodeDTO, CompanyTeamReadDTO } from '../types/team';
import { useTranslation } from 'react-i18next';
import { ListScreenLayout } from '../components/ListScreenLayout';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';

export default function TeamsScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const user = useSelector((s: RootState) => s.auth.user);
  const { items, isLoading, error } = useSelector((s: RootState) => s.teams);
  const [refreshing, setRefreshing] = useState(false);
  const [createVisible, setCreateVisible] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createParentId, setCreateParentId] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [createError, setCreateError] = useState<string | null>(null);
  const [editingTeam, setEditingTeam] = useState<CompanyTeamNodeDTO | null>(null);
  const [editName, setEditName] = useState('');
  const [editParentId, setEditParentId] = useState<number | null>(null);
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [joinVisible, setJoinVisible] = useState(false);
  const [teamsToJoin, setTeamsToJoin] = useState<CompanyTeamReadDTO[]>([]);
  const [joinListLoading, setJoinListLoading] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joiningId, setJoiningId] = useState<number | null>(null);
  const [requestVisible, setRequestVisible] = useState(false);
  const [requestName, setRequestName] = useState('');
  const [requesting, setRequesting] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [reassignTeam, setReassignTeam] = useState<CompanyTeamNodeDTO | null>(null);
  const [reassignParentId, setReassignParentId] = useState<number>(0);
  const [reassigning, setReassigning] = useState(false);
  const [reassignError, setReassignError] = useState<string | null>(null);

  const fetch = useCallback(() => {
    if (user?.companyId) dispatch(fetchTeams(user.companyId));
  }, [dispatch, user?.companyId]);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    if (!user?.companyId) return;
    setRefreshing(true);
    await dispatch(fetchTeams(user.companyId)).unwrap().catch(() => {});
    setRefreshing(false);
  }, [dispatch, user?.companyId]);

  const openCreate = () => {
    setCreateName('');
    setCreateParentId(null);
    setCreateError(null);
    setCreateVisible(true);
  };

  const submitCreate = async () => {
    if (!user?.companyId) return;
    const name = (createName ?? '').trim();
    if (!name) {
      setCreateError(t('app.teams.enterTeamName'));
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      await dispatch(
        createTeam({
          companyId: user.companyId,
          model: { name, parentTeamId: createParentId },
        })
      ).unwrap();
      setCreateVisible(false);
    } catch (e) {
      setCreateError((e as string) || t('app.teams.createFail'));
    } finally {
      setCreating(false);
    }
  };

  const openEdit = (teamNode: CompanyTeamNodeDTO) => {
    setEditingTeam(teamNode);
    setEditName(teamNode.name);
    setEditParentId(teamNode.parentId);
    setEditError(null);
  };

  const closeEdit = () => setEditingTeam(null);

  const openJoin = useCallback(async () => {
    if (!user?.companyId) return;
    setJoinVisible(true);
    setJoinError(null);
    setJoinListLoading(true);
    try {
      const res = await getTeamsToJoin(user.companyId);
      setTeamsToJoin(res.data ?? []);
    } catch (e: unknown) {
      setTeamsToJoin([]);
      setJoinError((e as { message?: string })?.message ?? t('app.teams.loadTeamsFail'));
    } finally {
      setJoinListLoading(false);
    }
  }, [user?.companyId, t]);

  const closeJoin = () => setJoinVisible(false);

  const onJoinTeam = async (teamDto: CompanyTeamReadDTO) => {
    if (!user?.companyId) return;
    setJoiningId(teamDto.id);
    setJoinError(null);
    try {
      await apiJoinTeam(user.companyId, teamDto.id, { token: null });
      setTeamsToJoin((prev) => prev.filter((x) => x.id !== teamDto.id));
    } catch (e: unknown) {
      setJoinError((e as { message?: string })?.message ?? t('app.teams.joinFail'));
    } finally {
      setJoiningId(null);
    }
  };

  const openRequest = () => {
    setRequestName('');
    setRequestError(null);
    setRequestVisible(true);
  };

  const closeRequest = () => setRequestVisible(false);

  const submitRequest = async () => {
    if (!user?.companyId) return;
    const teamName = (requestName ?? '').trim();
    if (!teamName) {
      setRequestError(t('app.teams.enterRequestName'));
      return;
    }
    setRequestError(null);
    setRequesting(true);
    try {
      await requestNewTeam(user.companyId, {
        teamName,
        token: null,
        invitationId: null,
      });
      setRequestVisible(false);
    } catch (e: unknown) {
      setRequestError((e as { message?: string })?.message ?? t('app.teams.requestFail'));
    } finally {
      setRequesting(false);
    }
  };

  const openReassign = (teamNode: CompanyTeamNodeDTO) => {
    setReassignTeam(teamNode);
    setReassignParentId(teamNode.parentId ?? 0);
    setReassignError(null);
  };

  const closeReassign = () => setReassignTeam(null);

  const submitReassign = async () => {
    if (!user?.companyId || !reassignTeam) return;
    setReassignError(null);
    setReassigning(true);
    try {
      await dispatch(
        reassignParentNode({
          companyId: user.companyId,
          model: {
            currentNodeId: reassignTeam.id,
            newParentNodeId: reassignParentId,
          },
        })
      ).unwrap();
      closeReassign();
    } catch (e) {
      setReassignError((e as string) || t('app.teams.reassignFail'));
    } finally {
      setReassigning(false);
    }
  };

  const submitEdit = async () => {
    if (!user?.companyId || !editingTeam) return;
    const name = (editName ?? '').trim();
    if (!name) {
      setEditError(t('app.teams.enterTeamName'));
      return;
    }
    setEditError(null);
    setEditing(true);
    try {
      await dispatch(
        editTeam({
          companyId: user.companyId,
          model: { id: editingTeam.id, name, parentTeamId: editParentId },
        })
      ).unwrap();
      closeEdit();
    } catch (e) {
      setEditError((e as string) || t('app.teams.editFail'));
    } finally {
      setEditing(false);
    }
  };

  const isEmpty = !user?.companyId || items.length === 0;
  const emptyMessage = !user?.companyId
    ? t('app.teams.signInToView')
    : t('app.teams.emptyYet');

  return (
    <ListScreenLayout
      title={t('app.teams.title')}
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
              <Text style={styles.createBtnText}>{t('app.teams.createTeam')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.joinBtn} onPress={openJoin}>
              <Text style={styles.joinBtnText}>{t('app.teams.joinTeam')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.joinBtn} onPress={openRequest}>
              <Text style={styles.joinBtnText}>{t('app.teams.requestNewTeam')}</Text>
            </TouchableOpacity>
          </View>
        ) : null}
        <View style={screenStyles.list}>
          {items.map((teamItem) => (
            <View key={teamItem.id} style={screenStyles.card}>
              <View style={styles.teamRow}>
                <View style={styles.teamInfo}>
                  <Text style={styles.teamName}>{teamItem.name}</Text>
                  {teamItem.parentId != null ? (
                    <Text style={styles.caption}>
                      {t('app.teams.parentIdCaption', { id: teamItem.parentId })}
                    </Text>
                  ) : null}
                </View>
                <View style={styles.rowActions}>
                  <TouchableOpacity style={styles.editBtn} onPress={() => openEdit(teamItem)}>
                    <Text style={styles.editBtnText}>{t('app.companyAssets.edit')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={styles.reassignBtn} onPress={() => openReassign(teamItem)}>
                    <Text style={styles.reassignBtnText}>{t('app.companyAssets.reassign')}</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.deleteBtn}
                    onPress={() =>
                      Alert.alert(
                        t('app.teams.deleteTitle'),
                        t('app.teams.deleteMessage', { name: teamItem.name }),
                        [
                          { text: t('app.modal.cancel'), style: 'cancel' },
                          {
                            text: t('app.teams.deleteAction'),
                            style: 'destructive',
                            onPress: () => dispatch(deleteTeam(teamItem.id)),
                          },
                        ]
                      )
                    }
                  >
                    <Text style={styles.deleteBtnText}>{t('app.teams.deleteAction')}</Text>
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
            <Text style={styles.modalTitle}>{t('app.teams.createTitle')}</Text>
            {createError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{createError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>{t('app.teams.teamName')}</Text>
            <TextInput
              style={screenStyles.formInput}
              value={createName}
              onChangeText={setCreateName}
              placeholder={t('app.teams.namePh')}
              placeholderTextColor="#6c757d"
              editable={!creating}
            />
            <Text style={screenStyles.formLabel}>{t('app.teams.parentTeamOptional')}</Text>
            <View style={styles.parentRow}>
              {[{ id: null as number | null }, ...items].map((chip) => (
                <TouchableOpacity
                  key={chip.id != null ? chip.id : 'none'}
                  style={[
                    styles.parentChip,
                    createParentId === chip.id && styles.parentChipActive,
                  ]}
                  onPress={() => setCreateParentId(chip.id)}
                >
                  <Text
                    style={[
                      styles.parentChipText,
                      createParentId === chip.id && styles.parentChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {chip.id == null ? t('app.teams.none') : chip.name}
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
                  <Text style={screenStyles.formButtonText}>{t('app.defects.createAction')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={editingTeam != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('app.teams.editTitle')}</Text>
            {editError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{editError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>{t('app.teams.teamName')}</Text>
            <TextInput
              style={screenStyles.formInput}
              value={editName}
              onChangeText={setEditName}
              placeholder={t('app.teams.namePh')}
              placeholderTextColor="#6c757d"
              editable={!editing}
            />
            <Text style={screenStyles.formLabel}>{t('app.teams.parentTeamOptional')}</Text>
            <View style={styles.parentRow}>
              {[
                { id: null as number | null },
                ...items.filter((x) => x.id !== editingTeam?.id),
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
                    {x.id == null ? t('app.teams.none') : x.name}
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
                  <Text style={screenStyles.formButtonText}>{t('app.companyAssets.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={joinVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('app.teams.joinTitle')}</Text>
            {joinError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{joinError}</Text>
              </View>
            ) : null}
            {joinListLoading ? (
              <View style={styles.joinLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : teamsToJoin.length === 0 ? (
              <Text style={screenStyles.muted}>{t('app.teams.joinEmpty')}</Text>
            ) : (
              <ScrollView style={styles.joinList} nestedScrollEnabled>
                {teamsToJoin.map((row) => (
                  <View key={row.id} style={styles.joinRow}>
                    <Text style={styles.teamName} numberOfLines={1}>
                      {row.name}
                    </Text>
                    <TouchableOpacity
                      style={[styles.joinTeamBtn, joiningId === row.id && styles.joinTeamBtnDisabled]}
                      onPress={() => onJoinTeam(row)}
                      disabled={joiningId != null}
                    >
                      {joiningId === row.id ? (
                        <ActivityIndicator size="small" color="#fff" />
                      ) : (
                        <Text style={styles.joinTeamBtnText}>{t('app.teams.joinBtn')}</Text>
                      )}
                    </TouchableOpacity>
                  </View>
                ))}
              </ScrollView>
            )}
            <TouchableOpacity style={styles.cancelBtn} onPress={closeJoin}>
              <Text style={styles.cancelBtnText}>{t('app.modal.close')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
      <Modal visible={reassignTeam != null} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('app.teams.reassign')}</Text>
            {reassignTeam ? (
              <Text style={styles.reassignHint}>
                {t('app.companyAssets.reassignMove', { name: reassignTeam.name })}
              </Text>
            ) : null}
            {reassignError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{reassignError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>{t('app.teams.newParentTeam')}</Text>
            <View style={styles.parentRow}>
              {[
                { id: 0, name: '__root__' as const },
                ...items.filter((x) => x.id !== reassignTeam?.id),
              ].map((x) => (
                <TouchableOpacity
                  key={x.id}
                  style={[
                    styles.parentChip,
                    reassignParentId === x.id && styles.parentChipActive,
                  ]}
                  onPress={() => setReassignParentId(x.id)}
                >
                  <Text
                    style={[
                      styles.parentChipText,
                      reassignParentId === x.id && styles.parentChipTextActive,
                    ]}
                    numberOfLines={1}
                  >
                    {x.name === '__root__' ? t('app.teams.noneRoot') : x.name}
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
                <Text style={styles.cancelBtnText}>{t('app.modal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[screenStyles.formButton, reassigning && styles.buttonDisabled]}
                onPress={submitReassign}
                disabled={reassigning}
              >
                {reassigning ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={screenStyles.formButtonText}>{t('app.companyAssets.save')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
      <Modal visible={requestVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('app.teams.requestTitle')}</Text>
            <Text style={styles.requestHint}>{t('app.teams.requestHint')}</Text>
            {requestError ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{requestError}</Text>
              </View>
            ) : null}
            <Text style={screenStyles.formLabel}>{t('app.teams.requestedTeamName')}</Text>
            <TextInput
              style={screenStyles.formInput}
              value={requestName}
              onChangeText={setRequestName}
              placeholder={t('app.teams.namePh')}
              placeholderTextColor="#6c757d"
              editable={!requesting}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={closeRequest}
                disabled={requesting}
              >
                <Text style={styles.cancelBtnText}>{t('app.modal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[screenStyles.formButton, requesting && styles.buttonDisabled]}
                onPress={submitRequest}
                disabled={requesting}
              >
                {requesting ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={screenStyles.formButtonText}>{t('app.teams.submit')}</Text>
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
  joinBtn: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  joinBtnText: { fontSize: 14, fontWeight: '600', color: theme.colors.primary },
  joinLoader: { paddingVertical: 24, alignItems: 'center' },
  joinList: { maxHeight: 320, marginBottom: 12 },
  joinRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  joinTeamBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
    minWidth: 70,
    alignItems: 'center',
  },
  joinTeamBtnDisabled: { opacity: 0.7 },
  joinTeamBtnText: { color: '#fff', fontSize: 14, fontWeight: '600' },
  requestHint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  teamRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamInfo: { flex: 1 },
  teamName: { fontSize: 16, fontWeight: '600', color: theme.colors.text },
  caption: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
  editBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  editBtnText: { fontSize: 14, color: theme.colors.primary },
  reassignBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  reassignBtnText: { fontSize: 14, color: theme.colors.primary },
  deleteBtn: { paddingVertical: 8, paddingHorizontal: 12 },
  reassignHint: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 12 },
  deleteBtnText: { fontSize: 14, color: theme.colors.error ?? '#dc3545' },
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
  cancelBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', borderRadius: 8, borderWidth: 1, borderColor: theme.colors.border },
  cancelBtnText: { fontSize: 16, color: theme.colors.text },
  buttonDisabled: { opacity: 0.7 },
});
