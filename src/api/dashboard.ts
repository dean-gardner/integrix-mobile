import { AxiosResponse } from 'axios';
import axios from './axios';
import type {
  DashboardRequestDto,
  DashboardStatsDTO,
  EntitiesWithTotalCount,
  DashboardTaskItem,
  DashboardDefectItem,
  DashboardObservationItem,
} from '../types/dashboard';

export function getDashboardStats(
  model: DashboardRequestDto
): Promise<AxiosResponse<DashboardStatsDTO>> {
  return axios.post<DashboardStatsDTO>('api/dashboard/get-stats', model, {
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => {
    console.log('[API dashboard] get-stats response:', JSON.stringify(res.data, null, 2));
    return res;
  });
}

export function getDashboardTasks(
  model: DashboardRequestDto
): Promise<AxiosResponse<EntitiesWithTotalCount<DashboardTaskItem>>> {
  return axios.post('api/dashboard/get-tasks', model, {
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => {
    console.log('[API dashboard] get-tasks response:', JSON.stringify(res.data, null, 2));
    return res;
  });
}

export function getDashboardDefects(
  model: DashboardRequestDto
): Promise<AxiosResponse<EntitiesWithTotalCount<DashboardDefectItem>>> {
  return axios.post('api/dashboard/get-defects', model, {
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => {
    console.log('[API dashboard] get-defects response:', JSON.stringify(res.data, null, 2));
    return res;
  });
}

export function getDashboardObservations(
  model: DashboardRequestDto
): Promise<AxiosResponse<EntitiesWithTotalCount<DashboardObservationItem>>> {
  return axios.post('api/dashboard/get-observations', model, {
    headers: { 'Content-Type': 'application/json' },
  }).then((res) => {
    console.log('[API dashboard] get-observations response:', JSON.stringify(res.data, null, 2));
    return res;
  });
}
