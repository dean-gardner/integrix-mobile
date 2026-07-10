import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import type { RoleDTO } from '../../types/user';
import type { CompanyTeamNodeDTO } from '../../types/team';
import type { UserInvitationCreateDTO } from '../../types/invitation';
import { screenStyles } from '../../styles/screenStyles';
import { theme } from '../../theme';
import { useTranslation } from 'react-i18next';
import { translateKnownRoleName, translateKnownTeamName } from '../../utils/systemDisplayText';
import {
  isRtlLayout,
  rtlAwareInputStyle,
  rtlAwareTextStyle,
  rtlDirectionStyle,
  rtlRowStyle,
} from '../../utils/rtlLayout';
import { sanitizeApiErrorMessage } from '../../utils/httpErrorMessage';

type InviteTeamMemberModalProps = {
  visible: boolean;
  isAdmin: boolean;
  offlineMode: boolean;
  rolesLoading: boolean;
  roles: RoleDTO[];
  teams: CompanyTeamNodeDTO[];
  currentTeamId: number | null;
  loading: boolean;
  error: string | null;
  onClose: () => void;
  onSubmit: (model: UserInvitationCreateDTO) => Promise<void>;
};

function getDefaultRoleId(roles: RoleDTO[]): string {
  return roles.find((role) => role.name.toLowerCase() === 'user')?.id ?? roles[0]?.id ?? '';
}

function isValidEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

function isEmailValidationMessage(message: string): boolean {
  return /email/i.test(message) && /(invalid|format|valid)/i.test(message);
}

