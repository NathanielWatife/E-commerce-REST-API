import { Order } from "../models/Order.js"
import { Cart } from "../models/Cart.js"
import { Product } from "../models/Product.js"
import { User } from "../models/User.js"
import { validationResult } from "express-validator"
import logger from "../utils/logger.js"
import {
  sendEmail,
  generateOrderConfirmationEmail,
  generateOrderStatusUpdateEmail,
  generatePaymentConfirmationEmail,
} from "../utils/sendEmail.js"

// @desc    Create new order
export const createOrder = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const { shippingAddress, paymentMethod } = req.body

    // Get user's cart
    const cart = await Cart.findOne({ user: req.user._id }).populate("items.product")
    if (!cart || cart.items.length === 0) {
      return res.status(400).json({
        success: false,
        message: "No items in cart",
      })
    }

    // Check if all items are in stock
    for (const item of cart.items) {
      const product = item.product
      if (product.countInStock < item.quantity) {
        return res.status(400).json({
          success: false,
          message: `${product.name} is out of stock. Only ${product.countInStock} available.`,
        })
      }
    }

    // Calculate prices
    const itemsPrice = cart.totalPrice
    const taxPrice = Number((0.15 * itemsPrice).toFixed(2))
    const shippingPrice = itemsPrice > 100 ? 0 : 10
    const totalPrice = Number((itemsPrice + taxPrice + shippingPrice).toFixed(2))

    // Create order items from cart
    const orderItems = cart.items.map((item) => {
      return {
        product: item.product._id,
        name: item.product.name,
        quantity: item.quantity,
        image: item.product.image,
        price: item.price,
      }
    })

    // Create order
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

    const createdOrder = await order.save()

    // Update product stock
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id)
      product.countInStock -= item.quantity
      await product.save()
    }

    // Clear cart after order is created
    cart.items = []
    cart.totalPrice = 0
    await cart.save()

    // Get user details for email
    const user = await User.findById(req.user._id)

    // Send order confirmation email
    const orderEmailContent = generateOrderConfirmationEmail(user.name, createdOrder)
    await sendEmail({
      email: user.email,
      subject: `Order Confirmation #${createdOrder._id}`,
      message: orderEmailContent,
    })

    return res.status(201).json({
      success: true,
      order: createdOrder,
    })
  } catch (error) {
    logger.error("Create order error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Get order by ID
export const getOrderById = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id).populate("user", "name email").populate({
      path: "orderItems.product",
      select: "name image",
    })

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Check if the order belongs to the user or if the user is an admin
    if (
      order.user._id.toString() !== req.user._id.toString() &&
      !["admin", "super-admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to access this order",
      })
    }

    return res.status(200).json({
      success: true,
      order,
    })
  } catch (error) {
    logger.error("Get order by ID error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Update order to paid
export const updateOrderToPaid = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Check if the order belongs to the user or if the user is an admin
    if (
      order.user.toString() !== req.user._id.toString() &&
      !["admin", "super-admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to update this order",
      })
    }

    // Update order
    order.isPaid = true
    order.paidAt = Date.now()
    order.paymentResult = {
      id: req.body.id,
      status: req.body.status,
      update_time: req.body.update_time,
      email_address: req.body.email_address,
    }

    const updatedOrder = await order.save()

    // Get user details for email
    const user = await User.findById(order.user)

    // Send payment confirmation email
    const paymentInfo = {
      _id: req.body.id,
      paymentMethod: order.paymentMethod,
      amount: order.totalPrice,
      currency: "USD",
      createdAt: new Date(),
    }

    const paymentEmailContent = generatePaymentConfirmationEmail(user.name, paymentInfo, updatedOrder)
    await sendEmail({
      email: user.email,
      subject: `Payment Confirmation for Order #${order._id}`,
      message: paymentEmailContent,
    })

    return res.status(200).json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    logger.error("Update order to paid error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Update order to delivered
export const updateOrderToDelivered = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Store previous status for email notification
    const previousStatus = order.status

    // Update order
    order.isDelivered = true
    order.deliveredAt = Date.now()
    order.status = "delivered"

    const updatedOrder = await order.save()

    // Get user details for email
    const user = await User.findById(order.user)

    // Send order status update email
    const statusUpdateEmailContent = generateOrderStatusUpdateEmail(user.name, updatedOrder, previousStatus)
    await sendEmail({
      email: user.email,
      subject: `Your Order #${order._id} Has Been Delivered`,
      message: statusUpdateEmailContent,
    })

    return res.status(200).json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    logger.error("Update order to delivered error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Get logged in user orders

export const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id }).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      orders,
    })
  } catch (error) {
    logger.error("Get my orders error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Get all orders

export const getOrders = async (req, res) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10
    const page = Number(req.query.page) || 1

    const count = await Order.countDocuments({})
    const orders = await Order.find({})
      .populate("user", "id name")
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))

    return res.status(200).json({
      success: true,
      orders,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    })
  } catch (error) {
    logger.error("Get all orders error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Update order status

export const updateOrderStatus = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const { status } = req.body

    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Store previous status for email notification
    const previousStatus = order.status

    // Update order status
    order.status = status

    // If status is delivered, update delivered status
    if (status === "delivered") {
      order.isDelivered = true
      order.deliveredAt = Date.now()
    }

    const updatedOrder = await order.save()

    // Get user details for email
    const user = await User.findById(order.user)

    // Send order status update email
    const statusUpdateEmailContent = generateOrderStatusUpdateEmail(user.name, updatedOrder, previousStatus)
    await sendEmail({
      email: user.email,
      subject: `Order Status Update for #${order._id}`,
      message: statusUpdateEmailContent,
    })

    return res.status(200).json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    logger.error("Update order status error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Cancel order
export const cancelOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Check if the order belongs to the user or if the user is an admin
    if (
      order.user.toString() !== req.user._id.toString() &&
      !["admin", "super-admin"].includes(req.user.role)
    ) {
      return res.status(403).json({
        success: false,
        message: "Not authorized to cancel this order",
      })
    }

    // Check if order can be cancelled
    if (order.isDelivered) {
      return res.status(400).json({
        success: false,
        message: "Cannot cancel an order that has been delivered",
      })
    }

    // Store previous status for email notification
    const previousStatus = order.status

    // Update order status
    order.status = "cancelled"

    // Restore product stock
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product)
      if (product) {
        product.countInStock += item.quantity
        await product.save()
      }
    }

    const updatedOrder = await order.save()

    // Get user details for email
    const user = await User.findById(order.user)

    // Send order cancellation email
    const cancellationEmailContent = generateOrderStatusUpdateEmail(user.name, updatedOrder, previousStatus)
    await sendEmail({
      email: user.email,
      subject: `Your Order #${order._id} Has Been Cancelled`,
      message: cancellationEmailContent,
    })

    return res.status(200).json({
      success: true,
      order: updatedOrder,
    })
  } catch (error) {
    logger.error("Cancel order error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}


// tracking of order