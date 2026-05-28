const express = require("express");
const { register, login, logout, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, getCurrentUser } = require("../controllers/authController.js");
const { validateRegister, validateLogin, validateVerifyEmail, validateResendVerification, validateForgotPassword, validateResetPassword } = require("../middleware/validation.js");
const { protect } = require("../middleware/authMiddleware.js");

const router = express.Router();

// authentication
router.post("/register", validateRegister, register);
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