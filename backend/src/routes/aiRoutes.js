import { Router } from "express";
import { chat } from "../controllers/aiController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.post("/chat", requireAuth, chat);
export default router;