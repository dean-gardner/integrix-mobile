import { AxiosResponse } from 'axios';
import axios from './axios';
import type {
  CompanyTeamNodeDTO,
  CompanyTeamCreateEditDTO,
  CompanyTeamEditDTO,
  CompanyTeamReadDTO,
  JoinTeamDTO,
  TeamCreationRequestDTO,
  ReassignParentNodeDTO,
} from '../types/team';

export function getCompanyTeams(companyId: string): Promise<AxiosResponse<CompanyTeamNodeDTO[]>> {
  return axios.get<CompanyTeamNodeDTO[]>(`api/companies/${companyId}/companyteams`);
}

export function getTeamsToJoin(
  companyId: string
): Promise<AxiosResponse<CompanyTeamReadDTO[]>> {
  return axios.get<CompanyTeamReadDTO[]>(
    `api/companies/${companyId}/companyteams/get-teams-to-join-by-companyid`
  );
}

export function joinTeam(
  companyId: string,
  companyTeamId: number,
  joinTeamDTO: JoinTeamDTO
): Promise<AxiosResponse<string>> {
  return axios.post<string>(
    `api/companies/${companyId}/companyteams/${companyTeamId}/join-team`,
    joinTeamDTO
  );
}

export function requestNewTeam(
  companyId: string,
  model: TeamCreationRequestDTO
): Promise<AxiosResponse<string>> {
  return axios.post<string>(
    `api/companies/${companyId}/companyteams/request-new-team`,
    model
  );
}

export function createTeam(
  companyId: string,
  model: CompanyTeamCreateEditDTO
): Promise<AxiosResponse<CompanyTeamNodeDTO>> {
  return axios.post<CompanyTeamNodeDTO>(
    `api/companies/${companyId}/companyteams/create-team`,
    model
  );
}

export function editTeam(
  companyId: string,
  model: CompanyTeamEditDTO
): Promise<AxiosResponse<CompanyTeamNodeDTO>> {
  return axios.put<CompanyTeamNodeDTO>(
    `api/companies/${companyId}/companyteams/edit-team`,
    model
  );
}

export function reassignParentNode(
  companyId: string,
  model: ReassignParentNodeDTO
): Promise<AxiosResponse<CompanyTeamNodeDTO>> {
  return axios.put<CompanyTeamNodeDTO>(
    `api/companies/${companyId}/companyteams/reassign-parent-node`,
    model
  );
}

export function deleteTeam(id: number): Promise<AxiosResponse<CompanyTeamNodeDTO>> {
  return axios.delete<CompanyTeamNodeDTO>(`api/companies/0/companyteams/delete-team/${id}`);
}
