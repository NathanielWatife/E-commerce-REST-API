const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    name: { type: String, required: true },
    quantity: { type: Number, required: true, min: 1 },
    image: { type: String, default: '' },
    price: { type: Number, required: true, default: 0 },
  },
  { _id: true }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: { type: String, required: true },
    note: { type: String, default: '' },
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    updatedAt: { type: Date, default: Date.now },
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    orderItems: { type: [orderItemSchema], default: [] },
    shippingAddress: { type: mongoose.Schema.Types.Mixed, default: {} },
    billingAddress: { type: mongoose.Schema.Types.Mixed, default: {} },
    paymentMethod: { type: String, default: 'Paystack' },
    paymentResult: { type: mongoose.Schema.Types.Mixed, default: {} },
    itemsPrice: { type: Number, required: true, default: 0 },
    taxPrice: { type: Number, required: true, default: 0 },
    shippingPrice: { type: Number, required: true, default: 0 },
    totalPrice: { type: Number, required: true, default: 0 },
    isPaid: { type: Boolean, default: false },
    paidAt: { type: Date, default: null },
    isDelivered: { type: Boolean, default: false },
    deliveredAt: { type: Date, default: null },
    status: {
      type: String,
      enum: ['pending', 'awaiting_payment_review', 'processing', 'shipped', 'delivered', 'cancelled'],
      default: 'pending',
    },
    statusHistory: { type: [statusHistorySchema], default: [] },
    shippedAt: { type: Date, default: null },
    shippingCarrier: { type: String, default: '' },
    trackingNumber: { type: String, default: '' },
    trackingUrl: { type: String, default: '' },
    estimatedDelivery: { type: Date, default: null },
  },
  { timestamps: true }
);

const Order = mongoose.models.Order || mongoose.model('Order', orderSchema);

module.exports = Order;
module.exports.Order = Order;