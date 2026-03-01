/**
 * Defect types – aligned with integrix-app-for-mobile API.
 */
export type { EntitiesWithTotalCount } from './common';

export type DefectFilteringModel = {
  pageNumber: number;
  pageSize: number;
  sortingField?: string | null;
  sortingOrder?: number;
  statusCode?: number | string | null;
  templateId?: string | null;
  userId?: string | null;
  [key: string]: unknown;
};

export type DefectCommentDTO = {
  id: string;
  text: string;
  createdOnUtc: string;
  createdByName: string;
  createdByUser?: { fullName?: string; photoUrl?: string | null } | null;
};

export type DefectReadDTO = {
  id: string;
  defectNumber: string;
  description: string;
  statusCode: string;
  createdOnUtc: string;
  createdByName: string;
  createdByPhotoUrl?: string | null;
  modifiedOnUtc?: string | null;
  modifiedByName?: string | null;
  assetName?: string;
  taskId?: string;
  taskStepId?: string;
  remediationDetails?: string | null;
  files?: Array<{ url?: string; thumbnailUrl?: string; name?: string }> | null;
  comments?: DefectCommentDTO[] | null;
  [key: string]: unknown;
};
