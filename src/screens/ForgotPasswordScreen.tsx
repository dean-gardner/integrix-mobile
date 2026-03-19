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
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { apiForgotPassword } from '../api/auth';
import { theme } from '../theme';

export default function ForgotPasswordScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const em = (email ?? '').trim();
    if (!em) {
      setError(t('app.forgotPassword.emailRequired'));
      return;
    }
    setLoading(true);
    try {
      await apiForgotPassword({ email: em });
      Alert.alert(t('app.forgotPassword.checkEmailTitle'), t('app.forgotPassword.checkEmailBody'), [
        { text: t('app.modal.ok'), onPress: () => navigation.goBack() },
      ]);
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? t('app.forgotPassword.requestFailed');
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={styles.card}>
        <Text style={styles.title}>{t('app.forgotPassword.title')}</Text>
        <Text style={styles.hint}>{t('app.forgotPassword.hint')}</Text>
        {error ? (
          <View style={styles.errorBox}>
            <Text style={styles.errorText}>{error}</Text>
          </View>
        ) : null}
        <Text style={styles.label}>{t('app.forgotPassword.emailPh')}</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder={t('app.forgotPassword.emailPh')}
          placeholderTextColor="#6c757d"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity
          style={[styles.button, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={styles.buttonText}>{t('app.forgotPassword.sendLink')}</Text>
          )}
        </TouchableOpacity>
        <TouchableOpacity style={styles.backLink} onPress={() => navigation.goBack()} disabled={loading}>
          <Text style={styles.backLinkText}>{t('app.forgotPassword.backSignIn')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={styles.secondaryLink}
          onPress={() => navigation.navigate('ResetPassword' as never)}
          disabled={loading}
        >
          <Text style={styles.backLinkText}>{t('app.forgotPassword.haveResetLink')}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
    justifyContent: 'center',
    padding: theme.spacing.pagePadding,
  },
  card: { backgroundColor: theme.colors.cardBg, borderRadius: 12, padding: theme.spacing.cardPadding },
  title: {
    fontSize: theme.typography.title,
    fontWeight: '600',
    color: theme.colors.text,
    marginBottom: 8,
  },
  hint: { fontSize: 14, color: theme.colors.textMuted, marginBottom: 20 },
  errorBox: { backgroundColor: '#fee', padding: 12, borderRadius: 8, marginBottom: 16 },
  errorText: { color: theme.colors.error, fontSize: 14 },
  label: { fontSize: 14, fontWeight: '500', color: theme.colors.text, marginBottom: 6 },
  input: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: theme.colors.text,
    marginBottom: 20,
  },
  button: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonDisabled: { opacity: 0.7 },
  buttonText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  backLink: { alignItems: 'center', marginTop: 16 },
  secondaryLink: { alignItems: 'center', marginTop: 12 },
  backLinkText: { fontSize: 14, color: theme.colors.primary },
});
