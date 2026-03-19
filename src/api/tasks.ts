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

export type ShareTasksWithUsersDTO = {
  tasksIds: string[];
  usersToShare: FoundUserDTO[];
};

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

/** Map numeric status to API enum name (matches web app). */
const TASK_STATUS_TO_API: Record<number, string> = {
  0: 'JInProgress',
  1: 'JComplete',
  2: 'JCancelled',
  3: 'JLocked',
  4: 'JPlanned',
};

function taskStatusToApiValue(status: number | string | null): string | null {
  if (status == null || status === '') return null;
  const num = typeof status === 'string' ? parseInt(status, 10) : status;
  if (Number.isFinite(num) && TASK_STATUS_TO_API[num as keyof typeof TASK_STATUS_TO_API] != null) {
    return TASK_STATUS_TO_API[num as keyof typeof TASK_STATUS_TO_API];
  }
  return typeof status === 'string' ? status : String(status);
}

export function changeTaskStatus(
  documentId: string,
  versionId: string,
  taskId: string,
  status: number | string | null
): Promise<AxiosResponse<TaskWithDetailsReadDTO>> {
  const value = taskStatusToApiValue(status);
  return axios.patch<TaskWithDetailsReadDTO>(
    `api/documents/${documentId}/versions/${versionId}/tasks/${taskId}/change-status`,
    [{ op: 'replace', path: '/JobStatusCode', value }]
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

/** Web-compatible endpoint for sharing one/many tasks with users. */
export function shareTasks(
  model: ShareTasksWithUsersDTO
): Promise<AxiosResponse<unknown>> {
  return axios.post<unknown>('api/tasks/share-tasks', model);
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

/** Web-compatible endpoint for unsharing users by task id. */
export function unshareUsers(
  taskId: string,
  users: FoundUserDTO[]
): Promise<AxiosResponse<string>> {
  return axios.delete<string, AxiosResponse<string>>(
    `api/tasks/${taskId}/unshare-users`,
    { data: users }
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
