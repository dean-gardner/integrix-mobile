import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { AxiosError } from 'axios';
import i18n from '../i18n';
import type {
  SubscriptionReadDTO,
  SubscriptionTariffs,
  ManageSubscriptionMembersDTO,
  SubscriptionCreateDTO,
} from '../types/subscription';
import {
  getUserSubscription,
  getSubscriptionMemberPrices,
  assignSubscription,
  revokeSubscription,
  createSubscription as apiCreateSubscription,
} from '../api/subscriptions';

function formatSubscriptionApiError(e: unknown, fallbackKey: string): string {
  const err = e as AxiosError<{ message?: string; title?: string } | string>;
  const data = err.response?.data;
  if (typeof data === 'string' && data.trim()) return data;
  if (data && typeof data === 'object') {
    const msg = (data as { message?: string; title?: string }).message ?? (data as { title?: string }).title;
    if (typeof msg === 'string' && msg.trim()) return msg;
  }
  if (typeof err.message === 'string' && err.message.trim()) return err.message;
  return i18n.t(fallbackKey);
}

export const fetchUserSubscription = createAsyncThunk<
  SubscriptionReadDTO | null,
  string,
  { rejectValue: string }
>('subscription/fetch', async (userId, { rejectWithValue }) => {
  try {
    const res = await getUserSubscription(userId);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.loadSubscription'));
  }
});

export const fetchSubscriptionMemberPrices = createAsyncThunk<
  SubscriptionTariffs,
  void,
  { rejectValue: string }
>('subscription/fetchPrices', async (_, { rejectWithValue }) => {
  try {
    const res = await getSubscriptionMemberPrices();
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue(
      (e as { message?: string })?.message ?? i18n.t('app.errors.loadMemberPrices')
    );
  }
});

export const assignSubscriptionMembers = createAsyncThunk<
  number,
  ManageSubscriptionMembersDTO,
  { rejectValue: string }
>('subscription/assignMembers', async (model, { rejectWithValue }) => {
  try {
    const res = await assignSubscription(model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue(
      (e as { message?: string })?.message ?? i18n.t('app.errors.assignSubscription')
    );
  }
});

export const revokeSubscriptionMembers = createAsyncThunk<
  number,
  ManageSubscriptionMembersDTO,
  { rejectValue: string }
>('subscription/revokeMembers', async (model, { rejectWithValue }) => {
  try {
    const res = await revokeSubscription(model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue(
      (e as { message?: string })?.message ?? i18n.t('app.errors.revokeSubscription')
    );
  }
});

export const createSubscriptionEntry = createAsyncThunk<
  string,
  SubscriptionCreateDTO,
  { rejectValue: string }
>('subscription/create', async (model, { rejectWithValue }) => {
  try {
    const res = await apiCreateSubscription(model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue(formatSubscriptionApiError(e, 'app.errors.createSubscription'));
  }
});

type SubscriptionState = {
  subscription: SubscriptionReadDTO | null;
  memberPrices: SubscriptionTariffs | null;
  isLoading: boolean;
  isActionLoading: boolean;
  error: string | null;
};

const initialState: SubscriptionState = {
  subscription: null,
  memberPrices: null,
  isLoading: false,
  isActionLoading: false,
  error: null,
};

const subscriptionSlice = createSlice({
  name: 'subscription',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserSubscription.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserSubscription.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.subscription = payload;
        state.error = null;
      })
      .addCase(fetchUserSubscription.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadSubscription');
      });

    builder
      .addCase(fetchSubscriptionMemberPrices.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(fetchSubscriptionMemberPrices.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.memberPrices = payload;
      })
      .addCase(fetchSubscriptionMemberPrices.rejected, (state, { payload }) => {
        state.isLoading = false;
        if (payload) state.error = payload;
      });

    builder
      .addCase(assignSubscriptionMembers.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(assignSubscriptionMembers.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        if (state.subscription && typeof payload === 'number') {
          state.subscription.actualMembersCount = payload;
        }
      })
      .addCase(assignSubscriptionMembers.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      })
      .addCase(revokeSubscriptionMembers.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(revokeSubscriptionMembers.fulfilled, (state, { payload }) => {
        state.isActionLoading = false;
        if (state.subscription && typeof payload === 'number') {
          state.subscription.actualMembersCount = payload;
        }
      })
      .addCase(revokeSubscriptionMembers.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      })
      .addCase(createSubscriptionEntry.pending, (state) => {
        state.isActionLoading = true;
      })
      .addCase(createSubscriptionEntry.fulfilled, (state) => {
        state.isActionLoading = false;
      })
      .addCase(createSubscriptionEntry.rejected, (state, { payload }) => {
        state.isActionLoading = false;
        if (payload) state.error = payload;
      });
  },
});

export default subscriptionSlice.reducer;
