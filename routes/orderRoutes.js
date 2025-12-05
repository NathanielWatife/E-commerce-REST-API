const express = require("express")
const {
  createOrder,
  getOrderById,
  updateOrderToPaid,
  updateOrderToDelivered,
  getMyOrders,
  getOrders,
  updateOrderStatus,
  cancelOrder,
  shipOrder,
} = require("../controllers/orderController.js")
const { protect, admin } = require("../middleware/authMiddleware.js")
const { body } = require("express-validator")

const router = express.Router()


// Validation middleware
const validateCreateOrder = [
  body("shippingAddress").notEmpty().withMessage("Shipping address is required"),
  body("shippingAddress.street").notEmpty().withMessage("Street is required"),
  body("shippingAddress.city").notEmpty().withMessage("City is required"),
  body("shippingAddress.state").notEmpty().withMessage("State is required"),
  body("shippingAddress.country").notEmpty().withMessage("Country is required"),
  body("paymentMethod").notEmpty().withMessage("Payment method is required"),
]

const validateOrderStatus = [
  body("status")
    .notEmpty()
    .withMessage("Status is required")
    .isIn(["pending", "processing", "shipped", "delivered", "cancelled"])
    .withMessage("Invalid status"),
  body("note").optional().isString().isLength({ max: 500 }).withMessage("Note too long"),
]

const validateShipOrder = [
  body("shippingCarrier").optional().isString(),
  body("trackingNumber").notEmpty().withMessage("Tracking number is required"),
  body("trackingUrl").optional().isString(),
  body("estimatedDelivery").optional().isISO8601(),
  body("note").optional().isString().isLength({ max: 500 }),
]

// Routes
router.route("/").post(protect, validateCreateOrder, createOrder).get(protect, admin, getOrders)
router.route("/myorders").get(protect, getMyOrders)
router.route("/:id").get(protect, getOrderById)
router.route("/:id/pay").put(protect, updateOrderToPaid)
router.route("/:id/deliver").put(protect, admin, updateOrderToDelivered)
router.route("/:id/status").put(protect, admin, validateOrderStatus, updateOrderStatus)
router.route(":id/ship").put(protect, admin, validateShipOrder, shipOrder)
router.route(":id/cancel").put(protect, cancelOrder)
module.exports = router
