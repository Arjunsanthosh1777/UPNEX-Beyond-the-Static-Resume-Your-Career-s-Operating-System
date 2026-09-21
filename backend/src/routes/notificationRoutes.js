import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { listNotifications, markNotificationsRead, unreadCount } from "../controllers/notificationController.js";

const router = Router();
router.use(requireAuth);
router.get("/", listNotifications);
router.get("/unread-count", unreadCount);
router.post("/read", markNotificationsRead);
export default router;