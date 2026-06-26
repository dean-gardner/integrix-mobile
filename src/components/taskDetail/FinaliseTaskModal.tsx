import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTranslation } from 'react-i18next';
import type { TaskWithDetailsReadDTO } from '../../types/task';
import type { FoundUserDTO } from '../../types/user';
import type { FinaliseTaskDTO, TaskSignatureMode } from '../../types/finaliseTask';
import { getUsersBySearch } from '../../api/users';
import { theme } from '../../theme';
import { buildSignaturePadHtml, stripDataUrlPrefix } from '../../utils/signaturePadHtml';
import { UserPickerModal } from '../UserPickerModal';

export type FinaliseTaskModalProps = {
  visible: boolean;
  task: TaskWithDetailsReadDTO | null;
  requireSignature: boolean;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (model: FinaliseTaskDTO) => void;
};

type SignatureTab = 'draw' | 'type';

function normalizeShareUser(user: FoundUserDTO): FoundUserDTO {
  return {
    fullName: user.fullName ?? null,
    email: (user.email ?? '').trim(),
    userId: user.userId ?? null,
    companyTeam: null,
    isImplicitShare: user.isImplicitShare ?? null,
  };
}

export function FinaliseTaskModal({
  visible,
  task,
  requireSignature,
  submitting = false,
  onClose,
  onSubmit,
}: FinaliseTaskModalProps) {
  const { t } = useTranslation();
  const webViewRef = useRef<WebView>(null);
  const [signatureTab, setSignatureTab] = useState<SignatureTab>('draw');
  const [drawnSignature, setDrawnSignature] = useState<string | null>(null);
  const [typedSignature, setTypedSignature] = useState('');
  const [fullName, setFullName] = useState('');
  const [position, setPosition] = useState('');
  const [shouldBeSentToCrm, setShouldBeSentToCrm] = useState(false);
  const [shareUsers, setShareUsers] = useState<FoundUserDTO[]>([]);
  const [shareQuery, setShareQuery] = useState('');
  const [shareResults, setShareResults] = useState<FoundUserDTO[]>([]);
  const [shareSearching, setShareSearching] = useState(false);
  const [pickerVisible, setPickerVisible] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const signaturePadHtml = useMemo(() => ({ html: buildSignaturePadHtml() }), []);

  const showCrmAttach = useMemo(() => {
    const crm = task?.integratedCrmName?.trim();
    return Boolean(task?.notificationNumber && crm && crm.toLowerCase() !== 'none');
  }, [task?.integratedCrmName, task?.notificationNumber]);

  const resetForm = useCallback(() => {
    setSignatureTab('draw');
    setDrawnSignature(null);
    setTypedSignature('');
    setFullName('');
    setPosition('');
    setShouldBeSentToCrm(false);
    setShareUsers([]);
    setShareQuery('');
    setShareResults([]);
    setFormError(null);
    webViewRef.current?.injectJavaScript(
      `window.postMessage(JSON.stringify({type:'clear'}), '*'); true;`
    );
  }, []);

  useEffect(() => {
    if (!visible) return;
    resetForm();
  }, [visible, task?.id, resetForm]);

  useEffect(() => {
    const q = shareQuery.trim();
    if (q.length < 2) {
      setShareResults([]);
      return;
    }
    let cancelled = false;
    setShareSearching(true);
    getUsersBySearch({
      search: q,
      shouldFindTeams: false,
      onlyRegisteredUsers: false,
      onlyCompanyTeamUsers: true,
      includeOwnPerson: true,
    })
      .then((res) => {
        if (!cancelled) setShareResults(res.data ?? []);
      })
      .catch(() => {
        if (!cancelled) setShareResults([]);
      })
      .finally(() => {
        if (!cancelled) setShareSearching(false);
      });
    return () => {
      cancelled = true;
    };
  }, [shareQuery]);

  const onSignatureWebMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const data = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        signature?: string | null;
        empty?: boolean;
      };
      if (data.type === 'change') {
        if (data.empty || !data.signature) {
          setDrawnSignature(null);
        } else {
          setDrawnSignature(data.signature);
        }
      }
    } catch {
      /* ignore */
    }
  }, []);

  const handleClearSignature = () => {
    setDrawnSignature(null);
    setTypedSignature('');
    webViewRef.current?.injectJavaScript(
      `window.postMessage(JSON.stringify({type:'clear'}), '*'); true;`
    );
  };

  const addShareUser = (user: FoundUserDTO) => {
    const normalized = normalizeShareUser(user);
    if (!normalized.email) return;
    setShareUsers((prev) => {
      if (prev.some((u) => u.email.toLowerCase() === normalized.email.toLowerCase())) return prev;
      return [...prev, normalized];
    });
    setShareQuery('');
    setShareResults([]);
  };

  const removeShareUser = (email: string) => {
    setShareUsers((prev) => prev.filter((u) => u.email.toLowerCase() !== email.toLowerCase()));
  };

  const resolveSignaturePayload = (): {
    signature: string;
    signatureType: TaskSignatureMode;
  } | null => {
    if (signatureTab === 'draw') {
      if (!drawnSignature) return null;
      return {
        signature: stripDataUrlPrefix(drawnSignature),
        signatureType: 'Draw',
      };
    }
    const typed = typedSignature.trim();
    if (!typed) return null;
    return { signature: typed, signatureType: 'Type' };
  };

  const handleFinalise = () => {
    setFormError(null);
    if (requireSignature) {
      const name = fullName.trim();
      if (!name) {
        setFormError(t('app.taskFinalise.fullNameRequired'));
        return;
      }
      const sig = resolveSignaturePayload();
      if (!sig) {
        setFormError(t('app.taskFinalise.signatureRequired'));
        return;
      }
      onSubmit({
        users: shareUsers,
        shouldBeSentToCrm,
        signature: sig.signature,
        fullName: name,
        position: position.trim() || null,
        signatureType: sig.signatureType,
        signatureImage: sig.signature,
        signatureFullName: name,
        signaturePosition: position.trim() || null,
      });
      return;
    }

    onSubmit({
      users: shareUsers,
      shouldBeSentToCrm,
    });
  };

  if (!task) return null;

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.backdrop}>
        <View style={styles.card}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>{t('app.task.finaliseTitle')}</Text>
            <TouchableOpacity onPress={onClose} disabled={submitting} hitSlop={12}>
              <MaterialIcons name="close" size={22} color="#2f3444" />
            </TouchableOpacity>
          </View>

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={styles.scrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator
          >
            {requireSignature ? (
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>{t('app.taskFinalise.signatureLabel')}</Text>
                <View style={styles.tabRow}>
                  <TouchableOpacity
                    style={[styles.tabBtn, signatureTab === 'draw' && styles.tabBtnActive]}
                    onPress={() => setSignatureTab('draw')}
                    disabled={submitting}
                  >
                    <Text style={[styles.tabText, signatureTab === 'draw' && styles.tabTextActive]}>
                      {t('app.taskFinalise.drawTab')}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.tabBtn, signatureTab === 'type' && styles.tabBtnActive]}
                    onPress={() => setSignatureTab('type')}
                    disabled={submitting}
                  >
                    <Text style={[styles.tabText, signatureTab === 'type' && styles.tabTextActive]}>
                      {t('app.taskFinalise.typeTab')}
                    </Text>
                  </TouchableOpacity>
                </View>

                {signatureTab === 'draw' ? (
                  <View style={styles.signaturePadWrap}>
                    <WebView
                      ref={webViewRef}
                      source={signaturePadHtml}
                      style={styles.signatureWebView}
                      onMessage={onSignatureWebMessage}
                      javaScriptEnabled
                      originWhitelist={['*']}
                      setSupportMultipleWindows={false}
                      scrollEnabled={false}
                      {...(Platform.OS === 'android' ? { mixedContentMode: 'always' as const } : {})}
                    />
                  </View>
                ) : (
                  <TextInput
                    style={styles.typedSignatureInput}
                    value={typedSignature}
                    onChangeText={setTypedSignature}
                    placeholder={t('app.taskFinalise.typeSignaturePh')}
                    placeholderTextColor="#a0a6b6"
                    editable={!submitting}
                  />
                )}

                <TouchableOpacity
                  style={styles.clearSignatureBtn}
                  onPress={handleClearSignature}
                  disabled={submitting}
                >
                  <Text style={styles.clearSignatureText}>{t('app.taskFinalise.clearSignature')}</Text>
                </TouchableOpacity>

                <Text style={styles.fieldLabel}>{t('app.taskFinalise.fullNameLabel')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={fullName}
                  onChangeText={setFullName}
                  placeholder={t('app.taskFinalise.fullNamePh')}
                  placeholderTextColor="#a0a6b6"
                  editable={!submitting}
                  autoCapitalize="words"
                />

                <Text style={styles.fieldLabel}>{t('app.taskFinalise.positionLabel')}</Text>
                <TextInput
                  style={styles.fieldInput}
                  value={position}
                  onChangeText={setPosition}
                  placeholder={t('app.taskFinalise.positionPh')}
                  placeholderTextColor="#a0a6b6"
                  editable={!submitting}
                />
              </View>
            ) : null}

            <Text style={styles.description}>{t('app.taskFinalise.shareDescription')}</Text>

            {showCrmAttach ? (
              <TouchableOpacity
                style={styles.crmRow}
                onPress={() => setShouldBeSentToCrm((v) => !v)}
                disabled={submitting}
              >
                <MaterialIcons
                  name={shouldBeSentToCrm ? 'check-box' : 'check-box-outline-blank'}
                  size={22}
                  color={theme.colors.primary}
                />
                <Text style={styles.crmLabel}>
                  {t('app.taskFinalise.attachToCrm', { crmName: task.integratedCrmName })}
                </Text>
              </TouchableOpacity>
            ) : null}

            <Text style={styles.fieldLabel}>{t('app.task.usersToShare')}</Text>
            <View style={styles.shareInputRow}>
              <TextInput
                style={[styles.fieldInput, styles.shareInput]}
                value={shareQuery}
                onChangeText={setShareQuery}
                placeholder={t('app.task.sharePh')}
                placeholderTextColor="#a0a6b6"
                editable={!submitting}
                autoCapitalize="none"
              />
              <TouchableOpacity
                style={styles.addUserBtn}
                onPress={() => setPickerVisible(true)}
                disabled={submitting}
              >
                <MaterialIcons name="person-add" size={22} color="#fff" />
              </TouchableOpacity>
            </View>

            {shareSearching ? (
              <ActivityIndicator size="small" color={theme.colors.primary} style={styles.shareLoader} />
            ) : null}

            {shareResults.slice(0, 5).map((user) => (
              <TouchableOpacity
                key={user.email}
                style={styles.shareResultRow}
                onPress={() => addShareUser(user)}
                disabled={submitting}
              >
                <Text style={styles.shareResultName}>{user.fullName || user.email}</Text>
                {user.fullName ? <Text style={styles.shareResultEmail}>{user.email}</Text> : null}
              </TouchableOpacity>
            ))}

            {shareUsers.length > 0 ? (
              <View style={styles.selectedUsersWrap}>
                {shareUsers.map((user) => (
                  <View key={user.email} style={styles.selectedUserRow}>
                    <View style={styles.selectedUserText}>
                      <Text style={styles.selectedUserName}>{user.fullName || user.email}</Text>
                      {user.fullName ? (
                        <Text style={styles.selectedUserEmail}>{user.email}</Text>
                      ) : null}
                    </View>
                    <TouchableOpacity
                      onPress={() => removeShareUser(user.email)}
                      disabled={submitting}
                      hitSlop={8}
                    >
                      <MaterialIcons name="close" size={18} color="#5a5e69" />
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            ) : null}

            {formError ? <Text style={styles.formError}>* {formError}</Text> : null}
          </ScrollView>

          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
              <Text style={styles.cancelBtnText}>{t('app.modal.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.finaliseBtn, submitting && styles.finaliseBtnDisabled]}
              onPress={handleFinalise}
              disabled={submitting}
            >
              {submitting ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.finaliseBtnText}>{t('app.taskDetail.finaliseBtn')}</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <UserPickerModal
        visible={pickerVisible}
        onClose={() => setPickerVisible(false)}
        onSelect={(user) => {
          addShareUser(user);
          setPickerVisible(false);
        }}
        title={t('app.taskDetail.shareWithUserTitle')}
        initialQuery={shareQuery.trim().length >= 2 ? shareQuery : undefined}
      />
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'center',
    padding: 16,
  },
  card: {
    maxHeight: '92%',
    backgroundColor: '#fff',
    borderRadius: 12,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1f2233',
  },
  scroll: {
    maxHeight: 480,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  section: {
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2f3444',
    marginBottom: 8,
  },
  tabRow: {
    flexDirection: 'row',
    marginBottom: 8,
    gap: 8,
  },
  tabBtn: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8dce6',
    alignItems: 'center',
  },
  tabBtnActive: {
    borderColor: theme.colors.primary,
    backgroundColor: '#eef3ff',
  },
  tabText: {
    fontSize: 14,
    color: '#5a5e69',
  },
  tabTextActive: {
    color: theme.colors.primary,
    fontWeight: '600',
  },
  signaturePadWrap: {
    height: 160,
    borderRadius: 8,
    overflow: 'hidden',
  },
  signatureWebView: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  typedSignatureInput: {
    minHeight: 72,
    borderWidth: 1,
    borderColor: '#d8dce6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 28,
    fontStyle: 'italic',
    color: '#1a1d26',
  },
  clearSignatureBtn: {
    alignSelf: 'flex-end',
    marginTop: 6,
    marginBottom: 8,
  },
  clearSignatureText: {
    fontSize: 13,
    color: theme.colors.primary,
  },
  fieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#4d535f',
    marginBottom: 4,
    marginTop: 4,
  },
  fieldInput: {
    borderWidth: 1,
    borderColor: '#d8dce6',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'ios' ? 10 : 8,
    fontSize: 15,
    color: '#1f2233',
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: '#4d535f',
    lineHeight: 20,
    marginBottom: 10,
  },
  crmRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  crmLabel: {
    flex: 1,
    fontSize: 14,
    color: '#2f3444',
  },
  shareInputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  shareInput: {
    flex: 1,
    marginBottom: 0,
  },
  addUserBtn: {
    width: 44,
    height: 44,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shareLoader: {
    marginVertical: 6,
  },
  shareResultRow: {
    paddingVertical: 8,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#e8ebf2',
  },
  shareResultName: {
    fontSize: 14,
    color: '#1f2233',
  },
  shareResultEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  selectedUsersWrap: {
    marginTop: 8,
    gap: 6,
  },
  selectedUserRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f4f5f8',
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  selectedUserText: {
    flex: 1,
  },
  selectedUserName: {
    fontSize: 14,
    color: '#1f2233',
  },
  selectedUserEmail: {
    fontSize: 12,
    color: '#6b7280',
  },
  formError: {
    color: '#c62828',
    fontSize: 13,
    marginTop: 8,
  },
  actions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
    padding: 16,
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#e8ebf2',
  },
  cancelBtn: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8dce6',
  },
  cancelBtnText: {
    fontSize: 15,
    color: '#4d535f',
  },
  finaliseBtn: {
    minWidth: 120,
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: theme.colors.primary,
    alignItems: 'center',
  },
  finaliseBtnDisabled: {
    opacity: 0.7,
  },
  finaliseBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#fff',
  },
});
