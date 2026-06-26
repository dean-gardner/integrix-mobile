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
import { useTranslation } from 'react-i18next';
import { apiResetPassword } from '../api/auth';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';
import {
  isRtlLayout,
  rtlAwareTextStyle,
} from '../utils/rtlLayout';

type ResetPasswordParams = { token?: string; email?: string };

export default function ResetPasswordScreen() {
  const { t, i18n } = useTranslation();
  const navigation = useNavigation();
  const route = useRoute<RouteProp<{ ResetPassword: ResetPasswordParams }, 'ResetPassword'>>();
  const params = route.params;
  const isRtl = isRtlLayout(i18n);
  const rtlText = rtlAwareTextStyle(i18n);
  const [email, setEmail] = useState(params?.email ?? '');
  const [token, setToken] = useState(params?.token ?? '');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    const em = (email ?? '').trim();
    if (!em) {
      setError(t('app.resetPassword.emailRequired'));
      return;
    }
    const tok = (token ?? '').trim();
    if (!tok) {
      setError(t('app.resetPassword.tokenRequired'));
      return;
    }
    if (!newPassword) {
      setError(t('app.resetPassword.newPasswordRequired'));
      return;
    }
    if (newPassword !== repeatPassword) {
      setError(t('app.resetPassword.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await apiResetPassword({ email: em, token: tok, newPassword });
      Alert.alert(t('app.resetPassword.successTitle'), t('app.resetPassword.successBody'), [
        { text: t('app.modal.ok'), onPress: () => navigation.navigate('SignIn' as never) },
      ]);
    } catch (e: unknown) {
      const msg =
        (e as { response?: { data?: string }; message?: string })?.message ??
        (e as { response?: { data?: string } })?.response?.data ??
        t('app.resetPassword.failedReset');
      setError(typeof msg === 'string' ? msg : t('app.resetPassword.failedResetShort'));
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
        <View style={[screenStyles.card, isRtl && styles.rtlContent]}>
          <Text style={[screenStyles.title, rtlText]}>{t('app.resetPassword.title')}</Text>
          <Text style={[styles.hint, rtlText]}>{t('app.resetPassword.hintLong')}</Text>
          {error ? (
            <View style={screenStyles.errorBox}>
              <Text style={[screenStyles.errorText, rtlText]}>{error}</Text>
            </View>
          ) : null}
          <Text style={[screenStyles.formLabel, rtlText]}>{t('app.resetPassword.emailLabel')}</Text>
          <TextInput
            style={[screenStyles.formInput, rtlText]}
            value={email}
            onChangeText={setEmail}
            placeholder={t('app.signUp.emailPh')}
            placeholderTextColor="#6c757d"
            keyboardType="email-address"
            autoCapitalize="none"
            editable={!loading}
          />
          <Text style={[screenStyles.formLabel, rtlText]}>{t('app.resetPassword.tokenLabel')}</Text>
          <TextInput
            style={[screenStyles.formInput, rtlText]}
            value={token}
            onChangeText={setToken}
            placeholder={t('app.resetPassword.tokenPh')}
            placeholderTextColor="#6c757d"
            autoCapitalize="none"
            editable={!loading}
          />
          <Text style={[screenStyles.formLabel, rtlText]}>{t('app.resetPassword.newPasswordPh')}</Text>
          <TextInput
            style={[screenStyles.formInput, rtlText]}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('app.resetPassword.newPasswordPh')}
            placeholderTextColor="#6c757d"
            secureTextEntry
            editable={!loading}
          />
          <Text style={[screenStyles.formLabel, rtlText]}>{t('app.resetPassword.repeatNew')}</Text>
          <TextInput
            style={[screenStyles.formInput, rtlText]}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            placeholder={t('app.resetPassword.repeatNewPh')}
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
              <Text style={screenStyles.formButtonText}>{t('app.resetPassword.submit')}</Text>
            )}
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.backLink}
            onPress={() => navigation.goBack()}
            disabled={loading}
          >
            <Text style={[styles.backLinkText, rtlText]}>{t('app.forgotPassword.backSignIn')}</Text>
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
  rtlContent: { direction: 'rtl' },
  buttonDisabled: { opacity: 0.7 },
  backLink: { alignItems: 'center', marginTop: 16 },
  backLinkText: { fontSize: 14, color: theme.colors.primary },
});
