import { Cart } from "../models/Cart.js";
import { Product } from "../models/Product.js";
import { validationResult } from "express-validator";
import logger from "../utils/logger.js";


// get product in cart
export const getCart = async(req, res) => {
	try {
		let cart = await Cart.findOne({user: req.user._id}).populate({
			path: "items.product",
			select: "name image price countInStock",
		})

		if (!cart) {
			// create new cart

			cart = new Cart({
				user: req.user._id,
				items: [],
				totalPrice: 0
			})
			await cart.save()
		}

		return res.status(201).json({
			success: true,
			cart,
		})
	} catch (error) {
		logger.error("Get cart error:", error)
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV === "development" ? error.message: undefined
		})
	}
};


// add product to cart
export const addToCart = async (req, res) => {
	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		return res.status(400).json({
			success: false,
			errors: errors.array(),
		});
	}

	try {
		const { productId, quantity = 1 } = req.body

		// validate product
		const product = await Product.findById(productId)
		if (!product) {
			return res.status(404).json({
				success: false,
				message: "Product not found"
			});
		}

		// check if product is available in stock
		if(product.countInStock < quantity) {
			return res.status(400).json({
				success: false,
				message: "Product is out of stock"
			})
		}

		// find user cart or create a new one
		let cart = await Cart.findOne({ user: req.user._id })
		if (!cart) {
			cart = new Cart({
				user: req.user._id,
				items: [],
				totalPrice: 0,
			})
		}


		// check if product exist in cart
		const itemIndex = cart.items.findIndex((item) => item.product.toString() === productId)
		if (itemIndex > -1) {
			// product exist in cart we update
			cart.items[itemIndex].quantity += quantity
		} else {
			// Product does not exist in cart, we ad to cart
			cart.items.push({
				product: productId,
				quantity,
				price: product.price,
			})
		}

		// calculate total price
		cart.totalPrice = cart.items.reduce((total, item) => {
			return total + (item.price || 0) * item.quantity
		}, 0)
		await cart.save()

		// populate the product details for response
		await cart.populate({
			path: "items.product",
			select: "name image price countInStock",
		})

		return res.status(200).json({
			success: true,
			cart
		})
	} catch (error) {
		logger.error("Add to cart error:", error);
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV === "development" ? error.message : undefined
		});
	}
};


// update cart
export const updateCartItem = async (req, res) => {
	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		return res.status(400).json({
			success: false,
			errors: errors.array()
		});
	};


	try {
		const { quantity } = req.body;
		const { itemId } = req.params;

		// find th user cart
		const cart = await Cart.findOne({ user: req.user._id });
		if (!cart) {
			return res.status(404).json({
				success: false,
				message: "Cart not found"
			});
		}

		// find the item in the cart
		const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId)
		if (itemIndex === -1){
			return res.status(404).json({
				success: false,
				message: "Item not found in cart",
			});
		}

		// get product to check stock
		const product = await Product.findById(cart.items[itemIndex].product)
		if (!product) {
			return res.status(404).json({
				success: false,
				message: "Product not found"
			})
		}

		// check if requested quantity is available
		if (product.countInStock < quantity){
			return res.status(400).json({
				success: false,
				message: "Requested quantity not available in stock",
			})
		}

	// update the quantity
	cart.items[itemIndex].quantity = quantity

		// calcute the total price again
		cart.totalPrice = cart.items.reduce((total, item) => {
			return total + item.price * item.quantity
		}, 0)

		await cart.save();

		// populate product details for response
		await cart.populate({
			path: "items.product",
			select: "name image price countInStock",
		})


		return res.status(200).json({
			success: true,
			cart
		});
	} catch (error) {
		logger.error("Update cart item error:", error);
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV === "development" ? error.message : undefined
		});
	};
};



// remove item from cart 
export const removeFromCart = async (req, res) => {
	try {
		const { itemId } = req.params;

		// find user cart
		const cart = await Cart.findOne({ user: req.user._id })
		if (!cart) {
			return res.status(404).json({
				success: false,
				message: "Cart not found"
			});
		}

		// find the item in the cart
		const itemIndex = cart.items.findIndex((item) => item._id.toString() === itemId);
		if (itemIndex === -1) {
			return res.status(404).json({
				success: false,
				message: "Item not found in cart"
			});
		}
		// remove item from cart
		cart.items.splice(itemIndex, 1)
		// remove item from cart
		cart.totalPrice = cart.items.reduce((total, item) => {return total + item.price * item.quantity}, 0)
		await cart.save()

		// populate product details for response
		await cart.populate({
			path: "items.product",
			select: "name image price countInStock",
		});
		return res.status(200).json({
			success: true,
			cart
		});
	} catch (error) {
		logger.error("Remove from cart error:", error)
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV === "development" ? error.message : undefined
		});
	}
};



// clear user cart
export const clearCart = async (req, res) => {
	try {
		// get user cart
		const cart = await Cart.findOne({ user: req.user._id })
		if(!cart) {
			return res.status(404).json({
				success: false,
				message: "Cart not found"
			});
		}

		// clear user cart and total price
		cart.items = []
		cart.totalPrice = 0

		await cart.save()

		return res.status(200).json({
			success: true,
			message: "Your cart is cleared",
			cart,
		});
	} catch (error) {
		logger.error("Clear cart error:", error);
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV === "development" ? error.message: undefined
		});
	}
};

// sync cart from client (merge client items into server cart)
export const syncCart = async (req, res) => {
	try {
		const { items } = req.body;
		if (!Array.isArray(items)) {
			return res.status(400).json({ success: false, message: 'Items array is required' });
		}

		// find or create cart
		let cart = await Cart.findOne({ user: req.user._id });
		if (!cart) {
			cart = new Cart({ user: req.user._id, items: [], totalPrice: 0 });
		}

		// Merge items: for each incoming item (product, quantity) update or push
		for (const incoming of items) {
			const productId = incoming.product || incoming.productId || incoming.id;
			const quantity = Number(incoming.quantity) || 0;
			if (!productId || quantity <= 0) continue;

			const existingIndex = cart.items.findIndex(i => i.product.toString() === productId.toString());
			const product = await Product.findById(productId);
			if (!product) continue; // skip invalid products

			if (existingIndex > -1) {
				// replace quantity with max of both (or sum, choose merge strategy; here we take max)
				cart.items[existingIndex].quantity = Math.max(cart.items[existingIndex].quantity, quantity);
				cart.items[existingIndex].price = product.price;
			} else {
				cart.items.push({ product: productId, quantity, price: product.price });
			}
		}

		// recalc total
		cart.totalPrice = cart.items.reduce((total, item) => total + (item.price || 0) * item.quantity, 0);
		await cart.save();

		await cart.populate({ path: 'items.product', select: 'name image price countInStock' });

		return res.status(200).json({ success: true, cart });
	} catch (error) {
		logger.error('Sync cart error:', error);
		return res.status(500).json({ success: false, message: 'Server error', error: process.env.NODE_ENV === 'development' ? error.message : undefined });
	}
};