import { AxiosResponse } from 'axios';
import axios from './axios';
import type { CompanyReadDTO } from '../types/company';

export function getUserCompany(): Promise<AxiosResponse<CompanyReadDTO>> {
  return axios.get<CompanyReadDTO>('api/companies/user');
}
