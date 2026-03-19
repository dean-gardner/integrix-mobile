import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { apiChangePassword } from '../api/auth';
import { screenStyles } from '../styles/screenStyles';

export default function ChangePasswordScreen() {
  const { t } = useTranslation();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!currentPassword.trim()) {
      setError(t('app.changePassword.currentRequired'));
      return;
    }
    if (!newPassword) {
      setError(t('app.changePassword.newRequired'));
      return;
    }
    if (newPassword !== repeatPassword) {
      setError(t('app.changePassword.mismatch'));
      return;
    }
    setLoading(true);
    try {
      await apiChangePassword({
        currentPassword,
        newPassword,
        repeatPassword,
      });
      Alert.alert(t('app.alerts.success'), t('app.auth.passwordChanged'), [
        { text: t('app.modal.ok'), onPress: () => {
          setCurrentPassword('');
          setNewPassword('');
          setRepeatPassword('');
        } },
      ]);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: string }; message?: string })?.message
        ?? (e as { response?: { data?: string } })?.response?.data
        ?? t('app.changePassword.failedChange');
      setError(typeof msg === 'string' ? msg : t('app.changePassword.failedChange'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={screenStyles.container} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>{t('app.changePassword.title')}</Text>
      {error ? (
        <View style={screenStyles.errorBox}>
          <Text style={screenStyles.errorText}>{error}</Text>
        </View>
      ) : null}
      <View style={screenStyles.card}>
        <Text style={screenStyles.formLabel}>{t('app.changePassword.currentPh')}</Text>
        <TextInput
          style={screenStyles.formInput}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder={t('app.changePassword.currentPh')}
          placeholderTextColor="#6c757d"
          secureTextEntry
          editable={!loading}
        />
        <Text style={screenStyles.formLabel}>{t('app.changePassword.newPh')}</Text>
        <TextInput
          style={screenStyles.formInput}
          value={newPassword}
          onChangeText={setNewPassword}
          placeholder={t('app.changePassword.newPh')}
          placeholderTextColor="#6c757d"
          secureTextEntry
          editable={!loading}
        />
        <Text style={screenStyles.formLabel}>{t('app.changePassword.confirmPh')}</Text>
        <TextInput
          style={screenStyles.formInput}
          value={repeatPassword}
          onChangeText={setRepeatPassword}
          placeholder={t('app.changePassword.confirmPh')}
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
            <Text style={screenStyles.formButtonText}>{t('app.changePassword.submit')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: { opacity: 0.7 },
});
