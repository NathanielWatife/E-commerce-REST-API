import mongoose from 'mongoose'

const webhookEventSchema = new mongoose.Schema(
  {
    provider: { type: String, enum: ['paystack', 'flutterwave'], required: true },
    eventId: { type: String, required: true, unique: true },
    signature: { type: String },
    reference: { type: String },
    payment: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment' },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    payload: { type: Object },
    raw: { type: String },
    handled: { type: Boolean, default: false },
    status: { type: String },
    error: { type: String },
    receivedAt: { type: Date, default: Date.now },
    processedAt: { type: Date },
  },
  { timestamps: true }
)

webhookEventSchema.index({ provider: 1, reference: 1 })

export const WebhookEvent = mongoose.model('WebhookEvent', webhookEventSchema)
