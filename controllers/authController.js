import { User } from "../models/User.js";
import bcryptjs from "bcryptjs";
import { generateTokenAndSetCookie } from "../utils/generateTokenAndSetCookie.js";
import { validationResult } from "express-validator";
import { sendEmail, generateVerificationEmail, generatePasswordResetEmail, generateWelcomeEmail, generateLoginNotificationEmail } from "../utils/sendEmail.js";


// helper function to generate random token
const generateRandomToken = (length = 6) => {
	return Math.floor(100000 + Math.random() * 900000)
		.toString()
		.substring(0, length)
}

// function to get user IP and device information
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
export const signup = async (req, res) => {
	// validate the user inputs
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
		// hash the password
		const hashPassword = await bcryptjs.hash(password, 12);
		const verificationToken = generateRandomToken();

		// clear user
		const user = new User({
			name,
			email,
			password: hashPassword,
			verificationToken,
			verificationTokenExpiredAt: Date.now() + 24 * 60 * 60 * 1000, 
		});
		await user.save()

		// send verification email
		const emailContent = generateVerificationEmail(name, verificationToken)
		await sendEmail({
			email,
			subject: "Verify your email address",
			message: emailContent,
		});

		// jwt
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
		})
	} catch (error) {
		console.log("Signup error: ", error);
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV === "development" ? error.message : undefined
		})
	}
};



// login 
export const login = async (req, res) => {
	// validate user inputs
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

		// if user is verified
		if(!user.isVerified) {
			return res.status(403).json({
				success: false,
				message: "Please verify your email before logging in"
			})
		}

		// get client informations for login notifications
		const clientInfo = getClientInfo(req)

		// send client info login notification
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

		//  keep last 50 logins
		if(user.loginHistory.length > 50){
			user.loginHistory = user.loginHistory.slice(-50);
		}

		// update lastlogin
		user.lastlogin = Date.now()
		await user.save()

		// generate token
		const token = generateTokenAndSetCookie(res, user._id);

		return res.status(200).json({
			success: true,
			message: "Logged in successfully",
			token: token,
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				isVerified: user.isVerified
			}
		});
	} catch (error) {
		console.error("Login error", error)
		return res.status(500).json({
			success: false,
			message: "Server error",
			error: process.env.NODE_ENV === "development" ? error.message : undefined
		})
	}
};


  

// verify newly register email
export const verifyEmail = async (req, res) => {
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
  
	  // Update user verification status
	  user.isVerified = true
	  user.verificationToken = undefined
	  user.verificationTokenExpiredAt = undefined
	  await user.save()
  
	  // Send welcome email after successful verification
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
	  console.error("Email verification error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
		error: process.env.NODE_ENV === "development" ? error.message : undefined,
	  })
	}
  }
  

// resend email verification if requested
  export const resendVerificationEmail = async (req, res) => {
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
  
	  // Generate new verification token
	  const verificationToken = generateRandomToken()
	  user.verificationToken = verificationToken
	  user.verificationTokenExpiredAt = Date.now() + 24 * 60 * 60 * 1000 // 24 hours
	  await user.save()
  
	  // Send verification email
	  const emailContent = generateVerificationEmail(user.name, verificationToken)
	  await sendEmail({
		email,
		subject: "Verify Your Email Address",
		message: emailContent,
	  })
  
	  return res.status(200).json({
		success: true,
		message: "Verification email sent successfully",
	  })
	} catch (error) {
	  console.error("Resend verification email error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
		error: process.env.NODE_ENV === "development" ? error.message : undefined,
	  })
	}
  }

  // logout
export const logout = async (req, res) => {
	try {
	  res.clearCookie("token")
	  return res.status(200).json({
		success: true,
		message: "Logged out successfully",
	  })
	} catch (error) {
	  console.error("Logout Error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
	  })
	}
  }
  

// forgot password
export const forgotPassword = async (req, res) => {
	const { email } = req.body
  
	try {
	  const user = await User.findOne({ email })
	  if (!user) {
		return res.status(404).json({
		  success: false,
		  message: "User not found",
		})
	  }
  
	  // Generate reset token
	  const resetToken = generateRandomToken()
	  user.resetPasswordToken = resetToken
	  user.resetPasswordExpiredAt = Date.now() + 60 * 60 * 1000 // 1 hour
	  await user.save()
  
	  // Send password reset email
	  const emailContent = generatePasswordResetEmail(user.name, resetToken)
	  await sendEmail({
		email,
		subject: "Password Reset Request",
		message: emailContent,
	  })
  
	  return res.status(200).json({
		success: true,
		message: "Password reset email sent successfully",
	  })
	} catch (error) {
	  console.error("Forgot password error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
		error: process.env.NODE_ENV === "development" ? error.message : undefined,
	  })
	}
  }
  
// reset user password
  export const resetPassword = async (req, res) => {
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
  
	  // Hash new password and update user
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
	  console.error("Reset password error:", error)
	  return res.status(500).json({
		success: false,
		message: "Internal server error",
		error: process.env.NODE_ENV === "development" ? error.message : undefined,
	  })
	}
  }