import express from "express"
import {
  processPayment,
  getPaymentById,
  getMyPayments,
  getAllPayments,
  updatePaymentStatus,
  initPaystackPayment,
  verifyPaystackPayment,
  getBankInfo,
  submitBankTransfer,
  initFlutterwavePayment,
  verifyFlutterwavePayment,
} from "../controllers/paymentController.js"
import { protect, admin } from "../middleware/authMiddleware.js"
import { body } from "express-validator"

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

// Bank transfer
router.get("/bank-info", getBankInfo)
router.post("/bank-transfer/submit", protect, submitBankTransfer)

// Flutterwave
router.post("/flutterwave/init", protect, initFlutterwavePayment)
router.post("/flutterwave/verify", protect, verifyFlutterwavePayment)

export default router
