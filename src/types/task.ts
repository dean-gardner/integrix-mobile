/**
 * Task types for Feed and Tasks – aligned with integrix-app-for-mobile API.
 */
import type { FoundUserDTO } from './user';
import type { DefectFieldsTemplateDTO } from './defectTemplate';
export type { EntitiesWithTotalCount } from './common';

export enum TaskTypeEnum {
  TeamTasks = 0,
  SharedTasks = 1,
  AllFeedTasks = 2,
}

export type TaskReadDTO = {
  id: string;
  taskNumber: string;
  description?: string;
  workOrderNumber?: string | null;
  notificationNumber?: string | null;
  projectNumber?: string | null;
  status?: number;
  createdOnUtc?: string;
  createdBy?: string;
  createdById?: string;
  documentId?: string;
  versionId?: string;
  taskStepsCount?: number;
  taskStepsDone?: number;
  asset?: { id: number; name: string };
  usersSharedWith?: FoundUserDTO[];
  [key: string]: unknown;
};

export type TaskCreateDTO = {
  workOrderNumber: string | null;
  notificationNumber: string | null;
  projectNumber: string | null;
  assetId: number | null;
  asset: { id: number; name: string } | null;
  usersSharedWith: FoundUserDTO[];
};

export type TaskStepVerificationDTO = {
  id: string;
  taskStepId?: string;
  verificationStatusCode?: number | string | null;
  [key: string]: unknown;
};

export type TaskFileDTO = {
  name?: string;
  url?: string;
  [key: string]: unknown;
};

export type TaskStepReadDTO = {
  id: string;
  sortOrder?: number;
  canUserCreateDefect?: boolean;
  documentVersionSectionId?: string;
  taskDescription?: string;
  files?: TaskFileDTO[] | null;
  postsCount?: number;
  defectFieldsTemplate?: DefectFieldsTemplateDTO | null;
  [key: string]: unknown;
};

export type TaskSectionWithStepsDTO = {
  id: string;
  sectionTitle: string;
  sortOrder: number;
  taskSteps: TaskStepReadDTO[];
};

export type TaskWithDetailsReadDTO = TaskReadDTO & {
  documentFiles?: Array<{ name?: string; url?: string }>;
  usersSharedWith?: FoundUserDTO[];
  taskStepsVerifications?: TaskStepVerificationDTO[];
  completionReportUrl?: string | null;
  integratedCrmName?: string | null;
};

export type TaskFilteringModel = {
  pageNumber: number;
  pageSize: number;
  status?: number | null;
  type?: TaskTypeEnum | null;
  createdById?: string | null;
  taskNumber?: string | null;
  description?: string | null;
  taskReference?: string | null;
  createdBy?: string | null;
  sortingField?: string | null;
  sortingOrder?: number;
};
