const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    paymentMethod: { type: String, default: 'paystack' },
    transactionId: { type: String, required: true, unique: true },
    amount: { type: Number, required: true, default: 0 },
    currency: { type: String, default: 'NGN' },
    status: {
      type: String,
      enum: ['pending', 'completed', 'failed', 'refunded'],
      default: 'pending',
    },
    paymentDetails: { type: mongoose.Schema.Types.Mixed, default: {} },
  },
  { timestamps: true }
);


module.exports = mongoose.models.payment || mongoose.model('payment', paymentSchema);