export function InviteTeamMemberModal({
  visible,
  isAdmin,
  offlineMode,
  rolesLoading,
  roles,
  teams,
  currentTeamId,
  loading,
  error,
  onClose,
  onSubmit,
}: InviteTeamMemberModalProps) {
  const { t, i18n } = useTranslation();
  const isRtl = useMemo(() => isRtlLayout(i18n), [i18n]);
  const rtlText = useMemo(() => rtlAwareTextStyle(i18n), [i18n]);
  const rtlInput = useMemo(() => rtlAwareInputStyle(i18n), [i18n]);
  const rtlRow = useMemo(() => rtlRowStyle(i18n), [i18n]);
  const rtlDirection = useMemo(() => rtlDirectionStyle(i18n), [i18n]);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);
  const [emailError, setEmailError] = useState<string | null>(null);
  const wasVisibleRef = useRef(false);

  const defaultRoleId = useMemo(() => getDefaultRoleId(roles), [roles]);
  const defaultAdminRoleId = useMemo(() => roles[0]?.id ?? defaultRoleId, [roles, defaultRoleId]);
  const defaultTeamId = useMemo(
    () => (isAdmin ? teams[0]?.id ?? null : currentTeamId ?? teams[0]?.id ?? null),
    [isAdmin, teams, currentTeamId]
  );

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      setFirstName('');
      setLastName('');
      setEmail('');
      setPhone('');
      setRoleId(isAdmin ? defaultAdminRoleId : defaultRoleId);
      setTeamId(defaultTeamId);
      setLocalError(null);
      setEmailError(null);
    }
    wasVisibleRef.current = visible;
  }, [visible, isAdmin, defaultRoleId, defaultAdminRoleId, defaultTeamId]);

  const cleanedApiError = useMemo(() => {
    if (!error?.trim()) return null;
    return sanitizeApiErrorMessage(error);
  }, [error]);

  const bannerError = useMemo(() => {
    if (localError) return localError;
    if (!cleanedApiError) return null;
    if (isEmailValidationMessage(cleanedApiError)) return null;
    return cleanedApiError;
  }, [cleanedApiError, localError]);

  const displayedEmailError = useMemo(() => {
    if (emailError) return emailError;
    if (cleanedApiError && isEmailValidationMessage(cleanedApiError)) {
      return cleanedApiError;
    }
    return null;
  }, [cleanedApiError, emailError]);

  useEffect(() => {
    if (!visible) return;
    if (!roleId) {
      const nextRoleId = isAdmin ? defaultAdminRoleId : defaultRoleId;
      if (nextRoleId) {
        setRoleId(nextRoleId);
      }
    }
    if (teamId == null && defaultTeamId != null) {
      setTeamId(defaultTeamId);
    }
  }, [visible, roleId, teamId, isAdmin, defaultRoleId, defaultAdminRoleId, defaultTeamId]);

  const effectiveRoleId = roleId || (isAdmin ? defaultAdminRoleId : defaultRoleId);
  const selectedRoleName =
    roles.find((role) => role.id === effectiveRoleId)?.name ?? roles[0]?.name ?? '';
  const selectedRoleLabel = translateKnownRoleName(selectedRoleName, t);
  const resolvedTeamId = isAdmin ? teamId : (teamId ?? currentTeamId ?? null);
  const inviteDisabledReason = offlineMode ? t('app.users.inviteOfflineUnavailable') : null;
  const submitDisabled =
    loading ||
    rolesLoading ||
    Boolean(inviteDisabledReason) ||
    !effectiveRoleId ||
    resolvedTeamId == null;

  const submit = async () => {
    if (submitDisabled) return;
    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPhone = phone.trim();

    setLocalError(null);
    setEmailError(null);

    if (!cleanEmail || !cleanFirstName || !cleanLastName) {
      setLocalError(t('app.inviteMember.requiredFields'));
      return;
    }
    if (!isValidEmail(cleanEmail)) {
      setEmailError(t('app.inviteMember.invalidEmail'));
      return;
    }
    if (!effectiveRoleId) {
      setLocalError(t('app.inviteMember.selectRole'));
      return;
    }
    if (resolvedTeamId == null) {
      setLocalError(t('app.inviteMember.selectTeam'));
      return;
    }

    try {
      await onSubmit({
        email: cleanEmail,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        phoneNumber: cleanPhone,
        userRoleId: effectiveRoleId,
        companyTeamId: resolvedTeamId,
      });
      onClose();
    } catch {
      // Parent keeps API error state; email validation is shown inline when applicable.
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={[styles.modalScrollContent, rtlDirection]}
          keyboardShouldPersistTaps="handled"
        >
          <View style={[styles.modalCard, rtlDirection]}>
            <Text style={[styles.modalTitle, rtlText]}>{t('app.inviteMember.title')}</Text>
            {bannerError ? (
              <View style={screenStyles.errorBox}>
                <Text style={[screenStyles.errorText, rtlText]}>{bannerError}</Text>
              </View>
            ) : null}
            {inviteDisabledReason ? (
              <View style={styles.infoBox}>
                <Text style={[styles.infoText, rtlText]}>{inviteDisabledReason}</Text>
              </View>
            ) : null}

            <Text style={[screenStyles.formLabel, rtlText]}>{t('app.inviteMember.emailPh')} *</Text>
            <TextInput
              style={[
                screenStyles.formInput,
                rtlInput,
                displayedEmailError ? styles.inputInvalid : null,
              ]}
              textAlign={rtlInput.textAlign}
              value={email}
              onChangeText={(value) => {
                setEmail(value);
                if (emailError) setEmailError(null);
              }}
              placeholder={t('app.inviteMember.emailPh')}
              placeholderTextColor="#6c757d"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />
            {displayedEmailError ? (
              <Text style={[styles.fieldErrorText, rtlText]}>{displayedEmailError}</Text>
            ) : null}

            <Text style={[screenStyles.formLabel, rtlText]}>{t('app.inviteMember.firstNamePh')} *</Text>
            <TextInput
              style={[screenStyles.formInput, rtlInput]}
              textAlign={rtlInput.textAlign}
              value={firstName}
              onChangeText={setFirstName}
              placeholder={t('app.inviteMember.firstNamePh')}
              placeholderTextColor="#6c757d"
              editable={!loading}
            />

            <Text style={[screenStyles.formLabel, rtlText]}>{t('app.inviteMember.lastNamePh')} *</Text>
            <TextInput
              style={[screenStyles.formInput, rtlInput]}
              textAlign={rtlInput.textAlign}
              value={lastName}
              onChangeText={setLastName}
              placeholder={t('app.inviteMember.lastNamePh')}
              placeholderTextColor="#6c757d"
              editable={!loading}
            />

            <Text style={[screenStyles.formLabel, rtlText]}>{t('app.acceptInvitation.phone')}</Text>
            <TextInput
              style={[screenStyles.formInput, rtlInput]}
              textAlign={rtlInput.textAlign}
              value={phone}
              onChangeText={setPhone}
              placeholder={t('app.acceptInvitation.phonePh')}
              placeholderTextColor="#6c757d"
              keyboardType="phone-pad"
              editable={!loading}
            />

            <Text style={[screenStyles.formLabel, rtlText]}>{t('app.inviteMember.userRole')} *</Text>
            {rolesLoading ? (
              <View style={[styles.loadingRow, isRtl && styles.loadingRowRtl]}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : roles.length > 0 ? (
              <View style={[styles.chipRow, rtlRow, isRtl && styles.chipRowRtl]}>
                {isAdmin ? (
                  roles.map((role) => (
                    <TouchableOpacity
                      key={role.id}
                      style={[styles.chip, effectiveRoleId === role.id && styles.chipActive]}
                      onPress={() => setRoleId(role.id)}
                      disabled={loading || offlineMode}
                    >
                      <Text
                        style={[styles.chipText, rtlText, effectiveRoleId === role.id && styles.chipTextActive]}
                      >
                        {translateKnownRoleName(role.name, t)}
                      </Text>
                    </TouchableOpacity>
                  ))
                ) : (
                  <View style={[styles.chip, styles.chipActive, styles.chipReadonly]}>
                    <Text style={[styles.chipText, rtlText, styles.chipTextActive]}>
                      {selectedRoleLabel}
                    </Text>
                  </View>
                )}
              </View>
            ) : (
              <View style={styles.disabledField}>
                <Text style={[styles.disabledFieldText, rtlText]}>
                  {offlineMode ? t('app.users.rolesUnavailableOffline') : t('app.users.roleUnavailable')}
                </Text>
              </View>
            )}

            {isAdmin ? (
              <>
                <Text style={[screenStyles.formLabel, rtlText]}>{t('app.inviteMember.team')} *</Text>
                {teams.length > 0 ? (
                  <View style={[styles.chipRow, rtlRow, isRtl && styles.chipRowRtl]}>
                    {teams.map((teamItem) => (
                      <TouchableOpacity
                        key={teamItem.id}
                        style={[styles.chip, teamId === teamItem.id && styles.chipActive]}
                        onPress={() => setTeamId(teamItem.id)}
                        disabled={loading || offlineMode}
                      >
                        <Text
                          style={[styles.chipText, rtlText, teamId === teamItem.id && styles.chipTextActive]}
                        >
                          {translateKnownTeamName(teamItem.name, t)}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                ) : (
                  <View style={styles.disabledField}>
                    <Text style={[styles.disabledFieldText, rtlText]}>{t('app.users.teamUnavailable')}</Text>
                  </View>
                )}
              </>
            ) : (
              <Text style={[styles.teamHint, rtlText]}>{t('app.inviteMember.currentTeamHint')}</Text>
            )}

            <View style={[styles.modalActions, rtlRow, isRtl && styles.modalActionsRtl]}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={[styles.cancelBtnText, rtlText]}>{t('app.modal.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[screenStyles.formButton, styles.inviteButton, submitDisabled && styles.buttonDisabled]}
                onPress={submit}
                disabled={submitDisabled}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={[screenStyles.formButtonText, rtlText]}>{t('app.inviteMember.send')}</Text>
                )}
              </TouchableOpacity>
            </View>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  modalScroll: { flex: 1 },
  modalScrollContent: { flexGrow: 1, justifyContent: 'center' },
  modalCard: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: theme.spacing.cardPadding,
  },
  modalTitle: { fontSize: 18, fontWeight: '600', color: theme.colors.text, marginBottom: 10 },
  inputInvalid: {
    borderColor: theme.colors.error,
  },
  fieldErrorText: {
    color: theme.colors.error,
    fontSize: 13,
    marginTop: -4,
    marginBottom: 8,
  },
  infoBox: {
    marginTop: 2,
    marginBottom: 8,
    backgroundColor: '#edf4ff',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  infoText: {
    color: '#395a96',
    fontSize: 13,
  },
  teamHint: {
    marginTop: 12,
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  loadingRow: {
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'flex-start',
    marginTop: 8,
    marginBottom: 8,
  },
  loadingRowRtl: {
    alignItems: 'flex-end',
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
  chipRowRtl: {
    flexDirection: 'row-reverse',
    justifyContent: 'flex-start',
  },
  chip: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#ffffff',
  },
  chipActive: {
    borderColor: theme.colors.primary,
    backgroundColor: theme.colors.primaryLight,
  },
  chipReadonly: {
    opacity: 0.9,
  },
  chipText: { fontSize: 13, color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary, fontWeight: '600' },
  disabledField: {
    marginTop: 8,
    marginBottom: 8,
    minHeight: 38,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: '#f4f6fb',
    paddingHorizontal: 12,
    justifyContent: 'center',
  },
  disabledFieldText: {
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  modalActions: { flexDirection: 'row', gap: 12, marginTop: 8 },
  modalActionsRtl: {
    flexDirection: 'row-reverse',
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cancelBtnText: { fontSize: 16, color: theme.colors.text },
  inviteButton: { flex: 1, marginTop: 0 },
  buttonDisabled: { opacity: 0.7 },
});
