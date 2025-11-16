import express from "express";
import { protect } from "../middleware/authMiddleware.js";
import { rateLimitChatbot } from "../middleware/rateLimiter.js";
import {
  createChatSession,
  getChatSession,
  listChatSessions,
  resolveChatSession,
  sendChatMessage,
} from "../controllers/chatbotController.js";

const router = express.Router();

router.use(protect);
router.use(rateLimitChatbot);

router.route("/sessions")
  .get(listChatSessions)
  .post(createChatSession);

router.route("/sessions/:id")
  .get(getChatSession);

router.post("/sessions/:id/messages", sendChatMessage);
router.post("/sessions/:id/resolve", resolveChatSession);

export default router;
