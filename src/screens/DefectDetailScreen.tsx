import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { editDefect, deleteDefect } from '../store/defectsSlice';
import type { DefectReadDTO } from '../types/defect';
import type { FoundUserDTO } from '../types/user';
import {
  getDefectUsersSharedWith,
  shareDefects,
  unshareDefectUsers,
} from '../api/defects';
import { UserPickerModal } from '../components/UserPickerModal';
import { screenStyles } from '../styles/screenStyles';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

type DefectDetailParams = { defect: DefectReadDTO };

export default function DefectDetailScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: DefectDetailParams }, 'params'>>();
  const dispatch = useDispatch<AppDispatch>();
  const paramDefect = route.params?.defect;
  const defectFromList = useSelector((s: RootState) =>
    paramDefect ? s.defects.items.find((d) => d.id === paramDefect.id) : null
  );
  const defect = defectFromList ?? paramDefect;

  const [editVisible, setEditVisible] = useState(false);
  const [editDescription, setEditDescription] = useState(defect?.description ?? '');
  const [editing, setEditing] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [sharePickerVisible, setSharePickerVisible] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<FoundUserDTO[]>([]);
  const [sharedLoading, setSharedLoading] = useState(false);
  const [shareActionLoading, setShareActionLoading] = useState(false);

  useEffect(() => {
    if (!defect?.id) {
      setSharedUsers([]);
      return undefined;
    }
    let isCancelled = false;
    const loadSharedUsers = async () => {
      setSharedLoading(true);
      try {
        const res = await getDefectUsersSharedWith(defect.id);
        if (!isCancelled) {
          setSharedUsers(res.data ?? []);
        }
      } catch {
        if (!isCancelled) {
          setSharedUsers([]);
        }
      } finally {
        if (!isCancelled) {
          setSharedLoading(false);
        }
      }
    };
    loadSharedUsers().catch(() => {});
    return () => {
      isCancelled = true;
    };
  }, [defect?.id]);

  if (!defect) {
    return (
      <View style={screenStyles.container}>
        <Text style={screenStyles.muted}>{t('app.defect.notFound')}</Text>
      </View>
    );
  }

  const openEdit = () => {
    setEditDescription(defect.description ?? '');
    setEditError(null);
    setEditVisible(true);
  };

  const submitEdit = async () => {
    const description = (editDescription ?? '').trim();
    if (!description) {
      setEditError(t('app.defect.enterDescription'));
      return;
    }
    setEditError(null);
    setEditing(true);
    try {
      const formData = new FormData();
      formData.append('Description', description);
      await dispatch(editDefect({ defectId: defect.id, model: formData })).unwrap();
      setEditVisible(false);
    } catch (e) {
      setEditError((e as string) || t('app.defect.editFail'));
    } finally {
      setEditing(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      t('app.defect.deleteTitle'),
      t('app.defect.deleteConfirmNumber', { number: defect.defectNumber }),
      [
        { text: t('app.modal.cancel'), style: 'cancel' },
        {
          text: t('app.modal.delete'),
          style: 'destructive',
          onPress: async () => {
            try {
              await dispatch(deleteDefect(defect.id)).unwrap();
              navigation.goBack();
            } catch {
              Alert.alert(t('app.alerts.error'), t('app.defect.deleteFail'));
            }
          },
        },
      ]
    );
  };

  const handleShareUser = async (user: FoundUserDTO) => {
    setShareActionLoading(true);
    try {
      await shareDefects({
        itemsIds: [defect.id],
        usersToShare: [user],
      });
      const res = await getDefectUsersSharedWith(defect.id);
      setSharedUsers(res.data ?? []);
      Alert.alert(t('app.defect.shareTitle'), t('app.defect.shareOk', { name: user.fullName || user.email }));
    } catch (e) {
      Alert.alert(t('app.defect.shareTitle'), (e as string) || t('app.defect.shareFail'));
    } finally {
      setShareActionLoading(false);
    }
  };

  const handleUnshareUser = async (user: FoundUserDTO) => {
    setShareActionLoading(true);
    try {
      await unshareDefectUsers(defect.id, [user]);
      setSharedUsers((prev) =>
        prev.filter((u) => {
          const byUserId = Boolean(u.userId) && Boolean(user.userId) && u.userId === user.userId;
          const byEmail = u.email.toLowerCase() === user.email.toLowerCase();
          return !(byUserId || byEmail);
        })
      );
      Alert.alert(t('app.defect.shareTitle'), t('app.defect.unshareOk', { name: user.fullName || user.email }));
    } catch (e) {
      Alert.alert(t('app.defect.shareTitle'), (e as string) || t('app.defect.unshareFail'));
    } finally {
      setShareActionLoading(false);
    }
  };

  return (
    <ScrollView style={screenStyles.container} contentContainerStyle={styles.content}>
      <View style={screenStyles.card}>
        <Text style={styles.number}>{defect.defectNumber}</Text>
        <Text style={screenStyles.formLabel}>{t('app.tasks.status')}</Text>
        <Text style={styles.value}>{defect.statusCode}</Text>
        <Text style={screenStyles.formLabel}>{t('app.tasksScreen.description')}</Text>
        <Text style={styles.value}>{defect.description ?? '—'}</Text>
        <Text style={screenStyles.formLabel}>{t('app.defect.created')}</Text>
        <Text style={styles.value}>
          {defect.createdByName}
          {defect.createdOnUtc
            ? ` · ${new Date(defect.createdOnUtc).toLocaleString(undefined, {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit',
              })}`
            : ''}
        </Text>
        {defect.assetName ? (
          <>
            <Text style={screenStyles.formLabel}>{t('app.task.asset')}</Text>
            <Text style={styles.value}>{defect.assetName}</Text>
          </>
        ) : null}
      </View>
      <View style={styles.actions}>
        <TouchableOpacity style={styles.editButton} onPress={openEdit}>
          <Text style={styles.editButtonText}>{t('app.common.edit')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.shareButton, shareActionLoading && styles.buttonDisabled]}
          onPress={() => setSharePickerVisible(true)}
          disabled={shareActionLoading}
        >
          <Text style={styles.shareButtonText}>{t('app.defect.shareUserBtn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.deleteButton} onPress={handleDelete}>
          <Text style={styles.deleteButtonText}>{t('app.common.delete')}</Text>
        </TouchableOpacity>
      </View>

      <View style={screenStyles.card}>
        <Text style={styles.sectionTitle}>{t('app.task.sharedWith')}</Text>
        {sharedLoading ? (
          <ActivityIndicator size="small" color={theme.colors.primary} />
        ) : sharedUsers.length === 0 ? (
          <Text style={screenStyles.muted}>{t('app.task.noUsersYet')}</Text>
        ) : (
          sharedUsers.map((u, i) => (
            <View key={`${u.userId ?? u.email}-${i}`} style={styles.userRow}>
              <View style={styles.userTextWrap}>
                <Text style={styles.userName}>{u.fullName || u.email}</Text>
                {u.fullName ? <Text style={screenStyles.muted}>{u.email}</Text> : null}
              </View>
              <TouchableOpacity
                style={[styles.unshareBtn, shareActionLoading && styles.buttonDisabled]}
                onPress={() => handleUnshareUser(u)}
                disabled={shareActionLoading}
              >
                <Text style={styles.unshareBtnText}>{t('app.defect.unshareBtn')}</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>

      <Modal visible={editVisible} transparent animationType="fade">
        <View style={styles.modalBackdrop}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>{t('app.defect.editDefect')}</Text>
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
              placeholder={t('app.tasksScreen.description')}
              placeholderTextColor="#6c757d"
              multiline
              numberOfLines={4}
              editable={!editing}
            />
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelBtn}
                onPress={() => setEditVisible(false)}
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
      <UserPickerModal
        visible={sharePickerVisible}
        onClose={() => setSharePickerVisible(false)}
        onSelect={handleShareUser}
        title={t('app.defect.shareWithUserTitle')}
      />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { padding: theme.spacing.pagePadding },
  number: { fontSize: 20, fontWeight: '700', color: theme.colors.text, marginBottom: 16 },
  value: { fontSize: 14, color: theme.colors.text, marginBottom: 12 },
  actions: { flexDirection: 'row', gap: 12, marginTop: 16 },
  editButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  editButtonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  shareButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  shareButtonText: { fontSize: 16, color: theme.colors.primary, fontWeight: '600' },
  deleteButton: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.error ?? '#dc3545',
  },
  deleteButtonText: { fontSize: 16, color: theme.colors.error ?? '#dc3545' },
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
  sectionTitle: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 8 },
  userRow: {
    paddingVertical: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  userTextWrap: { flex: 1, paddingRight: 8 },
  userName: { fontSize: 14, color: theme.colors.text, fontWeight: '500' },
  unshareBtn: {
    borderWidth: 1,
    borderColor: theme.colors.error ?? '#dc3545',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  unshareBtnText: { color: theme.colors.error ?? '#dc3545', fontSize: 12, fontWeight: '600' },
});
