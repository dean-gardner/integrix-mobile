import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { FeedItemDTO, FilteringModel } from '../types/feed';
import { getFeed } from '../api/feed';

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
      return rejectWithValue(e?.message ?? 'Failed to load feed');
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
      return rejectWithValue(e?.message ?? 'Failed to load more');
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
};

const initialState: FeedState = {
  items: [],
  isLoading: false,
  error: null,
  filteringModel: { pageNumber: 0, pageSize: 10 },
  totalCount: 0,
  noMorePages: false,
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
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.filteringModel.pageNumber = 0;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <= 1;
        state.error = null;
      })
      .addCase(fetchFeedItems.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? 'Failed to load feed';
      });

    builder
      .addCase(fetchMoreFeedItems.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchMoreFeedItems.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.filteringModel.pageNumber = payload.nextPageNumber;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          payload.nextPageNumber + 1;
      })
      .addCase(fetchMoreFeedItems.rejected, (state, { payload }) => {
        state.isLoading = false;
        if (payload !== 'no_more') state.error = payload ?? null;
      });
  },
});

export const { setFeedFilteringOption, resetFeed } = feedSlice.actions;
export default feedSlice.reducer;
