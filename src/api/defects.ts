import { AxiosResponse } from 'axios';
import axios from './axios';
import type {
  DefectFilteringModel,
  DefectReadDTO,
  EntitiesWithTotalCount,
} from '../types/defect';
import type { FoundUserDTO } from '../types/user';
import type { ShareItemsDTO } from '../types/share';

export function getDefects(
  model: DefectFilteringModel
): Promise<AxiosResponse<EntitiesWithTotalCount<DefectReadDTO>>> {
  return axios.get('api/defects/get-defects', { params: model });
}

export function getTaskStepDefects(
  taskId: string,
  taskStepId: string,
  model: DefectFilteringModel
): Promise<AxiosResponse<EntitiesWithTotalCount<DefectReadDTO>>> {
  return axios.get<EntitiesWithTotalCount<DefectReadDTO>>(
    `api/defects/tasks/${taskId}/task-steps/${taskStepId}/get-defects`,
    { params: model }
  );
}

export function createDefect(model: FormData): Promise<AxiosResponse<DefectReadDTO>> {
  return axios.post<DefectReadDTO>('api/defects', model, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getDefectById(defectId: string): Promise<AxiosResponse<DefectReadDTO>> {
  return axios.get<DefectReadDTO>(`api/defects/${defectId}`);
}

export function editDefect(
  defectId: string,
  model: FormData
): Promise<AxiosResponse<DefectReadDTO>> {
  return axios.put<DefectReadDTO>(`api/defects/${defectId}/edit`, model, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function deleteDefect(defectId: string): Promise<AxiosResponse<string>> {
  return axios.delete<string>(`api/defects/${defectId}`);
}

export function shareDefects(model: ShareItemsDTO<string>): Promise<AxiosResponse<unknown>> {
  return axios.post<unknown>('api/defects/share', model);
}

export function unshareDefectUsers(
  defectId: string,
  users: FoundUserDTO[]
): Promise<AxiosResponse<string>> {
  return axios.delete<string, AxiosResponse<string>>(`api/defects/${defectId}/unshare-users`, {
    data: users,
  });
}

export function getDefectUsersSharedWith(
  defectId: string
): Promise<AxiosResponse<FoundUserDTO[]>> {
  return axios.get<FoundUserDTO[]>(`api/defects/${defectId}/users-shared-with`);
}
