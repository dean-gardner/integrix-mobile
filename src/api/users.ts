import { AxiosResponse } from 'axios';
import axios from './axios';
import type {
  UserReadDTO,
  UserFilteringModel,
  EntitiesWithTotalCount,
  UserSearchModelDTO,
  FoundUserDTO,
  UserEditDTO,
} from '../types/user';
import type { UserDTO } from '../types/UserDTO';

export function getUsers(
  model: UserFilteringModel
): Promise<AxiosResponse<EntitiesWithTotalCount<UserReadDTO>>> {
  return axios.post<EntitiesWithTotalCount<UserReadDTO>>('api/users/get-users', model);
}

export function editProfile(formData: FormData): Promise<AxiosResponse<UserDTO>> {
  return axios.put<UserDTO>('api/users/edit-profile', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function getUsersBySearch(
  model: UserSearchModelDTO
): Promise<AxiosResponse<FoundUserDTO[]>> {
  return axios.get<FoundUserDTO[]>('api/users/get-users-by-search', { params: model });
}

export function editUser(
  model: UserEditDTO
): Promise<AxiosResponse<UserReadDTO>> {
  return axios.put<UserReadDTO>('api/users/edit-user', model);
}

export function deleteUser(id: string): Promise<AxiosResponse<string>> {
  return axios.delete<string>(`api/users/${id}/delete-user`);
}
