import express from "express";
import { signup, login, logout, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword, getCurrentUser } from "../controllers/authController.js";
import { validateSignup, validateLogin, validateVerifyEmail, validateResendVerification, validateForgotPassword, validateResetPassword } from "../middleware/validation.js";
import { protect } from "../middleware/authMiddleware.js";

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
export default router;