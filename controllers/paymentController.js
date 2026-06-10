const Payment = require("../models/Payment.js")
const Order = require("../models/Order.js")
const User = require("../models/User.js")
const WebhookEvent = require("../models/WebhookEvent.js")
const { validationResult } = require("express-validator")
const { sendEmail, generatePaymentConfirmationEmail } = require("../utils/sendEmail.js")
const logger = require("../utils/logger.js")
const crypto = require("crypto")
const dotenv = require("dotenv");

dotenv.config();


async function psFetch(path, options = {}) {
  const baseUrl = process.env.PAYSTACK_BASE;
  const headers = options.headers || {}

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${process.env.PAYSTACK_SECRET_KEY}`,
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



// @desc    Process payment
// @route   POST /api/payments
// @access  Private
const processPayment = async (req, res) => {
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
      currency: "NGN", // Default currency
      status: "completed",
      transactionId: `TXN_${Date.now()}`,
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
const getPaymentById = async (req, res) => {
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
const getMyPayments = async (req, res) => {
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
const getAllPayments = async (req, res) => {
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
const updatePaymentStatus = async (req, res) => {
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
const initPaystackPayment = async (req, res) => {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ success: false, message: "Paystack is not configured" })
    }

    const { orderId } = req.body
    if (!orderId) {
      return res.status(400).json({ success: false, message: "orderId is required" })
    }

    const order = await Order.findById(orderId)
    if (!order) {
      return res.status(404).json({ success: false, message: "Order not found" })
    }
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: "Not authorized" })
    }
    if (order.isPaid) {
      return res.status(400).json({ success: false, message: "Order already paid" })
    }

    const amountNgn = Math.round((order.totalPrice || 0) * 100) // kobo
    const reference = `PS_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

    const initResp = await psFetch('/transaction/initialize', {
      method: 'POST',
      body: JSON.stringify({
        amount: amountNgn,
        email: req.user.email,
        reference,
        metadata: {
          orderId: order._id.toString(),
          userId: req.user._id.toString()
        },
        currency: 'NGN',
        callback_url: `${process.env.CLIENT_URL}/payment/verify?reference=${reference}`,
      }),
    })

    // Create pending payment record
    const payment = new Payment({
      user: req.user._id,
      order: order._id,
      paymentMethod: 'paystack',
      amount: order.totalPrice,
      currency: 'NGN',
      status: 'pending',
      transactionId: reference,
      paymentDetails: {
        provider: 'paystack',
        access_code: initResp?.data?.access_code,
        reference: reference,
      },
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
    });
  } catch (error) {
    logger.error('Init Paystack error:', error)
    return res.status(500).json({ success: false, message: error.message || 'Server error' })
  }
}

