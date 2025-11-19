const { Order } = require("../models/Order.js")
const { Cart } = require("../models/Cart.js")
const { Product } = require("../models/Product.js")
const { User } = require("../models/User.js")
const { InventoryHistory } = require("../models/InventoryHistory.js")
const { validationResult } = require("express-validator")
const logger = require("../utils/logger.js")
const {
  sendEmail,
  generateOrderConfirmationEmail,
  generateOrderStatusUpdateEmail,
  generatePaymentConfirmationEmail,
} = require("../utils/sendEmail.js")

// @desc    Create new order
const createOrder = async (req, res) => {
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

    // Update product stock and record inventory history
    for (const item of cart.items) {
      const product = await Product.findById(item.product._id)
      const prev = product.countInStock
      product.countInStock -= item.quantity
      await product.save()
      await InventoryHistory.create({
        product: product._id,
        user: req.user._id,
        order: createdOrder._id,
        change: -Math.abs(item.quantity),
        reason: "order-placement",
        previousStock: prev,
        newStock: product.countInStock,
        note: `Order ${createdOrder._id}: -${item.quantity} for ${product.name}`,
      })
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
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Get order by ID
const getOrderById = async (req, res) => {
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
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Update order to paid
const updateOrderToPaid = async (req, res) => {
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

    // derive payment payload (allow mock data when gateway response is absent)
    const paymentId = req.body.id || `mock_txn_${Date.now()}`
    const paymentStatus = req.body.status || "COMPLETED"
    const paymentUpdateTime = req.body.update_time || new Date().toISOString()
    const paymentEmail = req.body.email_address || req.user.email

    // Update order
    order.isPaid = true
    order.paidAt = Date.now()
    order.paymentResult = {
      id: paymentId,
      status: paymentStatus,
      update_time: paymentUpdateTime,
      email_address: paymentEmail,
    }

    const updatedOrder = await order.save()

    // Get user details for email
    const user = await User.findById(order.user)

    // Send payment confirmation email
    const paymentInfo = {
      _id: paymentId,
      paymentMethod: order.paymentMethod,
      amount: order.totalPrice,
      currency: "NGN",
      createdAt: new Date(paymentUpdateTime),
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
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Update order to delivered
const updateOrderToDelivered = async (req, res) => {
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
    order.statusHistory.push({ status: "delivered", updatedBy: req.user._id })

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
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Get logged in user orders

const getMyOrders = async (req, res) => {
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
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Get all orders

const getOrders = async (req, res) => {
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
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Update order status

const updateOrderStatus = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const { status, note } = req.body

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
    order.statusHistory.push({ status, note, updatedBy: req.user._id })

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
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Cancel order
const cancelOrder = async (req, res) => {
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
    order.statusHistory.push({ status: "cancelled", updatedBy: req.user._id })

    // Restore product stock
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product)
      if (product) {
        const prev = product.countInStock
        product.countInStock += item.quantity
        await product.save()
        await InventoryHistory.create({
          product: product._id,
          user: req.user._id,
          order: order._id,
          change: Math.abs(item.quantity),
          reason: "order-cancellation",
          previousStock: prev,
          newStock: product.countInStock,
          note: `Order ${order._id} cancelled: +${item.quantity} for ${product.name}`,
        })
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
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}


// tracking of order

// @desc    Mark order as shipped and add tracking info
const shipOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)

    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }

    const previousStatus = order.status
    const { shippingCarrier, trackingNumber, trackingUrl, estimatedDelivery, note } = req.body

    order.status = "shipped"
    order.shippedAt = new Date()
    order.shippingCarrier = shippingCarrier || order.shippingCarrier
    order.trackingNumber = trackingNumber || order.trackingNumber
    order.trackingUrl = trackingUrl || order.trackingUrl
    order.estimatedDelivery = estimatedDelivery ? new Date(estimatedDelivery) : order.estimatedDelivery
    order.statusHistory.push({ status: "shipped", note, updatedBy: req.user._id })

    const updatedOrder = await order.save()

    const user = await User.findById(order.user)
    const statusUpdateEmailContent = generateOrderStatusUpdateEmail(user.name, updatedOrder, previousStatus)
    await sendEmail({
      email: user.email,
      subject: `Your Order #${order._id} Has Shipped`,
      message: statusUpdateEmailContent,
    })

    return res.status(200).json({ success: true, order: updatedOrder })
  } catch (error) {
    logger.error("Ship order error:", error)
    return res.status(500).json({ success: false, message: "Server error", error: process.env.NODE_ENV ? error.message : undefined })
  }
}

module.exports = {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  shipOrder,
}