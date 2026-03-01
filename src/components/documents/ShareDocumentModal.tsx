import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { getUsersBySearch } from '../../api/users';
import {
  getDocumentUsersSharedWith,
  shareDocuments,
  unshareDocumentUsers,
} from '../../api/documents';
import type { DocumentVersionReadDTO } from '../../types/document';
import type { FoundUserDTO } from '../../types/user';
import { theme } from '../../theme';

type ShareDocumentModalProps = {
  visible: boolean;
  document: DocumentVersionReadDTO | null;
  onClose: () => void;
};

const MIN_SEARCH_LENGTH = 2;

function getUserKey(user: Pick<FoundUserDTO, 'userId' | 'email'>): string {
  if (user.userId) return `id:${user.userId}`;
  return `email:${user.email.toLowerCase()}`;
}

function usersEqual(a: Pick<FoundUserDTO, 'userId' | 'email'>, b: Pick<FoundUserDTO, 'userId' | 'email'>): boolean {
  if (a.userId && b.userId) return a.userId === b.userId;
  return a.email.toLowerCase() === b.email.toLowerCase();
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function extractEmails(value: string): string[] {
  const matches = value.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g) ?? [];
  const unique = new Set<string>();
  matches.forEach((email) => {
    const trimmed = email.trim().toLowerCase();
    if (trimmed && isValidEmail(trimmed)) unique.add(trimmed);
  });
  return Array.from(unique);
}

function dedupeUsers(users: FoundUserDTO[]): FoundUserDTO[] {
  const map = new Map<string, FoundUserDTO>();
  users.forEach((user) => { map.set(getUserKey(user), user); });
  return Array.from(map.values());
}

