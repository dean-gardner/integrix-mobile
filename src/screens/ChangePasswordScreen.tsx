import React, { useMemo, useState } from 'react';
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
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { useTranslation } from 'react-i18next';
import { apiChangePassword } from '../api/auth';
import { screenStyles } from '../styles/screenStyles';
import { getHttpErrorMessage } from '../utils/httpErrorMessage';
import {
  isRtlLayout,
  rtlAwareInputStyle,
  rtlAwareTextStyle,
  rtlDirectionStyle,
} from '../utils/rtlLayout';

export default function ChangePasswordScreen() {
  const { t, i18n } = useTranslation();
  const isRtl = useMemo(() => isRtlLayout(i18n), [i18n]);
  const rtlText = useMemo(() => rtlAwareTextStyle(i18n), [i18n]);
  const rtlInput = useMemo(() => rtlAwareInputStyle(i18n), [i18n]);
  const rtlDirection = useMemo(() => rtlDirectionStyle(i18n), [i18n]);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showRepeatPassword, setShowRepeatPassword] = useState(false);
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
      const status = (e as { response?: { status?: number } })?.response?.status;
      const fallback =
        status === 400
          ? t('app.changePassword.validationFailed')
          : t('app.changePassword.failedChange');
      const msg = getHttpErrorMessage(e, fallback);
      setError(msg || fallback);
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView
      style={screenStyles.container}
      contentContainerStyle={[screenStyles.content, rtlDirection]}
      keyboardShouldPersistTaps="handled"
    >
      {error ? (
        <View style={screenStyles.errorBox}>
          <Text style={[screenStyles.errorText, rtlText]}>{error}</Text>
        </View>
      ) : null}
      <View style={[screenStyles.card, rtlDirection]}>
        <Text style={[screenStyles.formLabel, rtlText]}>{`${t('app.changePassword.currentPh')} *`}</Text>
        <View style={styles.passwordInputWrap}>
          <TextInput
            style={[
              screenStyles.formInput,
              rtlInput,
              styles.passwordInput,
              isRtl ? styles.passwordInputRtl : styles.passwordInputLtr,
            ]}
            textAlign={rtlInput.textAlign}
            value={currentPassword}
            onChangeText={setCurrentPassword}
            placeholder={t('app.changePassword.currentPh')}
            placeholderTextColor="#6c757d"
            secureTextEntry={!showCurrentPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.passwordToggle, isRtl && styles.passwordToggleRtl]}
            onPress={() => setShowCurrentPassword((current) => !current)}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={
              showCurrentPassword
                ? t('app.changePassword.hidePassword')
                : t('app.changePassword.showPassword')
            }
          >
            <MaterialIcons
              name={showCurrentPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color="#6c757d"
            />
          </TouchableOpacity>
        </View>

        <Text style={[screenStyles.formLabel, rtlText]}>{`${t('app.changePassword.newPh')} *`}</Text>
        <View style={styles.passwordInputWrap}>
          <TextInput
            style={[
              screenStyles.formInput,
              rtlInput,
              styles.passwordInput,
              isRtl ? styles.passwordInputRtl : styles.passwordInputLtr,
            ]}
            textAlign={rtlInput.textAlign}
            value={newPassword}
            onChangeText={setNewPassword}
            placeholder={t('app.changePassword.newPh')}
            placeholderTextColor="#6c757d"
            secureTextEntry={!showNewPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.passwordToggle, isRtl && styles.passwordToggleRtl]}
            onPress={() => setShowNewPassword((current) => !current)}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={
              showNewPassword
                ? t('app.changePassword.hidePassword')
                : t('app.changePassword.showPassword')
            }
          >
            <MaterialIcons
              name={showNewPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color="#6c757d"
            />
          </TouchableOpacity>
        </View>

        <Text style={[screenStyles.formLabel, rtlText]}>{`${t('app.changePassword.confirmPh')} *`}</Text>
        <View style={styles.passwordInputWrap}>
          <TextInput
            style={[
              screenStyles.formInput,
              rtlInput,
              styles.passwordInput,
              isRtl ? styles.passwordInputRtl : styles.passwordInputLtr,
            ]}
            textAlign={rtlInput.textAlign}
            value={repeatPassword}
            onChangeText={setRepeatPassword}
            placeholder={t('app.changePassword.confirmPh')}
            placeholderTextColor="#6c757d"
            secureTextEntry={!showRepeatPassword}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.passwordToggle, isRtl && styles.passwordToggleRtl]}
            onPress={() => setShowRepeatPassword((current) => !current)}
            disabled={loading}
            accessibilityRole="button"
            accessibilityLabel={
              showRepeatPassword
                ? t('app.changePassword.hidePassword')
                : t('app.changePassword.showPassword')
            }
          >
            <MaterialIcons
              name={showRepeatPassword ? 'visibility-off' : 'visibility'}
              size={20}
              color="#6c757d"
            />
          </TouchableOpacity>
        </View>
        <TouchableOpacity
          style={[screenStyles.formButton, loading && styles.buttonDisabled]}
          onPress={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Text style={[screenStyles.formButtonText, rtlText]}>{t('app.changePassword.submit')}</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: { opacity: 0.7 },
  passwordInputWrap: {
    position: 'relative',
  },
  passwordInput: {
    paddingEnd: 44,
  },
  passwordInputLtr: {
    paddingRight: 44,
  },
  passwordInputRtl: {
    paddingLeft: 44,
  },
  passwordToggle: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    right: 8,
    width: 36,
    alignItems: 'center',
    justifyContent: 'center',
  },
  passwordToggleRtl: {
    right: undefined,
    left: 8,
  },
});
