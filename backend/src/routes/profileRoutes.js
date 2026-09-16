import { Router } from "express";
import { addDocument, addMark, addProject, getProfile, updateProfile } from "../controllers/profileController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.use(requireAuth);
router.get("/", getProfile);
router.patch("/identity", updateProfile);
router.post("/documents", addDocument);
router.post("/marks", addMark);
router.post("/projects", addProject);

export default router;