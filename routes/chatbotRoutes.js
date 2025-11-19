const express = require("express");
const { protect } = require("../middleware/authMiddleware.js");
const { rateLimitChatbot } = require("../middleware/rateLimiter.js");
const {
  createChatSession,
  getChatSession,
  listChatSessions,
  resolveChatSession,
  sendChatMessage,
} = require("../controllers/chatbotController.js");

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

module.exports = router;
