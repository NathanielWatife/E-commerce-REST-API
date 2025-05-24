import { Order } from "../models/Order.js"
import { Cart } from "../models/Cart.js"
import { Product } from "../models/Product.js"
import { User } from "../models/User.js"
import { validationResult } from "express-validator"
import { 
    sendEmail,
    generateOrderConfirmationEmail,
    generateOrderStatusUpdateEmail,
    generatePaymentConfirmationEmail
 } from "../utils/sendEmail.js"


// create new order
export const createOrder = async (req, res) => {
    const errors = validateResult(req)
    if (!errors.isEmpty()) {
        return res.status(400).json(
            {
                success: false,
                errors: errors.array()
            }
        )
    }

    try {
        const { shippingAddress, paymentMethod } = req.body
        // get user cart
        const cart = await Cart.findone({
            user: req.user._id
        }).populate("items.product")

        if (!cart || cart.items.length === 0) {
            return res.status(400).json({
                success: false,
                message: "No item in cart",
            })
        }

        // check if all items are in stock
        for (const item of cart.items) {
            const product = item.product
            if (product.countInStock < item.quantity) {
                return res.status(400).json({
                    success: false,
                    message: `${product.name} is out of stock. Only ${product.countInStock} available`
                })
            }
        }

        // calculate order items
        const orderItems = cart.items.map((item) => {
            return {
                product: item.product_id,
                name: item.product.name,
                quantity: item.quantity,
                image: item.product.image,
                price: item.price,
            }
        })

        // create order
        const order = new Order({
            user: req.user._id,
            orderItems,
            shippingAddress,
            paymentMethod,
            itemsPrice,
            taxPrice,
            shippingPrice,
            totalPrice,
        })

        const createOrder = await order.save()

        // update product stock
        for (const item of cart.items) {
            const product = await Product.findById(item.product._id)
            product.countInStock -= item.quantity
            await product.save()
        }

        // clear cart after order is created
        cart.items = []
        cart.totalPrice = 0
        await cart.save()

        // get user details for email
        const user = await User.findById(req.user._id)
        
        // send order confirmation email
        const orderEmailContent = generateOrderConfirmationEmail(user.name.createOrder)
        await sendEmail({
            email: user.email,
            subject: `Order confirmation #${createOrder._id}`,
            message: orderEmailContent,
        })

        return res.status(201).json({
            success: true,
            order: createdOrder,
        })
    } catch (error) {
        console.error("Create order error":, error)
        return res.status(500).json({
            success: false,
            message: "Server error",
            error: process.env.NODE_ENV === "development" ? error.message: undefined
        })
    }
}


// 