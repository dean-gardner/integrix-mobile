import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
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
import { getCompanyAssets, getAssetsBySearch } from '../../api/companyAssets';
import { CompanyAssetStatus, type CompanyAssetReadDTO } from '../../types/companyAsset';
import { getDocumentUsersSharedWith } from '../../api/documents';
import { getUsersBySearch } from '../../api/users';
import type { DocumentVersionReadDTO } from '../../types/document';
import type { TaskCreateDTO } from '../../types/task';
import type { FoundUserDTO } from '../../types/user';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';

const DocumentTaskReferencing = {
  WorkOrderAndNotificationNo: 0,
  ProjectNo: 1,
  Automatic: 2,
} as const;

type ShareOption = {
  kind: 'team' | 'user';
  key: string;
  title: string;
  subtitle: string;
  email: string | null;
  userId: string | null;
  users: FoundUserDTO[] | null;
};

type TranslateFn = (key: string, options?: Record<string, unknown>) => string;

type StartTaskModalProps = {
  visible: boolean;
  document: DocumentVersionReadDTO | null;
  companyId?: string | null;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (model: TaskCreateDTO, document: DocumentVersionReadDTO) => Promise<void>;
  onOpenAssetsPage: () => void;
};

function toLowerSafe(value: string): string {
  return value.trim().toLowerCase();
}

function isValidEmail(email: string): boolean {
  return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}$/.test(email.trim());
}

function extractEmails(input: string): string[] {
  const matches = input.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[A-Za-z]{2,}/g) ?? [];
  const dedup = new Set<string>();
  matches.forEach((email) => {
    if (isValidEmail(email)) {
      dedup.add(toLowerSafe(email));
    }
  });
  return Array.from(dedup);
}

function getTeamDescription(users: FoundUserDTO[], t: TranslateFn): string {
  if (users.length === 0) return t('app.startTask.noUsers');
  if (users.length === 1) return users[0].email;
  const preview = users.slice(0, 3).map((u) => u.email).join(', ');
  const suffix = users.length > 3 ? ', ...' : '';
  const usersLabel = users.length === 1 ? t('app.startTask.user') : t('app.startTask.users');
  return `${users.length} ${usersLabel}: ${preview}${suffix}`;
}

function generateShareOptions(users: FoundUserDTO[], t: TranslateFn): ShareOption[] {
  const teamMap = new Map<number, { name: string; users: FoundUserDTO[] }>();
  users.forEach((user) => {
    const team = user.companyTeam;
    if (team?.id == null) return;
    if (!teamMap.has(team.id)) {
      teamMap.set(team.id, { name: team.name, users: [] });
    }
    teamMap.get(team.id)!.users.push(user);
  });

  const options: ShareOption[] = [];
  teamMap.forEach((value, teamId) => {
    const count = value.users.length;
    options.push({
      kind: 'team',
      key: `team:${teamId}`,
      title: `${value.name} (${count} ${count === 1 ? t('app.startTask.user') : t('app.startTask.users')})`,
      subtitle: getTeamDescription(value.users, t),
      email: null,
      userId: null,
      users: value.users,
    });
  });

  users
    .filter((user) => user.companyTeam == null)
    .forEach((user) => {
      options.push({
        kind: 'user',
        key: `user:${toLowerSafe(user.email)}`,
        title: user.fullName ?? user.email,
        subtitle: user.fullName ? user.email : '',
        email: user.email,
        userId: user.userId,
        users: null,
      });
    });

  return options;
}

function mapOptionsToUsers(options: ShareOption[]): FoundUserDTO[] {
  const users: FoundUserDTO[] = [];

  options.forEach((option) => {
    if (option.kind === 'team' && option.users) {
      users.push(...option.users);
      return;
    }

    if (option.email) {
      users.push({
        fullName: option.title !== option.email ? option.title : null,
        email: option.email,
        userId: option.userId,
        companyTeam: null,
      });
    }
  });

  const unique = new Map<string, FoundUserDTO>();
  users.forEach((user) => {
    const emailKey = toLowerSafe(user.email);
    if (!unique.has(emailKey)) {
      unique.set(emailKey, user);
    }
  });

  return Array.from(unique.values());
}

