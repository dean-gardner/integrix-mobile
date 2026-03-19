import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  Image,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigation } from '@react-navigation/native';
import { launchImageLibrary, type Asset } from 'react-native-image-picker';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import type { AppDispatch, RootState } from '../store';
import { loadUser } from '../store/authSlice';
import { editProfile } from '../api/users';
import { screenStyles } from '../styles/screenStyles';
import { useTranslation } from 'react-i18next';
import { theme } from '../theme';

export default function EditProfileScreen() {
  const { t } = useTranslation();
  const dispatch = useDispatch<AppDispatch>();
  const navigation = useNavigation();
  const user = useSelector((s: RootState) => s.auth.user);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [selectedPhoto, setSelectedPhoto] = useState<Asset | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFirstName(user.firstName ?? '');
      setLastName(user.lastName ?? '');
      setEmail(user.email ?? '');
      setPhone(user.phone ?? '');
    }
  }, [user]);

  const pickPhoto = async () => {
    const result = await launchImageLibrary({
      mediaType: 'photo',
      selectionLimit: 1,
      quality: 0.9,
    });
    if (result.didCancel) return;
    if (result.errorCode) {
      setError(result.errorMessage ?? t('app.editProfile.pickPhotoFail'));
      return;
    }
    const photo = result.assets?.[0] ?? null;
    if (!photo?.uri) {
      setError(t('app.editProfile.pickPhotoFail'));
      return;
    }
    setError(null);
    setSelectedPhoto(photo);
  };

  const handleSave = async () => {
    if (!user) return;
    const fn = (firstName ?? '').trim();
    const ln = (lastName ?? '').trim();
    const em = (email ?? '').trim();
    if (!fn || !ln) {
      setError(t('app.editProfile.fnLnRequired'));
      return;
    }
    if (!em) {
      setError(t('app.editProfile.emailRequired'));
      return;
    }
    setError(null);
    setSaving(true);
    try {
      const formData = new FormData();
      if (selectedPhoto?.uri) {
        formData.append(
          'Photo',
          {
            uri: selectedPhoto.uri,
            name: selectedPhoto.fileName ?? 'profile.jpg',
            type: selectedPhoto.type ?? 'image/jpeg',
          } as any
        );
      }
      formData.append('FirstName', fn);
      formData.append('LastName', ln);
      formData.append('Email', em);
      formData.append('PhoneNumber', phone ?? '');
      await editProfile(formData);
      await dispatch(loadUser()).unwrap();
      setSelectedPhoto(null);
      Alert.alert(t('app.alerts.success'), t('app.editProfile.success'));
    } catch (e: unknown) {
      const msg = (e as { message?: string })?.message ?? t('app.editProfile.updateFailed');
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const openChangePassword = () => {
    navigation.navigate('ChangePassword' as never);
  };

  if (!user) {
    return (
      <View style={screenStyles.container}>
        <Text style={screenStyles.muted}>{t('app.editProfile.signInToEdit')}</Text>
      </View>
    );
  }

  const photoUri = selectedPhoto?.uri ?? user.photoUrl ?? null;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.pageTitle}>{t('app.editProfile.pageTitle')}</Text>
      {error ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorText}>{error}</Text>
        </View>
      ) : null}
      <View style={styles.card}>
        <Text style={styles.sectionTitle}>{t('app.editProfile.personalInfo')}</Text>

        <Text style={styles.label}>{t('app.editProfile.firstNameStar')}</Text>
        <TextInput
          style={styles.input}
          value={firstName}
          onChangeText={setFirstName}
          placeholder={t('app.editProfile.firstNamePh')}
          placeholderTextColor="#6c757d"
          editable={!saving}
        />

        <Text style={styles.label}>{t('app.editProfile.lastNameStar')}</Text>
        <TextInput
          style={styles.input}
          value={lastName}
          onChangeText={setLastName}
          placeholder={t('app.editProfile.lastNamePh')}
          placeholderTextColor="#6c757d"
          editable={!saving}
        />

        <Text style={styles.label}>{t('app.editProfile.emailStar')}</Text>
        <TextInput
          style={[styles.input, styles.disabledInput]}
          value={email}
          placeholder={t('app.editProfile.emailPh')}
          placeholderTextColor="#6c757d"
          keyboardType="email-address"
          autoCapitalize="none"
          editable={false}
        />

        <Text style={styles.label}>{t('app.editProfile.phoneLabel')}</Text>
        <TextInput
          style={styles.input}
          value={phone}
          onChangeText={setPhone}
          placeholder=""
          placeholderTextColor="#6c757d"
          keyboardType="phone-pad"
          editable={!saving}
        />

        <Text style={styles.label}>{t('app.editProfile.passwordLabel')}</Text>
        <TouchableOpacity
          style={styles.changePasswordButton}
          onPress={openChangePassword}
          disabled={saving}
          activeOpacity={0.8}
        >
          <Text style={styles.changePasswordText}>{t('app.editProfile.changePasswordBtn')}</Text>
        </TouchableOpacity>

        <View style={styles.photoSection}>
          {photoUri ? (
            <Image source={{ uri: photoUri }} style={styles.photoPreview} />
          ) : (
            <View style={styles.photoPlaceholder}>
              <MaterialIcons name="account-circle" size={104} color="#bfc3c8" />
            </View>
          )}
          <TouchableOpacity
            style={styles.cameraButton}
            onPress={pickPhoto}
            disabled={saving}
            activeOpacity={0.8}
          >
            <MaterialIcons name="photo-camera" size={16} color="#fff" />
          </TouchableOpacity>
        </View>

        <View style={styles.footerDivider} />

        <View style={styles.footerRow}>
          <TouchableOpacity
            style={[styles.saveButton, saving && styles.buttonDisabled]}
            onPress={handleSave}
            disabled={saving}
            activeOpacity={0.8}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.saveButtonText}>{t('app.editProfile.save')}</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },
  content: {
    paddingHorizontal: 10,
    paddingTop: 10,
    paddingBottom: 24,
  },
  pageTitle: {
    fontSize: 35,
    fontWeight: '700',
    color: '#1f2737',
    marginBottom: 12,
  },
  errorBox: {
    backgroundColor: '#fee',
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    marginBottom: 10,
  },
  errorText: {
    color: theme.colors.error,
    fontSize: 13,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: '#d9deea',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 12,
  },
  sectionTitle: {
    color: '#2f3a55',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
  },
  label: {
    color: '#3f4d70',
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 8,
    marginTop: 10,
  },
  input: {
    height: 42,
    borderWidth: 1,
    borderColor: '#d4d8e4',
    borderRadius: 3,
    backgroundColor: '#ffffff',
    paddingHorizontal: 12,
    color: '#1f2430',
    fontSize: 14,
  },
  disabledInput: {
    backgroundColor: '#d2d7e5',
    color: '#1f2430',
  },
  buttonDisabled: { opacity: 0.7 },
  changePasswordButton: {
    alignSelf: 'flex-start',
    marginTop: 2,
  },
  changePasswordText: {
    fontSize: 14,
    color: theme.colors.primary,
    fontWeight: '700',
  },
  photoSection: {
    width: 120,
    height: 120,
    alignSelf: 'center',
    marginTop: 10,
    marginBottom: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  photoPreview: {
    width: 112,
    height: 112,
    borderRadius: 56,
    backgroundColor: '#d0d3d9',
  },
  photoPlaceholder: {
    width: 112,
    height: 112,
    borderRadius: 56,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#d5d8dd',
  },
  cameraButton: {
    position: 'absolute',
    right: 6,
    top: 8,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: '#2639a8',
    borderWidth: 5,
    borderColor: '#e0e3ed',
    alignItems: 'center',
    justifyContent: 'center',
  },
  footerDivider: {
    borderTopWidth: 1,
    borderTopColor: '#d8dce6',
    marginTop: 6,
    marginBottom: 10,
  },
  footerRow: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  saveButton: {
    minHeight: 36,
    minWidth: 68,
    borderRadius: 4,
    backgroundColor: '#2639a8',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 14,
  },
  saveButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});
