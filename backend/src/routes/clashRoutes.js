import { Router } from "express";
import multer from "multer";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  abandonGame,
  answerQuestion,
  createGame,
  getGame,
  joinGame,
  leaderboard,
  setGameQuestions,
  startGame
} from "../controllers/clashController.js";
import { importQuizPdf } from "../controllers/quizPdfController.js";

// Question-paper uploads are buffered in memory; only validated bytes are used.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024, files: 1 }
});

const router = Router();
router.use(requireAuth);

router.post("/quizpdf", upload.single("file"), importQuizPdf);
router.post("/games", createGame);
router.post("/games/join", joinGame);
router.post("/games/:id/start", startGame);
router.post("/games/:id/questions", setGameQuestions);
router.post("/games/:id/answer", answerQuestion);
router.post("/games/:id/abandon", abandonGame);
router.get("/games/:id", getGame);
router.get("/leaderboard", leaderboard);

export default router;