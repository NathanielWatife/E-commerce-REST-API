import nodemailer from "nodemailer"
import logger from "./logger.js"

let transporterSingleton = null

const getTransporter = () => {
  if (transporterSingleton) return transporterSingleton
  try {
    transporterSingleton = nodemailer.createTransport({
      host: process.env.EMAIL_HOST,
      port: Number(process.env.EMAIL_PORT),
      secure: process.env.EMAIL_SECURE === "true",
      pool: true,
      maxConnections: 3,
      maxMessages: 50,
      connectionTimeout: 10000,
      greetingTimeout: 10000,
      socketTimeout: 10000,
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASSWORD,
      },
    })
  } catch (e) {
    logger.error("Failed to initialize mail transporter", e)
  }
  return transporterSingleton
}

// Send an email using nodemailer
export const sendEmail = async (options) => {
  try {
    const transporter = getTransporter()
    if (!transporter) {
      logger.error("Email transporter not available")
      return false
    }
    const mailOptions = {
      from: `${process.env.EMAIL_FROM_NAME} <${process.env.EMAIL_FROM}>`,
      to: options.email,
      subject: options.subject,
      html: options.message,
    }
    await transporter.sendMail(mailOptions)
    return true
  } catch (error) {
    logger.error("Email sending error:", error)
    return false
  }
}

// Generate verification email content
export const generateVerificationEmail = (name, token, email) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
  const verifyLink = `${clientUrl}/verify-email?email=${encodeURIComponent(email)}`
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
      <p>Hello ${name},</p>
      <p>Thank you for registering with our service. Please use the verification code below to complete your registration:</p>
      <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; letter-spacing: 5px;">
        ${token}
      </div>
      <p>Or click the button below to go to the verification page:</p>
      <p style="text-align: center;">
        <a href="${verifyLink}" style="display: inline-block; padding: 12px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px;">Verify Email</a>
      </p>
      <p>This code will expire in 24 hours.</p>
      <p>If you did not request this verification, please ignore this email.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `
}

//Generate password reset email content
export const generatePasswordResetEmail = (name, token, email) => {
  const clientUrl = process.env.CLIENT_URL || 'http://localhost:3000'
  const resetLink = `${clientUrl}/reset-password?email=${encodeURIComponent(email)}&code=${encodeURIComponent(token)}`
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Password Reset Request</h2>
      <p>Hello ${name},</p>
      <p>We received a request to reset your password. Please use the code below to reset your password:</p>
      <div style="background-color: #f4f4f4; padding: 10px; text-align: center; font-size: 24px; font-weight: bold; margin: 20px 0; letter-spacing: 5px;">
        ${token}
      </div>
      <p>Or click the button below to go directly to the reset page:</p>
      <p style="text-align: center;">
        <a href="${resetLink}" style="display: inline-block; padding: 12px 20px; background-color: #007bff; color: #ffffff; text-decoration: none; border-radius: 4px;">Reset Password</a>
      </p>
      <p>This code will expire in 1 hour.</p>
      <p>If you did not request a password reset, please ignore this email or contact support if you have concerns.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `
}

// Generate welcome email content after successful registration
export const generateWelcomeEmail = (name) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Welcome to Our Store!</h2>
      <p>Hello ${name},</p>
      <p>Thank you for creating an account with us. Your account has been successfully verified and is now active.</p>
      <p>You can now:</p>
      <ul>
        <li>Browse our extensive product catalog</li>
        <li>Add items to your cart</li>
        <li>Save your favorite products</li>
        <li>Track your orders</li>
        <li>Manage your profile</li>
      </ul>
      <p>If you have any questions or need assistance, please don't hesitate to contact our customer support team.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `
}

// Generate login notification email
export const generateLoginNotificationEmail = (name, loginInfo) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">New Login Detected</h2>
      <p>Hello ${name},</p>
      <p>We detected a new login to your account with the following details:</p>
      <div style="background-color: #f4f4f4; padding: 15px; margin: 15px 0;">
        <p><strong>Time:</strong> ${loginInfo.time}</p>
        <p><strong>IP Address:</strong> ${loginInfo.ip}</p>
        <p><strong>Device:</strong> ${loginInfo.device}</p>
      </div>
      <p>If this was you, you can ignore this email.</p>
      <p>If you did not log in at this time, please secure your account by changing your password immediately and contact our support team.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `
}

/**
 * Generate order confirmation email
 * @param {string} name - User's name
 * @param {Object} order - Order information
 * @returns {string} - HTML email content
 */
export const generateOrderConfirmationEmail = (name, order) => {
  // Generate order items HTML
  const orderItemsHtml = order.orderItems
    .map(
      (item) => `
      <tr>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">
          <img src="${item.image}" alt="${item.name}" style="width: 50px; height: 50px; object-fit: cover;">
        </td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.name}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">${item.quantity}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${item.price.toFixed(2)}</td>
        <td style="padding: 10px; border-bottom: 1px solid #ddd;">$${(item.price * item.quantity).toFixed(2)}</td>
      </tr>
    `,
    )
    .join("")

  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Order Confirmation</h2>
      <p>Hello ${name},</p>
      <p>Thank you for your order! We're pleased to confirm that we've received your order and it's being processed.</p>
      
      <div style="background-color: #f4f4f4; padding: 15px; margin: 15px 0;">
        <p><strong>Order Number:</strong> ${order._id}</p>
        <p><strong>Order Date:</strong> ${new Date(order.createdAt).toLocaleString()}</p>
        <p><strong>Payment Method:</strong> ${order.paymentMethod}</p>
      </div>
      
      <h3>Order Summary</h3>
      <table style="width: 100%; border-collapse: collapse;">
        <thead>
          <tr style="background-color: #f4f4f4;">
            <th style="padding: 10px; text-align: left;">Image</th>
            <th style="padding: 10px; text-align: left;">Product</th>
            <th style="padding: 10px; text-align: left;">Quantity</th>
            <th style="padding: 10px; text-align: left;">Price</th>
            <th style="padding: 10px; text-align: left;">Total</th>
          </tr>
        </thead>
        <tbody>
          ${orderItemsHtml}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="4" style="padding: 10px; text-align: right;"><strong>Items Total:</strong></td>
            <td style="padding: 10px;">$${order.itemsPrice.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 10px; text-align: right;"><strong>Shipping:</strong></td>
            <td style="padding: 10px;">$${order.shippingPrice.toFixed(2)}</td>
          </tr>
          <tr>
            <td colspan="4" style="padding: 10px; text-align: right;"><strong>Tax:</strong></td>
            <td style="padding: 10px;">$${order.taxPrice.toFixed(2)}</td>
          </tr>
          <tr style="background-color: #f4f4f4;">
            <td colspan="4" style="padding: 10px; text-align: right;"><strong>Order Total:</strong></td>
            <td style="padding: 10px;"><strong>$${order.totalPrice.toFixed(2)}</strong></td>
          </tr>
        </tfoot>
      </table>
      
      <h3>Shipping Address</h3>
      <div style="background-color: #f4f4f4; padding: 15px; margin: 15px 0;">
        <p>${order.shippingAddress.street}</p>
        <p>${order.shippingAddress.city}, ${order.shippingAddress.state} ${order.shippingAddress.postalCode}</p>
        <p>${order.shippingAddress.country}</p>
      </div>
      
      <p>We'll send you another email when your order ships. You can also check the status of your order at any time by logging into your account.</p>
      <p>If you have any questions or concerns about your order, please contact our customer support team.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `
}

