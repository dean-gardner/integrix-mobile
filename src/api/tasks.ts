import { AxiosResponse } from 'axios';
import axios from './axios';
import type {
  TaskReadDTO,
  TaskFilteringModel,
  EntitiesWithTotalCount,
  TaskWithDetailsReadDTO,
  TaskCreateDTO,
  TaskSectionWithStepsDTO,
  TaskStepVerificationDTO,
} from '../types/task';
import type { FoundUserDTO } from '../types/user';

export function getTasks(
  model: TaskFilteringModel
): Promise<AxiosResponse<EntitiesWithTotalCount<TaskReadDTO>>> {
  return axios.get<EntitiesWithTotalCount<TaskReadDTO>>('api/tasks', {
    params: model,
  });
}

export function getTaskById(
  versionId: string,
  taskId: string
): Promise<AxiosResponse<TaskWithDetailsReadDTO>> {
  return axios.get<TaskWithDetailsReadDTO>(`api/versions/${versionId}/tasks/${taskId}`);
}

export function changeTaskStatus(
  documentId: string,
  versionId: string,
  taskId: string,
  status: string | null
): Promise<AxiosResponse<TaskWithDetailsReadDTO>> {
  return axios.patch<TaskWithDetailsReadDTO>(
    `api/documents/${documentId}/versions/${versionId}/tasks/${taskId}/change-status`,
    [{ op: 'replace', path: '/JobStatusCode', value: status ? status.toString() : null }]
  );
}

export function shareTaskWithUser(
  documentId: string,
  versionId: string,
  taskId: string,
  model: FoundUserDTO
): Promise<AxiosResponse<FoundUserDTO>> {
  return axios.post<FoundUserDTO>(
    `api/documents/${documentId}/versions/${versionId}/tasks/${taskId}/share-with-user`,
    model
  );
}

export function unshareTaskWithUser(
  documentId: string,
  versionId: string,
  taskId: string,
  model: FoundUserDTO
): Promise<AxiosResponse<string>> {
  return axios.post<string>(
    `api/documents/${documentId}/versions/${versionId}/tasks/${taskId}/unshare-with-user`,
    model
  );
}

export function createTask(
  documentId: string,
  versionId: string,
  model: TaskCreateDTO
): Promise<AxiosResponse<TaskWithDetailsReadDTO>> {
  return axios.post<TaskWithDetailsReadDTO>(
    `api/documents/${documentId}/versions/${versionId}/tasks`,
    model
  );
}

export function editTask(
  documentId: string,
  versionId: string,
  taskId: string,
  model: TaskCreateDTO
): Promise<AxiosResponse<TaskWithDetailsReadDTO>> {
  return axios.put<TaskWithDetailsReadDTO>(
    `api/documents/${documentId}/versions/${versionId}/tasks/${taskId}`,
    model
  );
}

export async function deleteTask(
  taskId: string,
  documentId?: string | null,
  versionId?: string | null
): Promise<AxiosResponse<string>> {
  if (documentId && versionId) {
    try {
      return await axios.delete<string>(
        `api/documents/${documentId}/versions/${versionId}/tasks/${taskId}`
      );
    } catch {
      // Fallback to task-level endpoint if version scoped route is unavailable.
    }
  }

  return axios.delete<string>(`api/tasks/${taskId}`);
}

export function getTaskSectionsWithTaskSteps(
  taskId: string
): Promise<AxiosResponse<TaskSectionWithStepsDTO[]>> {
  return axios.get<TaskSectionWithStepsDTO[]>(`api/tasks/${taskId}/sections-task-steps`);
}

export function changeTaskStepStatus(
  documentId: string,
  versionId: string,
  taskId: string,
  taskStepId: string,
  status: string | null
): Promise<AxiosResponse<TaskStepVerificationDTO>> {
  return axios.patch<TaskStepVerificationDTO>(
    `api/documents/${documentId}/versions/${versionId}/tasks/${taskId}/tasksteps/${taskStepId}/change-status`,
    [{ op: 'replace', path: '/VerificationStatusCode', value: status ? status.toString() : null }]
  );
}
