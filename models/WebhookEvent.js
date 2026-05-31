const mongoose = require('mongoose');

const webhookEventSchema = new mongoose.Schema(
  {
    eventId: { type: String, required: true, unique: true, index: true },
    provider: { type: String, default: '' },
    eventType: { type: String, default: '' },
    status: { type: String, default: 'received' },
    handled: { type: Boolean, default: false },
    processedAt: { type: Date, default: null },
    reference: { type: String, default: '' },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', default: null },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    payload: { type: mongoose.Schema.Types.Mixed, default: null },
    error: { type: String, default: '' },
  },
  { timestamps: true }
);

const WebhookEvent = mongoose.models.WebhookEvent || mongoose.model('WebhookEvent', webhookEventSchema);

module.exports = WebhookEvent;
module.exports.WebhookEvent = WebhookEvent;