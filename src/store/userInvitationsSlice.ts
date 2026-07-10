import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import i18n from '../i18n';
import {
  createUserInvitation as apiCreateUserInvitation,
  deleteUserInvitation as apiDeleteUserInvitation,
  getUserInvitations,
  resendUserInvitation as apiResendUserInvitation,
} from '../api/userInvitations';
import type {
  UserInvitationCreateDTO,
  UserInvitationFilteringModel,
  UserInvitationReadDTO,
} from '../types/invitation';
import { getHttpErrorMessage } from '../utils/httpErrorMessage';

export const fetchUserInvitations = createAsyncThunk<
  { items: UserInvitationReadDTO[]; totalCount: number },
  void,
  {
    state: { userInvitations: { filteringModel: UserInvitationFilteringModel } };
    rejectValue: string;
  }
>('userInvitations/fetch', async (_, { getState, rejectWithValue }) => {
  try {
    const res = await getUserInvitations(getState().userInvitations.filteringModel);
    return { items: res.data.items, totalCount: res.data.totalCount };
  } catch (e: unknown) {
    return rejectWithValue(getHttpErrorMessage(e, i18n.t('app.errors.loadInvitations')));
  }
});

export const createInvitation = createAsyncThunk<
  UserInvitationReadDTO,
  UserInvitationCreateDTO,
  { rejectValue: string }
>('userInvitations/create', async (model, { rejectWithValue }) => {
  try {
    const res = await apiCreateUserInvitation(model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue(getHttpErrorMessage(e, i18n.t('app.errors.sendInvitation')));
  }
});

export const deleteInvitation = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('userInvitations/delete', async (id, { rejectWithValue }) => {
  try {
    await apiDeleteUserInvitation(id);
    return id;
  } catch (e: unknown) {
    return rejectWithValue(getHttpErrorMessage(e, i18n.t('app.errors.deleteInvitation')));
  }
});

export const resendInvitation = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('userInvitations/resend', async (id, { rejectWithValue }) => {
  try {
    await apiResendUserInvitation(id);
    return id;
  } catch (e: unknown) {
    return rejectWithValue(getHttpErrorMessage(e, i18n.t('app.errors.resendInvitation')));
  }
});

type UserInvitationsState = {
  items: UserInvitationReadDTO[];
  isLoading: boolean;
  error: string | null;
  filteringModel: UserInvitationFilteringModel;
  totalCount: number;
  activeFetchRequestId: string | null;
};

const initialState: UserInvitationsState = {
  items: [],
  isLoading: false,
  error: null,
  filteringModel: {
    sortingField: 'sendOn',
    sortingOrder: 1,
    pageNumber: 0,
    pageSize: 10,
  },
  totalCount: 0,
  activeFetchRequestId: null,
};

const userInvitationsSlice = createSlice({
  name: 'userInvitations',
  initialState,
  reducers: {
    setUserInvitationsFilter: (
      state,
      { payload }: { payload: Partial<UserInvitationFilteringModel> }
    ) => {
      state.filteringModel = { ...state.filteringModel, ...payload };
    },
    clearUserInvitationsLoading: (state) => {
      state.isLoading = false;
      state.activeFetchRequestId = null;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserInvitations.pending, (state, action) => {
        state.activeFetchRequestId = action.meta.requestId;
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserInvitations.fulfilled, (state, action) => {
        if (state.activeFetchRequestId !== action.meta.requestId) return;
        const { payload } = action;
        state.activeFetchRequestId = null;
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.error = null;
      })
      .addCase(fetchUserInvitations.rejected, (state, action) => {
        if (state.activeFetchRequestId !== action.meta.requestId) return;
        const { payload } = action;
        state.activeFetchRequestId = null;
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadInvitations');
      });
  },
});

export const { setUserInvitationsFilter, clearUserInvitationsLoading } =
  userInvitationsSlice.actions;
export default userInvitationsSlice.reducer;
