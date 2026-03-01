import { AxiosResponse } from 'axios';
import axios from './axios';
import type { FilteringModel, FeedItemDTO, EntitiesWithTotalCount } from '../types/feed';

export function getFeed(
  model: FilteringModel
): Promise<AxiosResponse<EntitiesWithTotalCount<FeedItemDTO>>> {
  return axios.get<EntitiesWithTotalCount<FeedItemDTO>>('api/feed/get-feed', {
    params: model,
  });
}

export function getTaskPosts(
  taskId: string,
  taskStepId: string,
  model: FilteringModel
): Promise<AxiosResponse<EntitiesWithTotalCount<FeedItemDTO>>> {
  return axios.get<EntitiesWithTotalCount<FeedItemDTO>>(
    `api/feed/tasks/${taskId}/task-steps/${taskStepId}/get-task-posts`,
    { params: model }
  );
}
