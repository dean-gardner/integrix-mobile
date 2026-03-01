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
import { apiChangePassword } from '../api/auth';
import { screenStyles } from '../styles/screenStyles';

export default function ChangePasswordScreen() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [repeatPassword, setRepeatPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setError(null);
    if (!currentPassword.trim()) {
      setError('Enter your current password.');
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
      await apiChangePassword({
        currentPassword,
        newPassword,
        repeatPassword,
      });
      Alert.alert('Success', 'Password changed. Please sign in again.', [
        { text: 'OK', onPress: () => {
          setCurrentPassword('');
          setNewPassword('');
          setRepeatPassword('');
        } },
      ]);
    } catch (e: unknown) {
      const msg = (e as { response?: { data?: string }; message?: string })?.message
        ?? (e as { response?: { data?: string } })?.response?.data
        ?? 'Failed to change password';
      setError(typeof msg === 'string' ? msg : 'Failed to change password');
    } finally {
      setLoading(false);
    }
  };

  return (
    <ScrollView style={screenStyles.container} contentContainerStyle={screenStyles.content}>
      <Text style={screenStyles.title}>Change password</Text>
      {error ? (
        <View style={screenStyles.errorBox}>
          <Text style={screenStyles.errorText}>{error}</Text>
        </View>
      ) : null}
      <View style={screenStyles.card}>
        <Text style={screenStyles.formLabel}>Current password</Text>
        <TextInput
          style={screenStyles.formInput}
          value={currentPassword}
          onChangeText={setCurrentPassword}
          placeholder="Current password"
          placeholderTextColor="#6c757d"
          secureTextEntry
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
            <Text style={screenStyles.formButtonText}>Change password</Text>
          )}
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  buttonDisabled: { opacity: 0.7 },
});
