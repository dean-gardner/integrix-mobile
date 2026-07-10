import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { FeedItemDTO, FilteringModel } from '../types/feed';
import { getFeed } from '../api/feed';
import i18n from '../i18n';
import { editTaskEntry } from './tasksSlice';

type TaskReferenceEdit = Pick<
  FeedItemDTO,
  'workOrderNumber' | 'notificationNumber' | 'projectNumber'
>;

function applyPendingTaskReferenceEdit(
  item: FeedItemDTO | null | undefined,
  pending?: Record<string, TaskReferenceEdit> | null
): FeedItemDTO {
  if (!item || typeof item !== 'object' || !item.taskId) return item as FeedItemDTO;
  const edit = pending?.[item.taskId];
  if (!edit || typeof edit !== 'object' || Array.isArray(edit)) return item;
  return { ...item, ...edit };
}

export const fetchFeedItems = createAsyncThunk<
  { items: FeedItemDTO[]; totalCount: number },
  void,
  { state: { feed: { filteringModel: FilteringModel } }; rejectValue: string }
>(
  'feed/fetchItems',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { filteringModel } = getState().feed;
      const res = await getFeed(filteringModel);
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadFeed'));
    }
  }
);

export const fetchMoreFeedItems = createAsyncThunk<
  { items: FeedItemDTO[]; totalCount: number; nextPageNumber: number },
  void,
  {
    state: { feed: { filteringModel: FilteringModel; items: FeedItemDTO[]; noMorePages: boolean } };
    rejectValue: string;
  }
>(
  'feed/fetchMore',
  async (_, { getState, rejectWithValue }) => {
    const { filteringModel, items, noMorePages } = getState().feed;
    if (noMorePages) return rejectWithValue('no_more');
    try {
      const next = { ...filteringModel, pageNumber: filteringModel.pageNumber + 1 };
      const res = await getFeed(next);
      return {
        items: items.concat(res.data.items),
        totalCount: res.data.totalCount,
        nextPageNumber: next.pageNumber,
      };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadMore'));
    }
  }
);

type FeedState = {
  items: FeedItemDTO[];
  isLoading: boolean;
  error: string | null;
  filteringModel: FilteringModel;
  totalCount: number;
  noMorePages: boolean;
  pendingReferenceEdits: Record<string, TaskReferenceEdit>;
};

const initialState: FeedState = {
  items: [],
  isLoading: false,
  error: null,
  filteringModel: { pageNumber: 0, pageSize: 10 },
  totalCount: 0,
  noMorePages: false,
  pendingReferenceEdits: {},
};

const feedSlice = createSlice({
  name: 'feed',
  initialState,
  reducers: {
    setFeedFilteringOption: (
      state,
      { payload }: { payload: { field: string; value: unknown } }
    ) => {
      (state.filteringModel as Record<string, unknown>)[payload.field] = payload.value;
    },
    resetFeed: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchFeedItems.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchFeedItems.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.pendingReferenceEdits ??= {};
        state.items = (payload.items ?? [])
          .filter((item): item is FeedItemDTO => Boolean(item && typeof item === 'object'))
          .map((item) => applyPendingTaskReferenceEdit(item, state.pendingReferenceEdits));
        state.totalCount = payload.totalCount;
        state.filteringModel.pageNumber = 0;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <= 1;
        state.error = null;
      })
      .addCase(fetchFeedItems.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadFeed');
      });

    builder
      .addCase(fetchMoreFeedItems.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreFeedItems.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.pendingReferenceEdits ??= {};
        state.items = (payload.items ?? [])
          .filter((item): item is FeedItemDTO => Boolean(item && typeof item === 'object'))
          .map((item) => applyPendingTaskReferenceEdit(item, state.pendingReferenceEdits));
        state.totalCount = payload.totalCount;
        state.filteringModel.pageNumber = payload.nextPageNumber;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          payload.nextPageNumber + 1;
      })
      .addCase(fetchMoreFeedItems.rejected, (state, { payload }) => {
        state.isLoading = false;
        if (payload !== 'no_more') state.error = payload ?? null;
      })
      .addCase(editTaskEntry.fulfilled, (state, { meta }) => {
        const referenceEdit: TaskReferenceEdit = {
          workOrderNumber: meta.arg.model.workOrderNumber,
          notificationNumber: meta.arg.model.notificationNumber,
          projectNumber: meta.arg.model.projectNumber,
        };
        state.pendingReferenceEdits ??= {};
        state.pendingReferenceEdits[meta.arg.taskId] = referenceEdit;
        state.items = state.items.map((item) =>
          item.taskId === meta.arg.taskId ? { ...item, ...referenceEdit } : item
        );
      });
  },
});

export const { setFeedFilteringOption, resetFeed } = feedSlice.actions;
export default feedSlice.reducer;
