import { Payment } from "../models/Payment.js"
import { Order } from "../models/Order.js"
import { User } from "../models/User.js"
import { validationResult } from "express-validator"
import { sendEmail, generatePaymentConfirmationEmail } from "../utils/sendEmail.js"
import logger from "../utils/logger.js"
import crypto from "crypto"

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || ""
const PAYSTACK_BASE = "https://api.paystack.co"
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || ""
const FLW_BASE = "https://api.flutterwave.com/v3"

async function psFetch(path, options = {}) {
  const headers = options.headers || {}
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.status === false) {
    const message = data?.message || `Paystack error (${res.status})`
    throw new Error(message)
  }
  return data
}

async function flwFetch(path, options = {}) {
  const headers = options.headers || {}
  const res = await fetch(`${FLW_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
      "Content-Type": "application/json",
      ...headers,
    },
  })
  const data = await res.json().catch(() => ({}))
  if (!res.ok || data.status === 'error') {
    const message = data?.message || `Flutterwave error (${res.status})`
    throw new Error(message)
  }
  return data
}

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
      error: process.env.NODE_ENV ? error.message : undefined,
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
    if (
      payment.user.toString() !== req.user._id.toString() &&
      !["admin", "super-admin"].includes(req.user.role)
    ) {
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
      error: process.env.NODE_ENV ? error.message : undefined,
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
      error: process.env.NODE_ENV ? error.message : undefined,
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
      error: process.env.NODE_ENV ? error.message : undefined,
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

    const order = await Order.findById(payment.order)

    // If payment is completed by admin, mark order paid
    if (status === 'completed' && order) {
      order.isPaid = true
      order.paidAt = new Date()
      order.status = 'processing'
      order.paymentResult = {
        id: payment.transactionId,
        status: 'completed',
        update_time: new Date().toISOString(),
        email_address: undefined,
        provider: payment?.paymentDetails?.provider || 'manual',
      }
      await order.save()
    }

    // If payment is refunded, update order status
    if (status === "refunded" && order) {
      order.isPaid = false
      order.status = "cancelled"
      await order.save()
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
      error: process.env.NODE_ENV ? error.message : undefined,
    })
  }
}

// @desc    Init Paystack transaction for an order
// @route   POST /api/payments/paystack/init
// @access  Private
export const initPaystackPayment = async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ success: false, message: "Paystack is not configured" })
    }
    const { orderId } = req.body
    if (!orderId) return res.status(400).json({ success: false, message: "orderId is required" })

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ success: false, message: "Order not found" })
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: "Not authorized" })
    if (order.isPaid) return res.status(400).json({ success: false, message: "Order already paid" })

    const amountNgn = Math.round((order.totalPrice || 0) * 100) // kobo
    const reference = `PS_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const initResp = await psFetch('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountNgn,
        email: req.user.email,
        reference,
        metadata: { orderId: order._id.toString(), userId: req.user._id.toString() },
        currency: 'NGN',
      }),
    })

    // Create or upsert pending payment record
    const payment = new Payment({
      user: req.user._id,
      order: order._id,
      paymentMethod: 'card',
      amount: order.totalPrice,
      currency: 'NGN',
      status: 'pending',
      transactionId: reference,
      paymentDetails: { provider: 'paystack', access_code: initResp?.data?.access_code },
    })
    await payment.save()

    return res.status(200).json({
      success: true,
      authorizationUrl: initResp?.data?.authorization_url,
      reference,
      accessCode: initResp?.data?.access_code,
      amount: order.totalPrice,
      currency: 'NGN',
      email: req.user.email,
    })
  } catch (error) {
    logger.error('Init Paystack error:', error)
    return res.status(500).json({ success: false, message: error.message || 'Server error' })
  }
}

// @desc    Verify Paystack transaction
// @route   POST /api/payments/paystack/verify
// @access  Private
export const verifyPaystackPayment = async (req, res) => {
  try {
    if (!PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ success: false, message: "Paystack is not configured" })
    }
    const { reference, orderId } = req.body
    if (!reference) return res.status(400).json({ success: false, message: 'reference is required' })

    const verify = await psFetch(`/transaction/verify/${encodeURIComponent(reference)}`)
    const data = verify?.data
    if (!data) throw new Error('Invalid verification response')
    if (data.status !== 'success') return res.status(400).json({ success: false, message: 'Payment not successful' })

    const payment = await Payment.findOne({ transactionId: reference })
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })

    const order = await Order.findById(payment.order)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' })

    // Amount check: Paystack returns amount in kobo
    const amountPaid = (data.amount || 0) / 100
    if (Math.round(amountPaid * 100) !== Math.round(order.totalPrice * 100)) {
      logger.warn('Amount mismatch on verify', { expected: order.totalPrice, got: amountPaid })
    }

    payment.status = 'completed'
    payment.paymentDetails = { ...(payment.paymentDetails || {}), paystack: data }
    await payment.save()

    order.isPaid = true
    order.paidAt = new Date()
    order.status = 'processing'
    order.paymentResult = {
      id: reference,
      status: 'completed',
      update_time: new Date().toISOString(),
      email_address: data?.customer?.email || req.user.email,
      provider: 'paystack',
    }
    await order.save()

    return res.status(200).json({ success: true, verified: true })
  } catch (error) {
    logger.error('Verify Paystack error:', error)
    return res.status(500).json({ success: false, message: error.message || 'Server error' })
  }
}

