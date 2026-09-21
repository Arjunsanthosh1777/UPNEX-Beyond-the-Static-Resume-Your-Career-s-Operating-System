import { Router } from "express";
import { requireAuth, requireRole } from "../middleware/authMiddleware.js";
import { approveDocument, listPendingDocuments, listUsers } from "../controllers/adminController.js";

// Staff-only surfaces: the review queue that turns pending uploads into verified
// credentials, plus a lightweight roster.
const router = Router();
router.use(requireAuth, requireRole("ADMIN", "TEACHER"));
router.get("/documents/pending", listPendingDocuments);
router.post("/documents/:id/approve", approveDocument);
router.get("/users", listUsers);
export default router;