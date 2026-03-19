import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import i18n from '../i18n';
import type { DefectReadDTO, DefectFilteringModel } from '../types/defect';
import { getDefects, createDefect as apiCreateDefect, editDefect as apiEditDefect, deleteDefect as apiDeleteDefect } from '../api/defects';

export const fetchDefects = createAsyncThunk<
  { items: DefectReadDTO[]; totalCount: number },
  void,
  { state: { defects: { filteringModel: DefectFilteringModel } }; rejectValue: string }
>(
  'defects/fetch',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await getDefects(getState().defects.filteringModel);
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadDefects'));
    }
  }
);

export const fetchMoreDefects = createAsyncThunk<
  { items: DefectReadDTO[]; totalCount: number },
  void,
  {
    state: {
      defects: {
        filteringModel: DefectFilteringModel;
        items: DefectReadDTO[];
        noMorePages: boolean;
      };
    };
    rejectValue: string;
  }
>(
  'defects/fetchMore',
  async (_, { getState, rejectWithValue }) => {
    const { filteringModel, items, noMorePages } = getState().defects;
    if (noMorePages) return rejectWithValue('no_more');
    try {
      const next = { ...filteringModel, pageNumber: filteringModel.pageNumber + 1 };
      const res = await getDefects(next);
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

export const createDefect = createAsyncThunk<DefectReadDTO, FormData, { rejectValue: string }>(
  'defects/create',
  async (model, { rejectWithValue }) => {
    try {
      const res = await apiCreateDefect(model);
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.createDefect'));
    }
  }
);

export const editDefect = createAsyncThunk<
  DefectReadDTO,
  { defectId: string; model: FormData },
  { rejectValue: string }
>('defects/edit', async ({ defectId, model }, { rejectWithValue }) => {
  try {
    const res = await apiEditDefect(defectId, model);
    return res.data;
  } catch (e: any) {
    return rejectWithValue(e?.message ?? i18n.t('app.errors.editDefect'));
  }
});

export const deleteDefect = createAsyncThunk<string, string, { rejectValue: string }>(
  'defects/delete',
  async (defectId, { rejectWithValue }) => {
    try {
      await apiDeleteDefect(defectId);
      return defectId;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.deleteDefect'));
    }
  }
);

type DefectsState = {
  items: DefectReadDTO[];
  isLoading: boolean;
  error: string | null;
  filteringModel: DefectFilteringModel;
  totalCount: number;
  noMorePages: boolean;
};

const initialState: DefectsState = {
  items: [],
  isLoading: false,
  error: null,
  filteringModel: { pageNumber: 0, pageSize: 20 },
  totalCount: 0,
  noMorePages: false,
};

const defectsSlice = createSlice({
  name: 'defects',
  initialState,
  reducers: {
    setDefectsFilter: (state, { payload }: { payload: Partial<DefectFilteringModel> }) => {
      state.filteringModel = { ...state.filteringModel, ...payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchDefects.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDefects.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
        state.error = null;
      })
      .addCase(fetchDefects.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadDefects');
      });
    builder
      .addCase(fetchMoreDefects.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        const next = (payload as { nextPageNumber?: number }).nextPageNumber;
        if (typeof next === 'number') state.filteringModel.pageNumber = next;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
      })
      .addCase(fetchMoreDefects.rejected, (state, { payload }) => {
        state.isLoading = false;
        if (payload !== 'no_more') state.error = payload ?? null;
      });
    builder
      .addCase(createDefect.fulfilled, (state, { payload }) => {
        state.items = [payload, ...state.items];
        state.totalCount = (state.totalCount ?? 0) + 1;
      })
      .addCase(editDefect.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((d) => d.id === payload.id);
        if (i >= 0) state.items[i] = payload;
      })
      .addCase(deleteDefect.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((d) => d.id !== payload);
        state.totalCount = Math.max(0, (state.totalCount ?? 1) - 1);
      });
  },
});

export const { setDefectsFilter } = defectsSlice.actions;
export default defectsSlice.reducer;
