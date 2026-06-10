const logger = require('../utils/logger.js');
const Payment = require('../models/Payment.js');
const Order = require('../models/Order.js');
const User = require('../models/User.js');
const { sendEmail, generatePaymentConfirmationEmail } = require('../utils/sendEmail.js');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY;
const PAYSTACK_BASE = process.env.PAYSTACK_BASE;

async function psFetch(path, options = {}) {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === false) {
    const message = data?.message || `Paystack error (${res.status})`;
    throw new Error(message);
  }
  return data;
}

async function reconcileOne(payment) {
  try {
    if (!payment?.transactionId) return false;
    
    const order = await Order.findById(payment.order);
    if (!order) return false;

    const provider = payment?.paymentDetails?.provider || 'paystack';

    if (provider === 'paystack' && PAYSTACK_SECRET_KEY) {
      const verify = await psFetch(`/transaction/verify/${encodeURIComponent(payment.transactionId)}`);
      const data = verify?.data;
      
      if (data?.status === 'success') {
        const updated = await Payment.findOneAndUpdate(
          { _id: payment._id, status: { $ne: 'completed' } },
          { 
            $set: { 
              status: 'completed', 
              paymentDetails: { ...(payment.paymentDetails || {}), reconciled: data } 
            } 
          },
          { new: true }
        );
        
        if (updated) {
          order.isPaid = true;
          order.paidAt = new Date();
          order.status = 'processing';
          order.paymentResult = {
            id: payment.transactionId,
            status: 'completed',
            update_time: new Date().toISOString(),
            email_address: data?.customer?.email,
            provider: 'paystack',
          };
          await order.save();
          
          // Send confirmation email
          try {
            const user = await User.findById(order.user);
            if (user && user.email) {
              const content = generatePaymentConfirmationEmail(user.name || 'Customer', updated, order);
              await sendEmail({ 
                email: user.email, 
                subject: `Payment Confirmation for Order #${order._id}`, 
                message: content 
              });
            }
          } catch (emailError) {
            logger.error('Reconciler: Failed to send email:', emailError);
          }
          return true;
        }
      }
    }

    return false;
  } catch (err) {
    logger.warn('Reconcile payment error', { paymentId: payment._id, err: err.message });
    return false;
  }
}

function startPaymentReconciler() {
  const intervalMs = Number(process.env.PAYMENT_RECON_INTERVAL_MS || 5 * 60 * 1000);
  const minAgeMs = Number(process.env.PAYMENT_RECON_MIN_AGE_MS || 2 * 60 * 1000);
  const failAfterMs = Number(process.env.PAYMENT_RECON_FAIL_AFTER_MS || 24 * 60 * 60 * 1000);

  async function tick() {
    const now = Date.now();
    const olderThan = new Date(now - minAgeMs);

    try {
      const pendings = await Payment.find({ status: 'pending', createdAt: { $lte: olderThan } })
        .sort({ createdAt: -1 })
        .limit(50);

      for (const p of pendings || []) {
        const ok = await reconcileOne(p);
        if (!ok && now - new Date(p.createdAt).getTime() > failAfterMs) {
          await Payment.findByIdAndUpdate(p._id, { status: 'failed' });
          logger.info(`Payment ${p._id} marked as failed after ${failAfterMs}ms`);
        }
      }
    } catch (err) {
      logger.error('Payment reconcile tick error:', err);
    }
  }

  setInterval(tick, intervalMs);
  setTimeout(tick, 10 * 1000);
  logger.info(`Payment reconciler started: every ${intervalMs}ms`);
}

module.exports = { startPaymentReconciler };