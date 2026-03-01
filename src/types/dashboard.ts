/**
 * Dashboard types – aligned with integrix-app-for-mobile API.
 */
import type { EntitiesWithTotalCount } from './common';
export type { EntitiesWithTotalCount } from './common';

export enum DashboardViewEnum {
  Tasks = 0,
  Defects = 1,
  Observations = 2,
  ClosedDefects = 3,
}

export type DashboardRequestDto = {
  assetId?: number;
  viewType?: DashboardViewEnum;
  pageNumber?: number;
  pageSize?: number;
};

export type CompanyAssetNodeDTO = {
  id: number;
  parentId: number | null;
  name: string;
  namePrefix?: string | null;
  externalId?: string;
  hasChildren?: boolean;
  childrenAreLoded?: boolean;
};

export type DashboardStatsDTO = {
  asset: CompanyAssetNodeDTO;
  defects: EntitiesWithTotalCount<DashboardDefectItem>;
  observations: EntitiesWithTotalCount<DashboardObservationItem>;
  closedDefects: EntitiesWithTotalCount<DashboardDefectItem>;
  tasks: EntitiesWithTotalCount<DashboardTaskItem>;
};

export type DashboardTaskItem = {
  id: string;
  taskNumber: string;
  description?: string;
  status?: number | string;
  createdOnUtc?: string;
  createdBy?: string;
  asset?: { id: number; name: string };
};

export type DashboardDefectItem = {
  id: string;
  defectNumber: string;
  description?: string;
  statusCode?: string;
  createdOnUtc?: string;
  assetName?: string;
};

export type DashboardObservationItem = {
  id: string;
  type?: string;
  description?: string;
  createdOnUtc?: string;
};
