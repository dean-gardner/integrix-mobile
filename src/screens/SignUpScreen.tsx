import React, { useState } from 'react';
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
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { apiSignUp } from '../api/auth';
import { theme } from '../theme';

const getTimeZoneId = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Australia/Sydney';
  } catch {
    return 'Australia/Sydney';
  }
};

export default function SignUpScreen() {
  const { t } = useTranslation();
  const navigation = useNavigation();
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [position, setPosition] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    const fn = (firstName ?? '').trim();
    const ln = (lastName ?? '').trim();
    const em = (email ?? '').trim();
    const company = (companyName ?? '').trim();
    if (!fn || !ln || !em || !password || !company) {
      setError(t('app.signUp.errRequired'));
      return;
    }
    if (password !== repeatPassword) {
      setError(t('app.signUp.errPasswordMatch'));
      return;
    }

    setError(null);
    setLoading(true);
    try {
      await apiSignUp({
        firstName: fn,
        lastName: ln,
        phone: (phone ?? '').trim(),
        email: em,
        password,
        position: (position ?? '').trim(),
        companyName: company,
        timeZoneId: getTimeZoneId(),
      });
      Alert.alert(t('app.alerts.success'), t('app.auth.signupSuccess'), [
        { text: t('app.modal.ok'), onPress: () => navigation.navigate('SignIn' as never) },
      ]);
    } catch (e: unknown) {
      setError((e as { message?: string })?.message ?? t('app.signUp.signUpFailed'));
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
          <Text style={styles.title}>{t('app.signUp.title')}</Text>
          {error ? (
            <View style={styles.errorBox}>
              <Text style={styles.errorText}>{error}</Text>
            </View>
          ) : null}

          <Text style={styles.label}>{t('app.signUp.firstNamePh')}</Text>
          <TextInput
            style={styles.input}
            value={firstName}
            onChangeText={setFirstName}
            placeholder={t('app.signUp.firstNamePh')}
            placeholderTextColor="#6c757d"
            editable={!loading}
          />

          <Text style={styles.label}>{t('app.signUp.lastNamePh')}</Text>
          <TextInput
            style={styles.input}
            value={lastName}
            onChangeText={setLastName}
            placeholder={t('app.signUp.lastNamePh')}
            placeholderTextColor="#6c757d"
            editable={!loading}
          />

          <Text style={styles.label}>{t('app.signUp.position')}</Text>
          <TextInput
            style={styles.input}
            value={position}
            onChangeText={setPosition}
            placeholder={t('app.signUp.positionPh')}
            placeholderTextColor="#6c757d"
            editable={!loading}
          />

          <Text style={styles.label}>{t('app.signUp.companyPh')}</Text>
          <TextInput
            style={styles.input}
            value={companyName}
            onChangeText={setCompanyName}
            placeholder={t('app.signUp.companyPh')}
            placeholderTextColor="#6c757d"
            editable={!loading}
          />

          <Text style={styles.label}>{t('app.signUp.phone')}</Text>
          <TextInput
            style={styles.input}
            value={phone}
            onChangeText={setPhone}
            placeholder={t('app.signUp.phonePh')}
            placeholderTextColor="#6c757d"
            keyboardType="phone-pad"
            editable={!loading}
          />

          <Text style={styles.label}>{t('app.signUp.emailPh')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('app.signUp.emailPh')}
            placeholderTextColor="#6c757d"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />

          <Text style={styles.label}>{t('app.signUp.passwordPh')}</Text>
          <TextInput
            style={styles.input}
            value={password}
            onChangeText={setPassword}
            placeholder={t('app.signUp.passwordPh')}
            placeholderTextColor="#6c757d"
            secureTextEntry
            editable={!loading}
          />

          <Text style={styles.label}>{t('app.signUp.repeatPassword')}</Text>
          <TextInput
            style={styles.input}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            placeholder={t('app.signUp.repeatPasswordPh')}
            placeholderTextColor="#6c757d"
            secureTextEntry
            editable={!loading}
          />

          <TouchableOpacity
            style={[styles.button, loading && styles.buttonDisabled]}
            onPress={submit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('app.signUp.submit')}</Text>
            )}
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.secondaryLink}
            onPress={() => navigation.navigate('SignIn' as never)}
            disabled={loading}
          >
            <Text style={styles.secondaryLinkText}>{t('app.signUp.haveAccountFull')}</Text>
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
  title: { fontSize: 24, fontWeight: '700', color: '#222', marginBottom: 20 },
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
