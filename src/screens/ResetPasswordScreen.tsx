import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { apiResetPassword } from '../api/auth';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';

type ResetPasswordParams = { token?: string; email?: string };

export default function ResetPasswordScreen() {
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ ResetPassword: ResetPasswordParams }, 'ResetPassword'>>();
  const params = route.params;
  const [email, setEmail] = useState(params?.email ?? '');
  const [token, setToken] = useState(params?.token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const em = (email ?? '').trim();
    const t = (token ?? '').trim();
    if (!em) {
      setError('Enter your email address.');
      return;
    }
    if (!t) {
      setError('Enter the reset token from your email.');
      return;
    }
    if (!newPassword) {
      setError('Enter a new password.');
      return;
    }
    if (newPassword !== repeatPassword) {
      setError('New password and repeat do not match.');
      return;
    }
    setLoading(true);
    try {
      await apiResetPassword({ email: em, token: t, newPassword });
      Alert.alert(
        'Password reset',
        'Your password has been changed. You can sign in now.',
        [{ text: 'OK', onPress: () => navigation.navigate('SignIn' as never) }]
      );
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: string }; message?: string })?.message ??
        (e as { response?: { data?: string } })?.response?.data ??
        'Failed to reset password. Check your token and try again.';
      setError(typeof msg === 'string' ? msg : 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <View style={screenStyles.card}>
          <Text style={screenStyles.title}>Reset password</Text>
          <Text style={styles.hint}>
            Enter the email you used to request the reset, the token from the email, and your new password.
          </Text>
          {error ? (
            <View style={screenStyles.errorBox}>
              <Text style={screenStyles.errorText}>{error}</Text>
            </View>
          ) : null}
          <Text style={screenStyles.formLabel}>Email</Text>
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
          <Text style={screenStyles.formLabel}>Reset token</Text>
          <TextInput
            style={screenStyles.formInput}
            value={token}
            onChangeText={setToken}
            placeholder="Paste token from email"
            placeholderTextColor="#6c757d"
            autoCapitalize="none"
            editable={!loading}
          />
          <Text style={screenStyles.formLabel}>New password</Text>
          <TextInput
            style={screenStyles.formInput}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder="New password"
            placeholderTextColor="#6c757d"
            secureTextEntry
            editable={!loading}
          />
          <Text style={screenStyles.formLabel}>Repeat new password</Text>
          <TextInput
            style={screenStyles.formInput}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            placeholder="Repeat new password"
            placeholderTextColor="#6c757d"
            secureTextEntry
            editable={!loading}
          />
          <TouchableOpacity
            style={[screenStyles.formButton, loading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={screenStyles.formButtonText}>Reset password</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={styles.backLinkText}>Back to sign in</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    padding: theme.spacing.pagePadding,
  },
  hint: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 20 },
  buttonDisabled: { opacity: 0.7 },
  backLink: { alignItems: 'center', marginTop: 16 },
  backLinkText: { fontSize: 14, color: theme.colors.primary },
});
