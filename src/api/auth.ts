import { AxiosResponse } from 'axios';
import axios from './axios';
import type { SignInDTO } from '../types/SignInDTO';
import type { UserDTO } from '../types/UserDTO';
import type { ChangePasswordDTO } from '../types/ChangePasswordDTO';
import type { ForgotPasswordDTO } from '../types/ForgotPasswordDTO';
import type { ResetPasswordDTO } from '../types/ResetPasswordDTO';
import type { RoleDTO } from '../types/user';
import type { SignUpDTO } from '../types/SignUpDTO';
import type { AcceptInvitationDTO } from '../types/AcceptInvitationDTO';
import type { UserInvitationReadDTO } from '../types/invitation';

export const getRoles = (): Promise<AxiosResponse<RoleDTO[]>> =>
  axios.get<RoleDTO[]>('api/auth/get-all-roles');

export const apiSignIn = (dto: SignInDTO): Promise<AxiosResponse<string>> =>
  axios.post<string>('api/auth/sign-in', dto);

export const apiSignUp = (dto: SignUpDTO): Promise<AxiosResponse<string>> =>
  axios.post<string>('api/auth/sign-up', dto);

export const apiAcceptInvitation = (
  dto: AcceptInvitationDTO
): Promise<AxiosResponse<string>> => axios.post<string>('api/auth/accept-invitation', dto);

export const apiGetInvitationById = (
  id: string
): Promise<AxiosResponse<UserInvitationReadDTO>> =>
  axios.get<UserInvitationReadDTO>(`api/userinvitations/${id}`);

export const apiGetUserData = (): Promise<AxiosResponse<UserDTO>> =>
  axios.get<UserDTO>('api/auth/get-userdata');

export const apiSignOut = (): Promise<AxiosResponse<string>> =>
  axios.post<string>('api/auth/sign-out');

export const apiChangePassword = (
  dto: ChangePasswordDTO
): Promise<AxiosResponse<string>> =>
  axios.post<string>('api/auth/change-password', dto);

export const apiForgotPassword = (
  dto: ForgotPasswordDTO
): Promise<AxiosResponse<string>> =>
  axios.post<string>('api/auth/forgot-password', dto);

export const apiResetPassword = (
  dto: ResetPasswordDTO
): Promise<AxiosResponse<string>> =>
  axios.post<string>('api/auth/reset-password', dto);
