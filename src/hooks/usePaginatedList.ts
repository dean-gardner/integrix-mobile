/**
 * Shared hook for paginated list screens: fetch on mount, refresh, load more (DRY).
 * Pass fetch/fetchMore that close over any args (e.g. companyId); when they change, effect re-runs.
 */
import { useEffect, useState, useCallback } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '../store';

type PaginatedListState<T> = {
  items: T[];
  isLoading: boolean;
  error: string | null;
  totalCount: number;
  noMorePages: boolean;
};

type UsePaginatedListOptions<T> = {
  /** Select slice state with items, isLoading, error, totalCount, noMorePages */
  selector: (state: RootState) => PaginatedListState<T>;
  fetch: () => unknown;
  fetchMore?: () => unknown;
};

export function usePaginatedList<T>({
  selector,
  fetch,
  fetchMore,
}: UsePaginatedListOptions<T>) {
  const { items, isLoading, error, totalCount, noMorePages } = useSelector(selector);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetch();
  }, [fetch]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const result = fetch();
      if (result != null && typeof (result as Promise<unknown>).then === 'function') {
        await (result as Promise<unknown>).catch(() => {});
      }
    } finally {
      setRefreshing(false);
    }
  }, [fetch]);

  const loadMore = useCallback(() => {
    if (fetchMore && !noMorePages && !isLoading) fetchMore();
  }, [fetchMore, noMorePages, isLoading]);

  return {
    items,
    isLoading,
    error,
    totalCount,
    noMorePages,
    refreshing,
    onRefresh,
    loadMore,
  };
}
