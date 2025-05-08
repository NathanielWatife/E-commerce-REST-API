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
		const verificationToken = generateRandonToken()

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
			message: "User created. Please cehck your email to verify your account.",
			user: {
				id: user._id,
				name: user.name,
				email: user.email,
				isVerified: user.isVerified
			}
		})
	}
}