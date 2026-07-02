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
import { useTranslation } from 'react-i18next';
import { theme } from '../../theme';
import {
  rtlAwareInputStyle,
  rtlAwareTextStyle,
  rtlDirectionStyle,
  rtlRowStyle,
} from '../../utils/rtlLayout';

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

function normalizeDocumentShareUser(user: FoundUserDTO): FoundUserDTO {
  return {
    fullName: user.fullName ?? null,
    email: (user.email ?? '').trim(),
    userId: user.userId ?? null,
    companyTeam: null,
    isImplicitShare: user.isImplicitShare ?? null,
  };
}

function readStringField(source: unknown, key: string): string | null {
  if (!source || typeof source !== 'object') return null;
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' && value.trim() ? value.trim() : null;
}

function readStringOrNestedId(source: unknown, key: string): string | null {
  if (!source || typeof source !== 'object') return null;
  const value = (source as Record<string, unknown>)[key];
  if (typeof value === 'string' && value.trim()) return value.trim();
  return readStringField(value, 'id') ?? readStringField(value, 'Id');
}

function getDocumentShareIds(document: DocumentVersionReadDTO): string[] {
  const ids = [
    // Web shares DocumentVersionReadDTO.id. Keep all known version aliases first.
    readStringField(document, 'id'),
    readStringField(document, 'versionId'),
    readStringField(document, 'VersionId'),
    readStringField(document, 'documentVersionId'),
    readStringField(document, 'DocumentVersionId'),
    readStringField(document, 'documentVersionID'),
    readStringField(document, 'DocumentVersionID'),
    readStringOrNestedId(document, 'version'),
    readStringOrNestedId(document, 'Version'),
    // Parent document id is a fallback for archived documents in some API responses.
    readStringField(document, 'documentId'),
    readStringField(document, 'DocumentId'),
  ];
  return ids.filter((id, index): id is string =>
    Boolean(id && id.trim()) && ids.findIndex((candidate) => candidate === id) === index
  );
}

function getShareErrorMessage(error: unknown): string | null {
  const err = error as {
    message?: unknown;
    data?: unknown;
    response?: { data?: unknown; status?: number };
  };

  const extractFromData = (data: unknown): string | null => {
    if (typeof data === 'string' && data.trim()) return data;
    if (data && typeof data === 'object') {
      const record = data as Record<string, unknown>;
      if (typeof record.message === 'string' && record.message.trim()) return record.message;
      if (typeof record.title === 'string' && record.title.trim()) return record.title;
      if (record.errors && typeof record.errors === 'object') {
        const values = Object.values(record.errors as Record<string, unknown>)
          .flatMap((value) => Array.isArray(value) ? value : [value])
          .filter((value): value is string => typeof value === 'string' && value.trim().length > 0);
        if (values.length > 0) return values.join('\n');
      }
      try {
        const text = JSON.stringify(data);
        if (text && text !== '{}') return text;
      } catch {
        // Fall through to generic error handling.
      }
    }
    return null;
  };

  const responseMessage = extractFromData(err?.response?.data);
  if (responseMessage) return responseMessage;
  const directDataMessage = extractFromData(err?.data);
  if (directDataMessage) return directDataMessage;
  if (typeof err?.message === 'string' && err.message.trim()) return err.message;
  if (typeof err?.response?.status === 'number') {
    return `Request failed with status code ${err.response.status}`;
  }
  return null;
}

function isDocumentIdLookupError(error: unknown): boolean {
  const message = getShareErrorMessage(error)?.toLowerCase() ?? '';
  return message.includes('not all documents') && message.includes('found');
}

function buildShareResponseError(response: { data?: unknown; status?: number }): unknown {
  return { response: { data: response.data }, status: response.status };
}

