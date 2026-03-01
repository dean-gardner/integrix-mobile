/**
 * Observations API types – feed observations list.
 */
export type { EntitiesWithTotalCount } from './common';

export type ObservationFilteringModel = {
  pageNumber: number;
  pageSize: number;
  sortingField?: string | null;
  sortingOrder?: number;
};

export type ObservationFeedReadDTO = {
  id: string;
  description: string;
  createdById: string | null;
  createdByName: string;
  createdOnUtc: string;
  createdByPhotoUrl: string | null;
  taskStepId: string;
  taskId: string;
  documentId: string;
  versionId: string;
  taskTitle: string;
  taskSectionTitle: string;
  workOrderNumber: string | null;
  notificationNumber: string | null;
  assetName?: string;
  canEdit?: boolean;
  canDelete?: boolean;
};

/** Response from create/edit observation. */
export type ObservationReadDTO = {
  id: string;
  description: string;
  createdById: string | null;
  createdByName: string;
  createdOnUtc: string;
  taskStepId: string;
  taskId: string;
  canEdit?: boolean;
  canDelete?: boolean;
};
