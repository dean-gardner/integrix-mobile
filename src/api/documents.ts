import { AxiosResponse } from 'axios';
import axios from './axios';
import type {
  DocumentFilteringModel,
  DocumentVersionReadDTO,
  DocumentSectionReadDTO,
  DocumentTaskStepReadDTO,
  DocumentAuditTrailDTO,
  EntitiesWithTotalCount,
} from '../types/document';
import type { FoundUserDTO } from '../types/user';
import type { ShareItemsDTO } from '../types/share';

export function getDocuments(
  model: DocumentFilteringModel
): Promise<AxiosResponse<EntitiesWithTotalCount<DocumentVersionReadDTO>>> {
  return axios.post('api/documents/get-documents-versions', model, {
    headers: { 'Content-Type': 'application/json' },
  });
}

export function getDocumentById(
  documentId: string,
  versionId: string
): Promise<AxiosResponse<DocumentVersionReadDTO>> {
  return axios.get<DocumentVersionReadDTO>(
    `api/documents/${documentId}/versions/${versionId}`
  );
}

export function getDocumentSections(
  documentId: string,
  versionId: string
): Promise<AxiosResponse<DocumentSectionReadDTO[]>> {
  return axios.get<DocumentSectionReadDTO[]>(
    `api/documents/${documentId}/versions/${versionId}/get-sections`
  );
}

export function getDocumentHistory(
  versionId: string
): Promise<AxiosResponse<DocumentAuditTrailDTO[]>> {
  return axios.get<DocumentAuditTrailDTO[]>(`api/documents/versions/${versionId}/get-audit`);
}

export function getDocumentSectionTaskSteps(
  documentId: string,
  versionId: string,
  sectionId: string
): Promise<AxiosResponse<DocumentTaskStepReadDTO[]>> {
  return axios.get<DocumentTaskStepReadDTO[]>(
    `api/documents/${documentId}/versions/${versionId}/sections/${sectionId}/get-task-steps`
  );
}

export function createDocument(
  model: FormData
): Promise<AxiosResponse<DocumentVersionReadDTO>> {
  return axios.post<DocumentVersionReadDTO>('api/documents/create-document', model, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

export function editDocument(
  documentId: string,
  versionId: string,
  model: FormData
): Promise<AxiosResponse<DocumentVersionReadDTO>> {
  return axios.put<DocumentVersionReadDTO>(
    `api/documents/${documentId}/versions/${versionId}`,
    model,
    { headers: { 'Content-Type': 'multipart/form-data' } }
  );
}

export function deleteDocument(
  versionId: string
): Promise<AxiosResponse<DocumentVersionReadDTO>> {
  return axios.delete<DocumentVersionReadDTO>(
    `api/documents/delete-document/${versionId}`
  );
}

export function shareDocuments(
  model: ShareItemsDTO<string>
): Promise<AxiosResponse<unknown>> {
  return axios.post<unknown>('api/documents/share-documents', model);
}

export function unshareDocumentUsers(
  documentId: string,
  users: FoundUserDTO[]
): Promise<AxiosResponse<string>> {
  return axios.delete<string, AxiosResponse<string>>(
    `api/documents/${documentId}/unshare-users`,
    { data: users }
  );
}

export function getDocumentUsersSharedWith(
  documentId: string
): Promise<AxiosResponse<FoundUserDTO[]>> {
  return axios.get<FoundUserDTO[]>(`api/documents/${documentId}/get-users-shared-with`);
}

export function generateDocumentReport(
  documentId: string,
  versionId: string,
  isLargeImages = false
): Promise<AxiosResponse<DocumentVersionReadDTO>> {
  return axios.post<DocumentVersionReadDTO>(
    `api/documents/${documentId}/versions/${versionId}/export`,
    null,
    { params: { isLargeImages } }
  );
}

export function duplicateDocument(
  versionId: string
): Promise<AxiosResponse<DocumentVersionReadDTO>> {
  return axios.post<DocumentVersionReadDTO>(`api/documents/${versionId}/duplicate`);
}
