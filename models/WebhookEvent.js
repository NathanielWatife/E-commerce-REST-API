const { getSupabase } = require('../config/db');

class WebhookEvent {
  static get table() { return 'webhook_events'; }
}

module.exports = WebhookEvent;