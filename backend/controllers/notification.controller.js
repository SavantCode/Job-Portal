import { Notification } from "../models/notification.model.js";

export const getUserNotifications = async (req, res) => {
    try {
        const notifications = await Notification.find({ recipient: req.id })
            .populate({
                path: "job",
                populate: { path: "company" }
            })
            .populate("application")
            .sort({ createdAt: -1 });

        return res.status(200).json({
            success: true,
            notifications
        });
    } catch (error) {
        console.error("[Get Notifications Error]:", error);
        return res.status(500).json({
            success: false,
            message: "Failed to fetch notifications."
        });
    }
};

export const markNotificationRead = async (req, res) => {
    try {
        const { id } = req.params;
        const notification = await Notification.findOneAndUpdate(
            { _id: id, recipient: req.id },
            { isRead: true },
            { new: true }
        );
        if (!notification) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }
        return res.status(200).json({
            success: true,
            notification
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to mark notification read." });
    }
};

export const markAllNotificationsRead = async (req, res) => {
    try {
        await Notification.updateMany({ recipient: req.id, isRead: false }, { isRead: true });
        return res.status(200).json({
            success: true,
            message: "All notifications marked as read."
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to mark notifications read." });
    }
};

export const deleteNotification = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Notification.findOneAndDelete({ _id: id, recipient: req.id });
        if (!deleted) {
            return res.status(404).json({ success: false, message: "Notification not found." });
        }
        return res.status(200).json({
            success: true,
            message: "Notification deleted.",
            id
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to delete notification." });
    }
};

export const clearAllNotifications = async (req, res) => {
    try {
        await Notification.deleteMany({ recipient: req.id });
        return res.status(200).json({
            success: true,
            message: "All notifications cleared."
        });
    } catch (error) {
        return res.status(500).json({ success: false, message: "Failed to clear notifications." });
    }
};