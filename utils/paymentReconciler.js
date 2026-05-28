const logger = require('../utils/logger.js');
const Payment = require('../models/Payment.js');
const Order = require('../models/Order.js');
const User = require('../models/User.js');
const { sendEmail, generatePaymentConfirmationEmail } = require('../utils/sendEmail.js');

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const FLW_SECRET_KEY = process.env.FLW_SECRET_KEY || '';

async function psFetch(path, options = {}) {
  const res = await fetch(`https://api.paystack.co${path}`, {
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

async function flwFetch(path, options = {}) {
  const res = await fetch(`https://api.flutterwave.com/v3${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${FLW_SECRET_KEY}`,
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data.status === 'error') {
    const message = data?.message || `Flutterwave error (${res.status})`;
    throw new Error(message);
  }
  return data;
}

async function reconcileOne(payment) {
  try {
    if (!payment?.transactionId) return false;
    const order = await Order.findById(payment.order);
    if (!order) return false;

    // Decide provider based on paymentDetails
    const provider = payment?.paymentDetails?.provider;

    if (provider === 'paystack' && PAYSTACK_SECRET_KEY) {
      const verify = await psFetch(`/transaction/verify/${encodeURIComponent(payment.transactionId)}`);
      const data = verify?.data;
      if (data?.status === 'success') {
        payment.status = 'completed';
        payment.paymentDetails = { ...(payment.paymentDetails || {}), recon: data };
        await payment.save();
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
        // send confirmation email (best-effort)
        try {
          const user = await User.findById(order.user)
          const content = generatePaymentConfirmationEmail(user?.name || 'Customer', payment, order)
          await sendEmail({ email: user?.email, subject: `Payment Confirmation for Order #${order._id}`, message: content })
        } catch {}
        return true;
      }
    }

    if (provider === 'flutterwave' && FLW_SECRET_KEY) {
      const verify = await flwFetch(`/transactions/verify_by_reference?tx_ref=${encodeURIComponent(payment.transactionId)}`);
      const data = verify?.data;
      if (data?.status === 'successful') {
        payment.status = 'completed';
        payment.paymentDetails = { ...(payment.paymentDetails || {}), recon: data };
        await payment.save();
        order.isPaid = true;
        order.paidAt = new Date();
        order.status = 'processing';
        order.paymentResult = {
          id: String(data?.id || payment.transactionId),
          status: 'completed',
          update_time: new Date().toISOString(),
          email_address: data?.customer?.email,
          provider: 'flutterwave',
        };
        await order.save();
        try {
          const user = await User.findById(order.user)
          const content = generatePaymentConfirmationEmail(user?.name || 'Customer', payment, order)
          await sendEmail({ email: user?.email, subject: `Payment Confirmation for Order #${order._id}`, message: content })
        } catch {}
        return true;
      }
    }

    return false;
  } catch (err) {
    logger.warn('Reconcile payment error', { paymentId: payment._id, err: err.message });
    return false;
  }
}

function startPaymentReconciler() {
  const intervalMs = Number(process.env.PAYMENT_RECON_INTERVAL_MS || 5 * 60 * 1000); // 5m
  const minAgeMs = Number(process.env.PAYMENT_RECON_MIN_AGE_MS || 2 * 60 * 1000); // 2m
  const failAfterMs = Number(process.env.PAYMENT_RECON_FAIL_AFTER_MS || 24 * 60 * 60 * 1000); // 24h

  async function tick() {
    const now = Date.now();
    const olderThan = new Date(now - minAgeMs);

    try {
      const { data: pendings, error: fetchErr } = await Payment.find(
        { status: 'pending', createdAt: { $lte: olderThan.toISOString() } },
        { limit: 50 }
      );
      if (fetchErr) throw fetchErr;

      for (const p of pendings || []) {
        const ok = await reconcileOne(p);
        if (!ok && now - new Date(p.createdAt).getTime() > failAfterMs) {
          await Payment.update(p.id || p._id, { status: 'failed' });
        }
      }
    } catch (err) {
      logger.error('Payment reconcile tick error:', err);
    }
  }

  setInterval(tick, intervalMs);
  // initial delayed run
  setTimeout(tick, 10 * 1000);
  logger.info(`Payment reconciler started: every ${intervalMs}ms`);
}

module.exports = { startPaymentReconciler };
