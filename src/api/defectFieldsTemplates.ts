import { AxiosResponse } from 'axios';
import axios from './axios';
import type { DefectFieldsTemplateDTO } from '../types/defectTemplate';

export function getDefectFieldsTemplatesBySearch(
  search: string
): Promise<AxiosResponse<DefectFieldsTemplateDTO[]>> {
  return axios.get<DefectFieldsTemplateDTO[]>('api/defectFieldsTemplates/find-templates', {
    params: { search },
  });
}

export function getDefaultDefectFieldsTemplate(): Promise<AxiosResponse<DefectFieldsTemplateDTO>> {
  return axios.get<DefectFieldsTemplateDTO>('api/defectFieldsTemplates/get-default-template');
}
