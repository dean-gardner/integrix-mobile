import { AxiosResponse } from 'axios';
import axios from './axios';
import type { NotificationDTO } from '../types/notification';

export function getNotifications(): Promise<AxiosResponse<NotificationDTO[]>> {
  return axios.get<NotificationDTO[]>('api/notifications/get-notifications');
}

export function readNotification(id: string): Promise<AxiosResponse<string>> {
  return axios.patch<string>(`api/notifications/${id}/read`);
}

export function readAllNotifications(): Promise<AxiosResponse<string>> {
  return axios.patch<string>('api/notifications/read-all');
}
