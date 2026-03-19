import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import i18n from '../i18n';
import type { DashboardStatsDTO, DashboardRequestDto } from '../types/dashboard';
import type { DashboardTaskItem, DashboardDefectItem, DashboardObservationItem } from '../types/dashboard';
import {
  getDashboardStats,
  getDashboardTasks,
  getDashboardDefects,
  getDashboardObservations,
} from '../api/dashboard';
import { DashboardViewEnum as ViewEnum } from '../types/dashboard';

export const fetchDashboardStats = createAsyncThunk<
  DashboardStatsDTO,
  { assetId?: number } | undefined,
  { rejectValue: string }
>(
  'dashboard/fetchStats',
  async (payload, { rejectWithValue }) => {
    try {
      const model: DashboardRequestDto = { assetId: payload?.assetId };
      const res = await getDashboardStats(model);
      return res.data;
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadDashboardStats'));
    }
  }
);

export const fetchDashboardTasks = createAsyncThunk<
  { items: DashboardTaskItem[]; totalCount: number },
  { assetId?: number; page?: number; pageSize?: number },
  { rejectValue: string }
>(
  'dashboard/fetchTasks',
  async ({ assetId, page = 0, pageSize = 25 }, { rejectWithValue }) => {
    try {
      const res = await getDashboardTasks({ assetId, pageNumber: page, pageSize });
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadDashboardTasks'));
    }
  }
);

export const fetchDashboardDefects = createAsyncThunk<
  { items: DashboardDefectItem[]; totalCount: number },
  { assetId?: number; page?: number; pageSize?: number },
  { rejectValue: string }
>(
  'dashboard/fetchDefects',
  async ({ assetId, page = 0, pageSize = 25 }, { rejectWithValue }) => {
    try {
      const model: DashboardRequestDto = {
        assetId,
        viewType: ViewEnum.Defects,
        pageNumber: page,
        pageSize,
      };
      const res = await getDashboardDefects(model);
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadDashboardDefects'));
    }
  }
);

export const fetchDashboardClosedDefects = createAsyncThunk<
  { items: DashboardDefectItem[]; totalCount: number },
  { assetId?: number; page?: number; pageSize?: number },
  { rejectValue: string }
>(
  'dashboard/fetchClosedDefects',
  async ({ assetId, page = 0, pageSize = 25 }, { rejectWithValue }) => {
    try {
      const model: DashboardRequestDto = {
        assetId,
        viewType: ViewEnum.ClosedDefects,
        pageNumber: page,
        pageSize,
      };
      const res = await getDashboardDefects(model);
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadDashboardClosedDefects'));
    }
  }
);

export const fetchDashboardObservations = createAsyncThunk<
  { items: DashboardObservationItem[]; totalCount: number },
  { assetId?: number; page?: number; pageSize?: number },
  { rejectValue: string }
>(
  'dashboard/fetchObservations',
  async ({ assetId, page = 0, pageSize = 25 }, { rejectWithValue }) => {
    try {
      const model: DashboardRequestDto = {
        assetId,
        viewType: ViewEnum.Observations,
        pageNumber: page,
        pageSize,
      };
      const res = await getDashboardObservations(model);
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadDashboardObservations'));
    }
  }
);

type DashboardState = {
  stats: DashboardStatsDTO | null;
  isLoading: boolean;
  error: string | null;
};

const initialState: DashboardState = {
  stats: null,
  isLoading: false,
  error: null,
};

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearDashboardError: (state) => {
      state.error = null;
    },
    resetDashboardStats: (state) => {
      state.stats = null;
    },
  },
  extraReducers: (builder) => {
    // fetchDashboardStats
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.stats = payload;
        state.error = null;
      })
      .addCase(fetchDashboardStats.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadDashboard');
      });
    // fetchDashboardTasks
    builder.addCase(fetchDashboardTasks.fulfilled, (state, { payload }) => {
      if (state.stats) {
        state.stats = {
          ...state.stats,
          tasks: { items: payload.items, totalCount: payload.totalCount },
        };
      }
    });
    // fetchDashboardDefects
    builder.addCase(fetchDashboardDefects.fulfilled, (state, { payload }) => {
      if (state.stats) {
        state.stats = {
          ...state.stats,
          defects: { items: payload.items, totalCount: payload.totalCount },
        };
      }
    });
    // fetchDashboardClosedDefects
    builder.addCase(fetchDashboardClosedDefects.fulfilled, (state, { payload }) => {
      if (state.stats) {
        state.stats = {
          ...state.stats,
          closedDefects: { items: payload.items, totalCount: payload.totalCount },
        };
      }
    });
    // fetchDashboardObservations
    builder.addCase(fetchDashboardObservations.fulfilled, (state, { payload }) => {
      if (state.stats) {
        state.stats = {
          ...state.stats,
          observations: { items: payload.items, totalCount: payload.totalCount },
        };
      }
    });
  },
});

export const { clearDashboardError, resetDashboardStats } = dashboardSlice.actions;
export default dashboardSlice.reducer;
