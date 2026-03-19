import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import i18n from '../i18n';
import type {
  CompanyAssetNodeDTO,
  CompanyAssetStatus,
  CompanyAssetCreateDTO,
  ReassignParentNodeDTO,
} from '../types/companyAsset';
import {
  getCompanyAssets,
  createAsset as apiCreateAsset,
  editAsset as apiEditAsset,
  setAssetStatus as apiSetAssetStatus,
  reassignParentNode as apiReassignParentNode,
} from '../api/companyAssets';

export const fetchCompanyAssets = createAsyncThunk<
  CompanyAssetNodeDTO[],
  { companyId: string; parentAssetId: number | null; status: CompanyAssetStatus },
  { rejectValue: string }
>('companyAssets/fetch', async ({ companyId, parentAssetId, status }, { rejectWithValue }) => {
  try {
    const res = await getCompanyAssets(companyId, parentAssetId, status);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.loadAssets'));
  }
});

export const createAsset = createAsyncThunk<
  CompanyAssetNodeDTO,
  { companyId: string; model: CompanyAssetCreateDTO },
  { rejectValue: string }
>('companyAssets/create', async ({ companyId, model }, { rejectWithValue }) => {
  try {
    const res = await apiCreateAsset(companyId, model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.createAsset'));
  }
});

export const editAsset = createAsyncThunk<
  CompanyAssetNodeDTO,
  { id: number; companyId: string; model: CompanyAssetCreateDTO },
  { rejectValue: string }
>('companyAssets/edit', async ({ id, companyId, model }, { rejectWithValue }) => {
  try {
    const res = await apiEditAsset(id, companyId, model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.editAsset'));
  }
});

export const setAssetStatus = createAsyncThunk<
  CompanyAssetNodeDTO,
  { id: number; companyId: string; status: CompanyAssetStatus },
  { rejectValue: string }
>('companyAssets/setStatus', async ({ id, companyId, status }, { rejectWithValue }) => {
  try {
    const res = await apiSetAssetStatus(id, companyId, status);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.updateAssetStatus'));
  }
});

export const reassignAssetParent = createAsyncThunk<
  CompanyAssetNodeDTO,
  { companyId: string; model: ReassignParentNodeDTO },
  { rejectValue: string }
>('companyAssets/reassignParent', async ({ companyId, model }, { rejectWithValue }) => {
  try {
    const res = await apiReassignParentNode(companyId, model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.reassignParent'));
  }
});

type CompanyAssetsState = {
  items: CompanyAssetNodeDTO[];
  isLoading: boolean;
  error: string | null;
};

const initialState: CompanyAssetsState = {
  items: [],
  isLoading: false,
  error: null,
};

const companyAssetsSlice = createSlice({
  name: 'companyAssets',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchCompanyAssets.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCompanyAssets.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload;
        state.error = null;
      })
      .addCase(fetchCompanyAssets.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadAssets');
      });
    builder
      .addCase(createAsset.fulfilled, (state, { payload }) => {
        if (!state.items.some((a) => a.id === payload.id)) {
          state.items = [...state.items, payload];
        }
      })
      .addCase(editAsset.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((a) => a.id === payload.id);
        if (i >= 0) state.items[i] = payload;
      })
      .addCase(setAssetStatus.fulfilled, (state, { payload, meta }) => {
        const status = meta.arg.status;
        if (status === CompanyAssetStatus.Archived) {
          state.items = state.items.filter((a) => a.id !== payload.id);
        } else {
          const i = state.items.findIndex((a) => a.id === payload.id);
          if (i >= 0) state.items[i] = payload;
          else state.items = [...state.items, payload];
        }
      })
      .addCase(reassignAssetParent.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((a) => a.id === payload.id);
        if (i >= 0) state.items[i] = payload;
        else state.items = [...state.items, payload];
      });
  },
});

export default companyAssetsSlice.reducer;
