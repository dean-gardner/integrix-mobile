import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { UserDTO } from '../types/UserDTO';
import { apiSignIn, apiGetUserData, apiSignOut } from '../api/auth';
import type { SignInDTO } from '../types/SignInDTO';
import { getToken, setToken, removeToken } from '../storage/tokenStorage';

export const signIn = createAsyncThunk<
  UserDTO,
  SignInDTO,
  { rejectValue: string }
>('auth/signIn', async (dto, { rejectWithValue }) => {
  try {
    const res = await apiSignIn(dto);
    const token = typeof res.data === 'string' ? res.data : (res.data as unknown as string);
    await setToken(token);
    const userRes = await apiGetUserData();
    return userRes.data;
  } catch (e: any) {
    const status = e?.response?.status;
    if (status === 429) {
      return rejectWithValue('Too many failed attempts. Please try again later.');
    }
    const message =
      e?.response?.data != null && typeof e.response.data === 'object' && 'message' in e.response.data
        ? String((e.response.data as { message?: string }).message)
        : e?.message ?? 'Sign in failed';
    return rejectWithValue(message);
  }
});

export const loadUser = createAsyncThunk<UserDTO | null>(
  'auth/loadUser',
  async () => {
    const token = await getToken();
    if (!token) return null;
    const res = await apiGetUserData();
    return res.data;
  }
);

export const signOut = createAsyncThunk('auth/signOut', async () => {
  try {
    await apiSignOut();
  } catch {
    // ignore
  }
  await removeToken();
});

type AuthState = {
  user: UserDTO | null;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;
};

const initialState: AuthState = {
  user: null,
  isLoaded: false,
  isLoading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    setUnauthorized: (state) => {
      state.user = null;
      state.isLoaded = true;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(signIn.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(signIn.fulfilled, (state, { payload }) => {
        state.user = payload;
        state.isLoading = false;
        state.isLoaded = true;
        state.error = null;
      })
      .addCase(signIn.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? 'Sign in failed';
      })
      .addCase(loadUser.fulfilled, (state, { payload }) => {
        state.user = payload;
        state.isLoaded = true;
      })
      .addCase(loadUser.rejected, (state) => {
        state.user = null;
        state.isLoaded = true;
      })
      .addCase(signOut.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { clearError, setUnauthorized } = authSlice.actions;
export default authSlice.reducer;
