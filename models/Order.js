import mongoose from "mongoose"

const orderItemSchema = new mongoose.Schema({
    product: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Product",
        required: true,
    },
    name: {
        type: String,
        required: true,
    },
    quantity: {
        type: Number,
        required: true,
        min: 1,
    },
    image: {
        type: String,
        required: true,
    },
    price: {
        type: Number,
        required: true,
    },
})


const orderSchema = new mongoose.Schema(
    {
        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        orderItems: [orderItemSchema],
        shippingAddress: {
            street: { type: String, required: true },
            city: { type: String, required: true },
            state: { type: String, required: true },
            postalCode: { type: String, required: true },
            country: { type: String, required: true },
        },
        paymentMethod: {
            type: String,
            enum: ["card", "bank-transfer", "ussd", "crypto"],
            required: true,
        },
        paymentResult: {
            id: { type: String },
            status: { type: String },
            update_time: { type: String },
            email_address: { type: String },
        },
        itemsPrice: { type: Number, required: true, default: 0.0 },
        taxPrice: { type: Number, required: true, default: 0.0 },
        shippingPrice: { type: Number, required: true, default: 0.0 },
        totalPrice: { type: Number, required: true, default: 0.0 },
        isPaid: { type: Boolean, required: true, default: false },
        paidAt: { type: Date },
        isDelivered: { type: Boolean, required: true, default: false },
        deliveredAt: { type: Date },
        // shipping/tracking details
        shippingCarrier: { type: String },
        trackingNumber: { type: String },
        trackingUrl: { type: String },
        shippedAt: { type: Date },
        estimatedDelivery: { type: Date },
        status: {
            type: String,
            required: true,
            enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
            default: "pending",
        },
        statusHistory: [
            {
                status: {
                    type: String,
                    enum: ["pending", "processing", "shipped", "delivered", "cancelled"],
                },
                note: { type: String },
                updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
                updatedAt: { type: Date, default: Date.now },
            },
        ],
    },
    { timestamps: true },
)


export const Order = mongoose.model("Order", orderSchema)