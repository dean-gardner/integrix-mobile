import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  TaskReadDTO,
  TaskFilteringModel,
  TaskWithDetailsReadDTO,
  TaskCreateDTO,
} from '../types/task';
import type { FoundUserDTO } from '../types/user';
import type { FinaliseTaskDTO } from '../types/finaliseTask';
import { TASK_STATUS_CANCELLED } from '../config/taskDetail';
import i18n from '../i18n';
import {
  getTasks,
  getTaskById,
  changeTaskStatus,
  shareTasks as apiShareTasks,
  unshareUsers as apiUnshareUsers,
  getTaskUsersSharedWith,
  shareTaskWithUser,
  unshareTaskWithUser,
  createTask as apiCreateTask,
  editTask as apiEditTask,
  deleteTask as apiDeleteTask,
  finaliseTask as apiFinaliseTask,
} from '../api/tasks';

type TaskReferenceEdit = Pick<
  TaskCreateDTO,
  'workOrderNumber' | 'notificationNumber' | 'projectNumber'
>;

function applyPendingTaskReferenceEdit<T extends TaskReadDTO>(
  task: T,
  pending: Record<string, TaskReferenceEdit>
): T {
  const edit = pending[task.id];
  return edit ? { ...task, ...edit } : task;
}

/**
 * Match web task-share payload shape:
 * - companyTeam is always null
 * - userId/fullName nullable
 * - keep isImplicitShare when present
 */
function normalizeTaskShareUser(user: FoundUserDTO): FoundUserDTO {
  return {
    fullName: user.fullName ?? null,
    email: (user.email ?? '').trim(),
    userId: user.userId ?? null,
    companyTeam: null,
    isImplicitShare: user.isImplicitShare ?? null,
  };
}

function normalizeSharedUsers(data: unknown): FoundUserDTO[] {
  const list = Array.isArray(data)
    ? data
    : Array.isArray((data as { usersSharedWith?: unknown } | null)?.usersSharedWith)
      ? (data as { usersSharedWith: unknown[] }).usersSharedWith
      : Array.isArray((data as { UsersSharedWith?: unknown } | null)?.UsersSharedWith)
        ? (data as { UsersSharedWith: unknown[] }).UsersSharedWith
        : Array.isArray((data as { sharedWithUsers?: unknown } | null)?.sharedWithUsers)
          ? (data as { sharedWithUsers: unknown[] }).sharedWithUsers
          : Array.isArray((data as { SharedWithUsers?: unknown } | null)?.SharedWithUsers)
            ? (data as { SharedWithUsers: unknown[] }).SharedWithUsers
            : [];

  return list
    .map((item) => {
      if (!item || typeof item !== 'object') return null;
      const record = item as Record<string, unknown>;
      const email =
        typeof record.email === 'string'
          ? record.email.trim()
          : typeof record.Email === 'string'
            ? record.Email.trim()
            : '';
      if (!email) return null;
      const fullName =
        typeof record.fullName === 'string' && record.fullName.trim()
          ? record.fullName.trim()
          : typeof record.FullName === 'string' && record.FullName.trim()
            ? record.FullName.trim()
            : null;
      const userId =
        typeof record.userId === 'string'
          ? record.userId
          : typeof record.id === 'string'
            ? record.id
            : typeof record.UserId === 'string'
              ? record.UserId
              : typeof record.Id === 'string'
                ? record.Id
                : null;
      return {
        fullName,
        email,
        userId,
        companyTeam: null,
        isImplicitShare:
          typeof record.isImplicitShare === 'boolean' ? record.isImplicitShare : null,
      };
    })
    .filter((user): user is FoundUserDTO => Boolean(user));
}

function hasSharedUsersPayload(data: unknown): boolean {
  if (!data || typeof data !== 'object') return Array.isArray(data);
  const record = data as Record<string, unknown>;
  return (
    Array.isArray(record.usersSharedWith) ||
    Array.isArray(record.UsersSharedWith) ||
    Array.isArray(record.sharedWithUsers) ||
    Array.isArray(record.SharedWithUsers)
  );
}

