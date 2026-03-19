import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import i18n from '../i18n';
import type {
  CompanyTeamNodeDTO,
  CompanyTeamCreateEditDTO,
  CompanyTeamEditDTO,
  ReassignParentNodeDTO,
} from '../types/team';
import {
  getCompanyTeams,
  createTeam as apiCreateTeam,
  editTeam as apiEditTeam,
  deleteTeam as apiDeleteTeam,
  reassignParentNode as apiReassignParentNode,
} from '../api/teams';

export const fetchTeams = createAsyncThunk<
  CompanyTeamNodeDTO[],
  string,
  { rejectValue: string }
>('teams/fetch', async (companyId, { rejectWithValue }) => {
  try {
    const res = await getCompanyTeams(companyId);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.loadTeams'));
  }
});

export const createTeam = createAsyncThunk<
  CompanyTeamNodeDTO,
  { companyId: string; model: CompanyTeamCreateEditDTO },
  { rejectValue: string }
>('teams/create', async ({ companyId, model }, { rejectWithValue }) => {
  try {
    const res = await apiCreateTeam(companyId, model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.createTeam'));
  }
});

export const editTeam = createAsyncThunk<
  CompanyTeamNodeDTO,
  { companyId: string; model: CompanyTeamEditDTO },
  { rejectValue: string }
>('teams/edit', async ({ companyId, model }, { rejectWithValue }) => {
  try {
    const res = await apiEditTeam(companyId, model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.editTeam'));
  }
});

export const reassignParentNode = createAsyncThunk<
  CompanyTeamNodeDTO,
  { companyId: string; model: ReassignParentNodeDTO },
  { rejectValue: string }
>('teams/reassignParent', async ({ companyId, model }, { rejectWithValue }) => {
  try {
    const res = await apiReassignParentNode(companyId, model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue(
      (e as { message?: string })?.message ?? i18n.t('app.errors.reassignTeamParent')
    );
  }
});

export const deleteTeam = createAsyncThunk<
  number,
  number,
  { rejectValue: string }
>('teams/delete', async (id, { rejectWithValue }) => {
  try {
    await apiDeleteTeam(id);
    return id;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.deleteTeam'));
  }
});

type TeamsState = {
  items: CompanyTeamNodeDTO[];
  isLoading: boolean;
  error: string | null;
};

const initialState: TeamsState = {
  items: [],
  isLoading: false,
  error: null,
};

const teamsSlice = createSlice({
  name: 'teams',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchTeams.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload;
        state.error = null;
      })
      .addCase(fetchTeams.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadTeams');
      });
    builder
      .addCase(createTeam.fulfilled, (state, { payload }) => {
        if (!state.items.some((t) => t.id === payload.id)) {
          state.items = [...state.items, payload];
        }
      })
      .addCase(editTeam.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((t) => t.id === payload.id);
        if (i >= 0) state.items[i] = payload;
      })
      .addCase(reassignParentNode.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((t) => t.id === payload.id);
        if (i >= 0) state.items[i] = payload;
      })
      .addCase(deleteTeam.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((t) => t.id !== payload);
      });
  },
});

export default teamsSlice.reducer;
