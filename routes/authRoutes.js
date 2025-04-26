import express from "express";
import { signup, login, logout, verifyEmail, resendVerificationEmail, forgotPassword, resetPassword } from "../controllers/authController.js";
import { validateSignup, validateLogin, validateVerifyEmail, validateResendVerification, validateForgotPassword, validateResetPassword } from "../middleware/validation.js";

const router = express.Router();

// authentication
router.post("/signup", validateSignup, signup);
router.post("/login", validateLogin, login);
router.post("/logout", logout)


// email verification 
router.post("/verify-email", validateVerifyEmail, verifyEmail);
router.post("/reset-verification", validateResendVerification, resendVerificationEmail);


// password reset
router.post("/forgot-password", validateForgotPassword, forgotPassword);
router,post("/reset-password", validateResetPassword, resetPassword);
export default router;