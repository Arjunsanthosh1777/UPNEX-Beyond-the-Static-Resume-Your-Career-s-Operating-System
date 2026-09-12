import { Router } from "express";
import { courseDetails, enroll, listCourses } from "../controllers/courseController.js";
import { requireAuth } from "../middleware/authMiddleware.js";

const router = Router();
router.get("/", listCourses);
router.get("/:id", courseDetails);
router.post("/:id/enroll", requireAuth, enroll);
export default router;