/**
 * Document types – aligned with integrix-app-for-mobile API.
 */
export type { EntitiesWithTotalCount } from './common';

export type DocumentFilteringModel = {
  pageNumber: number;
  pageSize: number;
  sortingField?: string | null;
  sortingOrder?: number;
  documentNumberStr?: string;
  description?: string;
  createdByName?: string;
  versionStatusCode?: number | null;
  type?: number | null;
};

export type DocumentVersionReadDTO = {
  id: string;
  documentId: string;
  documentNo: string;
  documentNumberStr: string;
  description: string;
  createdByName: string;
  createdById?: string;
  createdByEmail?: string;
  createdByCompanyTeamId?: number;
  createdOnUtc: string;
  versionStatusCode: string;
  versionNo: string;
  taskReferencingType?: number;
  isSharedWithMe?: boolean;
  task?: { id?: string } | null;
  exportReportUrl?: string | null;
  exportLargeReportUrl?: string | null;
  [key: string]: unknown;
};

export type DocumentSectionReadDTO = {
  id: string;
  sectionTitle: string;
  sortOrder: number;
};

export type DocumentTaskStepReadDTO = {
  id: string;
  sortOrder?: number;
  taskDescription?: string;
  postsCount?: number;
  canUserCreateDefect?: boolean;
  files?: Array<{ name?: string; url?: string }>;
  defectFieldsTemplate?: unknown;
  [key: string]: unknown;
};

export type DocumentAuditTrailDTO = {
  id: number | string;
  userId: string;
  userName: string;
  documentVersionId: string;
  description: string;
  utcDate: string;
  companyId: string;
  companyName: string;
};