export function ShareDocumentModal({ visible, document, onClose }: ShareDocumentModalProps) {
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FoundUserDTO[]>([]);

  const [loadingSharedUsers, setLoadingSharedUsers] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<FoundUserDTO[]>([]);
  const [usersToShare, setUsersToShare] = useState<FoundUserDTO[]>([]);
  const [usersToUnshare, setUsersToUnshare] = useState<FoundUserDTO[]>([]);
  const [saving, setSaving] = useState(false);

  const ownerName = document?.createdByName ?? 'Owner';
  const ownerEmail =
    (typeof document?.createdByEmail === 'string' && document.createdByEmail) || null;

  const displayedSharedUsers = useMemo(() => {
    return sharedUsers.filter(
      (user) => !usersToUnshare.some((removedUser) => usersEqual(user, removedUser))
    );
  }, [sharedUsers, usersToUnshare]);

  const queryUsersToShare = useMemo(() => {
    const ownerEmailLower = ownerEmail?.toLowerCase();
    return extractEmails(query)
      .filter((email) => !ownerEmailLower || email !== ownerEmailLower)
      .filter((email) => !sharedUsers.some((u) => u.email.toLowerCase() === email))
      .filter((email) => !usersToShare.some((u) => u.email.toLowerCase() === email))
      .map((email) => ({ fullName: null, email, userId: null, companyTeam: null } as FoundUserDTO));
  }, [ownerEmail, query, sharedUsers, usersToShare]);

  const canSave = usersToShare.length > 0 || usersToUnshare.length > 0 || queryUsersToShare.length > 0;

  const resetState = useCallback(() => {
    setQuery('');
    setSearchResults([]);
    setSearchLoading(false);
    setLoadingSharedUsers(false);
    setSharedUsers([]);
    setUsersToShare([]);
    setUsersToUnshare([]);
    setSaving(false);
  }, []);

  const closeModal = useCallback(() => {
    resetState();
    onClose();
  }, [onClose, resetState]);

  const loadSharedUsers = useCallback(async () => {
    if (!document?.id) return;
    setLoadingSharedUsers(true);
    try {
      const response = await getDocumentUsersSharedWith(document.id);
      setSharedUsers(response.data ?? []);
    } catch {
      setSharedUsers([]);
    } finally {
      setLoadingSharedUsers(false);
    }
  }, [document?.id]);

  useEffect(() => {
    if (!visible) { resetState(); return; }
    loadSharedUsers().catch(() => {});
  }, [visible, loadSharedUsers, resetState]);

  useEffect(() => {
    if (!visible) return;
    const trimmed = query.trim();
    if (trimmed.length < MIN_SEARCH_LENGTH) {
      setSearchResults([]);
      setSearchLoading(false);
      return;
    }

    let isCancelled = false;
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const response = await getUsersBySearch({
          search: trimmed,
          shouldFindTeams: true,
          onlyRegisteredUsers: false,
          onlyCompanyTeamUsers: false,
          includeOwnPerson: true,
        });
        if (isCancelled) return;
        const ownerEmailLower = ownerEmail?.toLowerCase();
        const filtered = (response.data ?? []).filter(
          (user) => !ownerEmailLower || user.email.toLowerCase() !== ownerEmailLower
        );
        setSearchResults(filtered);
      } catch {
        if (!isCancelled) setSearchResults([]);
      } finally {
        if (!isCancelled) setSearchLoading(false);
      }
    }, 300);

    return () => { isCancelled = true; clearTimeout(timer); };
  }, [ownerEmail, query, visible]);

  const addUserToShare = useCallback(
    (user: FoundUserDTO) => {
      if (ownerEmail && user.email.toLowerCase() === ownerEmail.toLowerCase()) return;
      setUsersToUnshare((prev) => prev.filter((u) => !usersEqual(u, user)));
      setUsersToShare((prev) => {
        if (prev.some((u) => usersEqual(u, user))) return prev;
        if (sharedUsers.some((u) => usersEqual(u, user))) return prev;
        return [...prev, user];
      });
    },
    [ownerEmail, sharedUsers]
  );

  const removeSharedUser = useCallback((user: FoundUserDTO) => {
    setUsersToUnshare((prev) => {
      if (prev.some((u) => usersEqual(u, user))) return prev;
      return [...prev, user];
    });
  }, []);

  const removePendingShareUser = useCallback((user: FoundUserDTO) => {
    setUsersToShare((prev) => prev.filter((u) => !usersEqual(u, user)));
  }, []);

  const addUsersToShare = useCallback(
    (users: FoundUserDTO[]) => {
      if (users.length === 0) return;
      setUsersToUnshare((prev) => prev.filter((u) => !users.some((candidate) => usersEqual(u, candidate))));
      setUsersToShare((prev) => {
        const next = [...prev];
        users.forEach((user) => {
          if (ownerEmail && user.email.toLowerCase() === ownerEmail.toLowerCase()) return;
          if (next.some((u) => usersEqual(u, user))) return;
          if (sharedUsers.some((u) => usersEqual(u, user))) return;
          next.push(user);
        });
        return next;
      });
    },
    [ownerEmail, sharedUsers]
  );

  const handleQueryChange = useCallback(
    (value: string) => {
      setQuery(value);
      const lastChar = value.charAt(value.length - 1);
      if (![' ', ',', ';'].includes(lastChar)) return;
      const usersFromInput = extractEmails(value).map(
        (email) => ({ fullName: null, email, userId: null, companyTeam: null } as FoundUserDTO)
      );
      if (usersFromInput.length === 0) return;
      addUsersToShare(usersFromInput);
      setQuery('');
      setSearchResults([]);
    },
    [addUsersToShare]
  );

  const handleQuerySubmit = useCallback(() => {
    const usersFromInput = extractEmails(query).map(
      (email) => ({ fullName: null, email, userId: null, companyTeam: null } as FoundUserDTO)
    );
    if (usersFromInput.length === 0) return;
    addUsersToShare(usersFromInput);
    setQuery('');
    setSearchResults([]);
  }, [addUsersToShare, query]);

  const submit = useCallback(async () => {
    if (!document?.id) return;
    setSaving(true);
    try {
      const usersToSharePayload = dedupeUsers([...usersToShare, ...queryUsersToShare]);
      if (usersToUnshare.length > 0) await unshareDocumentUsers(document.id, usersToUnshare);
      if (usersToSharePayload.length > 0) {
        await shareDocuments({ itemsIds: [document.id], usersToShare: usersToSharePayload });
      }
      closeModal();
    } catch (e: unknown) {
      const err = e as { response?: { data?: { message?: string } | string } };
      const message =
        typeof err?.response?.data === 'string'
          ? err.response.data
          : typeof err?.response?.data === 'object' &&
              err?.response?.data &&
              'message' in err.response.data &&
              typeof (err.response.data as { message?: string }).message === 'string'
            ? (err.response.data as { message?: string }).message
            : 'Failed to save share changes.';
      Alert.alert('Share Documents', message);
    } finally {
      setSaving(false);
    }
  }, [closeModal, document?.id, queryUsersToShare, usersToShare, usersToUnshare]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropPressArea} onPress={closeModal} />

        <View style={styles.modalCard}>
          {/* Header */}
          <View style={styles.headerRow}>
            <Text style={styles.title}>Share Documents</Text>
            <TouchableOpacity onPress={closeModal} hitSlop={10}>
              <MaterialIcons name="close" size={22} color="#2f2f33" />
            </TouchableOpacity>
          </View>

          {/* Scrollable body */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.body}
          >
            <Text style={styles.documentNoText}>
              <Text style={styles.documentNoLabel}>Document No: </Text>
              {document?.documentNumberStr ?? document?.documentNo ?? '-'}
            </Text>

            {/* Search input — label matches web; supports adding unregistered users by email (Enter or Add) */}
            <View style={styles.inputRow}>
              <TextInput
                style={styles.input}
                value={query}
                onChangeText={handleQueryChange}
                onSubmitEditing={handleQuerySubmit}
                placeholder="Enter users (for external users..."
                placeholderTextColor="#8a8f9c"
                editable={!saving}
                autoCapitalize="none"
                autoCorrect={false}
              />
              <TouchableOpacity
                style={[styles.addEmailButton, (!query.trim() || !isValidEmail(query.trim()) || saving) && styles.addEmailButtonDisabled]}
                onPress={handleQuerySubmit}
                disabled={!query.trim() || !isValidEmail(query.trim()) || saving}
              >
                <Text style={styles.addEmailButtonText}>Add</Text>
              </TouchableOpacity>
              {searchLoading ? (
                <ActivityIndicator size="small" color={theme.colors.primary} style={styles.inputLoader} />
              ) : null}
            </View>

            {/* Search suggestions */}
            {searchResults.length > 0 ? (
              <View style={styles.suggestionBox}>
                {searchResults.slice(0, 6).map((user) => (
                  <TouchableOpacity
                    key={getUserKey(user)}
                    style={styles.suggestionItem}
                    onPress={() => {
                      addUserToShare(user);
                      setQuery('');
                      setSearchResults([]);
                    }}
                  >
                    <Text style={styles.suggestionName}>{user.fullName || user.email}</Text>
                    {user.fullName ? <Text style={styles.suggestionEmail}>{user.email}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Users list — label matches web: Shared with: */}
            <Text style={styles.sharedWithTitle}>Shared with:</Text>
            {/* Owner */}
            <View style={styles.userRow}>
              <View style={styles.userInfo}>
                <Text style={styles.userName}>{ownerName}</Text>
                {ownerEmail ? <Text style={styles.userEmail}>{ownerEmail}</Text> : null}
              </View>
              <Text style={styles.ownerBadge}>Owner</Text>
            </View>

            {loadingSharedUsers ? (
              <View style={styles.listLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : (
              displayedSharedUsers.map((user) => (
                <View key={getUserKey(user)} style={styles.userRow}>
                  <View style={styles.userInfo}>
                    <Text style={styles.userName}>{user.fullName || user.email}</Text>
                    {user.fullName ? <Text style={styles.userEmail}>{user.email}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => removeSharedUser(user)} disabled={saving} hitSlop={8}>
                    <MaterialIcons name="close" size={20} color="#63697b" />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {usersToShare.map((user) => (
              <View key={`pending-${getUserKey(user)}`} style={styles.userRow}>
                <View style={styles.userInfo}>
                  <Text style={styles.userName}>{user.fullName || user.email}</Text>
                  {user.fullName ? <Text style={styles.userEmail}>{user.email}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => removePendingShareUser(user)} disabled={saving} hitSlop={8}>
                  <MaterialIcons name="close" size={20} color="#63697b" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={styles.footer}>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={saving}>
              <Text style={styles.btnText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
              onPress={() => { submit().catch(() => {}); }}
              disabled={saving || !canSave}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.btnText}>Save changes</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        <Pressable style={styles.backdropPressArea} onPress={closeModal} />
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  backdropPressArea: {
    flex: 1,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    maxHeight: '88%',
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    color: '#1e2029',
  },
  body: {
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  documentNoText: {
    fontSize: 14,
    color: '#1a1a1a',
    marginBottom: 14,
  },
  documentNoLabel: {
    fontWeight: '500',
  },
  sharedWithTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#14151c',
    marginTop: 12,
    marginBottom: 8,
  },
  inputRow: {
    borderBottomWidth: 1,
    borderBottomColor: '#b0b4c0',
    marginBottom: 6,
    flexDirection: 'row',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    fontSize: 14,
    color: '#1a1c26',
    paddingVertical: 8,
    minHeight: 40,
  },
  addEmailButton: {
    marginLeft: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    minHeight: 36,
    justifyContent: 'center',
    borderRadius: 4,
    backgroundColor: theme.colors.primary,
  },
  addEmailButtonDisabled: {
    backgroundColor: '#b0b4c0',
    opacity: 0.8,
  },
  addEmailButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  inputLoader: {
    marginLeft: 6,
  },
  suggestionBox: {
    borderWidth: 1,
    borderColor: '#dde0ea',
    borderRadius: 4,
    backgroundColor: '#fafbff',
    marginBottom: 10,
  },
  suggestionItem: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderBottomWidth: 1,
    borderBottomColor: '#eceef5',
  },
  suggestionName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1d28',
  },
  suggestionEmail: {
    fontSize: 12,
    color: '#6a7082',
    marginTop: 1,
  },
  userRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 44,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f1f5',
  },
  userInfo: {
    flex: 1,
    paddingRight: 8,
    paddingVertical: 6,
  },
  userName: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1e2029',
  },
  userEmail: {
    fontSize: 12,
    color: '#676d7c',
    marginTop: 1,
  },
  ownerBadge: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
  },
  listLoader: {
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 14,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#e8eaf0',
  },
  cancelBtn: {
    minWidth: 110,
    height: 36,
    borderRadius: 3,
    backgroundColor: '#707ea1',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  saveBtn: {
    minWidth: 140,
    height: 36,
    borderRadius: 3,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
  },
  saveBtnDisabled: {
    opacity: 0.45,
  },
  btnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
});
