const mongoose = require("mongoose")

const inventoryHistorySchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: "Product", required: true },
    user: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
    order: { type: mongoose.Schema.Types.ObjectId, ref: "Order" },
    change: { type: Number, required: true }, // positive for restock, negative for deduction
    reason: {
      type: String,
      enum: [
        "order-placement",
        "order-cancellation",
        "manual-adjustment",
        "return",
        "correction",
        "initial-stock",
      ],
      required: true,
    },
    previousStock: { type: Number },
    newStock: { type: Number },
    note: { type: String },
  },
  { timestamps: true },
)

const InventoryHistory = mongoose.model("InventoryHistory", inventoryHistorySchema)

module.exports = { InventoryHistory }