export function ShareDocumentModal({ visible, document, onClose }: ShareDocumentModalProps) {
  const { t, i18n } = useTranslation();
  const rtlText = useMemo(() => rtlAwareTextStyle(i18n), [i18n]);
  const rtlInput = useMemo(() => rtlAwareInputStyle(i18n), [i18n]);
  const rtlRow = useMemo(() => rtlRowStyle(i18n), [i18n]);
  const rtlDirection = useMemo(() => rtlDirectionStyle(i18n), [i18n]);
  const [query, setQuery] = useState('');
  const [searchLoading, setSearchLoading] = useState(false);
  const [searchResults, setSearchResults] = useState<FoundUserDTO[]>([]);

  const [loadingSharedUsers, setLoadingSharedUsers] = useState(false);
  const [sharedUsers, setSharedUsers] = useState<FoundUserDTO[]>([]);
  const [usersToShare, setUsersToShare] = useState<FoundUserDTO[]>([]);
  const [usersToUnshare, setUsersToUnshare] = useState<FoundUserDTO[]>([]);
  const [saving, setSaving] = useState(false);

  const ownerName = document?.createdByName ?? t('app.document.ownerFallback');
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
      .map((email) => normalizeDocumentShareUser({ fullName: null, email, userId: null, companyTeam: null }));
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
      let responseData: FoundUserDTO[] = [];
      let lastError: unknown = null;
      for (const documentId of getDocumentShareIds(document)) {
        try {
          const response = await getDocumentUsersSharedWith(documentId);
          responseData = response.data ?? [];
          lastError = null;
          break;
        } catch (error) {
          lastError = error;
          if (!isDocumentIdLookupError(error)) break;
        }
      }
      if (lastError) throw lastError;
      setSharedUsers(responseData);
    } catch {
      setSharedUsers([]);
    } finally {
      setLoadingSharedUsers(false);
    }
  }, [document]);

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
      const normalizedUser = normalizeDocumentShareUser(user);
      setUsersToUnshare((prev) => prev.filter((u) => !usersEqual(u, user)));
      setUsersToShare((prev) => {
        if (prev.some((u) => usersEqual(u, normalizedUser))) return prev;
        if (sharedUsers.some((u) => usersEqual(u, normalizedUser))) return prev;
        return [...prev, normalizedUser];
      });
    },
    [ownerEmail, sharedUsers]
  );

  const removeSharedUser = useCallback((user: FoundUserDTO) => {
    const normalizedUser = normalizeDocumentShareUser(user);
    setUsersToUnshare((prev) => {
      if (prev.some((u) => usersEqual(u, normalizedUser))) return prev;
      return [...prev, normalizedUser];
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
          const normalizedUser = normalizeDocumentShareUser(user);
          if (next.some((u) => usersEqual(u, normalizedUser))) return;
          if (sharedUsers.some((u) => usersEqual(u, normalizedUser))) return;
          next.push(normalizedUser);
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
        (email) => normalizeDocumentShareUser({ fullName: null, email, userId: null, companyTeam: null })
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
      (email) => normalizeDocumentShareUser({ fullName: null, email, userId: null, companyTeam: null })
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
      const usersToSharePayload = dedupeUsers([...usersToShare, ...queryUsersToShare].map(normalizeDocumentShareUser));
      const usersToUnsharePayload = dedupeUsers(usersToUnshare.map(normalizeDocumentShareUser));
      const documentShareIds = getDocumentShareIds(document);
      let resolvedDocumentId = documentShareIds[0];
      const runWithFallback = async (operation: (documentId: string) => Promise<void>) => {
        let lastError: unknown = null;
        const orderedIds = [
          resolvedDocumentId,
          ...documentShareIds.filter((documentId) => documentId !== resolvedDocumentId),
        ];
        for (const documentId of orderedIds) {
          try {
            await operation(documentId);
            resolvedDocumentId = documentId;
            return;
          } catch (error) {
            lastError = error;
            if (!isDocumentIdLookupError(error)) break;
          }
        }
        throw lastError;
      };

      if (usersToUnsharePayload.length > 0) {
        await runWithFallback((documentId) => unshareDocumentUsers(documentId, usersToUnsharePayload));
      }
      if (usersToSharePayload.length > 0) {
        await runWithFallback((documentId) =>
          shareDocuments({ itemsIds: [documentId], usersToShare: usersToSharePayload }).then((response) => {
            if (response.status === 202) {
              throw buildShareResponseError(response);
            }
          })
        );
      }
      closeModal();
    } catch (e: unknown) {
      const message =
        getShareErrorMessage(e) ?? t('app.document.shareSaveFail');
      Alert.alert(t('app.document.shareDocs'), message);
    } finally {
      setSaving(false);
    }
  }, [closeModal, document, queryUsersToShare, usersToShare, usersToUnshare, t]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={closeModal}>
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropPressArea} onPress={closeModal} />

        <View style={[styles.modalCard, rtlDirection]}>
          {/* Header */}
          <View style={[styles.headerRow, rtlRow]}>
            <Text style={[styles.title, rtlText]}>{t('app.document.shareDocs')}</Text>
            <TouchableOpacity onPress={closeModal} hitSlop={10}>
              <MaterialIcons name="close" size={22} color="#2f2f33" />
            </TouchableOpacity>
          </View>

          {/* Scrollable body */}
          <ScrollView
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[styles.body, rtlDirection]}
          >
            <Text style={[styles.documentNoText, rtlText]}>
              <Text style={[styles.documentNoLabel, rtlText]}>{t('app.document.shareDocNo')} </Text>
              {document?.documentNumberStr ?? document?.documentNo ?? '-'}
            </Text>

            {/* Search input — label matches web; supports adding unregistered users by email (Enter or Add) */}
            <View style={[styles.inputRow, rtlRow]}>
              <TextInput
                style={[styles.input, rtlInput]}
                textAlign={rtlInput.textAlign}
                value={query}
                onChangeText={handleQueryChange}
                onSubmitEditing={handleQuerySubmit}
                placeholder={t('app.document.shareUsersPh')}
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
                <Text style={[styles.addEmailButtonText, rtlText]}>{t('app.document.addEmail')}</Text>
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
                    <Text style={[styles.suggestionName, rtlText]}>{user.fullName || user.email}</Text>
                    {user.fullName ? <Text style={[styles.suggestionEmail, rtlText]}>{user.email}</Text> : null}
                  </TouchableOpacity>
                ))}
              </View>
            ) : null}

            {/* Users list — label matches web: Shared with: */}
            <Text style={[styles.sharedWithTitle, rtlText]}>{t('app.task.sharedWith')}</Text>
            {/* Owner */}
            <View style={[styles.userRow, rtlRow]}>
              <View style={styles.userInfo}>
                <Text style={[styles.userName, rtlText]}>{ownerName}</Text>
                {ownerEmail ? <Text style={[styles.userEmail, rtlText]}>{ownerEmail}</Text> : null}
              </View>
              <Text style={[styles.ownerBadge, rtlText]}>{t('app.document.owner')}</Text>
            </View>

            {loadingSharedUsers ? (
              <View style={styles.listLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : (
              displayedSharedUsers.map((user) => (
                <View key={getUserKey(user)} style={[styles.userRow, rtlRow]}>
                  <View style={styles.userInfo}>
                    <Text style={[styles.userName, rtlText]}>{user.fullName || user.email}</Text>
                    {user.fullName ? <Text style={[styles.userEmail, rtlText]}>{user.email}</Text> : null}
                  </View>
                  <TouchableOpacity onPress={() => removeSharedUser(user)} disabled={saving} hitSlop={8}>
                    <MaterialIcons name="close" size={20} color="#63697b" />
                  </TouchableOpacity>
                </View>
              ))
            )}

            {usersToShare.map((user) => (
              <View key={`pending-${getUserKey(user)}`} style={[styles.userRow, rtlRow]}>
                <View style={styles.userInfo}>
                  <Text style={[styles.userName, rtlText]}>{user.fullName || user.email}</Text>
                  {user.fullName ? <Text style={[styles.userEmail, rtlText]}>{user.email}</Text> : null}
                </View>
                <TouchableOpacity onPress={() => removePendingShareUser(user)} disabled={saving} hitSlop={8}>
                  <MaterialIcons name="close" size={20} color="#63697b" />
                </TouchableOpacity>
              </View>
            ))}
          </ScrollView>

          {/* Footer */}
          <View style={[styles.footer, rtlRow]}>
            <TouchableOpacity style={styles.cancelBtn} onPress={closeModal} disabled={saving}>
              <Text style={[styles.btnText, rtlText]}>{t('app.modal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.saveBtn, (!canSave || saving) && styles.saveBtnDisabled]}
              onPress={() => { submit().catch(() => {}); }}
              disabled={saving || !canSave}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.btnText, rtlText]}>{t('app.document.saveChanges')}</Text>
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
    marginStart: 8,
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
    marginStart: 6,
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
    paddingEnd: 8,
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