function mergeSharedUsersIntoTask<T extends TaskReadDTO>(
  task: T,
  users: FoundUserDTO[]
): T {
  return {
    ...task,
    usersSharedWith: users,
  };
}

function dedupeSharedUsers(users: FoundUserDTO[]): FoundUserDTO[] {
  const seen = new Set<string>();
  return users.filter((user) => {
    const key = (user.userId || user.email).toLowerCase();
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function preserveSharedUsers<T extends TaskReadDTO>(
  nextTask: T,
  previousTask?: TaskReadDTO | null
): T {
  if (hasSharedUsersPayload(nextTask)) {
    return mergeSharedUsersIntoTask(nextTask, normalizeSharedUsers(nextTask));
  }
  const previousUsers = normalizeSharedUsers(previousTask?.usersSharedWith);
  return previousUsers.length > 0 ? mergeSharedUsersIntoTask(nextTask, previousUsers) : nextTask;
}

export const fetchTasks = createAsyncThunk<
  { items: TaskReadDTO[]; totalCount: number },
  void,
  { state: { tasks: { filteringModel: TaskFilteringModel } }; rejectValue: string }
>(
  'tasks/fetch',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await getTasks(getState().tasks.filteringModel);
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadTasks'));
    }
  }
);

export const fetchMoreTasks = createAsyncThunk<
  { items: TaskReadDTO[]; totalCount: number },
  void,
  {
    state: {
      tasks: {
        filteringModel: TaskFilteringModel;
        items: TaskReadDTO[];
        noMorePages: boolean;
      };
    };
    rejectValue: string;
  }
>(
  'tasks/fetchMore',
  async (_, { getState, rejectWithValue }) => {
    const { filteringModel, items, noMorePages } = getState().tasks;
    if (noMorePages) return rejectWithValue('no_more');
    try {
      const next = {
        ...filteringModel,
        pageNumber: filteringModel.pageNumber + 1,
      };
      const res = await getTasks(next);
      return {
        items: items.concat(res.data.items),
        totalCount: res.data.totalCount,
        nextPageNumber: next.pageNumber,
      };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadMoreTasks'));
    }
  }
);

export const goToTasksPage = createAsyncThunk<
  { items: TaskReadDTO[]; totalCount: number; pageNumber: number },
  number,
  { state: { tasks: { filteringModel: TaskFilteringModel } }; rejectValue: string }
>(
  'tasks/goToPage',
  async (pageNumber, { getState, rejectWithValue }) => {
    try {
      const { filteringModel } = getState().tasks;
      const res = await getTasks({ ...filteringModel, pageNumber: pageNumber - 1 });
      return { items: res.data.items, totalCount: res.data.totalCount, pageNumber };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadTasks'));
    }
  }
);

export const fetchTaskById = createAsyncThunk<
  TaskWithDetailsReadDTO,
  { versionId: string; taskId: string },
  { rejectValue: string }
>('tasks/fetchById', async ({ versionId, taskId }, { rejectWithValue }) => {
  try {
    const res = await getTaskById(versionId, taskId);
    // Web task detail uses apiGetTaskById(...) and reads response.data.usersSharedWith.
    const detailUsers = normalizeSharedUsers(res.data);
    let endpointUsers: FoundUserDTO[] = [];
    try {
      const sharedRes = await getTaskUsersSharedWith(versionId, taskId);
      endpointUsers = normalizeSharedUsers(sharedRes.data);
    } catch {
      // Keep the web-compatible task-detail payload as the source of truth if this fails.
    }
    const usersSharedWith = dedupeSharedUsers([...detailUsers, ...endpointUsers]);
    return usersSharedWith.length > 0 || hasSharedUsersPayload(res.data)
      ? mergeSharedUsersIntoTask(res.data, usersSharedWith)
      : res.data;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? i18n.t('app.errors.loadTaskDetails'));
  }
});

