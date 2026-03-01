import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { getUsersBySearch } from '../api/users';
import type { FoundUserDTO } from '../types/user';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';

const MIN_QUERY_LENGTH = 2;

export default function UserSearchScreen() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUserDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const onSearch = useCallback(async () => {
    const q = (query ?? '').trim();
    if (q.length < MIN_QUERY_LENGTH) {
      setError(`Enter at least ${MIN_QUERY_LENGTH} characters.`);
      return;
    }
    setError(null);
    setSearched(true);
    setLoading(true);
    try {
      const res = await getUsersBySearch({
        search: q,
        onlyCompanyTeamUsers: true,
        onlyRegisteredUsers: true,
      });
      setResults(res.data ?? []);
    } catch (e: unknown) {
      setResults([]);
      setError((e as { message?: string })?.message ?? 'Search failed.');
    } finally {
      setLoading(false);
    }
  }, [query]);

  const isEmpty = searched && !loading && results.length === 0;
  const showResults = searched && !loading;

  return (
    <KeyboardAvoidingView
      style={screenStyles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 100 : 0}
    >
      <ScrollView
        style={screenStyles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={screenStyles.title}>Search users</Text>
        <Text style={styles.hint}>
          Find users by name or email (for share/assign). Min {MIN_QUERY_LENGTH} characters.
        </Text>
        <View style={styles.searchRow}>
          <TextInput
            style={styles.input}
            value={query}
            onChangeText={(t) => {
              setQuery(t);
              setError(null);
            }}
            placeholder="Name or email..."
            placeholderTextColor="#6c757d"
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
            onSubmitEditing={onSearch}
            editable={!loading}
          />
          <TouchableOpacity
            style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
            onPress={onSearch}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <Text style={styles.searchBtnText}>Search</Text>
            )}
          </TouchableOpacity>
        </View>
        {error ? (
          <View style={screenStyles.errorBox}>
            <Text style={screenStyles.errorText}>{error}</Text>
          </View>
        ) : null}
        {loading ? (
          <View style={screenStyles.loader}>
            <ActivityIndicator size="large" color={theme.colors.primary} />
          </View>
        ) : null}
        {showResults && !loading ? (
          <View style={screenStyles.list}>
            {isEmpty ? (
              <Text style={screenStyles.muted}>No users found.</Text>
            ) : (
              results.map((u, idx) => (
                <View key={`${u.email}-${u.userId ?? idx}`} style={screenStyles.card}>
                  <Text style={styles.name}>{u.fullName || u.email}</Text>
                  {u.fullName ? (
                    <Text style={screenStyles.muted}>{u.email}</Text>
                  ) : null}
                  {u.companyTeam ? (
                    <Text style={styles.team}>Team: {u.companyTeam.name}</Text>
                  ) : null}
                </View>
              ))
            )}
          </View>
        ) : null}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  scrollContent: { paddingBottom: 32 },
  hint: {
    fontSize: 13,
    color: theme.colors.textMuted,
    marginBottom: 16,
  },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  input: {
    flex: 1,
    ...screenStyles.formInput,
    marginBottom: 0,
  },
  searchBtn: {
    paddingHorizontal: 20,
    justifyContent: 'center',
    minWidth: 90,
    backgroundColor: theme.colors.primary,
    borderRadius: 8,
  },
  searchBtnDisabled: { opacity: 0.7 },
  searchBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },
  name: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 4 },
  team: { fontSize: 12, color: theme.colors.textMuted, marginTop: 4 },
});
