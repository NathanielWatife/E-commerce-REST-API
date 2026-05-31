const mongoose = require('mongoose');

const cartItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
    quantity: { type: Number, required: true, min: 1, default: 1 },
    price: { type: Number, required: true, default: 0 },
  },
  { timestamps: true }
);

const cartSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },
    items: { type: [cartItemSchema], default: [] },
    totalPrice: { type: Number, default: 0 },
  },
  { timestamps: true }
);

const Cart = mongoose.models.Cart || mongoose.model('Cart', cartSchema);

module.exports = Cart;
module.exports.Cart = Cart;