export const finaliseCurrentTask = createAsyncThunk<
  TaskWithDetailsReadDTO,
  { versionId: string; taskId: string; model: FinaliseTaskDTO },
  { rejectValue: string }
>('tasks/finalise', async ({ versionId, taskId, model }, { rejectWithValue }) => {
  try {
    const res = await apiFinaliseTask(versionId, taskId, model);
    return res.data;
  } catch (e: any) {
    const statusCode = e?.response?.status;
    const responseData = e?.response?.data;
    const is5xx = statusCode != null && statusCode >= 500;
    if (is5xx) {
      return rejectWithValue(i18n.t('app.errors.unableFinaliseTask'));
    }
    const detail =
      responseData != null
        ? typeof responseData === 'object'
          ? JSON.stringify(responseData)
          : String(responseData)
        : e?.message ?? i18n.t('app.errors.finaliseTask');
    return rejectWithValue(
      statusCode != null
        ? i18n.t('app.errors.requestFailedStatus', { code: statusCode, detail })
        : detail
    );
  }
});

export const changeCurrentTaskStatus = createAsyncThunk<
  TaskWithDetailsReadDTO,
  { documentId: string; versionId: string; taskId: string; status: number },
  { rejectValue: string }
>(
  'tasks/changeStatus',
  async ({ documentId, versionId, taskId, status }, { rejectWithValue }) => {
    try {
      const res = await changeTaskStatus(documentId, versionId, taskId, status.toString());
      if (__DEV__) {
        console.log('[tasks/changeStatus] response', { status: res.status, data: res.data });
      }
      return res.data;
    } catch (e: any) {
      const statusCode = e?.response?.status;
      const responseData = e?.response?.data;
      const is5xx = statusCode != null && statusCode >= 500;
      if (__DEV__ && !is5xx) {
        console.log('[tasks/changeStatus] error', {
          message: e?.message,
          status: statusCode,
          responseData,
          fullError: e,
        });
      } else if (__DEV__ && is5xx) {
        console.log('[tasks/changeStatus] server error (5xx), user-friendly message shown');
      }
      if (is5xx) {
        const friendlyMessage =
          status === TASK_STATUS_CANCELLED
            ? i18n.t('app.errors.unableCancelTask')
            : i18n.t('app.errors.unableUpdateTaskStatus');
        return rejectWithValue(friendlyMessage);
      }
      const detail =
        responseData != null
          ? typeof responseData === 'object'
            ? JSON.stringify(responseData)
            : String(responseData)
            : e?.message ?? i18n.t('app.errors.changeTaskStatus');
      return rejectWithValue(
        statusCode != null
          ? i18n.t('app.errors.requestFailedStatus', { code: statusCode, detail })
          : detail
      );
    }
  }
);

export const shareCurrentTaskWithUser = createAsyncThunk<
  FoundUserDTO,
  { documentId: string; versionId: string; taskId: string; user: FoundUserDTO },
  { rejectValue: string }
