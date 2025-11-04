import { Payment } from "../models/Payment.js"
import { Order } from "../models/Order.js"
import { User } from "../models/User.js"
import { validationResult } from "express-validator"
import { sendEmail, generatePaymentConfirmationEmail } from "../utils/sendEmail.js"
import logger from "../utils/logger.js"

// @desc    Process payment
// @route   POST /api/payments
// @access  Private
export const processPayment = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const { orderId, paymentMethod, paymentDetails } = req.body

    // Find the order
    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({
        success: false,
        message: "Order not found",
      })
    }

    // Check if order belongs to user
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      })
    }

    // Check if order is already paid
    if (order.isPaid) {
      return res.status(400).json({
        success: false,
        message: "Order is already paid",
      })
    }

    // Create payment record
    const payment = new Payment({
      user: req.user._id,
      order: orderId,
      paymentMethod,
      amount: order.totalPrice,
      currency: "USD", // Default currency, can be made dynamic
      status: "completed", // In a real app, this would be determined by the payment gateway
      transactionId: `TXN_${Date.now()}`, // In a real app, this would come from the payment gateway
      paymentDetails,
    })

    const createdPayment = await payment.save()

    // Update order payment status
    order.isPaid = true
    order.paidAt = Date.now()
    order.status = "processing"
    order.paymentResult = {
      id: createdPayment._id,
      status: "completed",
      update_time: new Date().toISOString(),
      email_address: req.user.email,
    }

    await order.save()

    // Get user details for email
    const user = await User.findById(req.user._id)

    // Send payment confirmation email
    const paymentEmailContent = generatePaymentConfirmationEmail(user.name, createdPayment, order)
    await sendEmail({
      email: user.email,
      subject: `Payment Confirmation for Order #${order._id}`,
      message: paymentEmailContent,
    })

    return res.status(200).json({
      success: true,
      payment: createdPayment,
    })
  } catch (error) {
    logger.error("Process payment error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Get payment by ID
// @route   GET /api/payments/:id
// @access  Private
export const getPaymentById = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      })
    }

    // Check if payment belongs to user or user is admin
    if (payment.user.toString() !== req.user._id.toString() && req.user.role !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Not authorized",
      })
    }

    return res.status(200).json({
      success: true,
      payment,
    })
  } catch (error) {
    logger.error("Get payment by ID error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Get user payments
// @route   GET /api/payments/mypayments
// @access  Private
export const getMyPayments = async (req, res) => {
  try {
    const payments = await Payment.find({ user: req.user._id }).sort({ createdAt: -1 })

    return res.status(200).json({
      success: true,
      payments,
    })
  } catch (error) {
    logger.error("Get my payments error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Get all payments (admin only)
// @route   GET /api/payments
// @access  Private/Admin
export const getAllPayments = async (req, res) => {
  try {
    const pageSize = Number(req.query.pageSize) || 10
    const page = Number(req.query.page) || 1

    const count = await Payment.countDocuments({})
    const payments = await Payment.find({})
      .populate("user", "id name email")
      .populate("order", "id totalPrice")
      .sort({ createdAt: -1 })
      .limit(pageSize)
      .skip(pageSize * (page - 1))

    return res.status(200).json({
      success: true,
      payments,
      page,
      pages: Math.ceil(count / pageSize),
      count,
    })
  } catch (error) {
    logger.error("Get all payments error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}

// @desc    Update payment status (admin only)
// @route   PUT /api/payments/:id
// @access  Private/Admin
export const updatePaymentStatus = async (req, res) => {
  const errors = validationResult(req)
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      errors: errors.array(),
    })
  }

  try {
    const { status } = req.body

    const payment = await Payment.findById(req.params.id)

    if (!payment) {
      return res.status(404).json({
        success: false,
        message: "Payment not found",
      })
    }

    // Update payment status
    payment.status = status

    // If payment is refunded, update order status
    if (status === "refunded") {
      const order = await Order.findById(payment.order)
      if (order) {
        order.isPaid = false
        order.status = "cancelled"
        await order.save()
      }
    }

    const updatedPayment = await payment.save()

    return res.status(200).json({
      success: true,
      payment: updatedPayment,
    })
  } catch (error) {
    logger.error("Update payment status error:", error)
    return res.status(500).json({
      success: false,
      message: "Server error",
      error: process.env.NODE_ENV === "development" ? error.message : undefined,
    })
  }
}
