import { AxiosResponse } from 'axios';
import axios from './axios';
import type {
  SubscriptionReadDTO,
  SubscriptionTariffs,
  ManageSubscriptionMembersDTO,
  SubscriptionCreateDTO,
} from '../types/subscription';

export function getUserSubscription(
  userId: string
): Promise<AxiosResponse<SubscriptionReadDTO | null>> {
  return axios.get<SubscriptionReadDTO | null>(`api/subscriptions/user/${userId}`);
}

export function getSubscriptionMemberPrices(): Promise<AxiosResponse<SubscriptionTariffs>> {
  return axios.get<SubscriptionTariffs>('api/subscriptions/member-prices');
}

export function assignSubscription(
  model: ManageSubscriptionMembersDTO
): Promise<AxiosResponse<number>> {
  return axios.patch<number>('api/subscriptions/assign', model);
}

export function revokeSubscription(
  model: ManageSubscriptionMembersDTO
): Promise<AxiosResponse<number>> {
  return axios.patch<number>('api/subscriptions/revoke', model);
}

export function createSubscription(
  model: SubscriptionCreateDTO
): Promise<AxiosResponse<string>> {
  return axios.post<string>('api/subscriptions/create', model);
}
