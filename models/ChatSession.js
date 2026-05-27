const { getSupabase } = require('../config/db');

class ChatSession {
  static get table() { return 'chat_sessions'; }
}

module.exports = ChatSession;