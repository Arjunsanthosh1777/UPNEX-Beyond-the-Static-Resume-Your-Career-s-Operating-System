import { Router } from "express";
import { googleCallback, googleLogin, login, logout, me, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
export default router;