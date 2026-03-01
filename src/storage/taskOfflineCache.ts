import AsyncStorage from '@react-native-async-storage/async-storage';
import type { DefectReadDTO } from '../types/defect';
import type { FeedItemDTO } from '../types/feed';
import type { TaskSectionWithStepsDTO } from '../types/task';

const OFFLINE_TASKS_KEY = '@offline_tasks_v1';

function taskPostsKey(taskId: string, taskStepId: string): string {
  return `@offline_task_posts_${taskId}_${taskStepId}`;
}

function taskDefectsKey(taskId: string, taskStepId: string): string {
  return `@offline_task_defects_${taskId}_${taskStepId}`;
}

function taskSectionsKey(taskId: string): string {
  return `@offline_task_sections_${taskId}`;
}

type OfflineTasksMap = Record<string, number>;

async function readOfflineTasksMap(): Promise<OfflineTasksMap> {
  try {
    const raw = await AsyncStorage.getItem(OFFLINE_TASKS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as OfflineTasksMap;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

async function writeOfflineTasksMap(next: OfflineTasksMap): Promise<void> {
  try {
    await AsyncStorage.setItem(OFFLINE_TASKS_KEY, JSON.stringify(next));
  } catch {
    // ignore write errors
  }
}

export async function isTaskAvailableOffline(taskId: string): Promise<boolean> {
  const map = await readOfflineTasksMap();
  return typeof map[taskId] === 'number';
}

export async function markTaskAvailableOffline(taskId: string): Promise<void> {
  const map = await readOfflineTasksMap();
  map[taskId] = Date.now();
  await writeOfflineTasksMap(map);
}

export async function setCachedTaskStepPosts(
  taskId: string,
  taskStepId: string,
  items: FeedItemDTO[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(taskPostsKey(taskId, taskStepId), JSON.stringify(items ?? []));
  } catch {
    // ignore write errors
  }
}

export async function getCachedTaskStepPosts(
  taskId: string,
  taskStepId: string
): Promise<FeedItemDTO[]> {
  try {
    const raw = await AsyncStorage.getItem(taskPostsKey(taskId, taskStepId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as FeedItemDTO[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCachedTaskStepDefects(
  taskId: string,
  taskStepId: string,
  items: DefectReadDTO[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(taskDefectsKey(taskId, taskStepId), JSON.stringify(items ?? []));
  } catch {
    // ignore write errors
  }
}

export async function getCachedTaskStepDefects(
  taskId: string,
  taskStepId: string
): Promise<DefectReadDTO[]> {
  try {
    const raw = await AsyncStorage.getItem(taskDefectsKey(taskId, taskStepId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as DefectReadDTO[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export async function setCachedTaskSections(
  taskId: string,
  sections: TaskSectionWithStepsDTO[]
): Promise<void> {
  try {
    await AsyncStorage.setItem(taskSectionsKey(taskId), JSON.stringify(sections ?? []));
  } catch {
    // ignore write errors
  }
}

export async function getCachedTaskSections(
  taskId: string
): Promise<TaskSectionWithStepsDTO[]> {
  try {
    const raw = await AsyncStorage.getItem(taskSectionsKey(taskId));
    if (!raw) return [];
    const parsed = JSON.parse(raw) as TaskSectionWithStepsDTO[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}
