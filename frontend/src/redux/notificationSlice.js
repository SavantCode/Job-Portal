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
        prependNotificationInStore: (state, action) => {
            const incoming = action.payload;
            if (!incoming || !incoming._id) return;
            const exists = state.notifications.some((n) => n._id === incoming._id);
            if (!exists) {
                state.notifications = [incoming, ...state.notifications];
            }
        },
        markOneReadInStore: (state, action) => {
            state.notifications = state.notifications.map((n) =>
                n._id === action.payload ? { ...n, isRead: true } : n
            );
        },
        markAllReadInStore: (state) => {
            state.notifications = state.notifications.map((n) => ({ ...n, isRead: true }));
        },
        removeNotificationFromStore: (state, action) => {
            state.notifications = state.notifications.filter((n) => n._id !== action.payload);
        },
        clearNotificationsInStore: (state) => {
            state.notifications = [];
        }
    }
});

export const {
    setNotifications,
    prependNotificationInStore,
    markOneReadInStore,
    markAllReadInStore,
    removeNotificationFromStore,
    clearNotificationsInStore
} = notificationSlice.actions;

export default notificationSlice.reducer;