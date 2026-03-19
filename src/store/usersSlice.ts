import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import i18n from '../i18n';
import type { UserReadDTO, UserFilteringModel, UserEditDTO } from '../types/user';
import { getUsers, editUser as apiEditUser, deleteUser as apiDeleteUser } from '../api/users';

export const fetchUsers = createAsyncThunk<
  { items: UserReadDTO[]; totalCount: number },
  void,
  { state: { users: { filteringModel: UserFilteringModel } }; rejectValue: string }
>(
  'users/fetch',
  async (_, { getState, rejectWithValue }) => {
    try {
      const res = await getUsers(getState().users.filteringModel);
      return { items: res.data.items, totalCount: res.data.totalCount };
    } catch (e: any) {
      return rejectWithValue(e?.message ?? i18n.t('app.errors.loadUsers'));
    }
  }
);

export const fetchMoreUsers = createAsyncThunk<
  { items: UserReadDTO[]; totalCount: number },
  void,
  {
    state: {
      users: {
        filteringModel: UserFilteringModel;
        items: UserReadDTO[];
        noMorePages: boolean;
      };
    };
    rejectValue: string;
  }
>(
  'users/fetchMore',
  async (_, { getState, rejectWithValue }) => {
    const { filteringModel, items, noMorePages } = getState().users;
    if (noMorePages) return rejectWithValue('no_more');
    try {
      const next = { ...filteringModel, pageNumber: filteringModel.pageNumber + 1 };
      const res = await getUsers(next);
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

export const editUser = createAsyncThunk<
  UserReadDTO,
  UserEditDTO,
  { rejectValue: string }
>('users/edit', async (model, { rejectWithValue }) => {
  try {
    const res = await apiEditUser(model);
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue(
      (e as { message?: string })?.message ?? i18n.t('app.errors.editUser')
    );
  }
});

export const deleteUser = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('users/delete', async (userId, { rejectWithValue }) => {
  try {
    await apiDeleteUser(userId);
    return userId;
  } catch (e: unknown) {
    return rejectWithValue(
      (e as { message?: string })?.message ?? i18n.t('app.errors.deleteUser')
    );
  }
});

type UsersState = {
  items: UserReadDTO[];
  isLoading: boolean;
  error: string | null;
  filteringModel: UserFilteringModel;
  totalCount: number;
  noMorePages: boolean;
};

const initialState: UsersState = {
  items: [],
  isLoading: false,
  error: null,
  filteringModel: { pageNumber: 0, pageSize: 20 },
  totalCount: 0,
  noMorePages: false,
};

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setUsersFilter: (state, { payload }: { payload: Partial<UserFilteringModel> }) => {
      state.filteringModel = { ...state.filteringModel, ...payload };
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
        state.error = null;
      })
      .addCase(fetchUsers.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? i18n.t('app.errors.loadUsers');
      });
    builder
      .addCase(fetchMoreUsers.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload.items;
        state.totalCount = payload.totalCount;
        const next = (payload as { nextPageNumber?: number }).nextPageNumber;
        if (typeof next === 'number') state.filteringModel.pageNumber = next;
        state.noMorePages =
          Math.ceil(payload.totalCount / state.filteringModel.pageSize) <=
          state.filteringModel.pageNumber + 1;
      })
      .addCase(fetchMoreUsers.rejected, (state, { payload }) => {
        state.isLoading = false;
        if (payload !== 'no_more') state.error = payload ?? null;
      });
    builder
      .addCase(editUser.fulfilled, (state, { payload }) => {
        const i = state.items.findIndex((u) => u.id === payload.id);
        if (i >= 0) state.items[i] = payload;
      })
      .addCase(deleteUser.fulfilled, (state, { payload }) => {
        state.items = state.items.filter((u) => u.id !== payload);
        state.totalCount = Math.max(0, state.totalCount - 1);
      });
  },
});

export const { setUsersFilter } = usersSlice.actions;
export default usersSlice.reducer;
