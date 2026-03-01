/**
 * Feed types – aligned with integrix-app-for-mobile API.
 */
export type { EntitiesWithTotalCount } from './common';

export type FilteringModel = {
  pageNumber: number;
  pageSize: number;
  sortingField?: string | null;
  sortingOrder?: number;
};

export type FeedFileDTO = {
  id?: string;
  extension?: string | null;
  name?: string;
  url?: string;
  thumbnailUrl?: string;
  createdOnUtc?: string;
  [key: string]: unknown;
};

export type FeedFieldValueDTO = {
  id?: string;
  name?: string;
  value?: string;
  type?: number | null;
  defectFieldId?: string;
  [key: string]: unknown;
};

export type FeedItemDTO = {
  id: string;
  type: string;
  isOtherPostItem?: boolean;
  description?: string;
  remediationDetails?: string | null;
  defectNumber?: string;
  createdOnUtc?: string;
  createdByName?: string;
  createdById?: string | null;
  createdByPhotoUrl?: string | null;
  createdByCompanyId?: string | null;
  createdByCompany?: string | null;
  modifiedByName?: string | null;
  modifiedOnUtc?: string | null;
  modifiedByPhotoUrl?: string | null;
  modifiedByCompany?: string | null;
  modifiedByCompanyId?: string | null;
  taskId?: string;
  taskStepId?: string;
  taskNo?: string;
  taskTitle?: string;
  taskSectionTitle?: string;
  taskStepDescription?: string;
  documentId?: string;
  versionId?: string;
  workOrderNumber?: string | null;
  notificationNumber?: string | null;
  projectNumber?: string | null;
  assetName?: string | null;
  files?: FeedFileDTO[] | null;
  fieldValues?: FeedFieldValueDTO[] | null;
  statusCode?: string;
  canEdit?: boolean;
  canDelete?: boolean;
  [key: string]: unknown;
};
