import { Router } from "express";
import { getPublicProfile, getVerifyInfo, recordEvent } from "../controllers/publicController.js";

// Public, unauthenticated endpoints. /verify/:verificationId MUST be declared
// before /:username so "verify" never resolves to a user profile lookup.
const router = Router();
router.get("/verify/:verificationId", getVerifyInfo);
router.get("/:username", getPublicProfile);
router.post("/:username/event", recordEvent);
export default router;