>(
  'tasks/shareWithUser',
  async ({ documentId, versionId, taskId, user }, { rejectWithValue }) => {
    const requestUser = normalizeTaskShareUser(user);
    if (!requestUser.email) {
      return rejectWithValue(i18n.t('app.errors.shareTask'));
    }
    const isFoundUser = (v: unknown): v is FoundUserDTO =>
      Boolean(v) && typeof v === 'object' && typeof (v as { email?: unknown }).email === 'string';
    const usersMatch = (a: FoundUserDTO, b: FoundUserDTO) =>
      (a.userId && b.userId && a.userId === b.userId) ||
      a.email.toLowerCase() === b.email.toLowerCase();
    const getValidUsers = (data: unknown): FoundUserDTO[] => {
      const maybe = (data as { validUsers?: unknown } | null)?.validUsers;
      return Array.isArray(maybe) ? maybe.filter(isFoundUser) : [];
    };
    const getResponseMessage = (data: unknown): string | null => {
      const msg = (data as { message?: unknown } | null)?.message;
      return typeof msg === 'string' && msg.trim().length > 0 ? msg : null;
    };
    const pickUserFromData = (data: unknown): FoundUserDTO | null => {
      if (Array.isArray(data)) {
        const users = data.filter(isFoundUser);
        return users.find((u) => usersMatch(u, requestUser)) ?? users[0] ?? null;
      }
      if (isFoundUser(data)) return data;
      const validUsers = getValidUsers(data);
      return validUsers.find((u) => usersMatch(u, requestUser)) ?? validUsers[0] ?? null;
    };

    try {
      // Match web app context: share by task id via /api/tasks/share-tasks
      const res = await apiShareTasks({ tasksIds: [taskId], usersToShare: [requestUser] });
      const picked = pickUserFromData(res.data);
      if (picked) return picked;

      if (res.status === 202) {
        return rejectWithValue(getResponseMessage(res.data) ?? i18n.t('app.errors.shareTask'));
      }

      // Endpoint can succeed without returning user details; keep optimistic local entry.
      if (res.status >= 200 && res.status < 300) return requestUser;
      return rejectWithValue(i18n.t('app.errors.shareTask'));
    } catch (e: any) {
      // Backward-compatible fallback to version-scoped endpoint.
      try {
        const legacy = await shareTaskWithUser(documentId, versionId, taskId, requestUser);
        return legacy.data;
      } catch (legacyError: any) {
        return rejectWithValue(
          legacyError?.response?.data?.message ??
            legacyError?.message ??
            e?.response?.data?.message ??
            e?.message ??
            i18n.t('app.errors.shareTask')
        );
      }
    }
  }
);

export const unshareCurrentTaskWithUser = createAsyncThunk<
  FoundUserDTO,
  { documentId: string; versionId: string; taskId: string; user: FoundUserDTO },
  { rejectValue: string }
>(
  'tasks/unshareWithUser',
  async ({ documentId, versionId, taskId, user }, { rejectWithValue }) => {
    const requestUser = normalizeTaskShareUser(user);
    try {
      // Match web app context: unshare by task id via /api/tasks/{taskId}/unshare-users
      await apiUnshareUsers(taskId, [requestUser]);
      return requestUser;
    } catch (e: any) {
      // Backward-compatible fallback to version-scoped endpoint.
      try {
        await unshareTaskWithUser(documentId, versionId, taskId, requestUser);
        return requestUser;
      } catch (legacyError: any) {
        return rejectWithValue(
          legacyError?.response?.data?.message ??
            legacyError?.message ??
            e?.response?.data?.message ??
            e?.message ??
            i18n.t('app.errors.unshareTask')
        );
      }
    }
  }
);

export const createTaskEntry = createAsyncThunk<
  TaskWithDetailsReadDTO,
  { documentId: string; versionId: string; model: TaskCreateDTO },
  { rejectValue: string }
>('tasks/create', async ({ documentId, versionId, model }, { rejectWithValue }) => {
  try {
    const res = await apiCreateTask(documentId, versionId, model);
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? i18n.t('app.errors.createTask'));
  }
});

export const editTaskEntry = createAsyncThunk<
  TaskWithDetailsReadDTO,
  { documentId: string; versionId: string; taskId: string; model: TaskCreateDTO },
  { rejectValue: string }
>(
  'tasks/edit',
  async ({ documentId, versionId, taskId, model }, { rejectWithValue }) => {
    try {
      const res = await apiEditTask(documentId, versionId, taskId, model);
      return res.data;
    } catch (e: any) {
      const statusCode = e?.response?.status;
      if (statusCode != null && statusCode >= 500) {
        return rejectWithValue(i18n.t('app.errors.unableSaveTask'));
      }
      return rejectWithValue(e?.message ?? i18n.t('app.errors.editTask'));
    }
  }
);

export const deleteTaskEntry = createAsyncThunk<
  string,
  { taskId: string; documentId?: string | null; versionId?: string | null },
  { rejectValue: string }
