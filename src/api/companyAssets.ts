import { AxiosResponse } from 'axios';
import axios from './axios';
import type {
  CompanyAssetNodeDTO,
  CompanyAssetStatus,
  CompanyAssetCreateDTO,
  CompanyAssetReadDTO,
  ReassignParentNodeDTO,
} from '../types/companyAsset';

export function getCompanyAssets(
  companyId: string,
  parentAssetId: number | null,
  status: CompanyAssetStatus
): Promise<AxiosResponse<CompanyAssetNodeDTO[]>> {
  return axios.get<CompanyAssetNodeDTO[]>(`api/companies/${companyId}/companyassets`, {
    params: { parentAssetId, status },
  });
}

export function createAsset(
  companyId: string,
  model: CompanyAssetCreateDTO
): Promise<AxiosResponse<CompanyAssetNodeDTO>> {
  return axios.post<CompanyAssetNodeDTO>(
    `api/companies/${companyId}/companyassets/create-asset`,
    model
  );
}

export function editAsset(
  id: number,
  companyId: string,
  model: CompanyAssetCreateDTO
): Promise<AxiosResponse<CompanyAssetNodeDTO>> {
  return axios.put<CompanyAssetNodeDTO>(
    `api/companies/${companyId}/companyassets/${id}/edit-asset`,
    model
  );
}

export function setAssetStatus(
  id: number,
  companyId: string,
  status: CompanyAssetStatus
): Promise<AxiosResponse<CompanyAssetNodeDTO>> {
  return axios.patch<CompanyAssetNodeDTO>(
    `api/companies/${companyId}/companyassets/${id}/set-status`,
    status
  );
}

export function getExternalIds(
  companyId: string
): Promise<AxiosResponse<string[]>> {
  return axios.get<string[]>(
    `api/companies/${companyId}/companyassets/get-externalids`
  );
}

export function getAssetsBySearch(
  companyId: string,
  search: string,
  excludeIds?: number[],
  includeSharedAssets?: boolean
): Promise<AxiosResponse<CompanyAssetReadDTO[]>> {
  return axios.post<CompanyAssetReadDTO[]>(
    `api/companies/${companyId}/companyassets/get-assets-by-search`,
    { search, excludeIds, includeSharedAssets }
  );
}

export function reassignParentNode(
  companyId: string,
  model: ReassignParentNodeDTO
): Promise<AxiosResponse<CompanyAssetNodeDTO>> {
  return axios.put<CompanyAssetNodeDTO>(
    `api/companies/${companyId}/companyassets/reassign-parent-node`,
    model
  );
}
