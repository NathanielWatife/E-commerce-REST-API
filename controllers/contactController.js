import { sendEmail } from '../utils/sendEmail.js'
import logger from '../utils/logger.js'

export const submitContact = async (req, res) => {
  try {
    const { name, email, message, subject, phone } = req.body || {}

    // Basic validation
    if (!name || !email || !message) {
      return res.status(400).json({ success: false, message: 'Name, email and message are required' })
    }
    const emailRegex = /.+@.+\..+/
    if (!emailRegex.test(String(email))) {
      return res.status(400).json({ success: false, message: 'Please provide a valid email' })
    }

    // Optional spam honeypot: reject if suspicious hidden field is filled
    if (req.body._hp) {
      return res.status(200).json({ success: true, message: 'Thanks! We will get back to you.' })
    }

    const to = process.env.SUPPORT_EMAIL || process.env.EMAIL_FROM || process.env.EMAIL_USER
    if (!to) {
      logger.warn('No SUPPORT_EMAIL configured; dropping contact message')
      return res.status(503).json({ success: false, message: 'Service temporarily unavailable' })
    }

    const safeSubject = subject?.trim() || `New contact message from ${name}`
    const html = `
      <div style="font-family: Arial, sans-serif;">
        <h3 style="margin:0 0 8px 0;">Contact Form Submission</h3>
        <p style="margin:0 0 4px 0;"><strong>Name:</strong> ${name}</p>
        <p style="margin:0 0 4px 0;"><strong>Email:</strong> ${email}</p>
        ${phone ? `<p style="margin:0 0 4px 0;"><strong>Phone:</strong> ${phone}</p>` : ''}
        <p style="margin:12px 0 6px 0;"><strong>Message:</strong></p>
        <div style="white-space: pre-wrap;">${String(message).replace(/</g,'&lt;')}</div>
      </div>
    `

    const ok = await sendEmail({ email: to, subject: safeSubject, message: html })
    if (!ok) {
      return res.status(500).json({ success: false, message: 'Failed to send message' })
    }

    return res.status(200).json({ success: true, message: 'Message sent successfully' })
  } catch (e) {
    logger.error('Contact submit error', e)
    return res.status(500).json({ success: false, message: 'Server error' })
  }
}
