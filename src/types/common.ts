/**
 * Shared API/types used across modules (DRY).
 */

export type EntitiesWithTotalCount<T> = {
  items: T[];
  totalCount: number;
};

/** Base paging + sorting for list APIs */
export type BaseFilteringModel = {
  pageNumber: number;
  pageSize: number;
  sortingField?: string | null;
  sortingOrder?: number;
};
