import { Router } from "express";
import { streamFile, streamMedia } from "../controllers/storageController.js";

const router = Router();
router.get("/file", streamFile);
router.get("/media/:userId/:filename", streamMedia);

export default router;