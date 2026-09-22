import { Router } from "express";
import multer from "multer";
import {
  addAchievement,
  addDocument,
  addExperience,
  addLearning,
  addMark,
  addProject,
  analyseDocument,
  batchSaveMarks,
  generateAbout,
  generateHeadlines,
  getAnalytics,
  getDocumentAccess,
  getProfile,
  listMarks,
  removeAchievement,
  removeCover,
  removeDocument,
  removeExperience,
  removeLearning,
  removeMark,
  removePhoto,
  removeProject,
  reorderExperience,
  updateAchievement,
  updateDocument,
  updateExperience,
  updateLearning,
  updatePreferences,
  updateProfile,
  updateProject,
  updateUsername,
  uploadCover,
  uploadPhoto
} from "../controllers/profileController.js";
import { requireAuth } from "../middleware/authMiddleware.js";
import { getCoach, getPlanner, updatePlanner } from "../controllers/studyController.js";

// Files are buffered in memory (10 MB cap, one file) and written to disk by
// the controller only after validation; nothing ever lands in a public folder.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

const router = Router();
router.use(requireAuth);
router.get("/", getProfile);
router.patch("/identity", updateProfile);
router.patch("/preferences", updatePreferences);
router.patch("/username", updateUsername);
router.post("/documents", upload.single("file"), addDocument);
router.patch("/documents/:id", updateDocument);
router.delete("/documents/:id", removeDocument);
router.post("/documents/:id/access", getDocumentAccess);
router.post("/documents/:id/analyse", analyseDocument);
router.get("/marks", listMarks);
router.post("/marks", addMark);
router.delete("/marks/:id", removeMark);
router.post("/marks/batch", batchSaveMarks);
router.post("/projects", addProject);
router.patch("/projects/:id", updateProject);
router.delete("/projects/:id", removeProject);

// Photo / cover
router.post("/photo", upload.single("file"), uploadPhoto);
router.delete("/photo", removePhoto);
router.post("/cover", upload.single("file"), uploadCover);
router.delete("/cover", removeCover);

// Experience
router.post("/experience", addExperience);
router.patch("/experience/:id", updateExperience);
router.delete("/experience/:id", removeExperience);
router.patch("/experience", reorderExperience);

// Learning
router.post("/learning", addLearning);
router.patch("/learning/:id", updateLearning);
router.delete("/learning/:id", removeLearning);

// Achievements
router.post("/achievements", addAchievement);
router.patch("/achievements/:id", updateAchievement);
router.delete("/achievements/:id", removeAchievement);

// Analytics + AI helpers
router.get("/analytics", getAnalytics);
router.post("/ai/headline", generateHeadlines);
router.post("/ai/about", generateAbout);

// Smart education: subject coach + weekly study planner
router.get("/coach", getCoach);
router.get("/study-planner", getPlanner);
router.patch("/study-planner", updatePlanner);

export default router;