/**
 * Generate payment confirmation email
 * @param {string} name - User's name
 * @param {Object} payment - Payment information
 * @param {Object} order - Order information
 * @returns {string} - HTML email content
 */
export const generatePaymentConfirmationEmail = (name, payment, order) => {
  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Payment Confirmation</h2>
      <p>Hello ${name},</p>
      <p>We're pleased to confirm that we've received your payment for order #${order._id}.</p>
      
      <div style="background-color: #f4f4f4; padding: 15px; margin: 15px 0;">
        <p><strong>Payment ID:</strong> ${payment._id}</p>
        <p><strong>Payment Method:</strong> ${payment.paymentMethod}</p>
        <p><strong>Amount:</strong> ${payment.currency} ${payment.amount.toFixed(2)}</p>
        <p><strong>Date:</strong> ${new Date(payment.createdAt).toLocaleString()}</p>
        <p><strong>Status:</strong> <span style="color: green; font-weight: bold;">Completed</span></p>
      </div>
      
      <p>Your order is now being processed. We'll send you another email when your order ships.</p>
      <p>If you have any questions or concerns about your payment, please contact our customer support team.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `
}

/**
 * Generate order status update email
 * @param {string} name - User's name
 * @param {Object} order - Order information
 * @param {string} previousStatus - Previous order status
 * @returns {string} - HTML email content
 */
export const generateOrderStatusUpdateEmail = (name, order, previousStatus) => {
  let statusMessage = ""
  let statusColor = ""

  switch (order.status) {
    case "processing":
      statusMessage = "Your order is now being processed. We'll prepare your items for shipping soon."
      statusColor = "#ff9800"
      break
    case "shipped":
      statusMessage = "Your order has been shipped! You can track your package using the tracking information below."
      statusColor = "#2196f3"
      break
    case "delivered":
      statusMessage = "Your order has been delivered. We hope you enjoy your purchase!"
      statusColor = "#4caf50"
      break
    case "cancelled":
      statusMessage = "Your order has been cancelled as requested."
      statusColor = "#f44336"
      break
    default:
      statusMessage = `Your order status has been updated from ${previousStatus} to ${order.status}.`
      statusColor = "#607d8b"
  }

  return `
    <div style="max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;">
      <h2 style="color: #333; text-align: center;">Order Status Update</h2>
      <p>Hello ${name},</p>
      <p>We're writing to inform you that the status of your order #${order._id} has been updated.</p>
      
      <div style="background-color: #f4f4f4; padding: 15px; margin: 15px 0;">
        <p><strong>Order Number:</strong> ${order._id}</p>
        <p><strong>Previous Status:</strong> ${previousStatus}</p>
        <p><strong>New Status:</strong> <span style="color: ${statusColor}; font-weight: bold;">${
          order.status.charAt(0).toUpperCase() + order.status.slice(1)
        }</span></p>
      </div>
      
      <p>${statusMessage}</p>
      
      ${
        order.status === "shipped"
          ? `
        <div style="background-color: #e3f2fd; padding: 15px; margin: 15px 0; border-left: 4px solid #2196f3;">
          <p><strong>Tracking Information:</strong></p>
          <p>Carrier: ${order.shippingCarrier || "Standard Shipping"}</p>
          <p>Tracking Number: ${order.trackingNumber || "Will be updated soon"}</p>
          ${order.trackingUrl ? `<p>Tracking URL: <a href="${order.trackingUrl}">${order.trackingUrl}</a></p>` : ""}
          <p>Estimated Delivery: ${order.estimatedDelivery ? new Date(order.estimatedDelivery).toLocaleString() : "Within 5-7 business days"}</p>
        </div>
      `
          : ""
      }
      
      <p>You can view the full details of your order by logging into your account.</p>
      <p>If you have any questions or concerns, please contact our customer support team.</p>
      <p>Best regards,<br>The Team</p>
    </div>
  `
}
