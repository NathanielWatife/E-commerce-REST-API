const { User } = require("../models/User.js");
const bcryptjs = require("bcryptjs");
const { generateTokenAndSetCookie } = require("../utils/generateTokenAndSetCookie.js");
const { validationResult } = require("express-validator");
const { sendEmail, generateVerificationEmail, generatePasswordResetEmail, generateWelcomeEmail, generateLoginNotificationEmail } = require("../utils/sendEmail.js");
const logger = require("../utils/logger.js");


const generateRandomToken = (length = 6) => {
	return Math.floor(100000 + Math.random() * 900000)
		.toString()
		.substring(0, length)
}

const getClientInfo = (req) => {
	const ip = req.headers["x-forwarded-for"] || req.connection.remoteAddress
	const userAgent = req.headers["user-agent"] || "Unknown Device"
	return {
		ip,
		device: userAgent,
		time: new Date().toLocaleString(),
	}
}


// user signup
const signup = async (req, res) => {
	const errors = validationResult(req);
	if(!errors.isEmpty()) {
		return res.status(400).json({
			success: false,
			errors: errors.array(),
		});
	}

	const { name, email, password } = req.body;
	try {
		const userAlreadyExists = await User.findOne({email})
		if (userAlreadyExists) {
			return res.status(400).json({
				succcess: false,
				message: "User already exists"
			});
		}
		const hashPassword = await bcryptjs.hash(password, 12);
		const verificationToken = generateRandomToken();

		const user = new User({
			name,
			email,
			password: hashPassword,
			verificationToken,
			verificationTokenExpiredAt: Date.now() + 24 * 60 * 60 * 1000, 
		});
		await user.save()

		const emailContent = generateVerificationEmail(name, verificationToken, email)
		setImmediate(async () => {
			try {
				const ok = await sendEmail({
					email,
					subject: "Verify your email address",
					message: emailContent,
				})
				if (!ok) logger.warn("Verification email failed to send")
			} catch (e) {
				logger.error("Background verification email error:", e)
			}
		})

		generateTokenAndSetCookie(res, user._id)
		return res.status(201).json({
			success: true,
			message: "User created. Please check your email to verify your account.",
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				isVerified: user.isVerified
			},
			debug: process.env.NODE_ENV !== "production" ? { verificationToken } : undefined,
		})
	} catch (error) {
		logger.error("Signup error:", error)
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV ? error.message : undefined
		})
	}
};



// login 
const login = async (req, res) => {
	const errors = validationResult(req)
	if (!errors.isEmpty()) {
		return res.status(400).json({
			success: false,
			errors: errors.array()
		})
	}

	const { email, password } = req.body;
	try {
		const user = await User.findOne({ email }).select("+password")
		if (!user) {
			return res.status(401).json({
				success: false,
				message: "Invalid email or password"
			});
		}

		const isMatch = await bcryptjs.compare(password, user.password)
		if (!isMatch) {
			return res.status(401).json({
				success: false,
				message: "Invalid email or password"
			})
		}

		if(!user.isVerified) {
			return res.status(403).json({
				success: false,
				message: "Please verify your email before logging in"
			})
		}

		const clientInfo = getClientInfo(req)

		const loginEmailContent = generateLoginNotificationEmail(user.name, clientInfo)
		await sendEmail({
			email: user.email,
			subject: "New Login to your account",
			message: loginEmailContent
		});

		user.loginHistory.push({
			ip: clientInfo.ip,
			device: clientInfo.device,
			time: new Date()
		});

		if(user.loginHistory.length > 50){
			user.loginHistory = user.loginHistory.slice(-50);
		}

		user.lastLogin = Date.now()
		await user.save()

		const token = generateTokenAndSetCookie(res, user._id);

		return res.status(200).json({
			success: true,
			message: "Logged in successfully",
			token: token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
				isVerified: user.isVerified
			}
		});
	} catch (error) {
		logger.error("Login error", error)
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV ? error.message : undefined
		})
	}
};


  

// verify newly register email
const verifyEmail = async (req, res) => {
	const { email, token } = req.body
  
	try {
	  const user = await User.findOne({
		email,
		verificationToken: token,
		verificationTokenExpiredAt: { $gt: Date.now() },
	  })
  
	  if (!user) {
		return res.status(400).json({
		  success: false,
		  message: "Invalid or expired verification token",
		})
	  }
  
	  user.isVerified = true
	  user.verificationToken = undefined
	  user.verificationTokenExpiredAt = undefined
	  await user.save()
  
	  const welcomeEmailContent = generateWelcomeEmail(user.name)
	  await sendEmail({
		email: user.email,
		subject: "Welcome to Our Store!",
		message: welcomeEmailContent,
	  })

	  return res.status(200).json({
		success: true,
		message: "Email verified successfully",
	  })
		} catch (error) {
			logger.error("Email verification error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
		error: process.env.NODE_ENV ? error.message : undefined,
	  })
	}
  }
  

