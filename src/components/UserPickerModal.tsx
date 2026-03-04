/**
 * Reusable modal to search and pick a user (e.g. for share/assign flows).
 * Uses getUsersBySearch; on row tap calls onSelect(user) and onClose().
 */
import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
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

export type UserPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (user: FoundUserDTO) => void;
  title?: string;
  /** When provided, modal opens with this query and runs search automatically (match web share UX). */
  initialQuery?: string;
};

export function UserPickerModal({
  visible,
  onClose,
  onSelect,
  title = 'Select user',
  initialQuery,
}: UserPickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUserDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  useEffect(() => {
    if (!visible) return;
    const q = (initialQuery ?? '').trim();
    if (q.length < MIN_QUERY_LENGTH) return;
    setQuery(q);
    setError(null);
    setSearched(true);
    setLoading(true);
    getUsersBySearch({
      search: q,
      shouldFindTeams: true,
      onlyRegisteredUsers: false,
      onlyCompanyTeamUsers: false,
      includeOwnPerson: true,
    })
      .then((res) => setResults(res.data ?? []))
      .catch((e: unknown) => {
        setResults([]);
        setError((e as { message?: string })?.message ?? 'Search failed.');
      })
      .finally(() => setLoading(false));
  }, [visible, initialQuery]);

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

  const handleSelect = useCallback(
    (u: FoundUserDTO) => {
      onSelect(u);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleClose = useCallback(() => {
    setQuery('');
    setResults([]);
    setError(null);
    setSearched(false);
    onClose();
  }, [onClose]);

  if (!visible) return null;

  return (
    <Modal visible={visible} transparent animationType="fade">
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 60 : 0}
      >
        <View style={styles.card}>
            <View style={styles.header}>
              <Text style={styles.title}>{title}</Text>
              <TouchableOpacity onPress={handleClose} hitSlop={12}>
                <Text style={styles.closeText}>Close</Text>
              </TouchableOpacity>
            </View>
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
              <View style={styles.loader}>
                <ActivityIndicator size="small" color={theme.colors.primary} />
              </View>
            ) : null}
            {searched && !loading ? (
              <ScrollView
                style={styles.resultsScroll}
                keyboardShouldPersistTaps="handled"
                nestedScrollEnabled
              >
                {results.length === 0 ? (
                  <Text style={screenStyles.muted}>No users found.</Text>
                ) : (
                  results.map((u, idx) => (
                    <TouchableOpacity
                      key={`${u.email}-${u.userId ?? idx}`}
                      style={styles.resultRow}
                      onPress={() => handleSelect(u)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.resultName}>{u.fullName || u.email}</Text>
                      {u.fullName ? (
                        <Text style={screenStyles.muted}>{u.email}</Text>
                      ) : null}
                      {u.companyTeam ? (
                        <Text style={styles.team}>Team: {u.companyTeam.name}</Text>
                      ) : null}
                    </TouchableOpacity>
                  ))
                )}
              </ScrollView>
            ) : null}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: theme.colors.cardBg,
    borderRadius: 12,
    padding: theme.spacing.cardPadding,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: { fontSize: 18, fontWeight: '600', color: theme.colors.text },
  closeText: { fontSize: 15, color: theme.colors.primary, fontWeight: '500' },
  searchRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 12,
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
  loader: { paddingVertical: 16, alignItems: 'center' },
  resultsScroll: { maxHeight: 280 },
  resultRow: {
    paddingVertical: 12,
    paddingHorizontal: 0,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultName: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  team: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
});
