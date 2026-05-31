const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema(
  {
    role: { type: String, enum: ['user', 'assistant', 'system'], required: true },
    content: { type: String, required: true },
  },
  { timestamps: true }
);

const chatSessionSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
    topic: { type: String, default: '' },
    status: { type: String, enum: ['open', 'resolved'], default: 'open' },
    messages: { type: [chatMessageSchema], default: [] },
    lastAssistantResponseAt: { type: Date, default: null },
  },
  { timestamps: true }
);

const ChatSession = mongoose.models.ChatSession || mongoose.model('ChatSession', chatSessionSchema);

module.exports = ChatSession;
module.exports.ChatSession = ChatSession;