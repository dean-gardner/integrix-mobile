import React, { useMemo, useState, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Linking,
  useWindowDimensions,
  StatusBar,
  I18nManager,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import type { AppDispatch, RootState } from '../store';
import { signIn, clearError } from '../store/authSlice';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';

const TERMS_URL = 'https://www.integri-x.com/en/terms';
const FORGOT_PASSWORD_URL = 'https://app.integri-x.com/forgot-password';
const CREATE_ACCOUNT_URL = 'https://app.integri-x.com/signup-company-type';

const openURL = (url: string) => Linking.openURL(url).catch(() => {});

const getTimeZoneId = () => {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone ?? 'Australia/Sydney';
  } catch {
    return 'Australia/Sydney';
  }
};

export default function SignInScreen() {
  const { t, i18n } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const isRtl = useMemo(() => {
    const languageCode = (i18n.resolvedLanguage ?? i18n.language ?? '').toLowerCase();
    if (languageCode.startsWith('ar') || languageCode.startsWith('ur')) return true;
    return I18nManager.isRTL || i18n.dir(languageCode) === 'rtl';
  }, [i18n]);
  const scrollViewRef = useRef<ScrollView>(null);
  const { height } = useWindowDimensions();
  const { isLoading, error } = useSelector((s: RootState) => s.auth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  React.useEffect(() => {
    dispatch(clearError());
  }, [dispatch]);

  const handleSubmit = async () => {
    if (!email.trim() || !password) {
      Alert.alert(t('common.error'), t('signIn.enterBoth'));
      return;
    }
    await dispatch(
      signIn({
        email: email.trim(),
        password,
        timeZoneId: getTimeZoneId(),
      })
    );
  };


  const topSpacing = Math.max(120, Math.min(220, Math.round(height * 0.28)));
  const keyboardVerticalOffset =
    Platform.OS === 'android' ? (StatusBar.currentHeight ?? 0) : 0;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior="padding"
      keyboardVerticalOffset={keyboardVerticalOffset}
    >
      <ScrollView
        ref={scrollViewRef}
        contentContainerStyle={[
          styles.formWrapper,
          isRtl && styles.formWrapperRtl,
          { paddingTop: topSpacing },
        ]}
        keyboardShouldPersistTaps="handled"
      >
        <View style={[styles.card, isRtl && styles.cardRtl]}>
          <Text style={[styles.title, isRtl ? styles.textRtl : styles.textLtr]}>{t('signIn.title')}</Text>

          {error ? (
            <View style={styles.errorBox}>
              <Text style={[styles.errorText, isRtl ? styles.textRtl : styles.textLtr]}>{error}</Text>
            </View>
          ) : null}

          <View style={[styles.fieldGroup, isRtl && styles.fieldGroupRtl]}>
            <Text style={[styles.label, isRtl ? styles.textRtl : styles.textLtr]}>{t('signIn.email')}</Text>
            <TextInput
              style={[
                styles.input,
                isRtl
                  ? email.trim()
                    ? styles.inputRtlValue
                    : styles.inputRtl
                  : styles.inputLtr,
              ]}
              textAlign={isRtl ? 'right' : 'left'}
              textAlignVertical="center"
              placeholder={t('signIn.email')}
              placeholderTextColor="#6c757d"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              editable={!isLoading}
              textContentType="username"
            />
          </View>

          <View style={[styles.fieldGroup, isRtl && styles.fieldGroupRtl]}>
            <Text style={[styles.label, isRtl ? styles.textRtl : styles.textLtr]}>{t('signIn.password')}</Text>
            <TextInput
              style={[styles.input, isRtl ? styles.inputRtl : styles.inputLtr]}
              textAlign={isRtl ? 'right' : 'left'}
              textAlignVertical="center"
              placeholder={t('signIn.password')}
              placeholderTextColor="#6c757d"
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              editable={!isLoading}
              textContentType="password"
              onFocus={() =>
                setTimeout(
                  () =>
                    scrollViewRef.current?.scrollToEnd({ animated: true }),
                  100
                )
              }
            />
          </View>

          <TouchableOpacity
            style={[styles.button, isLoading && styles.buttonDisabled]}
            onPress={handleSubmit}
            disabled={isLoading}
            activeOpacity={0.85}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.buttonText}>{t('signIn.submit')}</Text>
            )}
          </TouchableOpacity>

          <Text style={[styles.termsText, isRtl ? styles.termsTextRtl : styles.textLtr]}>
            {t('signIn.termsPrefix')}{' '}
            <Text style={[styles.termsLink, isRtl && styles.termsLinkRtl]} onPress={() => openURL(TERMS_URL)}>
              {t('signIn.termsLink')}
            </Text>
          </Text>

          <View style={[styles.linksBlock, isRtl && styles.linksBlockRtl]}>
            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => openURL(FORGOT_PASSWORD_URL)}
              disabled={isLoading}
            >
              <Text style={[styles.forgotLinkText, isRtl ? styles.textRtl : styles.textLtr]}>
                {t('signIn.forgotPassword')}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.linkButton}
              onPress={() => openURL(CREATE_ACCOUNT_URL)}
              disabled={isLoading}
            >
              <Text style={[styles.secondaryLinkText, isRtl ? styles.textRtl : styles.textLtr]}>
                {t('signIn.createAccount')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  formWrapper: {
    flexGrow: 1,
    paddingHorizontal: 10,
    paddingBottom: 24,
    alignItems: 'stretch',
  },
  formWrapperRtl: {
    direction: 'rtl',
  },
  card: {
    width: '100%',
    backgroundColor: '#f8f9fc',
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#d5dbe8',
    padding: 24,
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  cardRtl: {
    direction: 'rtl',
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: theme.colors.primary,
    marginBottom: 10,
  },
  label: {
    fontSize: 14,
    color: '#8f93a8',
    marginBottom: 8,
    marginTop: 10,
  },
  fieldGroup: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'stretch',
  },
  fieldGroupRtl: {
    alignItems: 'flex-end',
  },
  textLtr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  textRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
    alignSelf: 'stretch',
  },
  input: {
    width: '100%',
    alignSelf: 'stretch',
    borderWidth: 1,
    borderColor: '#d2d7e5',
    borderRadius: 3,
    paddingHorizontal: 12,
    paddingVertical: 0,
    minHeight: 36,
    fontSize: 15,
    marginBottom: 16,
    backgroundColor: '#d2d7e5',
    color: '#151a22',
    includeFontPadding: false,
  },
  inputLtr: {
    textAlign: 'left',
    writingDirection: 'ltr',
  },
  inputRtl: {
    textAlign: 'right',
    writingDirection: 'rtl',
    direction: 'rtl',
  },
  inputRtlValue: {
    textAlign: 'right',
    writingDirection: 'ltr',
    direction: 'ltr',
  },
  errorBox: {
    backgroundColor: '#fee',
    padding: 12,
    borderRadius: 6,
    marginBottom: 16,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 14,
  },
  button: {
    backgroundColor: theme.colors.primary,
    borderRadius: 3,
    minHeight: 36,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 2,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
  termsText: {
    marginTop: 16,
    color: '#161a24',
    fontSize: 14,
    lineHeight: 22,
    fontWeight: '600',
  },
  termsTextRtl: {
    alignSelf: 'stretch',
    textAlign: 'right',
    writingDirection: 'rtl',
  },
  termsLink: {
    color: theme.colors.primary,
    fontWeight: '700',
  },
  termsLinkRtl: {
    writingDirection: 'rtl',
  },
  linksBlock: {
    width: '100%',
    alignSelf: 'stretch',
    alignItems: 'flex-start',
    marginTop: 36,
    gap: 8,
  },
  linksBlockRtl: {
    alignItems: 'flex-end',
  },
  linkButton: {
    alignSelf: 'auto',
  },
  forgotLinkText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  secondaryLinkText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '700',
  },
});