// @desc    Get bank transfer details
// @route   GET /api/payments/bank-info
// @access  Public
export const getBankInfo = async (req, res) => {
  return res.status(200).json({
    success: true,
    bank: {
      accountName: process.env.BANK_ACCOUNT_NAME || '',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
      bankName: process.env.BANK_BANK_NAME || '',
      instructions: process.env.BANK_TRANSFER_INSTRUCTIONS || 'Use your Order ID as payment reference.',
      currency: 'NGN',
    },
  })
}

// @desc    Submit bank transfer proof/reference
// @route   POST /api/payments/bank-transfer/submit
// @access  Private
export const submitBankTransfer = async (req, res) => {
  try {
    const { orderId, reference, proofImageUrl } = req.body
    if (!orderId || !reference) return res.status(400).json({ success: false, message: 'orderId and reference are required' })

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' })
    if (order.isPaid) return res.status(400).json({ success: false, message: 'Order already paid' })

    const payment = new Payment({
      user: req.user._id,
      order: order._id,
      paymentMethod: 'bank-transfer',
      amount: order.totalPrice,
      currency: 'NGN',
      status: 'pending',
      transactionId: reference,
      paymentDetails: { provider: 'bank-transfer', proofImageUrl },
    })
    await payment.save()

    order.status = 'awaiting_payment_review'
    await order.save()

    return res.status(200).json({ success: true, payment })
  } catch (error) {
    logger.error('Submit bank transfer error:', error)
    return res.status(500).json({ success: false, message: error.message || 'Server error' })
  }
}

// @desc    Init Flutterwave transaction
// @route   POST /api/payments/flutterwave/init
// @access  Private
export const initFlutterwavePayment = async (req, res) => {
  try {
    if (!FLW_SECRET_KEY) {
      return res.status(503).json({ success: false, message: "Flutterwave is not configured" })
    }
    const { orderId } = req.body
    if (!orderId) return res.status(400).json({ success: false, message: 'orderId is required' })

    const order = await Order.findById(orderId)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' })
    if (order.isPaid) return res.status(400).json({ success: false, message: 'Order already paid' })

    const txRef = `FLW_${Date.now()}_${Math.random().toString(36).slice(2,8)}`

    const payment = new Payment({
      user: req.user._id,
      order: order._id,
      paymentMethod: 'card',
      amount: order.totalPrice,
      currency: 'NGN',
      status: 'pending',
      transactionId: txRef,
      paymentDetails: { provider: 'flutterwave' },
    })
    await payment.save()

    return res.status(200).json({
      success: true,
      txRef,
      amount: order.totalPrice,
      currency: 'NGN',
      customer: { email: req.user.email, name: req.user.name },
    })
  } catch (error) {
    logger.error('Init Flutterwave error:', error)
    return res.status(500).json({ success: false, message: error.message || 'Server error' })
  }
}

// @desc    Verify Flutterwave transaction
// @route   POST /api/payments/flutterwave/verify
// @access  Private
export const verifyFlutterwavePayment = async (req, res) => {
  try {
    if (!FLW_SECRET_KEY) {
      return res.status(503).json({ success: false, message: "Flutterwave is not configured" })
    }
    const { txRef } = req.body
    if (!txRef) return res.status(400).json({ success: false, message: 'txRef is required' })

    const verify = await flwFetch(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`)
    const data = verify?.data
    if (!data) throw new Error('Invalid verification response')
    if (data?.status !== 'successful') return res.status(400).json({ success: false, message: 'Payment not successful' })

    const payment = await Payment.findOne({ transactionId: txRef })
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })
    const order = await Order.findById(payment.order)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })
    if (order.user.toString() !== req.user._id.toString()) return res.status(403).json({ success: false, message: 'Not authorized' })

    payment.status = 'completed'
    payment.paymentDetails = { ...(payment.paymentDetails || {}), flutterwave: data }
    await payment.save()

    order.isPaid = true
    order.paidAt = new Date()
    order.status = 'processing'
    order.paymentResult = {
      id: String(data?.id || txRef),
      status: 'completed',
      update_time: new Date().toISOString(),
      email_address: data?.customer?.email,
      provider: 'flutterwave',
    }
    await order.save()

    return res.status(200).json({ success: true, verified: true })
  } catch (error) {
    logger.error('Verify Flutterwave error:', error)
    return res.status(500).json({ success: false, message: error.message || 'Server error' })
  }
}
