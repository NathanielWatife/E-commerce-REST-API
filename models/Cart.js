import mongoose from "mongoose";

const cartItemSchema = new mongoose.Schema({
	product: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "Product",
		required: true,
	},

	quantity: {
		type: Number,
		default: 1,
		min: 1,
		required: true
	},

	price: {
		type: Number,
		required: true
	}
});


const cartSchema = new mongoose.Schema({
	user: {
		type: mongoose.Schema.Types.ObjectId,
		ref: "User",
		required:  true
	},

	items: [cartItemSchema],

	totalPrice: {
		type: Number,
		required: true,
		default: 0
	},
}, { timestamps: true },);

export const Cart =  mongoose.model("Cart", cartSchema);