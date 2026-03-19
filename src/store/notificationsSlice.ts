import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import i18n from '../i18n';
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
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.loadNotifications'));
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
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.markRead'));
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
    return rejectWithValue((e as { message?: string })?.message ?? i18n.t('app.errors.markAllRead'));
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
        state.error = payload ?? i18n.t('app.errors.loadNotifications');
      });
    builder
      .addCase(markNotificationRead.fulfilled, (state, { payload }) => {
        const n = state.items.find((i) => i.id === payload);
        if (n) n.isRead = true;
      })
      .addCase(markAllNotificationsRead.pending, (state) => {
        state.items.forEach((n) => (n.isRead = true));
      })
      .addCase(markAllNotificationsRead.fulfilled, (state) => {
        state.items.forEach((n) => (n.isRead = true));
      });
  },
});

export default notificationsSlice.reducer;
