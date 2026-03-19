import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import i18n from '../i18n';
import type { CompanyReadDTO } from '../types/company';
import { getUserCompany } from '../api/companies';

export const fetchUserCompany = createAsyncThunk<
  CompanyReadDTO | null,
  void,
  { rejectValue: string }
>('company/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await getUserCompany();
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue(
      (e as { message?: string })?.message ?? i18n.t('app.errors.loadCompany')
    );
  }
});

type CompanyState = {
  company: CompanyReadDTO | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: CompanyState = {
  company: null,
  isLoading: false,
  error: null,
};

const companySlice = createSlice({
  name: 'company',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserCompany.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserCompany.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.company = payload;
        state.error = null;
      })
      .addCase(fetchUserCompany.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadCompany');
      });
  },
});

export default companySlice.reducer;
