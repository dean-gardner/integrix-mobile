import React, { useMemo } from 'react';
import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { MaterialIcons } from '@react-native-vector-icons/material-icons';
import { theme } from '../theme';

type PaginatorProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  isLoading?: boolean;
};

const WINDOW = 2;

function buildPageItems(current: number, total: number): Array<number | '...'> {
  if (total <= 1) return [1];

  const pages = new Set<number>();
  pages.add(1);
  pages.add(total);
  for (let i = current - WINDOW; i <= current + WINDOW; i++) {
    if (i >= 1 && i <= total) pages.add(i);
  }

  const sorted = Array.from(pages).sort((a, b) => a - b);
  const result: Array<number | '...'> = [];
  for (let i = 0; i < sorted.length; i++) {
    if (i > 0 && sorted[i] - sorted[i - 1] > 1) result.push('...');
    result.push(sorted[i]);
  }
  return result;
}

export function Paginator({ currentPage, totalPages, onPageChange, isLoading }: PaginatorProps) {
  const pageItems = useMemo(() => buildPageItems(currentPage, totalPages), [currentPage, totalPages]);

  if (totalPages <= 1) return null;

  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.arrowButton, currentPage <= 1 && styles.disabled]}
        onPress={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1 || isLoading}
      >
        <MaterialIcons name="chevron-left" size={22} color={currentPage <= 1 ? '#c8c8c8' : '#555e72'} />
      </TouchableOpacity>

      {pageItems.map((item, index) =>
        item === '...' ? (
          <View key={`ellipsis-${index}`} style={styles.ellipsis}>
            <Text style={styles.ellipsisText}>…</Text>
          </View>
        ) : (
          <TouchableOpacity
            key={item}
            style={[styles.pageButton, item === currentPage && styles.pageButtonActive]}
            onPress={() => item !== currentPage && onPageChange(item)}
            disabled={isLoading}
            activeOpacity={item === currentPage ? 1 : 0.7}
          >
            {isLoading && item === currentPage ? (
              <ActivityIndicator size="small" color={theme.colors.primary} />
            ) : (
              <Text style={[styles.pageText, item === currentPage && styles.pageTextActive]}>
                {item}
              </Text>
            )}
          </TouchableOpacity>
        )
      )}

      <TouchableOpacity
        style={[styles.arrowButton, currentPage >= totalPages && styles.disabled]}
        onPress={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages || isLoading}
      >
        <MaterialIcons name="chevron-right" size={22} color={currentPage >= totalPages ? '#c8c8c8' : '#555e72'} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    flexWrap: 'wrap',
    gap: 4,
    paddingVertical: 12,
  },
  arrowButton: {
    width: 34,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d6dbe6',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pageButton: {
    minWidth: 34,
    height: 34,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#d6dbe6',
    backgroundColor: '#fff',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
  },
  pageButtonActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  pageText: {
    fontSize: 14,
    color: '#3f5479',
    fontWeight: '500',
  },
  pageTextActive: {
    color: '#fff',
    fontWeight: '700',
  },
  ellipsis: {
    width: 28,
    height: 34,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ellipsisText: {
    fontSize: 16,
    color: '#8a92a3',
  },
  disabled: {
    opacity: 0.4,
  },
});
