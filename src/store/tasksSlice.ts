import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  TaskReadDTO,
  TaskFilteringModel,
  TaskWithDetailsReadDTO,
  TaskCreateDTO,
} from '../types/task';
import type { FoundUserDTO } from '../types/user';
import { TASK_STATUS_CANCELLED } from '../config/taskDetail';
import {
  getTasks,
  getTaskById,
  changeTaskStatus,
  shareTaskWithUser,
  unshareTaskWithUser,
  createTask as apiCreateTask,
  editTask as apiEditTask,
  deleteTask as apiDeleteTask,
} from '../api/tasks';

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
      return rejectWithValue(e?.message ?? 'Failed to load tasks');
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
      return rejectWithValue(e?.message ?? 'Failed to load more tasks');
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
      return rejectWithValue(e?.message ?? 'Failed to load tasks');
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
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? 'Failed to load task details');
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
            ? 'Unable to cancel task at this moment. Please try again later.'
            : 'Unable to update task status at this time. Please try again later.';
        return rejectWithValue(friendlyMessage);
      }
      const detail =
        responseData != null
          ? typeof responseData === 'object'
            ? JSON.stringify(responseData)
            : String(responseData)
          : e?.message ?? 'Failed to change task status';
      return rejectWithValue(
        statusCode != null ? `Request failed with status code ${statusCode}. ${detail}` : detail
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
    try {
      const res = await shareTaskWithUser(documentId, versionId, taskId, user);
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Failed to share task');
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
    try {
      await unshareTaskWithUser(documentId, versionId, taskId, user);
      return user;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? 'Failed to unshare task');
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
    return rejectWithValue(e?.message ?? 'Failed to create task');
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
        return rejectWithValue('Unable to save task at this moment. Please try again later.');
      }
      return rejectWithValue(e?.message ?? 'Failed to edit task');
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
    return rejectWithValue(e?.message ?? 'Failed to delete task');
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
      .addCase(fetchTasks.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
        state.error = null;
      })
      .addCase(fetchTasks.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? 'Failed to load tasks';
      });

    builder
      .addCase(fetchMoreTasks.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreTasks.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
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
        state.items = payload.items;
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
        state.currentTask = payload;
        const i = state.items.findIndex((t) => t.id === payload.id);
        if (i >= 0) state.items[i] = { ...state.items[i], ...payload };
      })
      .addCase(fetchTaskById.rejected, (state, { payload }) => {
        state.currentTaskLoading = false;
        state.error = payload ?? state.error;
      });

    builder
      .addCase(changeCurrentTaskStatus.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(changeCurrentTaskStatus.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        state.currentTask = payload;
        const i = state.items.findIndex((t) => t.id === payload.id);
        if (i >= 0) state.items[i] = { ...state.items[i], ...payload };
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
        const list = state.currentTask.usersSharedWith ?? [];
        const exists = list.some(
          (u) =>
            (u.userId && payload.userId && u.userId === payload.userId) ||
            u.email.toLowerCase() === payload.email.toLowerCase()
        );
        if (!exists) {
          state.currentTask.usersSharedWith = [...list, payload];
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
        state.currentTask.usersSharedWith = state.currentTask.usersSharedWith.filter((u) => {
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
      .addCase(editTaskEntry.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        const i = state.items.findIndex((t) => t.id === payload.id);
        if (i >= 0) state.items[i] = { ...state.items[i], ...payload };
        state.currentTask = payload;
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