// resend email verification if requested
const resendVerificationEmail = async (req, res) => {
	const { email } = req.body
  
	try {
	  const user = await User.findOne({ email })
	  if (!user) {
		return res.status(404).json({
		  success: false,
		  message: "User not found",
		})
	  }
  
	  if (user.isVerified) {
		return res.status(400).json({
		  success: false,
		  message: "Email is already verified",
		})
	  }
  
	  const verificationToken = generateRandomToken()
	  user.verificationToken = verificationToken
	  user.verificationTokenExpiredAt = Date.now() + 24 * 60 * 60 * 1000
	  await user.save()
  
		const emailContent = generateVerificationEmail(user.name, verificationToken, email)
		setImmediate(async () => {
			try {
				const ok = await sendEmail({
					email,
					subject: "Verify Your Email Address",
					message: emailContent,
				})
				if (!ok) logger.warn("Resend verification email failed")
			} catch (e) {
				logger.error("Background resend verification email error:", e)
			}
		})

		return res.status(200).json({
		success: true,
			message: "Verification email sent successfully",
			debug: process.env.NODE_ENV !== "production" ? { verificationToken } : undefined,
	  })
		} catch (error) {
			logger.error("Resend verification email error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
		error: process.env.NODE_ENV ? error.message : undefined,
	  })
	}
  }

  // logout
const logout = async (req, res) => {
	try {
	  res.clearCookie("token", {
		  httpOnly: true,
		  secure: process.env.NODE_ENV === "production",
		  sameSite: "lax",
	  })
	  return res.status(200).json({
		success: true,
		message: "Logged out successfully",
	  })
		} catch (error) {
			logger.error("Logout Error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
	  })
	}
  }
  

// forgot password
const forgotPassword = async (req, res) => {
	const { email } = req.body
  
	try {
	  const user = await User.findOne({ email })
	  if (!user) {
		return res.status(404).json({
		  success: false,
		  message: "User not found",
		})
	  }
  
	  const resetToken = generateRandomToken()
	  user.resetPasswordToken = resetToken
	  user.resetPasswordExpiredAt = Date.now() + 60 * 60 * 1000
	  await user.save()
  
		const emailContent = generatePasswordResetEmail(user.name, resetToken, email, user.role)
		setImmediate(async () => {
			try {
				const ok = await sendEmail({
					email,
					subject: "Password Reset Request",
					message: emailContent,
				})
				if (!ok) logger.warn("Password reset email failed to send")
			} catch (e) {
				logger.error("Background password reset email error:", e)
			}
		})

		return res.status(200).json({
		success: true,
			message: "Password reset email sent successfully",
			debug: process.env.NODE_ENV !== "production" ? { resetToken } : undefined,
	  })
		} catch (error) {
			logger.error("Forgot password error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
		error: process.env.NODE_ENV ? error.message : undefined,
	  })
	}
  }
  
// reset user password
const resetPassword = async (req, res) => {
	const { email, token, newPassword } = req.body
  
	try {
	  const user = await User.findOne({
		email,
		resetPasswordToken: token,
		resetPasswordExpiredAt: { $gt: Date.now() },
	  })
  
	  if (!user) {
		return res.status(400).json({
		  success: false,
		  message: "Invalid or expired reset token",
		})
	  }
  
	  const hashPassword = await bcryptjs.hash(newPassword, 12)
	  user.password = hashPassword
	  user.resetPasswordToken = undefined
	  user.resetPasswordExpiredAt = undefined
	  await user.save()
  
	  return res.status(200).json({
		success: true,
		message: "Password reset successfully",
	  })
		} catch (error) {
			logger.error("Reset password error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
		error: process.env.NODE_ENV ? error.message : undefined,
	  })
	}
  }


// get current authenticated user
const getCurrentUser = async (req, res) => {
	try {
		const user = await User.findById(req.user?._id).select("name email role isVerified isActive accountStatus")
		if (!user) {
			return res.status(404).json({
				success: false,
				message: "User not found",
			})
		}

		return res.status(200).json({
			success: true,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				role: user.role,
				isVerified: user.isVerified,
				isActive: user.isActive,
				accountStatus: user.accountStatus
			}
		})
	} catch (error) {
		logger.error("Get current user error:", error)
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV ? error.message : undefined,
		})
	}
}

module.exports = {
	signup,
	login,
	verifyEmail,
	resendVerificationEmail,
	logout,
	forgotPassword,
	resetPassword,
	getCurrentUser,
};