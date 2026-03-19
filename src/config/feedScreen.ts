import { TaskTypeEnum } from '../types/task';

export type FeedTabKey = 'feed' | 'tasks';
export type FeedTaskFilterId = 'iStarted' | 'sharedWithMe' | 'myTeam';

export type FeedTabOption = {
  key: FeedTabKey;
  titleKey: string;
};

export type FeedTaskFilterOption = {
  id: FeedTaskFilterId;
  titleKey: string;
  indicatorColor: string;
  taskType: TaskTypeEnum | null;
  useCurrentUserId?: boolean;
};

export const feedTabOptions: FeedTabOption[] = [
  { key: 'feed', titleKey: 'app.feed.tabActivity' },
  { key: 'tasks', titleKey: 'app.feed.tabTasks' },
];

export const feedTaskFilterOptions: FeedTaskFilterOption[] = [
  {
    id: 'iStarted',
    titleKey: 'app.feed.startedByMe',
    indicatorColor: '#A78D7C',
    taskType: null,
    useCurrentUserId: true,
  },
  {
    id: 'myTeam',
    titleKey: 'app.feed.startedByTeam',
    indicatorColor: '#7E947D',
    taskType: TaskTypeEnum.TeamTasks,
  },
  {
    id: 'sharedWithMe',
    titleKey: 'app.feed.sharedWithMe',
    indicatorColor: '#6C8EBF',
    taskType: TaskTypeEnum.SharedTasks,
  },
];

export const defaultFeedTaskIndicatorColor = '#6C8EBF';
