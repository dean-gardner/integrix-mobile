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
import { getDocuments } from '../api/documents';
import type { DocumentVersionReadDTO } from '../types/document';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';

export type DocumentVersionPickerModalProps = {
  visible: boolean;
  onClose: () => void;
  onSelect: (doc: DocumentVersionReadDTO) => void;
  title?: string;
};

export function DocumentVersionPickerModal({
  visible,
  onClose,
  onSelect,
  title = 'Select document version',
}: DocumentVersionPickerModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<DocumentVersionReadDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);

  const runSearch = useCallback(
    async (search: string) => {
      setLoading(true);
      setError(null);
      setSearched(true);
      try {
        const q = search.trim();
        const res = await getDocuments({
          pageNumber: 0,
          pageSize: 20,
          documentNumberStr: q || undefined,
          description: q || undefined,
          sortingField: 'createdOnUtc',
          sortingOrder: 1,
        });
        setResults(res.data?.items ?? []);
      } catch (e: unknown) {
        setResults([]);
        setError((e as { message?: string })?.message ?? 'Failed to search documents.');
      } finally {
        setLoading(false);
      }
    },
    []
  );

  useEffect(() => {
    if (!visible) return;
    runSearch('').catch(() => {});
  }, [runSearch, visible]);

  const onSearchPress = useCallback(() => {
    runSearch(query).catch(() => {});
  }, [query, runSearch]);

  const handleSelect = useCallback(
    (doc: DocumentVersionReadDTO) => {
      onSelect(doc);
      onClose();
    },
    [onClose, onSelect]
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
              placeholder="Document number or description..."
              placeholderTextColor="#6c757d"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={onSearchPress}
              editable={!loading}
            />
            <TouchableOpacity
              style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
              onPress={onSearchPress}
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
            <ScrollView style={styles.resultsScroll} keyboardShouldPersistTaps="handled" nestedScrollEnabled>
              {results.length === 0 ? (
                <Text style={screenStyles.muted}>No document versions found.</Text>
              ) : (
                results.map((d) => (
                  <TouchableOpacity
                    key={d.id}
                    style={styles.resultRow}
                    onPress={() => handleSelect(d)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.resultName}>
                      {d.documentNumberStr ?? d.documentNo} · v{d.versionNo ?? '—'}
                    </Text>
                    <Text style={screenStyles.muted} numberOfLines={2}>
                      {d.description ?? '—'}
                    </Text>
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
  resultsScroll: { maxHeight: 320 },
  resultRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultName: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
});
