import nodemailer from "nodemailer"

export const sendEmail = async (options) => {
	try {
    	// Create a transporter
		const transporter = nodemailer.createTransport({
			host: process.env.EMAIL_HOST,
			port: process.env.EMAIL_PORT,
      		secure: process.env.EMAIL_SECURE === "true",
      		auth: {
				user: process.env.EMAIL_USER,
        		pass: process.env.EMAIL_PASSWORD,
      		},
    	})

    // Define email options
    	const mailOptions = {
			from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      		to: options.email,
      		subject: options.subject,
      		html: options.message,
    	}

    // Send the email
    	await transporter.sendMail(mailOptions)
    	return true
  	} catch (error) {
		console.error("Email sending error:", error)
    	return false
  	}
}


export const generateVerificationEmail = (name, token) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with our service. Please use the verification code below to complete your registration:</p>
      <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; letter-spacing: 5px;">
        ${token}
      </div>
      <p>This code will expire in 24 hours.</p>
      <p>If you did not request this verification, please ignore this email.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `
}

export const generatePasswordResetEmail = (name, token) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password. Please use the code below to reset your password:</p>
      <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; letter-spacing: 5px;">
        ${token}
      </div>
      <p>This code will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `
}
