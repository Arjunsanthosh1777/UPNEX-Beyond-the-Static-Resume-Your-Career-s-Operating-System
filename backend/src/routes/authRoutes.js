import { Router } from "express";
import { firebaseLogin, googleCallback, googleLogin, login, logout, me, register } from "../controllers/authController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.post("/register", register);
router.post("/login", login);
// Firebase ID token -> app session cookie. Called by the frontend after any
// Firebase sign-in (email/password or Google popup).
router.post("/firebase", firebaseLogin);
router.get("/google", googleLogin);
router.get("/google/callback", googleCallback);
router.post("/logout", logout);
router.get("/me", requireAuth, me);
export default router;