export function StartTaskModal({
  visible,
  document,
  companyId = null,
  submitting = false,
  onClose,
  onSubmit,
  onOpenAssetsPage,
}: StartTaskModalProps) {
  const { t } = useTranslation();
  const [workOrderNumber, setWorkOrderNumber] = useState('');
  const [notificationNumber, setNotificationNumber] = useState('');
  const [projectNumber, setProjectNumber] = useState('');

  // Refs to always hold the latest text values, avoiding stale state on button press
  const workOrderRef = useRef('');
  const notificationRef = useRef('');
  const projectRef = useRef('');

  const [selectedAsset, setSelectedAsset] = useState<CompanyAssetReadDTO | null>(null);
  const [assetSearch, setAssetSearch] = useState('');
  const [assetOptions, setAssetOptions] = useState<CompanyAssetReadDTO[]>([]);
  const [assetLoading, setAssetLoading] = useState(false);
  const [hasAssets, setHasAssets] = useState<boolean | null>(null);

  const [selectedUsers, setSelectedUsers] = useState<ShareOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userOptions, setUserOptions] = useState<ShareOption[]>([]);
  const [usersLoading, setUsersLoading] = useState(false);

  const [initialLoading, setInitialLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const taskReferencingType = useMemo(() => {
    if (typeof document?.taskReferencingType === 'number') return document.taskReferencingType;
    return DocumentTaskReferencing.ProjectNo;
  }, [document?.taskReferencingType]);

  const selectedUserEmails = useMemo(() => {
    const emails = new Set<string>();
    selectedUsers.forEach((option) => {
      if (option.kind === 'team' && option.users) {
        option.users.forEach((user) => emails.add(toLowerSafe(user.email)));
      } else if (option.email) {
        emails.add(toLowerSafe(option.email));
      }
    });
    return emails;
  }, [selectedUsers]);

  useEffect(() => {
    if (!visible || !document) return;

    setWorkOrderNumber('');
    setNotificationNumber('');
    setProjectNumber('');
    workOrderRef.current = '';
    notificationRef.current = '';
    projectRef.current = '';
    setSelectedAsset(null);
    setAssetSearch('');
    setAssetOptions([]);
    setSelectedUsers([]);
    setUserSearch('');
    setUserOptions([]);
    setError(null);
    setInitialLoading(true);

    let cancelled = false;

    const loadInitialData = async () => {
      try {
        const taskModel = (document as { task?: { workOrderNumber?: string | null; notificationNumber?: string | null; projectNumber?: string | null; asset?: { id: number; name: string } | null } }).task;

        if (taskModel?.workOrderNumber) { setWorkOrderNumber(taskModel.workOrderNumber); workOrderRef.current = taskModel.workOrderNumber; }
        if (taskModel?.notificationNumber) { setNotificationNumber(taskModel.notificationNumber); notificationRef.current = taskModel.notificationNumber; }
        if (taskModel?.projectNumber) { setProjectNumber(taskModel.projectNumber); projectRef.current = taskModel.projectNumber; }
        if (taskModel?.asset) {
          setSelectedAsset({
            id: taskModel.asset.id,
            name: taskModel.asset.name,
            externalId: '',
            companyId: '',
            companyName: null,
            parentName: null,
          });
          setAssetSearch(taskModel.asset.name);
        }

        const sharedWithResponse = await getDocumentUsersSharedWith(document.id);
        if (!cancelled) {
          setSelectedUsers(generateShareOptions(sharedWithResponse.data ?? [], t));
        }

        if (companyId) {
          const assetsResponse = await getCompanyAssets(companyId, null, CompanyAssetStatus.Active);
          if (!cancelled) {
            setHasAssets((assetsResponse.data ?? []).length > 0);
          }
        } else if (!cancelled) {
          setHasAssets(true);
        }
      } catch {
        if (!cancelled) {
          setHasAssets(true);
        }
      } finally {
        if (!cancelled) {
          setInitialLoading(false);
        }
      }
    };

    loadInitialData().catch(() => {
      if (!cancelled) {
        setInitialLoading(false);
      }
    });

    return () => {
      cancelled = true;
    };
  }, [companyId, document, t, visible]);

  useEffect(() => {
    if (!visible || !companyId) return;
    const query = assetSearch.trim();
    if (query.length === 0) {
      setAssetOptions([]);
      return;
    }

    let cancelled = false;
    setAssetLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await getAssetsBySearch(companyId, query, undefined, true);
        if (!cancelled) {
          setAssetOptions(response.data ?? []);
        }
      } catch {
        if (!cancelled) {
          setAssetOptions([]);
        }
      } finally {
        if (!cancelled) {
          setAssetLoading(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [assetSearch, companyId, visible]);

  useEffect(() => {
    if (!visible) return;
    const query = userSearch.trim();
    if (query.length < 2) {
      setUserOptions([]);
      return;
    }

    let cancelled = false;
    setUsersLoading(true);
    const timeout = setTimeout(async () => {
      try {
        const response = await getUsersBySearch({
          search: query,
          shouldFindTeams: true,
        });
        if (!cancelled) {
          const filteredUsers = (response.data ?? []).filter(
            (user) => !selectedUserEmails.has(toLowerSafe(user.email))
          );
          setUserOptions(generateShareOptions(filteredUsers, t));
        }
      } catch {
        if (!cancelled) {
          setUserOptions([]);
        }
      } finally {
        if (!cancelled) {
          setUsersLoading(false);
        }
      }
    }, 280);

    return () => {
      cancelled = true;
      clearTimeout(timeout);
    };
  }, [selectedUserEmails, t, userSearch, visible]);

  const addOption = (option: ShareOption) => {
    setSelectedUsers((previous) => {
      if (previous.some((existing) => existing.key === option.key)) return previous;
      return [...previous, option];
    });
    setUserSearch('');
    setUserOptions([]);
  };

  const addExternalEmails = (emails: string[]) => {
    if (emails.length === 0) return;
    setSelectedUsers((previous) => {
      const existingKeys = new Set(previous.map((option) => option.key));
      const additions: ShareOption[] = [];
      emails.forEach((email) => {
        const key = `user:${toLowerSafe(email)}`;
        if (!existingKeys.has(key)) {
          additions.push({
            kind: 'user',
            key,
            title: email,
            subtitle: '',
            email,
            userId: null,
            users: null,
          });
        }
      });
      return additions.length > 0 ? [...previous, ...additions] : previous;
    });
  };

  const handleUserInputChange = (text: string) => {
    setUserSearch(text);
    const lastChar = text.slice(-1);
    if (![' ', ',', ';'].includes(lastChar)) return;

    const parsedEmails = extractEmails(text);
    if (parsedEmails.length > 0) {
      addExternalEmails(parsedEmails);
      setUserSearch('');
      setUserOptions([]);
    }
  };

  const handleUserInputSubmit = () => {
    if (userOptions.length > 0) {
      addOption(userOptions[0]);
      return;
    }
    const parsedEmails = extractEmails(userSearch);
    if (parsedEmails.length > 0) {
      addExternalEmails(parsedEmails);
      setUserSearch('');
      setUserOptions([]);
    }
  };

  const handleSelectAsset = (asset: CompanyAssetReadDTO) => {
    setSelectedAsset(asset);
    setAssetSearch(asset.name);
    setAssetOptions([]);
    setError(null);
  };

  const handleSubmit = async () => {
    if (!document) return;
    // Read from refs to get the latest value even if the keyboard is still open
    const workOrder = workOrderRef.current.trim() || workOrderNumber.trim();
    const notification = notificationRef.current.trim() || notificationNumber.trim();
    const project = projectRef.current.trim() || projectNumber.trim();

    if (
      taskReferencingType === DocumentTaskReferencing.WorkOrderAndNotificationNo &&
      !workOrder &&
      !notification
    ) {
      setError(t('app.startTask.fillWorkOrderOrNotification'));
      return;
    }

    if (taskReferencingType === DocumentTaskReferencing.ProjectNo && !project) {
      setError(t('app.startTask.projectRequired'));
      return;
    }

    if (!selectedAsset) {
      setError(t('app.startTask.assetRequired'));
      return;
    }

    setError(null);
    const model: TaskCreateDTO = {
      workOrderNumber: workOrder || null,
      notificationNumber: notification || null,
      projectNumber: project || null,
      assetId: selectedAsset.id,
      asset: { id: selectedAsset.id, name: selectedAsset.name },
      usersSharedWith: mapOptionsToUsers(selectedUsers),
    };

    await onSubmit(model, document);
  };

  const handleBackdropClose = () => {
    if (submitting) return;
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleBackdropClose}
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <Pressable style={styles.backdropPressArea} onPress={handleBackdropClose} />
        <View style={styles.modalCard}>
          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
          >
            <Text style={styles.title}>{t('app.startTask.title')}</Text>

            {initialLoading ? (
              <View style={styles.initialLoader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : (
              <>
                <Text style={styles.label}>{t('app.documentCreate.docTitleStar')}</Text>
                <TextInput
                  value={document?.description ?? ''}
                  editable={false}
                  style={[styles.input, styles.inputDisabled]}
                />

                {taskReferencingType === DocumentTaskReferencing.WorkOrderAndNotificationNo ? (
                  <>
                    <Text style={styles.label}>{`${t('app.task.workOrderNumber')} *`}</Text>
                    <TextInput
                      value={workOrderNumber}
                      onChangeText={(text) => { workOrderRef.current = text; setWorkOrderNumber(text); setError(null); }}
                      editable={!submitting}
                      style={styles.input}
                      placeholder=""
                    />

                    <Text style={styles.label}>{`${t('app.task.notificationNumber')} *`}</Text>
                    <TextInput
                      value={notificationNumber}
                      onChangeText={(text) => { notificationRef.current = text; setNotificationNumber(text); setError(null); }}
                      editable={!submitting}
                      style={styles.input}
                      placeholder=""
                    />
                  </>
                ) : null}

                {taskReferencingType === DocumentTaskReferencing.ProjectNo ? (
                  <>
                    <Text style={styles.label}>{`${t('app.tasksScreen.projectNo')} *`}</Text>
                    <TextInput
                      value={projectNumber}
                      onChangeText={(text) => { projectRef.current = text; setProjectNumber(text); setError(null); }}
                      editable={!submitting}
                      style={styles.input}
                      placeholder=""
                    />
                  </>
                ) : null}

                <Text style={styles.label}>{`${t('app.startTask.tagAsset')} *`}</Text>
                <Text style={styles.searchLabel}>{t('app.startTask.searchAssetHint')}</Text>
                <TextInput
                  value={assetSearch}
                  onChangeText={(text) => {
                    setAssetSearch(text);
                    if (selectedAsset && toLowerSafe(text) !== toLowerSafe(selectedAsset.name)) {
                      setSelectedAsset(null);
                    }
                    setError(null);
                  }}
                  editable={!submitting}
                  style={styles.underlineInput}
                  placeholder=""
                />
                {assetLoading ? (
                  <View style={styles.inlineLoader}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : null}

                {selectedAsset ? (
                  <View style={styles.selectedRow}>
                    <Text style={styles.selectedText} numberOfLines={1}>
                      {selectedAsset.name}
                    </Text>
                    <TouchableOpacity
                      onPress={() => {
                        setSelectedAsset(null);
                        setAssetSearch('');
                      }}
                      disabled={submitting}
                    >
                      <MaterialIcons name="close" size={18} color="#6f7380" />
                    </TouchableOpacity>
                  </View>
                ) : null}

                {assetOptions.length > 0 ? (
                  <View style={styles.optionsPanel}>
                    {assetOptions.slice(0, 6).map((asset) => (
                      <TouchableOpacity
                        key={`asset-${asset.id}`}
                        style={styles.optionRow}
                        onPress={() => handleSelectAsset(asset)}
                        disabled={submitting}
                      >
                        <Text style={styles.optionTitle}>{asset.name}</Text>
                        <Text style={styles.optionSubtitle}>
                          {t('app.startTask.assetIdLabel', { id: asset.externalId })}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                {hasAssets === false && !selectedAsset ? (
                  <Text style={styles.assetsWarning}>
                    {t('app.startTask.noAssetsPrefix')}{' '}
                    <Text style={styles.assetsPageLink} onPress={onOpenAssetsPage}>
                      {t('app.startTask.assetsPageLink')}
                    </Text>{' '}
                    {t('app.startTask.noAssetsSuffix')}
                  </Text>
                ) : null}

                <Text style={styles.label}>{t('app.task.usersToShare')}</Text>
                <TextInput
                  value={userSearch}
                  onChangeText={handleUserInputChange}
                  onSubmitEditing={handleUserInputSubmit}
                  editable={!submitting}
                  style={styles.underlineInput}
                  placeholder={t('app.document.shareUsersPh')}
                  placeholderTextColor="#6a6a6a"
                />
                {usersLoading ? (
                  <View style={styles.inlineLoader}>
                    <ActivityIndicator size="small" color={theme.colors.primary} />
                  </View>
                ) : null}

                {userOptions.length > 0 ? (
                  <View style={styles.optionsPanel}>
                    {userOptions.slice(0, 6).map((option) => (
                      <TouchableOpacity
                        key={option.key}
                        style={styles.optionRow}
                        onPress={() => addOption(option)}
                        disabled={submitting}
                      >
                        <Text style={styles.optionTitle}>{option.title}</Text>
                        {option.subtitle ? (
                          <Text style={styles.optionSubtitle} numberOfLines={1}>
                            {option.subtitle}
                          </Text>
                        ) : null}
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : null}

                {selectedUsers.length > 0 ? (
                  <View style={styles.selectedUsersWrap}>
                    {selectedUsers.map((option) => (
                      <View key={option.key} style={styles.userChip}>
                        <Text style={styles.userChipText} numberOfLines={1}>
                          {option.title}
                        </Text>
                        <TouchableOpacity
                          onPress={() =>
                            setSelectedUsers((current) =>
                              current.filter((entry) => entry.key !== option.key)
                            )
                          }
                          disabled={submitting}
                        >
                          <MaterialIcons name="close" size={16} color="#5c6170" />
                        </TouchableOpacity>
                      </View>
                    ))}
                  </View>
                ) : null}

                {error ? <Text style={styles.errorText}>{error}</Text> : null}
              </>
            )}
          </ScrollView>

          <View style={styles.footerActions}>
            <TouchableOpacity
              style={[styles.footerButton, styles.cancelButton]}
              onPress={handleBackdropClose}
              disabled={submitting}
            >
              <Text style={styles.cancelButtonText}>{t('app.modal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.footerButton, styles.startButton, submitting && styles.disabledButton]}
              onPress={() => handleSubmit().catch(() => {})}
              disabled={submitting || initialLoading}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <Text style={styles.startButtonText}>{t('app.startTask.start')}</Text>
              )}
            </TouchableOpacity>
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
    paddingHorizontal: 14,
  },
  backdropPressArea: {
    ...StyleSheet.absoluteFillObject,
  },
  modalCard: {
    backgroundColor: '#f8f9fc',
    borderWidth: 1,
    borderColor: '#d3d9e7',
    borderRadius: 4,
    maxHeight: '92%',
  },
  scroll: {
    flexGrow: 0,
  },
  scrollContent: {
    paddingHorizontal: 14,
    paddingTop: 14,
    paddingBottom: 12,
  },
  title: {
    color: '#252a33',
    fontSize: 38,
    fontWeight: '700',
    marginBottom: 10,
  },
  label: {
    color: '#455272',
    fontSize: 16,
    marginTop: 12,
    marginBottom: 6,
    fontWeight: '500',
  },
  input: {
    borderWidth: 1,
    borderColor: '#d2d8e6',
    borderRadius: 3,
    minHeight: 40,
    paddingHorizontal: 10,
    color: '#1a1e26',
    backgroundColor: '#ffffff',
    fontSize: 14,
  },
  inputDisabled: {
    backgroundColor: '#d2d8e6',
  },
  searchLabel: {
    color: '#555555',
    fontSize: 13,
    marginBottom: 2,
  },
  underlineInput: {
    borderBottomWidth: 1,
    borderBottomColor: '#111111',
    minHeight: 38,
    color: '#1e2431',
    fontSize: 14,
    paddingHorizontal: 0,
  },
  inlineLoader: {
    marginTop: 6,
    alignItems: 'flex-start',
  },
  initialLoader: {
    minHeight: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  optionsPanel: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#d7dceb',
    borderRadius: 4,
    backgroundColor: '#ffffff',
  },
  optionRow: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#eef1f7',
  },
  optionTitle: {
    color: '#202533',
    fontSize: 14,
    fontWeight: '500',
  },
  optionSubtitle: {
    marginTop: 2,
    color: '#5d6780',
    fontSize: 12,
  },
  selectedRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d7dceb',
    borderRadius: 4,
    paddingHorizontal: 10,
    minHeight: 34,
    backgroundColor: '#ffffff',
  },
  selectedText: {
    flex: 1,
    color: '#1f2532',
    fontSize: 14,
    paddingRight: 8,
  },
  assetsWarning: {
    marginTop: 6,
    color: '#ef9800',
    fontSize: 13,
    lineHeight: 20,
  },
  assetsPageLink: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  selectedUsersWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 10,
  },
  userChip: {
    flexDirection: 'row',
    alignItems: 'center',
    maxWidth: '100%',
    borderWidth: 1,
    borderColor: '#d0d6e4',
    borderRadius: 999,
    paddingLeft: 10,
    paddingRight: 6,
    minHeight: 30,
    backgroundColor: '#f2f4fa',
    gap: 6,
  },
  userChipText: {
    maxWidth: 220,
    color: '#2a3247',
    fontSize: 12,
  },
  errorText: {
    marginTop: 8,
    color: theme.colors.error,
    fontSize: 13,
  },
  footerActions: {
    borderTopWidth: 1,
    borderTopColor: '#dfe3ef',
    paddingTop: 12,
    paddingBottom: 14,
    paddingHorizontal: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  footerButton: {
    minWidth: 100,
    minHeight: 36,
    borderRadius: 3,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  cancelButton: {
    backgroundColor: '#707ea6',
  },
  cancelButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  startButton: {
    backgroundColor: theme.colors.primary,
  },
  startButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  disabledButton: {
    opacity: 0.72,
  },
});
