const express = require("express")
const {
  processPayment,
  getPaymentById,
  getMyPayments,
  getAllPayments,
  updatePaymentStatus,
  initPaystackPayment,
  verifyPaystackPayment,
  getBankInfo,
  submitBankTransfer,
  refundPayment,
  paystackWebhook,
} = require("../controllers/paymentController.js")
const { protect, admin } = require("../middleware/authMiddleware.js")
const { body } = require("express-validator")

const router = express.Router()

// Validation middleware
const validatePaymentProcess = [
  body("orderId").notEmpty().withMessage("Order ID is required"),
  body("paymentMethod")
    .notEmpty()
    .withMessage("Payment method is required")
    .isIn(["card", "bank-transfer", "ussd", "crypto"])
    .withMessage("Invalid payment method"),
  body("paymentDetails").notEmpty().withMessage("Payment details are required"),
]

const validatePaymentStatus = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "completed", "failed", "refunded"])
    .withMessage("Invalid status"),
]

// Routes
router.route("/").post(protect, validatePaymentProcess, processPayment).get(protect, admin, getAllPayments)

router.route("/mypayments").get(protect, getMyPayments)

router.route("/:id").get(protect, getPaymentById).put(protect, admin, validatePaymentStatus, updatePaymentStatus)

// Paystack
router.post("/paystack/init", protect, initPaystackPayment)
router.post("/paystack/verify", protect, verifyPaystackPayment)
router.post("/paystack/webhook", express.raw({ type: "application/json" }), paystackWebhook)

// Bank transfer
router.get("/bank-info", getBankInfo)
router.post("/bank-transfer/submit", protect, submitBankTransfer)


// Refund (admin)
router.post('/:id/refund', protect, admin, refundPayment)

module.exports = router
