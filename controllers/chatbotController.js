import { ChatSession } from "../models/ChatSession.js";
import logger from "../utils/logger.js";
import { generateComplaintReply, isChatConfigured } from "../utils/openaiClient.js";

const MAX_STORED_MESSAGES = 40;

const trimMessages = (messages = []) => {
  if (messages.length <= MAX_STORED_MESSAGES) {
    return messages;
  }
  return messages.slice(-MAX_STORED_MESSAGES);
};

const ensureContent = (content) => (content || "").trim();

const ensureSessionOwnership = async (sessionId, userId) => {
  const session = await ChatSession.findOne({ _id: sessionId, user: userId });
  return session;
};

const appendAssistantResponse = (session, reply) => {
  session.messages.push({ role: "assistant", content: reply });
  session.lastAssistantResponseAt = new Date();
  session.messages = trimMessages(session.messages);
};

export const createChatSession = async (req, res) => {
  const { topic, message } = req.body;
  try {
    if (!isChatConfigured()) {
      return res.status(503).json({ success: false, message: "Chat assistant is temporarily unavailable. Please try again later." });
    }
    const session = new ChatSession({
      user: req.user._id,
      topic: ensureContent(topic),
      messages: [],
    });

    const initialMessage = ensureContent(message);
    if (initialMessage) {
      session.messages.push({ role: "user", content: initialMessage });
      const reply = await generateComplaintReply(session.messages, { userId: req.user._id, sessionId: session._id });
      appendAssistantResponse(session, reply);
    }

    await session.save();
    res.status(201).json({ success: true, session });
  } catch (error) {
    const isDisabled = error?.code === 'CHAT_DISABLED' || /OPENAI_API_KEY/i.test(error?.message || '');
    logger.error("Failed to create chat session", { error: error.message });
    if (isDisabled) {
      return res.status(503).json({ success: false, message: "Chat assistant is temporarily unavailable. Please try again later." });
    }
    res.status(500).json({ success: false, message: "Unable to create chat session" });
  }
};

export const listChatSessions = async (req, res) => {
  try {
    const sessions = await ChatSession.find({ user: req.user._id })
      .sort({ updatedAt: -1 })
      .limit(10);
    res.json({ success: true, sessions });
  } catch (error) {
    logger.error("Failed to list chat sessions", { error: error.message });
    res.status(500).json({ success: false, message: "Unable to load chat sessions" });
  }
};

export const getChatSession = async (req, res) => {
  try {
    const session = await ensureSessionOwnership(req.params.id, req.user._id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Chat session not found" });
    }
    res.json({ success: true, session });
  } catch (error) {
    logger.error("Failed to get chat session", { error: error.message });
    res.status(500).json({ success: false, message: "Unable to load chat session" });
  }
};

export const sendChatMessage = async (req, res) => {
  const { message } = req.body;
  const content = ensureContent(message);
  if (!content) {
    return res.status(400).json({ success: false, message: "Message content is required" });
  }

  try {
    if (!isChatConfigured()) {
      return res.status(503).json({ success: false, message: "Chat assistant is temporarily unavailable. Please try again later." });
    }
    const session = await ensureSessionOwnership(req.params.id, req.user._id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Chat session not found" });
    }

    session.messages.push({ role: "user", content });
    session.messages = trimMessages(session.messages);

    const reply = await generateComplaintReply(session.messages, { userId: req.user._id, sessionId: session._id });
    appendAssistantResponse(session, reply);
    await session.save();

    res.json({ success: true, session });
  } catch (error) {
    const isDisabled = error?.code === 'CHAT_DISABLED' || /OPENAI_API_KEY/i.test(error?.message || '');
    logger.error("Failed to send chat message", { error: error.message });
    if (isDisabled) {
      return res.status(503).json({ success: false, message: "Chat assistant is temporarily unavailable. Please try again later." });
    }
    res.status(500).json({ success: false, message: "Unable to process your message" });
  }
};

export const resolveChatSession = async (req, res) => {
  try {
    const session = await ensureSessionOwnership(req.params.id, req.user._id);
    if (!session) {
      return res.status(404).json({ success: false, message: "Chat session not found" });
    }
    session.status = "resolved";
    await session.save();
    res.json({ success: true, session });
  } catch (error) {
    logger.error("Failed to resolve chat session", { error: error.message });
    res.status(500).json({ success: false, message: "Unable to resolve chat session" });
  }
};
