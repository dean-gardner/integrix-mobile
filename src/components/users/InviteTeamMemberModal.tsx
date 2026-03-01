import React, { useEffect, useMemo, useState } from 'react';
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

type InviteTeamMemberModalProps = {
  visible: boolean;
  isAdmin: boolean;
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

export function InviteTeamMemberModal({
  visible,
  isAdmin,
  roles,
  teams,
  currentTeamId,
  loading,
  error,
  onClose,
  onSubmit,
}: InviteTeamMemberModalProps) {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [roleId, setRoleId] = useState('');
  const [teamId, setTeamId] = useState<number | null>(null);
  const [localError, setLocalError] = useState<string | null>(null);

  const defaultRoleId = useMemo(() => getDefaultRoleId(roles), [roles]);
  const defaultAdminRoleId = useMemo(() => roles[0]?.id ?? defaultRoleId, [roles, defaultRoleId]);
  const defaultTeamId = useMemo(
    () => (isAdmin ? teams[0]?.id ?? null : currentTeamId ?? teams[0]?.id ?? null),
    [isAdmin, teams, currentTeamId]
  );

  useEffect(() => {
    if (!visible) return;
    setFirstName('');
    setLastName('');
    setEmail('');
    setPhone('');
    setRoleId(isAdmin ? defaultAdminRoleId : defaultRoleId);
    setTeamId(defaultTeamId);
    setLocalError(null);
  }, [visible, isAdmin, defaultRoleId, defaultAdminRoleId, defaultTeamId]);

  const submit = async () => {
    const cleanEmail = email.trim().toLowerCase();
    const cleanFirstName = firstName.trim();
    const cleanLastName = lastName.trim();
    const cleanPhone = phone.trim();

    if (!cleanEmail || !cleanFirstName || !cleanLastName) {
      setLocalError('Email, first name and last name are required.');
      return;
    }
    if (!roleId) {
      setLocalError('Select a role.');
      return;
    }
    if (teamId == null) {
      setLocalError('Select a team.');
      return;
    }

    setLocalError(null);
    try {
      await onSubmit({
        email: cleanEmail,
        firstName: cleanFirstName,
        lastName: cleanLastName,
        phoneNumber: cleanPhone,
        userRoleId: roleId,
        companyTeamId: teamId,
      });
      onClose();
    } catch {
      // Parent keeps API error state.
    }
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.modalBackdrop}>
        <ScrollView
          style={styles.modalScroll}
          contentContainerStyle={styles.modalScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Invite team member</Text>
            {localError || error ? (
              <View style={screenStyles.errorBox}>
                <Text style={screenStyles.errorText}>{localError || error}</Text>
              </View>
            ) : null}

            <Text style={screenStyles.formLabel}>Email *</Text>
            <TextInput
              style={screenStyles.formInput}
              value={email}
              onChangeText={setEmail}
              placeholder="Email"
              placeholderTextColor="#6c757d"
              keyboardType="email-address"
              autoCapitalize="none"
              editable={!loading}
            />

            <Text style={screenStyles.formLabel}>First name *</Text>
            <TextInput
              style={screenStyles.formInput}
              value={firstName}
              onChangeText={setFirstName}
              placeholder="First name"
              placeholderTextColor="#6c757d"
              editable={!loading}
            />

            <Text style={screenStyles.formLabel}>Last name *</Text>
            <TextInput
              style={screenStyles.formInput}
              value={lastName}
              onChangeText={setLastName}
              placeholder="Last name"
              placeholderTextColor="#6c757d"
              editable={!loading}
            />

            <Text style={screenStyles.formLabel}>Phone</Text>
            <TextInput
              style={screenStyles.formInput}
              value={phone}
              onChangeText={setPhone}
              placeholder="Phone"
              placeholderTextColor="#6c757d"
              keyboardType="phone-pad"
              editable={!loading}
            />

            {isAdmin ? (
              <>
                <Text style={screenStyles.formLabel}>User role *</Text>
                <View style={styles.chipRow}>
                  {roles.map((role) => (
                    <TouchableOpacity
                      key={role.id}
                      style={[styles.chip, roleId === role.id && styles.chipActive]}
                      onPress={() => setRoleId(role.id)}
                      disabled={loading}
                    >
                      <Text style={[styles.chipText, roleId === role.id && styles.chipTextActive]}>
                        {role.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={screenStyles.formLabel}>Team *</Text>
                <View style={styles.chipRow}>
                  {teams.map((teamItem) => (
                    <TouchableOpacity
                      key={teamItem.id}
                      style={[styles.chip, teamId === teamItem.id && styles.chipActive]}
                      onPress={() => setTeamId(teamItem.id)}
                      disabled={loading}
                    >
                      <Text
                        style={[styles.chipText, teamId === teamItem.id && styles.chipTextActive]}
                      >
                        {teamItem.name}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            ) : (
              <Text style={styles.teamHint}>Invitation will be sent to your current team.</Text>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={loading}>
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[screenStyles.formButton, styles.inviteButton, loading && styles.buttonDisabled]}
                onPress={submit}
                disabled={loading}
              >
                {loading ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={screenStyles.formButtonText}>Invite</Text>
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
  teamHint: {
    marginTop: 12,
    color: theme.colors.textMuted,
    fontSize: 13,
  },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8, marginBottom: 8 },
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
  chipText: { fontSize: 13, color: theme.colors.text },
  chipTextActive: { color: theme.colors.primary, fontWeight: '600' },
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
  inviteButton: { flex: 1, marginTop: 0 },
  buttonDisabled: { opacity: 0.7 },
});
