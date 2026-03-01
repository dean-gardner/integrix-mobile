import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { apiAcceptInvitation, apiGetInvitationById } from '../api/auth';
import { getTeamsToJoin } from '../api/teams';
import type { CompanyTeamReadDTO } from '../types/team';
import { theme } from '../theme';

const getTimeZoneId = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Australia/Sydney';
  } catch {
    return 'Australia/Sydney';
  }
};

type AcceptInvitationParams = {
  email?: string;
  companyTeamId?: number;
  companyName?: string;
  invitationId?: string;
};

export default function AcceptInvitationScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ params: AcceptInvitationParams }, 'params'>>();
  const params = route.params;
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState(params?.email ?? '');
  const [companyTeamId, setCompanyTeamId] = useState(
    params?.companyTeamId != null ? String(params.companyTeamId) : ''
  );
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [availableTeams, setAvailableTeams] = useState<CompanyTeamReadDTO[]>([]);
  const [invitationLoading, setInvitationLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let isCancelled = false;

    const loadInvitation = async () => {
      const invitationId = params?.invitationId?.trim();
      if (!invitationId) return;

      setInvitationLoading(true);
      setError(null);
      try {
        const invitationRes = await apiGetInvitationById(invitationId);
        if (isCancelled) return;
        const invitation = invitationRes.data;
        const fullNameParts = (invitation.fullName ?? '').trim().split(/\s+/).filter(Boolean);
        const invitedFirstName = fullNameParts[0] ?? '';
        const invitedLastName = fullNameParts.slice(1).join(' ');

        setFirstName((prev) => prev || invitedFirstName);
        setLastName((prev) => prev || invitedLastName);
        setEmail((prev) => prev || invitation.email || '');
        setPhone((prev) => prev || invitation.phoneNumber || '');

        if (!invitation.companyId) return;

        const teamsRes = await getTeamsToJoin(invitation.companyId);
        if (isCancelled) return;
        const teams = teamsRes.data ?? [];
        setAvailableTeams(teams);

        const invitedTeamName = (invitation.team ?? '').trim().toLowerCase();
        if (!invitedTeamName) return;
        const matchedTeam = teams.find(
          (team) => team.name.trim().toLowerCase() === invitedTeamName
        );
        if (matchedTeam) {
          setCompanyTeamId((prev) => prev || String(matchedTeam.id));
        }
      } catch (e: unknown) {
        if (isCancelled) return;
        setError(
          (e as { message?: string })?.message ?? 'Failed to load invitation details.'
        );
      } finally {
        if (!isCancelled) {
          setInvitationLoading(false);
        }
      }
    };

    loadInvitation().catch(() => {});

    return () => {
      isCancelled = true;
    };
  }, [params?.invitationId]);

  const submit = async () => {
    const fn = (firstName ?? '').trim();
    const ln = (lastName ?? '').trim();
    const em = (email ?? '').trim();
    if (!fn || !ln || !em || !password) {
      setError('First name, last name, email, and password are required.');
      return;
    }
    if (password !== repeatPassword) {
      setError('Passwords must match.');
      return;
    }
    setError(null);
    setLoading(true);
    try {
      await apiAcceptInvitation({
        firstName: fn,
        lastName: ln,
        phone: (phone ?? '').trim(),
        email: em,
        password,
        companyTeamId: companyTeamId ? Number(companyTeamId) : null,
        companyName: params?.companyName ?? null,
        timeZoneId: getTimeZoneId(),
      });
      Alert.alert('Success', 'Invitation accepted. You can now sign in.', [
        { text: 'OK', onPress: () => navigation.navigate('SignIn' as never) },
      ]);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? 'Failed to accept invitation.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView contentContainerStyle={styles.formWrapper} keyboardShouldPersistTaps="handled">
        <View style={styles.card}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>Accept invitation</Text>
            {invitationLoading ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : null}
          </View>
          {params?.companyName ? (
            <Text style={styles.companyNameText}>Company: {params.companyName}</Text>
          ) : null}
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>First name</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder="First name"
            placeholderTextColor="#6c757d"
            editable={!loading}
          />

          <Text style={styles.label}>Last name</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder="Last name"
            placeholderTextColor="#6c757d"
            editable={!loading}
          />

          <Text style={styles.label}>Phone</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder="Phone"
            placeholderTextColor="#6c757d"
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.label}>Email</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder="Email"
            placeholderTextColor="#6c757d"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          {availableTeams.length > 0 ? (
            <>
              <Text style={styles.label}>Team</Text>
              <View style={styles.teamList}>
                {availableTeams.map((team) => {
                  const selected = companyTeamId === String(team.id);
                  return (
                    <TouchableOpacity
                      key={`team-${team.id}`}
                      style={[styles.teamChip, selected && styles.teamChipSelected]}
                      onPress={() => setCompanyTeamId(String(team.id))}
                      disabled={loading}
                    >
                      <Text style={[styles.teamChipText, selected && styles.teamChipTextSelected]}>
                        {team.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </>
          ) : null}
          <Text style={styles.label}>Team ID (optional)</Text>
          <TextInput
            style={styles.input}
            value={companyTeamId}
            onChangeText={setCompanyTeamId}
            placeholder="Company team id"
            placeholderTextColor="#6c757d"
            keyboardType="number-pad"
            editable={!loading}
          />

          <Text style={styles.label}>Password</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder="Password"
            placeholderTextColor="#6c757d"
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>Repeat password</Text>
          <TextInput
            style={styles.input}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            placeholder="Repeat password"
            placeholderTextColor="#6c757d"
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Accept invitation</Text>}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => navigation.navigate('SignIn' as never)}
            disabled={loading}
          >
            <Text style={styles.secondaryLinkText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#212529' },
  formWrapper: { flexGrow: 1, justifyContent: 'center', paddingHorizontal: 24, paddingVertical: 24 },
  card: {
    width: '100%',
    maxWidth: 480,
    alignSelf: 'center',
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  title: { fontSize: 24, fontWeight: '700', color: '#222', marginBottom: 8 },
  companyNameText: { fontSize: 13, color: theme.colors.textMuted, marginBottom: 12 },
  label: { fontSize: 14, color: theme.colors.text, marginBottom: 8 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    marginBottom: 14,
    backgroundColor: '#fff',
  },
  errorBox: { backgroundColor: '#fee', padding: 12, borderRadius: 6, marginBottom: 16 },
  errorText: { color: theme.colors.error, fontSize: 14 },
  teamList: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  teamChip: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 14,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: '#fff',
  },
  teamChipSelected: {
    borderColor: theme.colors.primary,
    backgroundColor: '#eef2ff',
  },
  teamChipText: { fontSize: 12, color: theme.colors.text },
  teamChipTextSelected: { color: theme.colors.primary, fontWeight: '600' },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  secondaryLink: { alignItems: 'center', marginTop: 16 },
  secondaryLinkText: { fontSize: 14, color: theme.colors.primary },
});
