import OpenAI from "openai";
import logger from "./logger.js";

export const isChatConfigured = () => !!process.env.OPENAI_API_KEY;

const ensureApiKey = () => {
  if (!isChatConfigured()) {
    throw new Error("OPENAI_API_KEY is not configured");
  }
};

let openaiInstance;

export const getOpenAIClient = () => {
  if (!openaiInstance) {
    ensureApiKey();
    openaiInstance = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  }
  return openaiInstance;
};

const DEFAULT_MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini";
const SYSTEM_PROMPT = `You are Raddazle's helpful customer care assistant. You help customers with order complaints, shipping issues, and product questions. Always respond in a friendly, empathetic tone, collect relevant details, and suggest next steps. Keep replies concise (under 120 words) and offer to escalate to human support when necessary.`;

export const generateComplaintReply = async (conversation) => {
  // Guard for missing API key
  if (!isChatConfigured()) {
    const err = new Error("Chat is not configured");
    err.code = "CHAT_DISABLED";
    throw err;
  }
  const client = getOpenAIClient();
  const limitedHistory = conversation.slice(-12);
  try {
    const completion = await client.chat.completions.create({
      model: DEFAULT_MODEL,
      temperature: 0.6,
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        ...limitedHistory.map((message) => ({
          role: message.role,
          content: message.content,
        })),
      ],
    });

    const assistantMessage = completion.choices?.[0]?.message?.content?.trim();
    if (!assistantMessage) {
      throw new Error("OpenAI returned an empty response");
    }
    return assistantMessage;
  } catch (error) {
    logger.error("OpenAI error", { error: error.message });
    throw error;
  }
};
