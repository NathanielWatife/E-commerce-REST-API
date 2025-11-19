const express = require("express");
const { getUserProfile, updateUserProfile, updateUserAvatar, addBillingAddress, updateBillingAddress, deleteBillingAddress, addShippingAddress, updateShippingAddress, deleteShippingAddress, getUsers, getUserById, updateUser, deleteUser } = require("../controllers/userController.js");
const { protect, admin } = require("../middleware/authMiddleware.js");
const { body } = require("express-validator");

const router = express.Router();

// Validation middleware
const validateUpdateProfile = [
  body("name").optional().isLength({ min: 2 }).withMessage("Name must be at least 2 characters"),
  body("email").optional().isEmail().withMessage("Please include a valid email"),
  body("password").optional().isLength({ min: 6 }).withMessage("Password must be at least 6 characters"),
];

const validateAvatar = [body("avatar").notEmpty().withMessage("Avatar URL is required")];

const validateAddress = [
  body("street").notEmpty().withMessage("Street is required"),
  body("city").notEmpty().withMessage("City is required"),
  body("state").notEmpty().withMessage("State is required"),
  body("postalCode").notEmpty().withMessage("Postal code is required"),
  body("country").notEmpty().withMessage("Country is required"),
  body("isDefault").optional().isBoolean().withMessage("isDefault must be a boolean"),
];

// User profile routes
router.route("/profile").get(protect, getUserProfile).put(protect, validateUpdateProfile, updateUserProfile);

router.route("/profile/avatar").put(protect, validateAvatar, updateUserAvatar);

// Billing address routes
router.route("/profile/billing-address").post(protect, validateAddress, addBillingAddress);

router
  .route("/profile/billing-address/:addressId")
  .put(protect, validateAddress, updateBillingAddress)
  .delete(protect, deleteBillingAddress);

// Shipping address routes
router.route("/profile/shipping-address").post(protect, validateAddress, addShippingAddress);

router
  .route("/profile/shipping-address/:addressId")
  .put(protect, validateAddress, updateShippingAddress)
  .delete(protect, deleteShippingAddress);

// Admin routes
router.route("/").get(protect, admin, getUsers);

router.route("/:id").get(protect, admin, getUserById).put(protect, admin, updateUser).delete(protect, admin, deleteUser);

module.exports = router;