// @desc    Verify Paystack transaction
// @route   POST /api/payments/paystack/verify
// @access  Private
const verifyPaystackPayment = async (req, res) => {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      return res.status(503).json({ success: false, message: "Paystack is not configured" })
    }
    const { reference } = req.body;
    if (!reference) {
      return res.status(400).json({ success: false, message: 'reference is required' })
    }

    const verify = await psFetch(`/transaction/verify/${encodeURIComponent(reference)}`)
    const data = verify?.data
    if (!data) {
      throw new Error('Invalid verification response')
    }
    if (data.status !== 'success') {
      return res.status(400).json({ success: false, message: 'Payment not successful' })
    }

    const payment = await Payment.findOne({ transactionId: reference })
    if (!payment) {
      return res.status(404).json({ success: false, message: 'Payment not found' })
    }
    if (payment.status === 'completed') {
      return res.status(200).json({ success: true, verified: true })
    }

    const order = await Order.findById(payment.order)
    if (!order) {
      return res.status(404).json({ success: false, message: 'Order not found' })
    }
    if (order.user.toString() !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'Not authorized' })
    }

    // Amount check: Paystack returns amount in kobo
    const amountPaid = (data.amount || 0) / 100
    if (Math.round(amountPaid * 100) !== Math.round(order.totalPrice * 100)) {
      logger.warn('Amount mismatch on verify', { expected: order.totalPrice, got: amountPaid })
    }

    // Automatically update payment and order automatically
    const updated = await Payment.findOneAndUpdate(
      { _id: payment._id, status: { $ne: 'completed' } },
      { $set: { status: 'completed', paymentDetails: { ...(payment.paymentDetails || {}), paystack: data } } },
      { new: true }
    )
    if (updated) {
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
    }

    //send email confirmation
    try {
        const user = await User.findById(order.user);
        if (user && user.email) {
          const content = generatePaymentConfirmationEmail(user.name || 'Customer', updated, order);
          await sendEmail({ 
            email: user.email, 
            subject: `Payment Confirmation for Order #${order._id}`, 
            message: content 
          });
        }
      } catch (emailError) {
        logger.error('Failed to send payment confirmation email:', emailError);
      }

    return res.status(200).json({ 
      success: true, 
      verified: true,
      payment: updated || payment
    })
  } catch (error) {
    logger.error('Verify Paystack error:', error)
    return res.status(500).json({ success: false, message: error.message || 'Server error' })
  }
}

// @desc    Get bank transfer details
// @route   GET /api/payments/bank-info
// @access  Public
const getBankInfo = async (req, res) => {
  return res.status(200).json({
    success: true,
    bank: {
      accountName: process.env.BANK_ACCOUNT_NAME || '',
      accountNumber: process.env.BANK_ACCOUNT_NUMBER || '',
      bankName: process.env.BANK_NAME || '',
      instructions: process.env.BANK_TRANSFER_INSTRUCTIONS || 'Use your Order ID as payment reference.',
      currency: 'NGN',
    },
  })
}

