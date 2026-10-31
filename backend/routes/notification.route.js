import express from "express";
import isAuthenticated from "../middlewares/isAuthenticated.js";
import {
    getUserNotifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
    clearAllNotifications
} from "../controllers/notification.controller.js";

const router = express.Router();

router.route("/get").get(isAuthenticated, getUserNotifications);
router.route("/read-all").put(isAuthenticated, markAllNotificationsRead);
router.route("/:id/read").put(isAuthenticated, markNotificationRead);
router.route("/:id").delete(isAuthenticated, deleteNotification);
router.route("/clear/all").delete(isAuthenticated, clearAllNotifications);

export default router;