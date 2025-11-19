const express = require("express");
const { signup, login, logout, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, getCurrentUser } = require("../controllers/authController.js");
const { validateSignup, validateLogin, validateVerifyEmail, validateResendVerification, validateForgotPassword, validateResetPassword } = require("../middleware/validation.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

// authentication
router.post("/signup", validateSignup, signup);
router.post("/register", validateSignup, signup); // alias for frontend compatibility
router.post("/login", validateLogin, login);
router.post("/logout", logout)
router.get("/me", protect, getCurrentUser);


// email verification 
router.post("/verify-email", validateVerifyEmail, verifyEmail);
router.post("/reset-verification", validateResendVerification, resendVerificationEmail);


// password reset
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router.post("/reset-password", validateResetPassword, resetPassword);
module.exports = router;