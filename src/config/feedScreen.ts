import { TaskTypeEnum } from '../types/task';

export type FeedTabKey = 'feed' | 'tasks';
export type FeedTaskFilterId = 'iStarted' | 'sharedWithMe' | 'myTeam';

export type FeedTabOption = {
  key: FeedTabKey;
  label: string;
};

export type FeedTaskFilterOption = {
  id: FeedTaskFilterId;
  label: string;
  indicatorColor: string;
  taskType: TaskTypeEnum | null;
  useCurrentUserId?: boolean;
};

export const feedTabOptions: FeedTabOption[] = [
  { key: 'feed', label: 'Activity Feed' },
  { key: 'tasks', label: 'Tasks' },
];

export const feedTaskFilterOptions: FeedTaskFilterOption[] = [
  {
    id: 'iStarted',
    label: 'Started by me',
    indicatorColor: '#A78D7C',
    taskType: null,
    useCurrentUserId: true,
  },
  {
    id: 'myTeam',
    label: 'Started by my team',
    indicatorColor: '#7E947D',
    taskType: TaskTypeEnum.TeamTasks,
  },
  {
    id: 'sharedWithMe',
    label: 'Shared with me',
    indicatorColor: '#6C8EBF',
    taskType: TaskTypeEnum.SharedTasks,
  },
];

export const defaultFeedTaskIndicatorColor = '#6C8EBF';
export const feedEmptyStateText = 'There are no defects or observations yet...';
