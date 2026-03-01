import { TaskTypeEnum } from '../types/task';
import type { DocumentsSelectOption } from './documentsScreen';

export type TaskReferenceField = 'workOrderNumber' | 'notificationNumber' | 'projectNumber';

export type TasksFilterForm = {
  taskNumber: string;
  description: string;
  taskReferenceField: TaskReferenceField;
  taskReference: string;
  createdBy: string;
};

export const TASK_STATUS_ALL_VALUE = -1;
export const TASK_REFERENCE_SEPARATOR = '$';
export const defaultTaskReferenceField: TaskReferenceField = 'workOrderNumber';

export const taskStatusOptions: DocumentsSelectOption<number>[] = [
  { value: TASK_STATUS_ALL_VALUE, label: 'All' },
  { value: 0, label: 'In Progress' },
  { value: 1, label: 'Complete' },
  { value: 2, label: 'Cancelled' },
];

export const taskTypeOptions: DocumentsSelectOption<TaskTypeEnum | null>[] = [
  { value: null, label: 'All' },
  { value: TaskTypeEnum.TeamTasks, label: 'Team Tasks' },
  { value: TaskTypeEnum.SharedTasks, label: 'Shared Tasks' },
];

export const taskSortFieldOptions: DocumentsSelectOption<string>[] = [
  { value: 'taskNumber', label: 'Task No' },
  { value: 'createdOnUtc', label: 'Date' },
  { value: 'description', label: 'Description' },
  { value: 'assetName', label: 'Asset' },
  { value: 'status', label: 'Status' },
  { value: 'createdBy', label: 'Created By' },
];

export const taskSortOrderOptions: DocumentsSelectOption<number>[] = [
  { value: 0, label: 'Ascending' },
  { value: 1, label: 'Descending' },
];

export const taskReferenceFieldOptions: DocumentsSelectOption<TaskReferenceField>[] = [
  { value: 'workOrderNumber', label: 'Work order' },
  { value: 'notificationNumber', label: 'Notification No' },
  { value: 'projectNumber', label: 'Project No' },
];

export const defaultTasksFilterForm: TasksFilterForm = {
  taskNumber: '',
  description: '',
  taskReferenceField: defaultTaskReferenceField,
  taskReference: '',
  createdBy: '',
};

export const defaultTasksStatusValue = 0;
export const defaultTasksTypeValue: TaskTypeEnum | null = null;
export const defaultTasksSortField = 'createdOnUtc';
export const defaultTasksSortOrder = 1;

export function parseTaskReferenceFilter(
  raw: string | null | undefined
): Pick<TasksFilterForm, 'taskReferenceField' | 'taskReference'> {
  if (!raw || raw.trim() === '') {
    return {
      taskReferenceField: defaultTaskReferenceField,
      taskReference: '',
    };
  }

  const separatorIndex = raw.indexOf(TASK_REFERENCE_SEPARATOR);
  if (separatorIndex < 0) {
    return {
      taskReferenceField: defaultTaskReferenceField,
      taskReference: raw,
    };
  }

  const maybeField = raw.slice(0, separatorIndex);
  const value = raw.slice(separatorIndex + 1);
  const isKnownField =
    maybeField === 'workOrderNumber' ||
    maybeField === 'notificationNumber' ||
    maybeField === 'projectNumber';

  return {
    taskReferenceField: isKnownField ? maybeField : defaultTaskReferenceField,
    taskReference: value,
  };
}

export function toTaskReferenceFilterValue(
  field: TaskReferenceField,
  value: string
): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  return `${field}${TASK_REFERENCE_SEPARATOR}${trimmed}`;
}
