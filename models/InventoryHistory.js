const mongoose = require('mongoose');

const inventoryHistorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true, index: true },
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', default: null },
    previousStock: { type: Number, required: true, default: 0 },
    change: { type: Number, required: true, default: 0 },
    newStock: { type: Number, required: true, default: 0 },
    reason: { type: String, default: '' },
    actor: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
    note: { type: String, default: '' },
  },
  { timestamps: true }
);

const InventoryHistory = mongoose.models.InventoryHistory || mongoose.model('InventoryHistory', inventoryHistorySchema);

module.exports = InventoryHistory;
module.exports.InventoryHistory = InventoryHistory;