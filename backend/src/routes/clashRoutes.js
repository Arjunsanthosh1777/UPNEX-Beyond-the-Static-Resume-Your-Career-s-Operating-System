import { Router } from "express";
import { requireAuth } from "../middleware/authMiddleware.js";
import {
  abandonGame,
  answerQuestion,
  createGame,
  getGame,
  joinGame,
  leaderboard,
  startGame
} from "../controllers/clashController.js";

const router = Router();
router.use(requireAuth);

router.post("/games", createGame);
router.post("/games/join", joinGame);
router.post("/games/:id/start", startGame);
router.post("/games/:id/answer", answerQuestion);
router.post("/games/:id/abandon", abandonGame);
router.get("/games/:id", getGame);
router.get("/leaderboard", leaderboard);

export default router;