>('tasks/delete', async ({ taskId, documentId, versionId }, { rejectWithValue }) => {
  try {
    await apiDeleteTask(taskId, documentId, versionId);
    return taskId;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? i18n.t('app.errors.deleteTask'));
  }
});

type TasksState = {
  items: TaskReadDTO[];
  isLoading: boolean;
  isActionLoading: boolean;
  currentTaskLoading: boolean;
  error: string | null;
  filteringModel: TaskFilteringModel;
  totalCount: number;
  noMorePages: boolean;
  currentTask: TaskWithDetailsReadDTO | null;
  activeFetchRequestId: string | null;
  pendingReferenceEdits: Record<string, TaskReferenceEdit>;
};

const initialState: TasksState = {
  items: [],
  isLoading: false,
  isActionLoading: false,
  currentTaskLoading: false,
  error: null,
  filteringModel: {
    pageNumber: 0,
    pageSize: 10,
    status: 0,
    type: null,
    createdById: null,
    taskNumber: null,
    description: null,
    taskReference: null,
    createdBy: null,
    sortingField: 'createdOnUtc',
    sortingOrder: 1, // desc
  },
  totalCount: 0,
  noMorePages: false,
  currentTask: null,
  activeFetchRequestId: null,
  pendingReferenceEdits: {},
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState,
  reducers: {
    setTasksFilter: (state, { payload }: { payload: Partial<TaskFilteringModel> }) => {
      state.filteringModel = {
        ...state.filteringModel,
        ...payload,
      };
    },
    setTasksFilteringOption: (
      state,
      { payload }: { payload: { field: keyof TaskFilteringModel; value: unknown } }
    ) => {
      (state.filteringModel as Record<string, unknown>)[payload.field] = payload.value;
    },
    resetTasks: () => initialState,
    clearCurrentTask: (state) => {
      state.currentTask = null;
      state.currentTaskLoading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchTasks.pending, (state, action) => {
        state.activeFetchRequestId = action.meta.requestId;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        if (state.activeFetchRequestId !== action.meta.requestId) return;
        const { payload } = action;
        state.activeFetchRequestId = null;
        state.isLoading = false;
        state.items = payload.items.map((task) =>
          applyPendingTaskReferenceEdit(task, state.pendingReferenceEdits)
        );
        state.totalCount = payload.totalCount;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
        state.error = null;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        if (state.activeFetchRequestId !== action.meta.requestId) return;
        const { payload } = action;
        state.activeFetchRequestId = null;
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadTasks');
      });

    builder
      .addCase(fetchMoreTasks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreTasks.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items.map((task) =>
          applyPendingTaskReferenceEdit(task, state.pendingReferenceEdits)
        );
        state.totalCount = payload.totalCount;
        const nextPage = (payload as { nextPageNumber?: number }).nextPageNumber;
        if (typeof nextPage === 'number') state.filteringModel.pageNumber = nextPage;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
      })
      .addCase(fetchMoreTasks.rejected, (state, { payload }) => {
        state.isLoading = false;
        if (payload !== 'no_more') state.error = payload ?? null;
      });

    builder
      .addCase(goToTasksPage.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(goToTasksPage.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items.map((task) =>
          applyPendingTaskReferenceEdit(task, state.pendingReferenceEdits)
        );
        state.totalCount = payload.totalCount;
        state.filteringModel.pageNumber = payload.pageNumber - 1;
        const totalPages = Math.ceil(payload.totalCount / state.filteringModel.pageSize);
        state.noMorePages = payload.pageNumber >= totalPages;
        state.error = null;
      })
      .addCase(goToTasksPage.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? null;
      });

    builder
      .addCase(fetchTaskById.pending, (state) => {
        state.currentTaskLoading = true;
      })
      .addCase(fetchTaskById.fulfilled, (state, { payload }) => {
        state.currentTaskLoading = false;
        const task = applyPendingTaskReferenceEdit(payload, state.pendingReferenceEdits);
        state.currentTask = task;
        const i = state.items.findIndex((t) => t.id === payload.id);
        if (i >= 0) state.items[i] = { ...state.items[i], ...task };
      })
      .addCase(fetchTaskById.rejected, (state, { payload }) => {
        state.currentTaskLoading = false;
        state.error = payload ?? state.error;
      });

    builder
      .addCase(finaliseCurrentTask.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(finaliseCurrentTask.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        const task = preserveSharedUsers(payload, state.currentTask);
        state.currentTask = task;
        const i = state.items.findIndex((t) => t.id === payload.id);
        if (i >= 0) state.items[i] = { ...state.items[i], ...task };
      })
      .addCase(finaliseCurrentTask.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      })
      .addCase(changeCurrentTaskStatus.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(changeCurrentTaskStatus.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        const task = preserveSharedUsers(payload, state.currentTask);
        state.currentTask = task;
        const i = state.items.findIndex((t) => t.id === payload.id);
        if (i >= 0) state.items[i] = { ...state.items[i], ...task };
      })
      .addCase(changeCurrentTaskStatus.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      });

    builder
      .addCase(shareCurrentTaskWithUser.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(shareCurrentTaskWithUser.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        if (!state.currentTask) return;
        const list = normalizeSharedUsers(state.currentTask.usersSharedWith);
        const exists = list.some(
          (u) =>
            (u.userId && payload.userId && u.userId === payload.userId) ||
            u.email.toLowerCase() === payload.email.toLowerCase()
        );
        if (!exists) {
          state.currentTask.usersSharedWith = [...list, normalizeTaskShareUser(payload)];
        }
      })
      .addCase(shareCurrentTaskWithUser.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      })
      .addCase(unshareCurrentTaskWithUser.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(unshareCurrentTaskWithUser.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        if (!state.currentTask?.usersSharedWith) return;
        state.currentTask.usersSharedWith = normalizeSharedUsers(state.currentTask.usersSharedWith).filter((u) => {
          const byUserId =
            Boolean(u.userId) && Boolean(payload.userId) && u.userId === payload.userId;
          const byEmail = u.email.toLowerCase() === payload.email.toLowerCase();
          return !(byUserId || byEmail);
        });
      })
      .addCase(unshareCurrentTaskWithUser.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      })
      .addCase(createTaskEntry.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(createTaskEntry.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        state.items = [payload, ...state.items];
        state.totalCount = (state.totalCount ?? 0) + 1;
        state.currentTask = payload;
      })
      .addCase(createTaskEntry.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      })
      .addCase(editTaskEntry.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(editTaskEntry.fulfilled, (state, { payload, meta }) => {
        state.isActionLoading = false;
        const referenceEdit: TaskReferenceEdit = {
          workOrderNumber: meta.arg.model.workOrderNumber,
          notificationNumber: meta.arg.model.notificationNumber,
          projectNumber: meta.arg.model.projectNumber,
        };
        state.pendingReferenceEdits[meta.arg.taskId] = referenceEdit;
        const editedTask = {
          ...payload,
          ...referenceEdit,
          usersSharedWith: normalizeSharedUsers(meta.arg.model.usersSharedWith),
        };
        const i = state.items.findIndex((t) => t.id === payload.id);
        if (i >= 0) state.items[i] = { ...state.items[i], ...editedTask };
        state.currentTask = editedTask;
      })
      .addCase(editTaskEntry.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      })
      .addCase(deleteTaskEntry.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(deleteTaskEntry.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        state.items = state.items.filter((t) => t.id !== payload);
        state.totalCount = Math.max(0, (state.totalCount ?? 1) - 1);
        if (state.currentTask?.id === payload) {
          state.currentTask = null;
        }
      })
      .addCase(deleteTaskEntry.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      });
  },
});

export const { setTasksFilter, setTasksFilteringOption, resetTasks, clearCurrentTask } =
  tasksSlice.actions;
export default tasksSlice.reducer;
