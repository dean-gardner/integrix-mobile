import { AxiosResponse } from 'axios';
import axios from './axios';
import type { EntitiesWithTotalCount } from '../types/common';
import type {
  UserInvitationCreateDTO,
  UserInvitationFilteringModel,
  UserInvitationReadDTO,
} from '../types/invitation';

export function getUserInvitations(
  model: UserInvitationFilteringModel
): Promise<AxiosResponse<EntitiesWithTotalCount<UserInvitationReadDTO>>> {
  return axios.post<EntitiesWithTotalCount<UserInvitationReadDTO>>(
    'api/userinvitations/get-invitations',
    model
  );
}

export function createUserInvitation(
  model: UserInvitationCreateDTO
): Promise<AxiosResponse<UserInvitationReadDTO>> {
  return axios.post<UserInvitationReadDTO>('api/userinvitations/create-invitation', model);
}

export function deleteUserInvitation(id: string): Promise<AxiosResponse<string>> {
  return axios.delete<string>(`api/userinvitations/delete-invitation/${id}`);
}

export function resendUserInvitation(id: string): Promise<AxiosResponse<string>> {
  return axios.post<string>(`api/userinvitations/resend-invitation/${id}`);
}
