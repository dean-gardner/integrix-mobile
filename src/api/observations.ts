import { AxiosResponse } from 'axios';
import axios from './axios';
import type {
  ObservationFeedReadDTO,
  ObservationFilteringModel,
  EntitiesWithTotalCount,
  ObservationReadDTO,
} from '../types/observation';

export function getFeedObservations(
  model: ObservationFilteringModel
): Promise<AxiosResponse<EntitiesWithTotalCount<ObservationFeedReadDTO>>> {
  return axios.get<EntitiesWithTotalCount<ObservationFeedReadDTO>>(
    'api/observations/get-feed-observations',
    { params: model }
  );
}

export function createObservation(
  formData: FormData
): Promise<AxiosResponse<ObservationReadDTO>> {
  return axios.post<ObservationReadDTO>('api/observations', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function editObservation(
  observationId: string,
  formData: FormData
): Promise<AxiosResponse<ObservationReadDTO>> {
  return axios.put<ObservationReadDTO>(
    `api/observations/${observationId}/edit`,
    formData,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
}

export function deleteObservation(
  observationId: string
): Promise<AxiosResponse<string>> {
  return axios.delete<string>(`api/observations/${observationId}`);
}
