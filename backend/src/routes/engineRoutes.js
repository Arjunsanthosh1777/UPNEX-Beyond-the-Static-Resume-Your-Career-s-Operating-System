import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getEngineInsight } from "../controllers/engineController.js";

const router = Router();
router.use(requireAuth);

router.get("/", getEngineInsight);

export default router;