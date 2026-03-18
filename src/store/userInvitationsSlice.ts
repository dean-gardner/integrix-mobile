import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
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
    return rejectWithValue(getHttpErrorMessage(e, 'Failed to load invitations'));
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
    return rejectWithValue(getHttpErrorMessage(e, 'Failed to send invitation'));
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
    return rejectWithValue(getHttpErrorMessage(e, 'Failed to delete invitation'));
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
    return rejectWithValue(getHttpErrorMessage(e, 'Failed to resend invitation'));
  }
});

type UserInvitationsState = {
  items: UserInvitationReadDTO[];
  isLoading: boolean;
  error: string | null;
  filteringModel: UserInvitationFilteringModel;
  totalCount: number;
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
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUserInvitations.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUserInvitations.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.error = null;
      })
      .addCase(fetchUserInvitations.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? 'Failed to load invitations';
      });
  },
});

export const { setUserInvitationsFilter } = userInvitationsSlice.actions;
export default userInvitationsSlice.reducer;
