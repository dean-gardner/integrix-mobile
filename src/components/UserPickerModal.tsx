/**
 * Reusable modal to search and pick a user (e.g. for share/assign flows).
 * Uses getUsersBySearch; on row tap calls onSelect(user) and onClose().
 */
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  useWindowDimensions,
} from 'react-native';
import { getUsersBySearch } from '../api/users';
import type { FoundUserDTO } from '../types/user';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';
import { useTranslation } from 'react-i18next';
import { rtlAwareInputStyle, rtlAwareTextStyle, rtlDirectionStyle, rtlRowStyle } from '../utils/rtlLayout';

const MIN_QUERY_LENGTH = 2;
const SEARCH_DEBOUNCE_MS = 300;
const RESULTS_MIN_HEIGHT = 120;
const RESULTS_MAX_HEIGHT = 280;

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
  title,
  initialQuery,
}: UserPickerModalProps) {
  const { t, i18n } = useTranslation();
  const { height: windowHeight } = useWindowDimensions();
  const rtlText = useMemo(() => rtlAwareTextStyle(i18n), [i18n]);
  const rtlInput = useMemo(() => rtlAwareInputStyle(i18n), [i18n]);
  const rtlRow = useMemo(() => rtlRowStyle(i18n), [i18n]);
  const rtlDirection = useMemo(() => rtlDirectionStyle(i18n), [i18n]);
  const resolvedTitle = title ?? t('app.userSearch.title');
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoundUserDTO[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searched, setSearched] = useState(false);
  const [sessionKey, setSessionKey] = useState(0);
  const searchRequestIdRef = useRef(0);
  const inputRef = useRef<TextInput>(null);
  const wasVisibleRef = useRef(false);

  // Keep an explicit height so iOS KeyboardAvoidingView + FlatList cannot collapse to a blank card.
  const resultsAreaHeight = useMemo(
    () => Math.min(RESULTS_MAX_HEIGHT, Math.max(RESULTS_MIN_HEIGHT, Math.floor(windowHeight * 0.35))),
    [windowHeight]
  );

  useEffect(() => {
    if (visible && !wasVisibleRef.current) {
      const nextQuery = (initialQuery ?? '').trim();
      searchRequestIdRef.current += 1;
      setSessionKey((key) => key + 1);
      setQuery(nextQuery);
      setResults([]);
      setError(null);
      setSearched(false);
      setLoading(false);
      // Refocus after reopen so the second search attempt works reliably on iOS.
      requestAnimationFrame(() => {
        inputRef.current?.focus();
      });
    }
    if (!visible && wasVisibleRef.current) {
      searchRequestIdRef.current += 1;
      setLoading(false);
    }
    wasVisibleRef.current = visible;
  }, [visible, initialQuery]);

  useEffect(() => {
    if (!visible) return;

    const q = query.trim();
    if (q.length < MIN_QUERY_LENGTH) {
      searchRequestIdRef.current += 1;
      setResults([]);
      setSearched(false);
      setLoading(false);
      return;
    }

    let isActive = true;
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setError(null);
    setSearched(true);
    setLoading(true);
    const timer = setTimeout(() => {
      getUsersBySearch({
        search: q,
        shouldFindTeams: false,
        includeOwnPerson: true,
        onlyRegisteredUsers: false,
        onlyCompanyTeamUsers: true,
      })
        .then((res) => {
          if (isActive && searchRequestIdRef.current === requestId) {
            setResults(Array.isArray(res.data) ? res.data : []);
          }
        })
        .catch((e: unknown) => {
          if (!isActive || searchRequestIdRef.current !== requestId) return;
          setResults([]);
          setError((e as { message?: string })?.message ?? t('app.userSearch.failed'));
        })
        .finally(() => {
          if (isActive && searchRequestIdRef.current === requestId) setLoading(false);
        });
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      isActive = false;
      clearTimeout(timer);
    };
  }, [query, t, visible, sessionKey]);

  const onSearch = useCallback(async () => {
    const q = (query ?? '').trim();
    if (q.length < MIN_QUERY_LENGTH) {
      searchRequestIdRef.current += 1;
      setError(t('app.userSearch.minChars', { min: MIN_QUERY_LENGTH }));
      return;
    }
    const requestId = searchRequestIdRef.current + 1;
    searchRequestIdRef.current = requestId;
    setError(null);
    setSearched(true);
    setLoading(true);
    try {
      const res = await getUsersBySearch({
        search: q,
        shouldFindTeams: false,
        includeOwnPerson: true,
        onlyRegisteredUsers: false,
        onlyCompanyTeamUsers: true,
      });
      if (searchRequestIdRef.current === requestId) {
        setResults(Array.isArray(res.data) ? res.data : []);
      }
    } catch (e: unknown) {
      if (searchRequestIdRef.current !== requestId) return;
      setResults([]);
      setError((e as { message?: string })?.message ?? t('app.userSearch.failed'));
    } finally {
      if (searchRequestIdRef.current === requestId) setLoading(false);
    }
  }, [query, t]);

  const handleSelect = useCallback(
    (u: FoundUserDTO) => {
      searchRequestIdRef.current += 1;
      setLoading(false);
      onSelect(u);
      onClose();
    },
    [onSelect, onClose]
  );

  const handleClose = useCallback(() => {
    searchRequestIdRef.current += 1;
    setQuery('');
    setResults([]);
    setError(null);
    setSearched(false);
    setLoading(false);
    onClose();
  }, [onClose]);

  const renderResult = useCallback(
    ({ item, index }: { item: FoundUserDTO; index: number }) => (
      <TouchableOpacity
        key={`${item.email}-${item.userId ?? index}`}
        style={styles.resultRow}
        onPress={() => handleSelect(item)}
        activeOpacity={0.7}
      >
        <Text style={[styles.resultName, rtlText]}>{item.fullName || item.email}</Text>
        {item.fullName ? <Text style={[screenStyles.muted, rtlText]}>{item.email}</Text> : null}
        {item.companyTeam ? (
          <Text style={[styles.team, rtlText]}>
            {t('app.userSearch.teamLabel', { name: item.companyTeam.name })}
          </Text>
        ) : null}
      </TouchableOpacity>
    ),
    [handleSelect, rtlText, t]
  );

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={handleClose}
      // Avoid iOS presentation quirks that can leave a blank surface after reopen.
      presentationStyle="overFullScreen"
    >
      <KeyboardAvoidingView
        style={styles.backdrop}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 24 : 0}
      >
        <View style={[styles.card, rtlDirection]}>
          <View style={[styles.header, rtlRow]}>
            <Text style={[styles.title, rtlText]}>{resolvedTitle}</Text>
            <TouchableOpacity onPress={handleClose} hitSlop={12}>
              <Text style={[styles.closeText, rtlText]}>{t('app.modal.close')}</Text>
            </TouchableOpacity>
          </View>
          <View style={[styles.searchRow, rtlRow]}>
            <TextInput
              ref={inputRef}
              style={[styles.input, rtlInput]}
              textAlign={rtlInput.textAlign}
              value={query}
              onChangeText={(text) => {
                setQuery(text);
                setError(null);
              }}
              placeholder={t('app.userSearch.placeholder')}
              placeholderTextColor="#6c757d"
              autoCapitalize="none"
              autoCorrect={false}
              returnKeyType="search"
              onSubmitEditing={onSearch}
              // Keep the field usable across reopen / second search on iOS.
              blurOnSubmit={false}
            />
            <TouchableOpacity
              style={[styles.searchBtn, loading && styles.searchBtnDisabled]}
              onPress={onSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={[styles.searchBtnText, rtlText]}>{t('app.userSearch.search')}</Text>
              )}
            </TouchableOpacity>
          </View>
          {error ? (
            <View style={screenStyles.errorBox}>
              <Text style={[screenStyles.errorText, rtlText]}>{error}</Text>
            </View>
          ) : null}
          {loading ? (
            <View style={styles.loader}>
              <ActivityIndicator size="small" color={theme.colors.primary} />
            </View>
          ) : null}
          {searched && !loading ? (
            <View style={[styles.resultsWrap, { height: resultsAreaHeight }]}>
              {results.length === 0 ? (
                <Text style={[styles.noResults, rtlText]}>{t('app.userSearch.noResults')}</Text>
              ) : (
                <FlatList
                  data={results}
                  keyExtractor={(item, index) => `${item.email}-${item.userId ?? index}`}
                  renderItem={renderResult}
                  keyboardShouldPersistTaps="handled"
                  style={styles.resultsList}
                  contentContainerStyle={styles.resultsListContent}
                />
              )}
            </View>
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
  title: { fontSize: 18, fontWeight: '600', color: theme.colors.text, flex: 1, paddingEnd: 8 },
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
  resultsWrap: {
    borderWidth: 1,
    borderColor: theme.colors.border,
    borderRadius: 8,
    backgroundColor: '#fafbfc',
    overflow: 'hidden',
  },
  resultsList: {
    flex: 1,
  },
  resultsListContent: {
    flexGrow: 1,
  },
  noResults: {
    ...screenStyles.muted,
    paddingHorizontal: 12,
    paddingVertical: 16,
  },
  resultRow: {
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  resultName: { fontSize: 16, fontWeight: '600', color: theme.colors.text, marginBottom: 2 },
  team: { fontSize: 12, color: theme.colors.textMuted, marginTop: 2 },
});
