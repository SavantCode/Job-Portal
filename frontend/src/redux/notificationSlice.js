import { createSlice } from "@reduxjs/toolkit";

const notificationSlice = createSlice({
    name: "notification",
    initialState: {
        notifications: []
    },
    reducers: {
        setNotifications: (state, action) => {
            state.notifications = action.payload || [];
        },
        markOneReadInStore: (state, action) => {
            state.notifications = state.notifications.map(n =>
                n._id === action.payload ? { ...n, isRead: true } : n
            );
        },
        markAllReadInStore: (state) => {
            state.notifications = state.notifications.map(n => ({ ...n, isRead: true }));
        },
        removeNotificationFromStore: (state, action) => {
            state.notifications = state.notifications.filter(n => n._id !== action.payload);
        },
        clearNotificationsInStore: (state) => {
            state.notifications = [];
        }
    }
});

export const {
    setNotifications,
    markOneReadInStore,
    markAllReadInStore,
    removeNotificationFromStore,
    clearNotificationsInStore
} = notificationSlice.actions;

export default notificationSlice.reducer;