import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { NotificationDTO } from '../types/notification';
import { getNotifications, readNotification, readAllNotifications } from '../api/notifications';

export const fetchNotifications = createAsyncThunk<
  NotificationDTO[],
  void,
  { rejectValue: string }
>('notifications/fetch', async (_, { rejectWithValue }) => {
  try {
    const res = await getNotifications();
    return res.data;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? 'Failed to load notifications');
  }
});

export const markNotificationRead = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>('notifications/readOne', async (id, { rejectWithValue }) => {
  try {
    await readNotification(id);
    return id;
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? 'Failed to mark read');
  }
});

export const markAllNotificationsRead = createAsyncThunk<
  void,
  void,
  { rejectValue: string }
>('notifications/readAll', async (_, { rejectWithValue }) => {
  try {
    await readAllNotifications();
  } catch (e: unknown) {
    return rejectWithValue((e as { message?: string })?.message ?? 'Failed to mark all read');
  }
});

type NotificationsState = {
  items: NotificationDTO[];
  isLoading: boolean;
  error: string | null;
};

const initialState: NotificationsState = {
  items: [],
  isLoading: false,
  error: null,
};

const notificationsSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, { payload }) => {
        state.isLoading = false;
        state.items = payload;
        state.error = null;
      })
      .addCase(fetchNotifications.rejected, (state, { payload }) => {
        state.isLoading = false;
        state.error = payload ?? 'Failed to load notifications';
      });
    builder
      .addCase(markNotificationRead.fulfilled, (state, { payload }) => {
        const n = state.items.find((i) => i.id === payload);
        if (n) n.isRead = true;
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((n) => (n.isRead = true));
      });
  },
});

export default notificationsSlice.reducer;
