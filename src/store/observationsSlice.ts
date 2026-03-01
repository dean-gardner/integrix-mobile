import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type {
  ObservationFeedReadDTO,
  ObservationFilteringModel,
} from '../types/observation';
import {
  getFeedObservations,
  createObservation as apiCreateObservation,
  editObservation as apiEditObservation,
  deleteObservation as apiDeleteObservation,
} from '../api/observations';

export const fetchObservations = createAsyncThunk<
  { items: ObservationFeedReadDTO[]; totalCount: number },
  void,
  {
    state: { observations: { filteringModel: ObservationFilteringModel } };
    rejectValue: string;
  }
>(
  'observations/fetch',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await getFeedObservations(getState().observations.filteringModel);
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: unknown) {
      return rejectWithValue(
        (e as { message?: string })?.message ?? 'Failed to load observations'
      );
    }
  }
);

export const fetchMoreObservations = createAsyncThunk<
  { items: ObservationFeedReadDTO[]; totalCount: number },
  void,
  {
    state: {
      observations: {
        filteringModel: ObservationFilteringModel;
        items: ObservationFeedReadDTO[];
        noMorePages: boolean;
      };
    };
    rejectValue: string;
  }
>(
  'observations/fetchMore',
  async (_, { getState, rejectWithValue }) => {
    const { filteringModel, items, noMorePages } = getState().observations;
    if (noMorePages) return rejectWithValue('no_more');
    try {
      const next = { ...filteringModel, pageNumber: filteringModel.pageNumber + 1 };
      const res = await getFeedObservations(next);
      return {
        items: items.concat(res.data.items),
        totalCount: res.data.totalCount,
        nextPageNumber: next.pageNumber,
      };
    } catch (e: unknown) {
      return rejectWithValue(
        (e as { message?: string })?.message ?? 'Failed to load more'
      );
    }
  }
);

export const createObservation = createAsyncThunk<
  void,
  { description: string },
  { rejectValue: string }
>(
  'observations/create',
  async ({ description }, { dispatch, rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('Description', (description ?? '').trim());
      await apiCreateObservation(formData);
      await dispatch(fetchObservations()).unwrap();
    } catch (e: unknown) {
      return rejectWithValue(
        (e as { message?: string })?.message ?? 'Failed to create observation'
      );
    }
  }
);

export const editObservation = createAsyncThunk<
  void,
  { observationId: string; description: string },
  { rejectValue: string }
>(
  'observations/edit',
  async ({ observationId, description }, { dispatch, rejectWithValue }) => {
    try {
      const formData = new FormData();
      formData.append('Description', (description ?? '').trim());
      await apiEditObservation(observationId, formData);
      await dispatch(fetchObservations()).unwrap();
    } catch (e: unknown) {
      return rejectWithValue(
        (e as { message?: string })?.message ?? 'Failed to edit observation'
      );
    }
  }
);

export const deleteObservation = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  'observations/delete',
  async (observationId, { rejectWithValue }) => {
    try {
      await apiDeleteObservation(observationId);
      return observationId;
    } catch (e: unknown) {
      return rejectWithValue(
        (e as { message?: string })?.message ?? 'Failed to delete observation'
      );
    }
  }
);

type ObservationsState = {
  items: ObservationFeedReadDTO[];
  isLoading: boolean;
  error: string | null;
  filteringModel: ObservationFilteringModel;
  totalCount: number;
  noMorePages: boolean;
};

const initialState: ObservationsState = {
  items: [],
  isLoading: false,
  error: null,
  filteringModel: { pageNumber: 0, pageSize: 20 },
  totalCount: 0,
  noMorePages: false,
};

const observationsSlice = createSlice({
  name: 'observations',
  initialState,
  reducers: {
    setObservationsFilter: (
      state,
      { payload }: { payload: Partial<ObservationFilteringModel> }
    ) => {
      state.filteringModel = { ...state.filteringModel, ...payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchObservations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchObservations.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
        state.error = null;
      })
      .addCase(fetchObservations.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? 'Failed to load observations';
      });
    builder
      .addCase(fetchMoreObservations.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        const next = (payload as { nextPageNumber?: number }).nextPageNumber;
        if (typeof next === 'number') state.filteringModel.pageNumber = next;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
      })
      .addCase(fetchMoreObservations.rejected, (state, { payload }) => {
        state.isLoading = false;
        if (payload !== 'no_more') state.error = payload ?? null;
      });
    builder.addCase(deleteObservation.fulfilled, (state, { payload }) => {
      state.items = state.items.filter((o) => o.id !== payload);
      state.totalCount = Math.max(0, state.totalCount - 1);
    });
  },
});

export const { setObservationsFilter } = observationsSlice.actions;
export default observationsSlice.reducer;