// @desc    Submit bank transfer proof/reference
// @route   POST /api/payments/bank-transfer/submit
// @access  Private
const submitBankTransfer = async (req, res) => {
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
      paymentMethod: 'bank_transfer',
      amount: order.totalPrice,
      currency: 'NGN',
      status: 'pending',
      transactionId: reference,
      paymentDetails: { provider: 'bank_transfer', proofImageUrl },
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


// =============== Webhooks ===============

// @desc    Paystack webhook receiver (raw body required)
// @route   POST /api/payments/paystack/webhook
// @access  Public (signature verified)
const paystackWebhook = async (req, res) => {
  try {
    if (!process.env.PAYSTACK_SECRET_KEY) {
      logger.warn('Paystack webhook: PAYSTACK_SECRET_KEY not configured');
      return res.sendStatus(204)
    }

    const signature = req.headers['x-paystack-signature']
    if (!signature) {
		logger.warn('Paystack webhook: Missing signature header');
		return res.status(400).send('Missing signature')
	}
	// get the raw body
    const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
    const hash = crypto.createHmac('sha512', process.env.PAYSTACK_SECRET_KEY).update(rawBody).digest('hex')
    if (hash !== signature) {
		logger.warn('Paystack webhook: Invalid signature');
		return res.status(401).send('Invalid signature')
	}

    const rawText = rawBody.toString('utf8')
    const event = JSON.parse(rawText)
    const eventId = crypto.createHash('sha256').update(rawBody).digest('hex')

    // check if the event already processed
	const existingEvent = await WebhookEvent.findOne({ eventId });
	if (existingEvent && existingEvent.handled) {
		logger.info(`Paystack webhook: Event ${eventId} already handled`);
		return res.status(200).send('ok');
	}

    const log = await WebhookEvent.findOneAndUpdate(
    	{ eventId },
    	{ $setOnInsert: 
			{
				provider: 'paystack', 
				signature, 
				raw: rawText, 
				payload: event, 
				receivedAt: new Date(),
				eventType: event?.event || '',
			}
		},
      { upsert: true, new: true }
    );


    if (log.handled) return res.status(200).send('ok')
    const type = event?.event;
    const data = event?.data;
    const reference = data?.reference;

    if (!reference) return res.status(200).send('ok')

    if (eventType === 'charge.success' && reference) {
      const payment = await Payment.findOne({ transactionId: reference })

      if (payment && payment.status !== 'completed') {
        const order = await Order.findById(payment.order)
        if (order) {
          const updated = await Payment.findOneAndUpdate(
            { _id: payment._id, status: { $ne: 'completed' } },
            { $set: { status: 'completed', paymentDetails: { ...(payment.paymentDetails || {}), webhook: event } } },
            { new: true }
          )
          if (updated) {
            order.isPaid = true
            order.paidAt = new Date()
            order.status = 'processing'
            order.paymentResult = {
              id: reference,
              status: 'completed',
              update_time: new Date().toISOString(),
              email_address: data?.customer?.email,
              provider: 'paystack',
            }
            await order.save()
          }

          // send confirmation email
          try {
            const user = await User.findById(order.user)
            if ( user && user.email) {
				const content = generatePaymentConfirmationEmail(user.name || 'Customer', updated, order)
            	await sendEmail({ email: user.email, subject: `Payment Confirmation for Order #${order._id}`, message: content })
			}
          } catch (emailError) {
			logger.error('Paystack webhook email error:', emailError)
		  }
          await WebhookEvent.updateOne({ _id: log._id }, { $set: { reference, payment: payment._id, order: order._id } })
        }
      }
    }


    await WebhookEvent.updateOne({ _id: log._id }, { $set: { handled: true, status: 'processed', processedAt: new Date() } })
    return res.status(200).send('ok')
  } catch (err) {
    logger.error('Paystack webhook error:', err)


    try {
      const rawBody = req.body instanceof Buffer ? req.body : Buffer.from(JSON.stringify(req.body));
      const eventId = crypto.createHash('sha256').update(rawBody).digest('hex');
      await WebhookEvent.findOneAndUpdate({ eventId }, { $set: { handled: false, status: 'error', error: err.message } }, { upsert: true })
    } catch (logError) {
		logger.error('Paystack webhook log error:', logError)
	}
    return res.status(500).send('error')
  }
}


// @desc    Refund a completed payment (admin)
// @route   POST /api/payments/:id/refund
// @access  Private/Admin
const refundPayment = async (req, res) => {
  try {
    const payment = await Payment.findById(req.params.id)
    if (!payment) return res.status(404).json({ success: false, message: 'Payment not found' })
    if (payment.status === 'refunded') return res.status(200).json({ success: true, refunded: true })

    const order = await Order.findById(payment.order)
    if (!order) return res.status(404).json({ success: false, message: 'Order not found' })

    const provider = payment?.paymentDetails?.provider
    if (provider === 'paystack') {
      if (!process.env.PAYSTACK_SECRET_KEY) return res.status(503).json({ success: false, message: 'Paystack not configured' })
      // Paystack refund: POST /refund with transaction reference/id
      await psFetch('/refund', { method: 'POST', body: JSON.stringify({ transaction: payment.transactionId }) })
    } else {
      return res.status(400).json({ success: false, message: 'Unsupported provider for refund' })
    }

    payment.status = 'refunded'
    await payment.save()

    order.isPaid = false
    order.status = 'cancelled'
    await order.save()

    return res.status(200).json({ success: true, refunded: true })
  } catch (err) {
    logger.error('Refund payment error:', err)
    return res.status(500).json({ success: false, message: err.message || 'Server error' })
  }
}

module.exports = {
  processPayment,
  getPaymentById,
  getMyPayments,
  getAllPayments,
  updatePaymentStatus,
  initPaystackPayment,
  verifyPaystackPayment,
  getBankInfo,
  submitBankTransfer,
  paystackWebhook,
  refundPayment,
}
