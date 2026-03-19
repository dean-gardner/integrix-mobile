/**
 * Reusable layout for paginated list screens: ScrollView, title, error, loading/empty/list.
 */
import React from 'react';
import {
  View,
  Text,
  ScrollView,
  RefreshControl,
  ActivityIndicator,
  TouchableOpacity,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { screenStyles } from '../styles/screenStyles';
import { theme } from '../theme';

type ListScreenLayoutProps = {
  title: string;
  error: string | null;
  isLoading: boolean;
  isEmpty: boolean;
  emptyMessage: string;
  refreshing: boolean;
  onRefresh: () => void;
  children: React.ReactNode;
  contentContainerStyle?: StyleProp<ViewStyle>;
};

export function ListScreenLayout({
  title,
  error,
  isLoading,
  isEmpty,
  emptyMessage,
  refreshing,
  onRefresh,
  children,
  contentContainerStyle,
}: ListScreenLayoutProps) {
  return (
    <ScrollView
      style={screenStyles.container}
      contentContainerStyle={[screenStyles.content, contentContainerStyle]}
      refreshControl={
        <RefreshControl
          refreshing={refreshing}
          onRefresh={onRefresh}
        />
      }
    >
      <Text style={screenStyles.title}>{title}</Text>
      {error ? (
        <View style={screenStyles.errorBox}>
          <Text style={screenStyles.errorText}>{error}</Text>
        </View>
      ) : null}
      {isLoading && isEmpty ? (
        <View style={screenStyles.loader}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
        </View>
      ) : isEmpty ? (
        <View style={screenStyles.card}>
          <Text style={screenStyles.muted}>{emptyMessage}</Text>
        </View>
      ) : (
        children
      )}
    </ScrollView>
  );
}

/** Load more button for paginated lists */
export function LoadMoreButton({
  onPress,
  loading,
  totalCount,
  disabled,
}: {
  onPress: () => void;
  loading: boolean;
  totalCount: number;
  disabled?: boolean;
}) {
  const { t } = useTranslation();
  return (
    <TouchableOpacity
      style={screenStyles.loadMore}
      onPress={onPress}
      disabled={disabled}
    >
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.primary} />
      ) : (
        <Text style={screenStyles.loadMoreText}>
          {t('app.list.loadMoreTotal', { count: totalCount })}
        </Text>
      )}
    </TouchableOpacity>
  );
}
